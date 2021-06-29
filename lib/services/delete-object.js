'use strict';

const baAsn1 = require('../asn1');

module.exports.decode = (buffer, offset, apduLen) => {
  const result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  if (result.tagNumber !== 12) return;
  let len = 1;
  const value = baAsn1.decodeObjectId(buffer, offset + len);
  len += value.len;
  if (len !== apduLen) return;
  value.len = len;
  return value;
};

module.exports.encode = (buffer, objectId) => {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
};
