'use strict';

import * as baAsn1 from '../asn1';
import {EncodeBuffer, BACNetObjectID} from '../types';

export const encode = (buffer: EncodeBuffer, objectId: BACNetObjectID) => {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  const result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  if (result.tagNumber !== 12) return;
  let len = 1;
  const value = baAsn1.decodeObjectId(buffer, offset + len);
  len += value.len;
  if (len !== apduLen) return;
  value.len = len;
  return value;
};
