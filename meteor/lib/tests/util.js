import test from 'ava';
import 'babel-core/register';

import { isFunction, getReturnObject } from '../util';

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
  t.true(isFunction(getReturnObject), 'getReturnObject is a function');

  const obj = getReturnObject();

  t.truthy(obj, 'getReturnObject return valid value.');
  t.truthy(obj, 'getReturnObject return valid value.');

  t.false(obj.success, '.success is false.');
  t.is(obj.statusCode, null, '.success is false.');
  t.is(obj.body, null, '.success is false.');

  t.is(Object.keys(obj).length, 3, 'obj only contains 3 keys.');
});
