const getDefaultOptions = () => ({
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
});

const getReturnObject = () => ({ success: false, statusCode: null, body: null });

const isFunction = func => typeof func === 'function';

const getNestedValue = (obj, keys) => {
  let res = obj;
  for (const key of keys) {
    if (Boolean(res)) {
      res = res[key];
    } else {
      return res;
    }
  }
  return res;
};

export { isFunction, getReturnObject, getNestedValue, getDefaultOptions };
