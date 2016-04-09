/* global Package, Npm */
/* eslint-disable func-names, prefer-arrow-callback */

Package.describe({
  name: 'xcv58:collection-api',
  description: 'Perform CRUD operations on Collections over a RESTful API',
  version: '0.3.0',
  summary: 'CRUD operations on Collections via HTTP/HTTPS API',
  git: 'https://github.com/xcv58/meteor-collectionapi.git',
  homepage: 'https://github.com/xcv58/meteor-collectionapi',
  author: 'Todd Colton, xcv58',
  documentation: 'README.md',
});

Npm.depends({
  url: '0.11.0',
  querystring: '0.2.0',
  fibers: '1.0.10',
  https: '1.0.0',
});

Package.onUse(function (api) {
  api.versionsFrom('1.3.1');
  api.use(['routepolicy', 'webapp', 'ecmascript', 'underscore'], 'server');
  api.mainModule('server.js', 'server');
});

Package.onTest(function (api) {
  api.use(['routepolicy', 'webapp', 'ecmascript', 'underscore'], 'server');
  api.use('tinytest');
  api.use('xcv58:collection-api');
  api.mainModule('meteor-tests.js', 'server');
});
