'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {BACNetObjectID, EncodeBuffer} from '../types';

export const encode = (buffer: EncodeBuffer, lowLimit: number, highLimit: number, objectId: BACNetObjectID, objectName: string) => {
  if ((lowLimit >= 0) && (lowLimit <= baEnum.ASN1_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baEnum.ASN1_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
  if (objectName && objectName !== '') {
    baAsn1.encodeContextCharacterString(buffer, 3, objectName);
  } else {
    baAsn1.encodeContextObjectId(buffer, 2, objectId.type, objectId.instance);
  }
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any = {};
  let decodedValue: any;
  let result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === 0) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
      value.lowLimit = decodedValue.value;
    }
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 1) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
      value.highLimit = decodedValue.value;
    }
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 2) {
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  }
  if (result.tagNumber === 3) {
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    len += decodedValue.len;
    value.objectName = decodedValue.value;
  }
  value.len = len;
  return value;
};
