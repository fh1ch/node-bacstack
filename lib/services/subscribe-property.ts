'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {EncodeBuffer, BACNetObjectID, BACNetPropertyID} from '../types';

export const encode = (buffer: EncodeBuffer, subscriberProcessId: number, monitoredObjectId: BACNetObjectID, cancellationRequest: boolean, issueConfirmedNotifications: boolean, lifetime: number, monitoredProperty: BACNetPropertyID, covIncrementPresent: boolean, covIncrement: number) => {
  baAsn1.encodeContextUnsigned(buffer, 0, subscriberProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, monitoredObjectId.type, monitoredObjectId.instance);
  if (!cancellationRequest) {
    baAsn1.encodeContextBoolean(buffer, 2, issueConfirmedNotifications);
    baAsn1.encodeContextUnsigned(buffer, 3, lifetime);
  }
  baAsn1.encodeOpeningTag(buffer, 4);
  baAsn1.encodeContextEnumerated(buffer, 0, monitoredProperty.id);
  if (monitoredProperty.index !== baEnum.ASN1_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 1, monitoredProperty.index);
  }
  baAsn1.encodeClosingTag(buffer, 4);
  if (covIncrementPresent) {
    baAsn1.encodeContextReal(buffer, 5, covIncrement);
  }
};

export const decode = (buffer: Buffer, offset: number) => {
  let len = 0;
  const value: any = {};
  let result: any;
  let decodedValue: any;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.subscriberProcessId = decodedValue.value;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.monitoredObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.cancellationRequest = true;
  value.issueConfirmedNotifications = false;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 2)) {
    value.cancellationRequest = false;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    value.issueConfirmedNotifications = buffer[offset + len] > 0;
    len++;
  }
  value.lifetime = 0;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 3)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.lifetime = decodedValue.value;
  }
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 4)) return;
  len++;
  value.monitoredProperty = {};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.monitoredProperty.id = decodedValue.value;
  value.monitoredProperty.index = baEnum.ASN1_ARRAY_ALL;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 1)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.monitoredProperty.index = decodedValue.value;
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 4)) return;
  len++;
  value.covIncrement = 0;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 5)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeReal(buffer, offset + len);
    len += decodedValue.len;
    value.covIncrement = decodedValue.value;
  }
  value.len = len;
  return value;
};
