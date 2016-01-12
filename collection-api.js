CollectionAPI = function (options) {
    var self = this;

    self.version = '0.2.6';
    self._url = Npm.require('url');
    self._querystring = Npm.require('querystring');
    self._fiber = Npm.require('fibers');
    self._collections = {};
    self.options = {
        apiPath: 'collectionapi',
        standAlone: false,
        allowCORS: false,
        sslEnabled: false,
        listenPort: 3005,
        listenHost: undefined,
        authToken: undefined,
        privateKeyFile: 'privatekey.pem',
        certificateFile: 'certificate.pem',
        timeOut: 120000
    };
    _.extend(self.options, options || {});
};

CollectionAPI.prototype.addCollection = function (collection, path, options) {
    var self = this;

    var collectionOptions = {};
    collectionOptions[path] = {
        collection: collection,
        options: options || {}
    };
    _.extend(self._collections, collectionOptions);
};

CollectionAPI.prototype.start = function () {
    var self = this;
    var httpServer, httpOptions, scheme;

    var startupMessage = 'Collection API v' + self.version;

    if (self.options.standAlone === true) {
        if (self.options.sslEnabled === true) {
            scheme = 'https://';
            httpServer = Npm.require('https');
            var fs = Npm.require('fs');

            httpOptions = {
                key: fs.readFileSync(self.options.privateKeyFile),
                cert: fs.readFileSync(self.options.certificateFile)
            };
        } else {
            scheme = 'http://';
            httpServer = Npm.require('http');
        }

        self._httpServer = httpServer.createServer(httpOptions);
        if (self.options.sslEnabled !== true) {
            self._httpServer.setTimeout(self.options.timeOut);
        }
        self._httpServer.addListener('request', function (request, response) {
            if (self.options.sslEnabled === true) {
                function requestTimeout() {
                    request.abort();
                }

                function responseTimeout() {
                    response.send(500, 'TIMEOUT');
                }

                request.setTimeout(self.options.timeOut, requestTimeout);
                response.setTimeout(self.options.timeOut, responseTimeout);
            }
            new CollectionAPI._requestListener(self, request, response);
        });
        self._httpServer.listen(self.options.listenPort, self.options.listenHost);
        console.log(startupMessage + ' running as a stand-alone server on ' + scheme + (self.options.listenHost || 'localhost') + ':' + self.options.listenPort + '/' + (self.options.apiPath || ''));
    } else {

        RoutePolicy.declare('/' + this.options.apiPath + '/', 'network');

        WebApp.connectHandlers.use(function (req, res, next) {
            if (req.url.split('/')[1] !== self.options.apiPath) {
                next();
                return;
            }
            self._fiber(function () {
                new CollectionAPI._requestListener(self, req, res);
            }).run();
        });

        console.log(startupMessage + ' running at /' + this.options.apiPath);
    }
};

CollectionAPI.prototype._collectionOptions = function (requestPath) {
    var self = this;
    return self._collections[requestPath.collectionPath] ? self._collections[requestPath.collectionPath].options : undefined;
};

CollectionAPI._requestListener = function (server, request, response) {
    var self = this;

    self._server = server;
    self._request = request;
    self._response = response;
    if (server.options.allowCORS === true) {
        response.setHeader('Access-Control-Allow-Origin', '*');
    }

    self._requestUrl = self._server._url.parse(self._request.url, true);

    // Check for the X-Auth-Token header or auth-token in the query string
    self._requestAuthToken = self._request.headers['x-auth-token'] ? self._request.headers['x-auth-token'] : self._server._querystring.parse(self._requestUrl.query)['auth-token'];

    var requestPath;
    var pathName = self._requestUrl.pathname;
    if (pathName.charAt(pathName.length - 1) === '/') {
        pathName = pathName.substring(0, pathName.length - 1);
    }

    if (self._server.options.standAlone === true && !self._server.options.apiPath) {
        requestPath = pathName.split('/').slice(1);
    } else {
        requestPath = pathName.split('/').slice(2);
    }

    self._requestPath = {
        collectionPath: requestPath[0],
        collectionId: requestPath[1],
        fields: requestPath.slice(2),
        query: self._requestUrl.query
    };

    self._requestCollection = self._server._collections[self._requestPath.collectionPath] ? self._server._collections[self._requestPath.collectionPath].collection : undefined;

    if (!self._requestCollection) {
        return self._notFoundResponse('Collection Object Not Found');
    }

    if (!self._authenticate(self._requestAuthToken, self._request.method, self._requestPath)) {
        return self._unauthorizedResponse('Invalid/Missing Auth Token');
    }

    return self._handleRequest();
};

CollectionAPI._requestListener.prototype._authenticate = function () {
    var self = this;
    var collectionOptions = self._server._collectionOptions(self._requestPath);
    var authCount = 0;

    // Check the global auth token
    if (self._server.options.authToken) {
        authCount++;
        if (self._requestAuthToken === self._server.options.authToken) {
            return true;
        }
    }

    // Check the collection's auth token
    if (collectionOptions && collectionOptions.authToken) {
        authCount++;
        if (self._requestAuthToken === collectionOptions.authToken) {
            return true;
        }
    }

    if (!authCount && collectionOptions.authenticate && _.isFunction(collectionOptions.authenticate)) {
        authCount++;
        if (collectionOptions.authenticate.apply(self, arguments)) {
            return true;
        }
    }

    return authCount === 0;
};

CollectionAPI._requestListener.prototype._handleRequest = function () {
    var self = this;

    if (!self._requestMethodAllowed(self._request.method)) {
        return self._notSupportedResponse();
    }

    switch (self._request.method) {
        case 'GET':
            return self._getRequest();
        case 'POST':
            return self._postRequest();
        case 'PUT':
            return self._putRequest();
        case 'DELETE':
            return self._deleteRequest();
        default:
            return self._notSupportedResponse();
    }
};

CollectionAPI._requestListener.prototype._requestMethodAllowed = function (method) {
    var self = this;
    var collectionOptions = self._server._collectionOptions(self._requestPath);

    if (collectionOptions && collectionOptions.methods) {
        return _.indexOf(collectionOptions.methods, method) >= 0;
    }

    return true;
};

CollectionAPI._requestListener.prototype._beforeHandling = function (method) {
    var self = this;
    var collectionOptions = self._server._collectionOptions(self._requestPath);

    if (collectionOptions && collectionOptions.before && collectionOptions.before[method] && _.isFunction(collectionOptions.before[method])) {
        return collectionOptions.before[method].apply(self, _.rest(arguments));
    }

    return true;
};

CollectionAPI._requestListener.prototype._afterHandling = function (method) {
    var self = this;
    var collectionOptions = self._server._collectionOptions(self._requestPath);

    if (collectionOptions && collectionOptions.after && collectionOptions.after[method] && _.isFunction(collectionOptions.after[method])) {
        return collectionOptions.after[method].apply(self, _.rest(arguments));
    }

    return true;
};

CollectionAPI._requestListener.prototype._getEmptyReturnObject = function () {
    var returnObject = {
        success: false,
        statusCode: undefined,
        body: undefined
    };
    return returnObject;
};

CollectionAPI._requestListener.prototype._handleReturnObject = function (method, returnObject) {
    if (returnObject.success && returnObject.statusCode && returnObject.body) {
        var self = this;
        self._afterHandling(method);
        return self._sendResponse(returnObject.statusCode, JSON.stringify(returnObject.body));
    }
    return false;
};

CollectionAPI._requestListener.prototype._getRequest = function (fromRequest) {
    var self = this;

    self._server._fiber(function () {

        try {
            // TODO: A better way to do this?
            var collection_result = self._requestPath.collectionId !== undefined ? self._requestCollection.find(self._requestPath.collectionId) : self._requestCollection.find();

            var records = [];
            collection_result.forEach(function (record) {
                records.push(record);
            });

            var returnObject = self._getEmptyReturnObject();

            if (!self._beforeHandling('GET', records, self._requestPath, returnObject)) {
                if (fromRequest) {
                    return records.length ? self._noContentResponse() : self._notFoundResponse('No Record(s) Found');
                }
                return self._rejectedResponse("Could not get that collection/object.");
            }

            if (self._handleReturnObject('GET', returnObject)) {
                return true;
            }

            records = _.compact(records);

            if (records.length === 0) {
                return self._notFoundResponse('No Record(s) Found');
            }


            self._afterHandling('GET');

            if (fromRequest === "POST") {
                return self._createdResponse(JSON.stringify(records));
            }

            return self._okResponse(JSON.stringify(records));

        } catch (e) {
            return self._internalServerErrorResponse(e);
        }
    }).run();
};

CollectionAPI._requestListener.prototype._putRequest = function () {
    var self = this;

    if (!self._requestPath.collectionId) {
        return self._notFoundResponse('Missing _id');
    }

    var requestData = '';

    self._request.on('data', function (chunk) {
        requestData += chunk.toString();
    });

    self._request.on('end', function () {
        self._server._fiber(function () {
            try {
                var obj = JSON.parse(requestData);

                var returnObject = self._getEmptyReturnObject();

                if (!self._beforeHandling('PUT', self._requestCollection.findOne(self._requestPath.collectionId), obj, self._requestPath, returnObject)) {
                    return self._rejectedResponse("Could not put that object.");
                }

                if (self._handleReturnObject('PUT', returnObject)) {
                    return true;
                }

                self._requestCollection.update(self._requestPath.collectionId, obj);
            } catch (e) {
                return self._internalServerErrorResponse(e);
            }

            self._afterHandling('PUT');
            if (self._requestPath.query.callback === "0") {
                return self._createdResponse(JSON.stringify({'status': 'success'}));
            } else {
                return self._getRequest('PUT');
            }
        }).run();
    });
};

CollectionAPI._requestListener.prototype._deleteRequest = function () {
    var self = this;

    if (!self._requestPath.collectionId) {
        return self._notFoundResponse('Missing _id');
    }

    self._server._fiber(function () {
        try {
            var returnObject = self._getEmptyReturnObject();

            if (!self._beforeHandling('DELETE', self._requestCollection.findOne(self._requestPath.collectionId), self._requestPath, returnObject)) {
                return self._rejectedResponse("Could not delete that object.");
            }

            if (self._handleReturnObject('DELETE', returnObject)) {
                return true;
            }

            self._requestCollection.remove(self._requestPath.collectionId);
        } catch (e) {
            return self._internalServerErrorResponse(e);
        }
        self._afterHandling('DELETE');
        return self._okResponse('');
    }).run();
};

CollectionAPI._requestListener.prototype._postRequest = function () {
    var self = this;
    var requestData = '';

    self._request.on('data', function (chunk) {
        requestData += chunk.toString();
    });

    self._request.on('end', function () {
        self._server._fiber(function () {
            try {
                var obj = JSON.parse(requestData);

                var returnObject = self._getEmptyReturnObject();

                if (!self._beforeHandling('POST', obj, self._requestPath, returnObject)) {
                    return self._rejectedResponse("Could not post that object.");
                }

                if (self._handleReturnObject('POST', returnObject)) {
                    return true;
                }

                self._requestPath.collectionId = self._requestCollection.insert(obj);
            } catch (e) {
                return self._internalServerErrorResponse(e);
            }
            self._afterHandling('POST');
            return self._getRequest('POST');
        }).run();
    });
};

CollectionAPI._requestListener.prototype._okResponse = function (body) {
    var self = this;
    self._sendResponse(200, body);
};

CollectionAPI._requestListener.prototype._createdResponse = function (body) {
    var self = this;
    self._sendResponse(201, body);
};

CollectionAPI._requestListener.prototype._noContentResponse = function () {
    var self = this;
    self._sendResponse(204, '');
};

CollectionAPI._requestListener.prototype._notSupportedResponse = function () {
    var self = this;
    self._sendResponse(501, '');
};

CollectionAPI._requestListener.prototype._unauthorizedResponse = function (body) {
    var self = this;
    self._sendResponse(401, JSON.stringify({message: body.toString()}));
};

CollectionAPI._requestListener.prototype._notFoundResponse = function (body) {
    var self = this;
    self._sendResponse(404, JSON.stringify({message: body.toString()}));
};

CollectionAPI._requestListener.prototype._rejectedResponse = function (body) {
    var self = this;
    self._sendResponse(409, JSON.stringify({message: body.toString()}));
};

CollectionAPI._requestListener.prototype._internalServerErrorResponse = function (body) {
    var self = this;
    self._sendResponse(500, JSON.stringify({error: body.toString()}));
};

CollectionAPI._requestListener.prototype._sendResponse = function (statusCode, body) {
    var self = this;
    self._response.statusCode = statusCode;
    self._response.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
    self._response.setHeader('Content-Type', 'application/json');
    self._response.write(body);
    self._response.end();
    return true;
};