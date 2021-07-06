'use strict';

import * as baAsn1 from '../asn1';
import {EncodeBuffer} from '../types';

export const encode = (buffer: EncodeBuffer, state: number, password: string) => {
  baAsn1.encodeContextEnumerated(buffer, 0, state);
  if (password && password !== '') {
    baAsn1.encodeContextCharacterString(buffer, 1, password);
  }
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any = {};
  let result: any;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  let decodedValue: any = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  value.state = decodedValue.value;
  len += decodedValue.len;
  if (len < apduLen) {
    if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    value.password = decodedValue.value;
    len += decodedValue.len;
  }
  value.len = len;
  return value;
};
