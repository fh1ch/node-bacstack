'use strict';

const baAsn1 = require('../asn1');

module.exports.encode = (buffer, processId, requestingSource, operation, targetObjectId) => {
  baAsn1.encodeContextUnsigned(buffer, 0, processId);
  baAsn1.encodeContextCharacterString(buffer, 1, requestingSource);
  baAsn1.encodeContextEnumerated(buffer, 2, operation);
  baAsn1.encodeContextObjectId(buffer, 3, targetObjectId.type, targetObjectId.instance);
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
  value.processId = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
  len += decodedValue.len;
  value.requestingSource = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.operation = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.targetObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.len = len;
  return value;
};
