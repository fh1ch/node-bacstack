'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {EncodeBuffer} from '../types';

export const encode = (buffer: EncodeBuffer, time: Date) => {
  baAsn1.encodeApplicationDate(buffer, time);
  baAsn1.encodeApplicationTime(buffer, time);
};

export const decode = (buffer: Buffer, offset: number) => {
  let len = 0;
  let result: any;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.DATE) return;
  const date = baAsn1.decodeDate(buffer, offset + len);
  len += date.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.TIME) return;
  const time = baAsn1.decodeBacnetTime(buffer, offset + len);
  len += time.len;
  return {
    len: len,
    value: new Date(date.value.getFullYear(), date.value.getMonth(), date.value.getDate(), time.value.getHours(), time.value.getMinutes(), time.value.getSeconds(), time.value.getMilliseconds())
  };
};
