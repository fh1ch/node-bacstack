'use strict';

const baAsn1      = require('../asn1');

module.exports.encode = (buffer, ttl) => {
  baAsn1.encodeUnsigned(buffer, ttl, 2);
};

module.exports.decode = (buffer, offset, length) => {
  let len = 0;
  let result;
  result = baAsn1.decodeUnsigned(buffer, offset + len, 2);
  len += result.len;
  return {
    len: len,
    ttl: result.value,
  };
};
