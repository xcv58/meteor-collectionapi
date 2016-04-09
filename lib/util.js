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

const getReturnObject = () => ({ success: false, statusCode: null, body: null });

const isFunction = func => typeof func === 'function';

export { isFunction, getReturnObject, DEFAULT_OPTIONS };
