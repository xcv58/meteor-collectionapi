Package.describe({
  name: 'xcv58:collection-api',
  description: 'Perform CRUD operations on Collections over a RESTful API',
  version: '0.1.20',
  summary: 'CRUD operations on Collections via HTTP/HTTPS API',
  git: 'https://github.com/xcv58/meteor-collectionapi.git',
  homepage: 'https://github.com/xcv58/meteor-collectionapi',
  author: 'Todd Colton, xcv58',

  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.2');
  api.use('routepolicy', 'server');
  api.use('webapp', 'server');
  api.addFiles('xcv58:collection-api.js', 'server');
  api.export("CollectionAPI", "server");
});
