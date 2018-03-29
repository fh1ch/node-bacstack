'use strict';

const baAsn1      = require('../asn1');

const encodeWritePropertyMultiple = module.exports.encodeWritePropertyMultiple = (buffer, objectId, values) => {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeOpeningTag(buffer, 1);
  values.forEach((pValue) => {
    baAsn1.encodeContextEnumerated(buffer, 0, pValue.property.id);
    if (pValue.property.index !== baAsn1.BACNET_ARRAY_ALL) {
      baAsn1.encodeContextUnsigned(buffer, 1, pValue.property.index);
    }
    baAsn1.encodeOpeningTag(buffer, 2);
    pValue.value.forEach((value) => {
      baAsn1.bacappEncodeApplicationData(buffer, value);
    });
    baAsn1.encodeClosingTag(buffer, 2);
    if (pValue.priority !== baAsn1.BACNET_NO_PRIORITY) {
      baAsn1.encodeContextUnsigned(buffer, 3, pValue.priority);
    }
  });
  baAsn1.encodeClosingTag(buffer, 1);
};

module.exports.decodeWritePropertyMultiple = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  let objectId;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if ((result.tagNumber !== 0) || (apduLen <= len)) return;
  apduLen -= len;
  if (apduLen < 4) return;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  objectId = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  const _values = [];
  while ((apduLen - len) > 1) {
    let newEntry = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    let propertyId = decodedValue.value;
    let arrayIndex = baAsn1.BACNET_ARRAY_ALL;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 1) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      arrayIndex = decodedValue.value;
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
    }
    newEntry.property = {id: propertyId, index: arrayIndex};
    if ((result.tagNumber !== 2) || (!baAsn1.decodeIsOpeningTag(buffer, offset + len - 1))) return;
    const values = [];
    while ((len + offset) <= buffer.length && !baAsn1.decodeIsClosingTag(buffer, offset + len)) {
      let value = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, propertyId);
      if (!value) return;
      len += value.len;
      delete value.len;
      values.push(value);
    }
    len++;
    newEntry.value = values;
    let priority = baAsn1.BACNET_NO_PRIORITY;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 3) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      priority = decodedValue.value;
    } else {
      len--;
    }
    newEntry.priority = priority;
    _values.push(newEntry);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  return {
    len: len,
    objectId: objectId,
    values: _values
  };
};

module.exports.encodeWriteObjectMultiple = (buffer, values) => {
  values.forEach((object) => {
    encodeWritePropertyMultiple(buffer, object.objectId, object.values);
  });
};
