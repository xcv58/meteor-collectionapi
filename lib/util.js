const getReturnObject = () => ({ success: false, statusCode: null, body: null });

const isFunction = func => typeof func === 'function';

export { isFunction, getReturnObject };
