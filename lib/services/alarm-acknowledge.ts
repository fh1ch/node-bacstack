'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {EncodeBuffer, BACNetObjectID} from '../types';

export const encode = (buffer: EncodeBuffer, ackProcessId: number, eventObjectId: BACNetObjectID, eventStateAcknowledged: number, ackSource: string, eventTimeStamp: any, ackTimeStamp: any) => {
  baAsn1.encodeContextUnsigned(buffer, 0, ackProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, eventObjectId.type, eventObjectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 2, eventStateAcknowledged);
  baAsn1.bacappEncodeContextTimestamp(buffer, 3, eventTimeStamp);
  baAsn1.encodeContextCharacterString(buffer, 4, ackSource);
  baAsn1.bacappEncodeContextTimestamp(buffer, 5, ackTimeStamp);
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any = {};
  let result: any;
  let decodedValue: any;
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
    decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len);
    len += decodedValue.len;
    value.eventTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.SEQUENCE_NUMBER) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.DATETIME) {
    const dateRaw = baAsn1.decodeApplicationDate(buffer, offset + len);
    len += dateRaw.len;
    const date = dateRaw.value;
    const timeRaw = baAsn1.decodeApplicationTime(buffer, offset + len);
    len += timeRaw.len;
    const time = timeRaw.value;
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
    decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len);
    len += decodedValue.len;
    value.acknowledgeTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.SEQUENCE_NUMBER) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgeTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimeStamp.DATETIME) {
    const dateRaw = baAsn1.decodeApplicationDate(buffer, offset + len);
    len += dateRaw.len;
    const date = dateRaw.value;
    const timeRaw = baAsn1.decodeApplicationTime(buffer, offset + len);
    len += timeRaw.len;
    const time = timeRaw.value;
    value.acknowledgeTimeStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    len++;
  }
  len++;
  value.len = len;
  return value;
};
