'use strict';

const baAsn1 = require('../asn1');

module.exports.encode = (buffer, alarms) => {
  alarms.forEach((alarm) => {
    baAsn1.encodeContextObjectId(buffer, 12, alarm.objectId.type, alarm.objectId.instance);
    baAsn1.encodeContextEnumerated(buffer, 9, alarm.alarmState);
    baAsn1.encodeContextBitstring(buffer, 8, alarm.acknowledgedTransitions);
  });
};

module.exports.decode = (buffer, offset, apduLen) => {
  let len = 0;
  let result;
  let decodedValue;
  const alarms = [];
  while ((apduLen - 3 - len) > 0) {
    const value = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.alarmState = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgedTransitions = decodedValue.value;
    alarms.push(value);
  }
  return {
    len: len,
    alarms: alarms
  };
};
