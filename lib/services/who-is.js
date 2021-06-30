'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, lowLimit, highLimit) => {
  if ((lowLimit >= 0) && (lowLimit <= baEnum.ASN1_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baEnum.ASN1_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  const value = {};
  if (apduLen <= 0) return {};
  let result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  if (apduLen <= len) return;
  let decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
    value.lowLimit = decodedValue.value;
  }
  if (apduLen <= len) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  if (apduLen <= len) return;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
    value.highLimit = decodedValue.value;
  }
  value.len = len;
  return value;
};
