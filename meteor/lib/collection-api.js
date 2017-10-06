import fibers from 'fibers';
import https from 'https';
import http from 'http';
import fs from 'fs';

import {WebApp} from 'meteor/webapp';
import {RoutePolicy} from 'meteor/routepolicy';

import {RequestListener} from './request-listener';
import {getNestedValue, getDefaultOptions} from './util';

class CollectionAPI {
    constructor(options = {}) {
        this.version = '0.3.0';
        this._collections = {};
        this.options = getDefaultOptions();
        Object.assign(this.options, options);
    }

    addCollection(collection, path, options = {}) {
        const collectionOptions = {};
        collectionOptions[path] = {collection, options};
        Object.assign(this._collections, collectionOptions);
    }

    start() {
        const startupMessage = `Collection API v${this.version}`;


        if (this.options.standAlone === true) {
            let httpServer = http;
            let scheme = 'http://';
            let httpOptions = {};

            if (this.options.sslEnabled === true) {
                scheme = 'https://';
                httpServer = https;
                httpOptions = {
                    key: fs.readFileSync(this.options.privateKeyFile),
                    cert: fs.readFileSync(this.options.certificateFile),
                };
            }

            if (this.options.sslEnabled !== true) {
                this._httpServer = httpServer.createServer();
                this._httpServer.setTimeout(this.options.timeOut);
            } else {
                this._httpServer = httpServer.createServer(httpOptions);
            }

            this._httpServer.addListener('request', (request, response) => {
                if (this.options.sslEnabled === true) {
                    /* eslint-disable */
                    function requestTimeout() {
                        request.abort();
                    }

                    function responseTimeout() {
                        response.send(500, 'TIMEOUT');
                    }

                    /* eslint-enable */

                    request.setTimeout(this.options.timeOut, requestTimeout);
                    response.setTimeout(this.options.timeOut, responseTimeout);
                }

                /* eslint-disable */
                new RequestListener(this, request, response);
                /* eslint-enable */
            });

            const {listenHost = 'localhost', listenPort, apiPath = ''} = this.options;

            this._httpServer.listen(listenPort, listenHost);

            /* eslint-disable */
            console.log(
                startupMessage,
                'running as a stand-alone server on',
                `${scheme}${listenHost}:${listenPort}/${apiPath}`
            );
            /* eslint-enable */
        } else {
            RoutePolicy.declare(`/${this.options.apiPath}/`, 'network');

            WebApp.connectHandlers.use((req, res, next) => {
                if (req.url.split('/')[1] !== this.options.apiPath) {
                    next();
                    return;
                }
                fibers(() => new RequestListener(this, req, res)).run();
            });

            /* eslint-disable */
            console.log(`${startupMessage} running at /${this.options.apiPath}`);
            /* eslint-enable */
        }
    }

    _getCollectionOptions({collectionPath}) {
        return getNestedValue(this._collections, [collectionPath, 'options']);
    }

    _getCollection({collectionPath}) {
        return getNestedValue(this._collections, [collectionPath, 'collection']);
    }
}

export {CollectionAPI};
