import { Tinytest } from 'meteor/tinytest';
import { CollectionAPI } from 'meteor/xcv58:collection-api';

const DEFAULT_OPTIONS = {
  apiPath: 'collectionapi',
  standAlone: false,
  allowCORS: false,
  sslEnabled: false,
  listenPort: 3005,
  listenHost: null,
  authToken: null,
  privateKeyFile: 'privatekey.pem',
  certificateFile: 'certificate.pem',
  timeOut: 120000,
};

Tinytest.add('CollectionAPI - import, init, options', test => {
  test.isTrue(Boolean(CollectionAPI), 'CollectionAPI exists!');

  let API;

  API = new CollectionAPI();
  test.equal(API.options, DEFAULT_OPTIONS, 'Default options');

  API = new CollectionAPI({ allowCORS: true });
  test.isTrue(API.options.allowCORS, 'set allowCORS');

  API = new CollectionAPI({ apiPath: 'testpath' });
  test.equal(API.options.apiPath, 'testpath', 'set apiPath');
});
