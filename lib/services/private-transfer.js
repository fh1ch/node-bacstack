'use strict';

const baAsn1 = require('../asn1');

module.exports.encode = (buffer, vendorId, serviceNumber, data) => {
  baAsn1.encodeContextUnsigned(buffer, 0, vendorId);
  baAsn1.encodeContextUnsigned(buffer, 1, serviceNumber);
  baAsn1.encodeOpeningTag(buffer, 2);
  for (let i = 0; i < data.length; i++) {
    buffer.buffer[buffer.offset++] = data[i];
  }
  baAsn1.encodeClosingTag(buffer, 2);
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  const value = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.vendorId = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.serviceNumber = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  const size = apduLen - (offset + len + 1);
  const data = [];
  for (let i = 0; i < size; i++) {
    data.push(buffer[offset + len++]);
  }
  value.data = data;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  value.len = len;
  return value;
};
