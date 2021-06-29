'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, ackProcessId, eventObjectId, eventStateAcknowledged, ackSource, eventTimeStamp, ackTimeStamp) => {
  baAsn1.encodeContextUnsigned(buffer, 0, ackProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, eventObjectId.type, eventObjectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 2, eventStateAcknowledged);
  baAsn1.bacappEncodeContextTimestamp(buffer, 3, eventTimeStamp);
  baAsn1.encodeContextCharacterString(buffer, 4, ackSource);
  baAsn1.bacappEncodeContextTimestamp(buffer, 5, ackTimeStamp);
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  const value = {};
  let result;
  let decodedValue;
  let date;
  let time;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.acknowledgedProcessId = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.eventObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.eventStateAcknowledged = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === baEnum.TimeStamp.TIME) {
    decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.SEQUENCE_NUMBER) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.DATETIME) {
    date = baAsn1.decodeApplicationDate(buffer, offset + len);
    len += date.len;
    date = date.value.value;
    time = baAsn1.decodeApplicationTime(buffer, offset + len);
    len += time.len;
    time = time.value.value;
    value.eventTimeStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    len++;
  }
  len++;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
  value.acknowledgeSource = decodedValue.value;
  len += decodedValue.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === baEnum.TimeStamp.TIME) {
    decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgeTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.SEQUENCE_NUMBER) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgeTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.DATETIME) {
    date = baAsn1.decodeApplicationDate(buffer, offset + len);
    len += date.len;
    date = date.value.value;
    time = baAsn1.decodeApplicationTime(buffer, offset + len);
    len += time.len;
    time = time.value.value;
    value.acknowledgeTimeStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    len++;
  }
  len++;
  value.len = len;
  return value;
};
