'use strict';

const baAsn1 = require('../asn1');

module.exports.encode = (buffer, state, password) => {
  baAsn1.encodeContextEnumerated(buffer, 0, state);
  if (password && password !== '') {
    baAsn1.encodeContextCharacterString(buffer, 1, password);
  }
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  const value = {};
  let result;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  let decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  value.state = decodedValue.value;
  len += decodedValue.len;
  if (len < apduLen) {
    if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    value.password = decodedValue.value;
    len += decodedValue.len;
  }
  value.len = len;
  return value;
};
