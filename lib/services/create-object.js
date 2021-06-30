'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, objectId, values) => {
  baAsn1.encodeOpeningTag(buffer, 0);
  baAsn1.encodeContextObjectId(buffer, 1, objectId.type, objectId.instance);
  baAsn1.encodeClosingTag(buffer, 0);
  baAsn1.encodeOpeningTag(buffer, 1);
  values.forEach((propertyValue) => {
    baAsn1.encodeContextEnumerated(buffer, 0, propertyValue.property.id);
    if (propertyValue.property.index !== baEnum.ASN1_ARRAY_ALL) {
      baAsn1.encodeContextUnsigned(buffer, 1, propertyValue.property.index);
    }
    baAsn1.encodeOpeningTag(buffer, 2);
    propertyValue.value.forEach((value) => {
      baAsn1.bacappEncodeApplicationData(buffer, value);
    });
    baAsn1.encodeClosingTag(buffer, 2);
    if (propertyValue.priority !== baEnum.ASN1_NO_PRIORITY) {
      baAsn1.encodeContextUnsigned(buffer, 3, propertyValue.priority);
    }
  });
  baAsn1.encodeClosingTag(buffer, 1);
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  let objectId;
  const valueList = [];
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if ((result.tagNumber === 0) && (apduLen > len)) {
    apduLen -= len;
    if (apduLen < 4) return;
    decodedValue = baAsn1.decodeContextObjectId(buffer, offset + len, 1);
    len += decodedValue.len;
    objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  } else {
    return;
  }
  if (baAsn1.decodeIsClosingTag(buffer, offset + len)) {
    len++;
  }
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  while ((apduLen - len) > 1) {
    const newEntry = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    const propertyId = decodedValue.value;
    let arraIndex = baEnum.ASN1_ARRAY_ALL;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 1) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      arraIndex += decodedValue.value;
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
    }
    newEntry.property = {id: propertyId, index: arraIndex};
    if ((result.tagNumber === 2) && (baAsn1.decodeIsOpeningTag(buffer, offset + len - 1))) {
      const values = [];
      while (!baAsn1.decodeIsClosingTag(buffer, offset + len)) {
        decodedValue = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, propertyId);
        if (!decodedValue) return;
        len += decodedValue.len;
        delete decodedValue.len;
        values.push(decodedValue);
      }
      len++;
      newEntry.value = values;
    } else {
      return;
    }
    valueList.push(newEntry);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  return {
    len: len,
    objectId: objectId,
    values: valueList
  };
};

module.exports.encodeAcknowledge = (buffer, objectId) => {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
};
