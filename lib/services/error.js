'use strict';

const baAsn1 = require('../asn1');

module.exports.encode = (buffer, errorClass, errorCode) => {
  baAsn1.encodeApplicationEnumerated(buffer, errorClass);
  baAsn1.encodeApplicationEnumerated(buffer, errorCode);
};

module.exports.decode = (buffer, offset) => {
  const orgOffset = offset;
  let result;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  offset += result.len;
  const errorClass = baAsn1.decodeEnumerated(buffer, offset, result.value);
  offset += errorClass.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  offset += result.len;
  const errorCode = baAsn1.decodeEnumerated(buffer, offset, result.value);
  offset += errorClass.len;
  return {
    len: offset - orgOffset,
    class: errorClass.value,
    code: errorCode.value
  };
};
