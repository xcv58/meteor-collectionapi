import test from 'ava';
import 'babel-core/register';

import { isFunction, getReturnObject, getNestedValue, getDefaultOptions } from '../util';

test('isFunction', t => {
  t.truthy(isFunction, 'isFunction is truthy.');
  t.true(typeof isFunction === 'function', 'isFunction itself is a function.');

  t.false(isFunction(undefined), 'undefined is not function.');
  t.false(isFunction(null), 'null is not function.');
  t.false(isFunction(1), 'number is not function.');
  t.false(isFunction({}), 'object is not function.');
  t.false(isFunction([]), 'array is not function.');

  t.true(isFunction(() => 1), '() => is function.');
  function func() {}
  t.true(isFunction(func), 'function () {} is function.');
});

test('getReturnObject', t => {
  t.true(isFunction(getReturnObject), 'getReturnObject is a function.');

  const obj = getReturnObject();

  t.truthy(obj, 'getReturnObject return valid value.');
  t.truthy(obj, 'getReturnObject return valid value.');

  t.false(obj.success, '.success is false.');
  t.is(obj.statusCode, null, '.success is false.');
  t.is(obj.body, null, '.success is false.');

  t.is(Object.keys(obj).length, 3, 'obj only contains 3 keys.');
});

test('getNestedValue', t => {
  t.true(isFunction(getNestedValue), 'getNestedValue is a function.');

  t.is(getNestedValue(undefined, []), undefined, 'get undefined if obj is undefined.');

  t.is(getNestedValue(null, []), null, 'get undefined if obj is null.');

  let obj = {};
  t.is(getNestedValue(obj, []), obj, 'get origin if keys is [].');

  t.is(getNestedValue(obj, ['key']), undefined, 'get undefined if key not exist.');

  obj = { key: 1 };
  t.is(getNestedValue(obj, ['key']), 1, 'get correct value.');

  t.is(getNestedValue(obj, ['key', 'inside']), undefined, 'get undefined if no nested key.');

  obj = { key0: { key1: { key2: { key3: 1 } } } };

  t.is(getNestedValue(obj, ['key0', 'key1', 'key2', 'key3']), 1, 'get correct value.');

  t.is(getNestedValue(obj, ['key0', 'invalidKey', 'key2', 'key3']), undefined, 'get undefined.');
});


test('getDefaultOptions', t => {
  t.true(isFunction(getDefaultOptions), 'getDefaultOptions is a function.');

  const defaultOptions = getDefaultOptions();
  t.true(typeof defaultOptions === 'object', 'defaultOptions is an object.');

  const {
    apiPath,
    standAlone,
    allowCORS,
    sslEnabled,
    listenPort,
    listenHost,
    authToken,
    privateKeyFile,
    certificateFile,
    timeOut,
  } = defaultOptions;

  t.is(apiPath, 'collectionapi', 'default apiPath is /collectionapi .');
  t.is(standAlone, false, 'default standAlone is false.');

  t.is(allowCORS, false, 'default allowCORS is false.');
  t.is(sslEnabled, false, 'default sslEnabled is false.');

  t.is(listenHost, null, 'default listenHost is null.');
  t.is(listenPort, 3005, 'default listenPort is 3005.');

  t.is(authToken, null, 'default authToken is null.');

  t.is(privateKeyFile, 'privatekey.pem', 'default privateKeyFile is privatekey.pem');
  t.is(certificateFile, 'certificate.pem', 'default certificateFile is certificate.pem.');
  t.is(timeOut, 120000, 'default timeOut is 2 minutes.');
});
