'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {EncodeBuffer, BACNetEvent} from '../types';

export const encode = (buffer: EncodeBuffer, events: BACNetEvent[], moreEvents: boolean) => {
  baAsn1.encodeOpeningTag(buffer, 0);
  events.forEach((event) => {
    baAsn1.encodeContextObjectId(buffer, 0, event.objectId.type, event.objectId.instance);
    baAsn1.encodeContextEnumerated(buffer, 1, event.eventState);
    baAsn1.encodeContextBitstring(buffer, 2, event.acknowledgedTransitions);
    baAsn1.encodeOpeningTag(buffer, 3);
    for (let i = 0; i < 3; i++) {
      baAsn1.encodeApplicationDate(buffer, event.eventTimeStamps[i]);
      baAsn1.encodeApplicationTime(buffer, event.eventTimeStamps[i]);
    }
    baAsn1.encodeClosingTag(buffer, 3);
    baAsn1.encodeContextEnumerated(buffer, 4, event.notifyType);
    baAsn1.encodeContextBitstring(buffer, 5, event.eventEnable);
    baAsn1.encodeOpeningTag(buffer, 6);
    for (let i = 0; i < 3; i++) {
      baAsn1.encodeApplicationUnsigned(buffer, event.eventPriorities[i]);
    }
    baAsn1.encodeClosingTag(buffer, 6);
  });
  baAsn1.encodeClosingTag(buffer, 0);
  baAsn1.encodeContextBoolean(buffer, 1, moreEvents);
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  let result: any;
  let decodedValue: any;
  len++;
  const alarms = [];
  while ((apduLen - 3 - len) > 0) {
    const value: any = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventState = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgedTransitions = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    value.eventTimeStamps = [];
    for (let i = 0; i < 3; i++) {
      if (result.tagNumber !== baEnum.ApplicationTags.NULL) {
        decodedValue = baAsn1.decodeApplicationDate(buffer, offset + len);
        len += decodedValue.len;
        const date = decodedValue.value;
        decodedValue = baAsn1.decodeApplicationTime(buffer, offset + len);
        len += decodedValue.len;
        const time = decodedValue.value;
        value.eventTimeStamps[i] = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
      } else {
        len += result.value;
      }
    }
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.notifyType = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventEnable = decodedValue.value;
    len++;
    value.eventPriorities = [];
    for (let i = 0; i < 3; i++) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      value.eventPriorities[i] = decodedValue.value;
    }
    len++;
    alarms.push(value);
  }
  const moreEvents = (buffer[apduLen - 1] === 1);
  return {
    len: len,
    alarms: alarms,
    moreEvents: moreEvents
  };
};
