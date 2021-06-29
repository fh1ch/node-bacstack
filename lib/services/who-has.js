'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, lowLimit, highLimit, objectId, objectName) => {
  if ((lowLimit >= 0) && (lowLimit <= baEnum.ASN1_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baEnum.ASN1_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
  if (objectName && objectName !== '') {
    baAsn1.encodeContextCharacterString(buffer, 3, objectName);
  } else {
    baAsn1.encodeContextObjectId(buffer, 2, objectId.type, objectId.instance);
  }
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  const value = {};
  let decodedValue;
  let result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === 0) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
      value.lowLimit = decodedValue.value;
    }
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 1) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
      value.highLimit = decodedValue.value;
    }
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 2) {
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  }
  if (result.tagNumber === 3) {
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    len += decodedValue.len;
    value.objectName = decodedValue.value;
  }
  value.len = len;
  return value;
};
