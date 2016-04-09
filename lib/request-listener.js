import fibers from 'fibers';
import url from 'url';
import querystring from 'querystring';

import { isFunction, getReturnObject, getNestedValue } from './util';


class RequestListener {
  constructor(server, request, response) {
    this._server = server;
    this._request = request;
    this._response = response;

    if (server.options.allowCORS === true) {
      response.setHeader('Access-Control-Allow-Origin', '*');
    }

    this._requestUrl = url.parse(this._request.url, true);

    // Check for the X-Auth-Token header or auth-token in the query string
    this._requestAuthToken = this._request.headers['x-auth-token'];
    if (!this._requestAuthToken) {
      this._requestAuthToken = querystring.parse(this._requestUrl.query)['auth-token'];
    }

    let requestPath;
    let pathName = this._requestUrl.pathname;
    if (pathName.charAt(pathName.length - 1) === '/') {
      pathName = pathName.substring(0, pathName.length - 1);
    }

    if (this._server.options.standAlone === true && !this._server.options.apiPath) {
      requestPath = pathName.split('/').slice(1);
    } else {
      requestPath = pathName.split('/').slice(2);
    }

    this._requestPath = {
      collectionPath: requestPath[0],
      collectionId: requestPath[1],
      fields: requestPath.slice(2),
      query: this._requestUrl.query,
    };

    this._collectionOptions = this._server._getCollectionOptions(this._requestPath);
    this._requestCollection = this._server._getCollection(this._requestPath);

    if (!this._requestCollection) {
      return this._notFoundResponse('Collection Object Not Found');
    }

    if (!this._authenticate(this._requestAuthToken, this._request.method, this._requestPath)) {
      return this._unauthorizedResponse('Invalid/Missing Auth Token');
    }

    return this._handleRequest();
  }

  _authenticate(...args) {
    const collectionOptions = this._collectionOptions;
    let authCount = 0;

    // Check the global auth token
    if (this._server.options.authToken) {
      authCount++;
      if (this._requestAuthToken === this._server.options.authToken) {
        return true;
      }
    }

    // Check the collection's auth token
    if (collectionOptions && collectionOptions.authToken) {
      authCount++;
      if (this._requestAuthToken === collectionOptions.authToken) {
        return true;
      }
    }

    const { authenticate } = collectionOptions;
    if (!authCount && authenticate && isFunction(authenticate)) {
      authCount++;
      if (authenticate.apply(this, args)) {
        return true;
      }
    }

    return authCount === 0;
  }

  _handleRequest() {
    const { method } = this._request;

    if (!this._requestMethodAllowed(method)) {
      return this._notSupportedResponse();
    }

    const func = this[method.toLowerCase()];
    if (isFunction(func)) {
      return func.apply(this);
    }

    return this._notSupportedResponse();
  }

  _requestMethodAllowed(method) {
    const collectionOptions = this._collectionOptions;

    const { methods = [] } = collectionOptions || {};
    return methods.indexOf(method) >= 0;
  }

  _handleHooks(hook, method, args) {
    const func = getNestedValue(this._collectionOptions, [hook, method]);
    if (isFunction(func)) {
      return func.apply(this, args);
    }

    return true;
  }

  _beforeHandling(method, ...args) {
    return this._handleHooks.apply(this, ['before', method, args]);
  }

  _afterHandling(method, ...args) {
    return this._handleHooks.apply(this, ['after', method, args]);
  }

  _handleReturnObject(method, returnObject) {
    if (returnObject.success && returnObject.statusCode && returnObject.body) {
      this._afterHandling(method);
      return this._sendResponse(returnObject.statusCode, JSON.stringify(returnObject.body));
    }
    return false;
  }

  get(fromRequest = 'GET') {
    fibers(() => {
      try {
        // TODO: A better way to do this?
        const { collectionId } = this._requestPath;
        let cursor = null;
        if (collectionId) {
          cursor = this._requestCollection.find(this._requestPath.collectionId);
        } else {
          cursor = this._requestCollection.find();
        }

        const records = cursor.fetch();

        const returnObject = getReturnObject();

        if (!this._beforeHandling('GET', records, this._requestPath, returnObject)) {
          if (fromRequest) {
            if (records.length) {
              return this._noContentResponse();
            }
            return this._notFoundResponse('No Record(s) Found');
          }
          return this._rejectedResponse('Could not get that collection/object.');
        }

        if (this._handleReturnObject('GET', returnObject)) {
          return true;
        }

        if (records.length === 0) {
          return this._notFoundResponse('No Record(s) Found');
        }

        this._afterHandling('GET');

        if (fromRequest === 'POST') {
          return this._createdResponse(JSON.stringify(records));
        }

        return this._okResponse(JSON.stringify(records));
      } catch (e) {
        return this._internalServerErrorResponse(e);
      }
    }).run();
  }

  put() {
    if (!this._requestPath.collectionId) {
      return this._notFoundResponse('Missing _id');
    }

    let requestData = '';

    this._request.on('data', chunk => {
      requestData += chunk.toString();
    });

    return this._request.on('end', () => {
      fibers(() => {
        try {
          const obj = JSON.parse(requestData);

          const returnObject = getReturnObject();

          if (!this._beforeHandling(
            'PUT',
            this._requestCollection.findOne(this._requestPath.collectionId),
            obj,
            this._requestPath,
            returnObject
          )) {
            return this._rejectedResponse('Could not put that object.');
          }

          if (this._handleReturnObject('PUT', returnObject)) {
            return true;
          }

          this._requestCollection.update(this._requestPath.collectionId, obj);
        } catch (e) {
          return this._internalServerErrorResponse(e);
        }

        this._afterHandling('PUT');
        if (this._requestPath.query.callback === '0') {
          return this._createdResponse(JSON.stringify({ status: 'success' }));
        }
        return this.get('PUT');
      }).run();
    });
  }

  delete() {
    if (!this._requestPath.collectionId) {
      return this._notFoundResponse('Missing _id');
    }

    return fibers(() => {
      try {
        const returnObject = getReturnObject();

        if (!this._beforeHandling(
          'DELETE',
          this._requestCollection.findOne(this._requestPath.collectionId),
          this._requestPath,
          returnObject
        )) {
          return this._rejectedResponse('Could not delete that object.');
        }

        if (this._handleReturnObject('DELETE', returnObject)) {
          return true;
        }

        this._requestCollection.remove(this._requestPath.collectionId);
      } catch (e) {
        return this._internalServerErrorResponse(e);
      }
      this._afterHandling('DELETE');
      return this._okResponse('');
    }).run();
  }

  post() {
    let requestData = '';

    this._request.on('data', chunk => {
      requestData += chunk.toString();
    });

    this._request.on('end', () => {
      fibers(() => {
        try {
          const obj = JSON.parse(requestData);

          const returnObject = getReturnObject();

          if (!this._beforeHandling('POST', obj, this._requestPath, returnObject)) {
            return this._rejectedResponse('Could not post that object.');
          }

          if (this._handleReturnObject('POST', returnObject)) {
            return true;
          }

          this._requestPath.collectionId = this._requestCollection.insert(obj);
        } catch (e) {
          return this._internalServerErrorResponse(e);
        }
        this._afterHandling('POST');
        return this.get('POST');
      }).run();
    });
  }

  _okResponse(body) {
    this._sendResponse(200, body);
  }

  _createdResponse(body) {
    this._sendResponse(201, body);
  }

  _noContentResponse() {
    this._sendResponse(204, '');
  }

  _notSupportedResponse() {
    this._sendResponse(501, '');
  }

  _unauthorizedResponse(body) {
    this._sendResponse(401, JSON.stringify({ message: body.toString() }));
  }

  _notFoundResponse(body) {
    this._sendResponse(404, JSON.stringify({ message: body.toString() }));
  }

  _rejectedResponse(body) {
    this._sendResponse(409, JSON.stringify({ message: body.toString() }));
  }

  _internalServerErrorResponse(body) {
    this._sendResponse(500, JSON.stringify({ error: body.toString() }));
  }

  _notSupportedResponse() {
    this._sendResponse(501, '');
  }

  _sendResponse(statusCode, body) {
    this._response.statusCode = statusCode;
    this._response.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
    this._response.setHeader('Content-Type', 'application/json');
    this._response.write(body);
    this._response.end();
    return true;
  }
}

export { RequestListener };
