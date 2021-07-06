'use strict';

import * as baAsn1 from '../asn1';
import * as baEnum from '../enum';
import {BACNetObjectID, EncodeBuffer} from '../types';

export const encode = (buffer: EncodeBuffer, isStream: boolean, objectId: BACNetObjectID, position: number, blocks: number[][]) => {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
  if (isStream) {
    baAsn1.encodeOpeningTag(buffer, 0);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationOctetString(buffer, blocks[0], 0, blocks[0].length);
    baAsn1.encodeClosingTag(buffer, 0);
  } else {
    baAsn1.encodeOpeningTag(buffer, 1);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationUnsigned(buffer, blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      baAsn1.encodeApplicationOctetString(buffer, blocks[i], 0, blocks[i].length);
    }
    baAsn1.encodeClosingTag(buffer, 1);
  }
};

export const decode = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  let result: any;
  let decodedValue: any;
  let isStream: boolean;
  let position: number;
  const blocks = [];
  let blockCount: number;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.OBJECTIDENTIFIER) return;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  const objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 0)) {
    isStream = true;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.SIGNED_INTEGER) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.OCTET_STRING) return;
    decodedValue = baAsn1.decodeOctetString(buffer, offset + len, apduLen, 0, result.value);
    len += decodedValue.len;
    blocks.push(decodedValue.value);
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
    len++;
  } else if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) {
    isStream = false;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.SIGNED_INTEGER) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.UNSIGNED_INTEGER) return;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    blockCount = decodedValue.value;
    for (let i = 0; i < blockCount; i++) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      if (result.tagNumber !== baEnum.ApplicationTags.OCTET_STRING) return;
      decodedValue = baAsn1.decodeOctetString(buffer, offset + len, apduLen, 0, result.value);
      len += decodedValue.len;
      blocks.push(decodedValue.value);
    }
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
    len++;
  } else {
    return;
  }
  return {
    len: len,
    isStream: isStream,
    objectId: objectId,
    position: position,
    blocks: blocks
  };
};

export const encodeAcknowledge = (buffer: EncodeBuffer, isStream: boolean, position: number) => {
  if (isStream) {
    baAsn1.encodeContextSigned(buffer, 0, position);
  } else {
    baAsn1.encodeContextSigned(buffer, 1, position);
  }
};

export const decodeAcknowledge = (buffer: Buffer, offset: number) => {
  let len = 0;
  let isStream = false;
  let position = 0;
  const result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === 0) {
    isStream = true;
  } else if (result.tagNumber === 1) {
    isStream = false;
  } else {
    return;
  }
  const decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  position = decodedValue.value;
  return {
    len: len,
    isStream: isStream,
    position: position
  };
};
