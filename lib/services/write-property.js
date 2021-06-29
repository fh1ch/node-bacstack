'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, objectType, objectInstance, propertyId, arrayIndex, priority, values) => {
  baAsn1.encodeContextObjectId(buffer, 0, objectType, objectInstance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baEnum.ASN1_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeOpeningTag(buffer, 3);
  values.forEach((value) => {
    baAsn1.bacappEncodeApplicationData(buffer, value);
  });
  baAsn1.encodeClosingTag(buffer, 3);
  if (priority !== baEnum.ASN1_NO_PRIORITY) {
    baAsn1.encodeContextUnsigned(buffer, 4, priority);
  }
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  const value = {
    property: {}
  };
  let decodedValue;
  let result;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  const objectId = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  len += decodedValue.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.property.id = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.property.index = decodedValue.value;
  } else {
    value.property.index = baEnum.ASN1_ARRAY_ALL;
  }
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 3)) return;
  len++;
  const values = [];
  while ((apduLen - len) > 1 && !baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) {
    decodedValue = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, value.property.id);
    if (!decodedValue) return;
    len += decodedValue.len;
    delete decodedValue.len;
    values.push(decodedValue);
  }
  value.value = values;
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) return;
  len++;
  value.priority = baEnum.ASN1_MAX_PRIORITY;
  if (len < apduLen) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    if (result.tagNumber === 4) {
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue;
      if ((decodedValue.value >= baEnum.ASN1_MIN_PRIORITY) && (decodedValue.value <= baEnum.ASN1_MAX_PRIORITY)) {
        value.priority = decodedValue.value;
      } else {
        return;
      }
    }
  }
  return {
    len: len,
    objectId: objectId,
    value: value
  };
};
