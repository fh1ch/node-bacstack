'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {EncodeBuffer} from '../types';

export const encode = (buffer: EncodeBuffer, lowLimit: number, highLimit: number) => {
  if ((lowLimit >= 0) && (lowLimit <= baEnum.ASN1_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baEnum.ASN1_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any = {};
  if (apduLen <= 0) return {};
  let result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  if (apduLen <= len) return;
  let decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
    value.lowLimit = decodedValue.value;
  }
  if (apduLen <= len) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  if (apduLen <= len) return;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baEnum.ASN1_MAX_INSTANCE) {
    value.highLimit = decodedValue.value;
  }
  value.len = len;
  return value;
};
