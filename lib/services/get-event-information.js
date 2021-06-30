'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

module.exports.encode = (buffer, lastReceivedObjectId) => {
  baAsn1.encodeContextObjectId(buffer, 0, lastReceivedObjectId.type, lastReceivedObjectId.instance);
};

module.exports.decode = (buffer, offset) => {
  let len = 0;
  const value = {};
  const result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  const decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.lastReceivedObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.len = len;
  return value;
};

module.exports.encodeAcknowledge = (buffer, events, moreEvents) => {
  baAsn1.encodeOpeningTag(buffer, 0);
  events.forEach((eventData) => {
    baAsn1.encodeContextObjectId(buffer, 0, eventData.objectId.type, eventData.objectId.instance);
    baAsn1.encodeContextEnumerated(buffer, 1, eventData.eventState);
    baAsn1.encodeContextBitstring(buffer, 2, eventData.acknowledgedTransitions);
    baAsn1.encodeOpeningTag(buffer, 3);
    for (let i = 0; i < 3; i++) {
      baAsn1.bacappEncodeTimestamp(buffer, eventData.eventTimeStamps[i]);
    }
    baAsn1.encodeClosingTag(buffer, 3);
    baAsn1.encodeContextEnumerated(buffer, 4, eventData.notifyType);
    baAsn1.encodeContextBitstring(buffer, 5, eventData.eventEnable);
    baAsn1.encodeOpeningTag(buffer, 6);
    for (let i = 0; i < 3; i++) {
      baAsn1.encodeApplicationUnsigned(buffer, eventData.eventPriorities[i]);
    }
    baAsn1.encodeClosingTag(buffer, 6);
  });
  baAsn1.encodeClosingTag(buffer, 0);
  baAsn1.encodeContextBoolean(buffer, 1, moreEvents);
};

module.exports.decodeAcknowledge = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  const value = {};
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 0)) return;
  len++;
  value.events = [];
  while ((apduLen - len) > 3) {
    const event = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    event.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    event.eventState = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    event.acknowledgedTransitions = decodedValue.value;
    if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 3)) return;
    len++;
    event.eventTimeStamps = [];
    for (let i = 0; i < 3; i++) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      if (result.tagNumber === baEnum.TimeStamp.TIME) {
        decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len, result.value);
        len += decodedValue.len;
        event.eventTimeStamps[i] = {value: decodedValue.value, type: baEnum.TimeStamp.TIME};
      } else if (result.tagNumber === baEnum.TimeStamp.SEQUENCE_NUMBER) {
        decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        event.eventTimeStamps[i] = {value: decodedValue.value, type: baEnum.TimeStamp.SEQUENCE_NUMBER};
      } else if (result.tagNumber === baEnum.TimeStamp.DATETIME) {
        let date = baAsn1.decodeApplicationDate(buffer, offset + len);
        len += date.len;
        date = date.value.value;
        let time = baAsn1.decodeApplicationTime(buffer, offset + len);
        len += time.len;
        time = time.value.value;
        event.eventTimeStamps[i] = {value: new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds()), type: baEnum.TimeStamp.DATETIME};
        len++;
      }
    }
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) return;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    event.notifyType = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    event.eventEnable = decodedValue.value;
    if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 6)) return;
    len++;
    event.eventPriorities = [];
    for (let i = 0; i < 3; i++) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      event.eventPriorities[i] = decodedValue.value;
    }
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 6)) return;
    len++;
    value.events.push(event);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
  len++;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  value.moreEvents = buffer[offset + len] > 0;
  len++;
  value.len = len;
  return value;
};
