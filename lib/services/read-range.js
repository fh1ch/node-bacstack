'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, objectId, propertyId, arrayIndex, requestType, position, time, count) => {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baEnum.ASN1_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  switch (requestType) {
    case baEnum.ReadRangeType.BY_POSITION:
      baAsn1.encodeOpeningTag(buffer, 3);
      baAsn1.encodeApplicationUnsigned(buffer, position);
      baAsn1.encodeApplicationSigned(buffer, count);
      baAsn1.encodeClosingTag(buffer, 3);
      break;
    case baEnum.ReadRangeType.BY_SEQUENCE_NUMBER:
      baAsn1.encodeOpeningTag(buffer, 6);
      baAsn1.encodeApplicationUnsigned(buffer, position);
      baAsn1.encodeApplicationSigned(buffer, count);
      baAsn1.encodeClosingTag(buffer, 6);
      break;
    case baEnum.ReadRangeType.BY_TIME_REFERENCE_TIME_COUNT:
      baAsn1.encodeOpeningTag(buffer, 7);
      baAsn1.encodeApplicationDate(buffer, time);
      baAsn1.encodeApplicationTime(buffer, time);
      baAsn1.encodeApplicationSigned(buffer, count);
      baAsn1.encodeClosingTag(buffer, 7);
      break;
    default:
      break;
  }
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  let requestType;
  let position;
  let time;
  let count;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len, 0);
  len += decodedValue.len;
  const objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  const property = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  property.id = decodedValue.value;
  if (len < apduLen && baAsn1.decodeIsContextTag(buffer, offset + len, 2)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    property.index = decodedValue.value;
  } else {
    property.index = baEnum.ASN1_ARRAY_ALL;
  }
  if (len < apduLen) {
    result = baAsn1.decodeTagNumber(buffer, offset + len);
    len += result.len;
    switch (result.tagNumber) {
      case 3: {
        requestType = baEnum.ReadRangeType.BY_POSITION;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        position = decodedValue.value;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        count = decodedValue.value;
        break;
      } case 6: {
        requestType = baEnum.ReadRangeType.BY_SEQUENCE_NUMBER;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        position = decodedValue.value;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        count = decodedValue.value;
        break;
      } case 7: {
        requestType = baEnum.ReadRangeType.BY_TIME_REFERENCE_TIME_COUNT;
        decodedValue = baAsn1.decodeApplicationDate(buffer, offset + len);
        len += decodedValue.len;
        const tmpDate = decodedValue.value.value;
        decodedValue = baAsn1.decodeApplicationTime(buffer, offset + len);
        len += decodedValue.len;
        const tmpTime = decodedValue.value.value;
        time = new Date(tmpDate.getYear(), tmpDate.getMonth(), tmpDate.getDate(), tmpTime.getHours(), tmpTime.getMinutes(), tmpTime.getSeconds(), tmpTime.getMilliseconds());
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        count = decodedValue.value;
        break;
      } default:
        return;
    }
    result = baAsn1.decodeTagNumber(buffer, offset + len);
    len += result.len;
  }
  return {
    len: len,
    objectId: objectId,
    property: property,
    requestType: requestType,
    position: position,
    time: time,
    count: count
  };
};

module.exports.encodeAcknowledge = (buffer, objectId, propertyId, arrayIndex, resultFlags, itemCount, applicationData, requestType, firstSequence) => {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baEnum.ASN1_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeContextBitstring(buffer, 3, resultFlags);
  baAsn1.encodeContextUnsigned(buffer, 4, itemCount);
  baAsn1.encodeOpeningTag(buffer, 5);
  if (itemCount !== 0) {
    applicationData.copy(buffer.buffer, buffer.offset, 0, applicationData.length);
    buffer.offset += applicationData.length;
  }
  baAsn1.encodeClosingTag(buffer, 5);
  if (itemCount !== 0 && requestType && requestType !== baEnum.ReadRangeType.BY_POSITION) {
    baAsn1.encodeContextUnsigned(buffer, 6, firstSequence);
  }
};

module.exports.decodeAcknowledge = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  const objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  const property = {index: baEnum.ASN1_ARRAY_ALL};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  property.id = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  if ((result.tagNumber === 2) && (len < apduLen)) {
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    property.index = decodedValue.value;
  }
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
  len += decodedValue.len;
  const resultFlag = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  const itemCount = decodedValue.value;
  if (!(baAsn1.decodeIsOpeningTag(buffer, offset + len))) return;
  len++;
  const rangeBuffer = buffer.slice(offset + len, apduLen - 3);
  return {
    objectId: objectId,
    property: property,
    resultFlag: resultFlag,
    itemCount: itemCount,
    rangeBuffer: rangeBuffer,
    len: len
  };
};
