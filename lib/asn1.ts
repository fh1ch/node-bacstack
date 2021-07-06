'use strict';

import * as iconv from 'iconv-lite';

import * as baEnum from './enum';
import {
  EncodeBuffer,
  BACNetCovSubscription,
  BACNetReadAccessSpecification,
  BACNetBitString,
  BACNetAppData,
  BACNetPropertyState,
  BACNetDevObjRef,
  BACNetObjectID,
  BACNetPropertyID
} from './types';

const getBuffer = () => ({
  buffer: Buffer.alloc(1472),
  offset: 0
});

const getSignedLength = (value: number) => {
  if ((value >= -128) && (value < 128)) return 1;
  else if ((value >= -32768) && (value < 32768)) return 2;
  else if ((value > -8388608) && (value < 8388608)) return 3;
  else return 4;
};

const getUnsignedLength = (value: number) => {
  if (value < 0x100) return 1;
  else if (value < 0x10000) return 2;
  else if (value < 0x1000000) return 3;
  else return 4;
};

const getEncodingType = (encoding: number, decodingBuffer?: Buffer, decodingOffset?: number) => {
  switch (encoding) {
    case baEnum.CharacterStringEncoding.UTF_8:
      return 'utf8';
    case baEnum.CharacterStringEncoding.UCS_2:
      if (decodingBuffer && decodingBuffer[decodingOffset] === 0xFF && decodingBuffer[decodingOffset + 1] === 0xFE) {
        return 'ucs2';
      }
      return 'UTF-16BE'; // Default to big-endian
    case baEnum.CharacterStringEncoding.ISO_8859_1:
      return 'latin1';
    case baEnum.CharacterStringEncoding.UCS_4:
      return 'utf8'; // HACK: There is currently no support for UTF-32
    case baEnum.CharacterStringEncoding.MICROSOFT_DBCS:
      return 'cp850';
    case baEnum.CharacterStringEncoding.JIS_X_0208:
      return 'Shift_JIS';
    default:
      return 'utf8';
  }
};

const encodeUnsigned = (buffer: EncodeBuffer, value: number, length: number) => {
  buffer.buffer.writeUIntBE(value, buffer.offset, length);
  buffer.offset += length;
};

const encodeBacnetUnsigned = (buffer: EncodeBuffer, value: number) => {
  encodeUnsigned(buffer, value, getUnsignedLength(value));
};

const encodeSigned = (buffer: EncodeBuffer, value: number, length: number) => {
  buffer.buffer.writeIntBE(value, buffer.offset, length);
  buffer.offset += length;
};

const encodeBacnetSigned = (buffer: EncodeBuffer, value: number) => {
  encodeSigned(buffer, value, getSignedLength(value));
};

const encodeBacnetReal = (buffer: EncodeBuffer, value: number) => {
  buffer.buffer.writeFloatBE(value, buffer.offset);
  buffer.offset += 4;
};

const encodeBacnetDouble = (buffer: EncodeBuffer, value: number) => {
  buffer.buffer.writeDoubleBE(value, buffer.offset);
  buffer.offset += 8;
};

export const decodeUnsigned = (buffer: Buffer, offset: number, length: number) => ({
  len: length,
  value: buffer.readUIntBE(offset, length)
});

export const decodeEnumerated = (buffer: Buffer, offset: number, lenValue: number) => {
  return decodeUnsigned(buffer, offset, lenValue);
};

export const encodeBacnetObjectId = (buffer: EncodeBuffer, objectType: number, instance: number) => {
  const value = (((objectType & baEnum.ASN1_MAX_OBJECT) << baEnum.ASN1_INSTANCE_BITS) | (instance & baEnum.ASN1_MAX_INSTANCE)) >>> 0;
  encodeUnsigned(buffer, value, 4);
};

export const encodeTag = (buffer: EncodeBuffer, tagNumber: number, contextSpecific: boolean, lenValueType: number) => {
  let len = 1;
  const tmp = new Array(3);
  tmp[0] = 0;
  if (contextSpecific) {
    tmp[0] |= 0x8;
  }
  if (tagNumber <= 14) {
    tmp[0] |= (tagNumber << 4);
  } else {
    tmp[0] |= 0xF0;
    tmp[1] = tagNumber;
    len++;
  }
  if (lenValueType <= 4) {
    tmp[0] |= lenValueType;
    Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
    buffer.offset += len;
  } else {
    tmp[0] |= 5;
    if (lenValueType <= 253) {
      tmp[len++] = lenValueType;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
    } else if (lenValueType <= 65535) {
      tmp[len++] = 254;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
      encodeUnsigned(buffer, lenValueType, 2);
    } else {
      tmp[len++] = 255;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
      encodeUnsigned(buffer, lenValueType, 4);
    }
  }
};

const encodeBacnetEnumerated = (buffer: EncodeBuffer, value: number) => {
  encodeBacnetUnsigned(buffer, value);
};

const isExtendedTagNumber = (x: number) => {
  return (x & 0xF0) === 0xF0;
};

const isExtendedValue = (x: number) => {
  return (x & 0x07) === 5;
};

const isContextSpecific = (x: number) => {
  return (x & 0x8) === 0x8;
};

const isOpeningTag = (x: number) => {
  return (x & 0x07) === 6;
};

const isClosingTag = (x: number) => {
  return (x & 0x07) === 7;
};

export const encodeContextReal = (buffer: EncodeBuffer, tagNumber: number, value: number) => {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetReal(buffer, value);
};

export const encodeContextUnsigned = (buffer: EncodeBuffer, tagNumber: number, value: number) => {
  encodeTag(buffer, tagNumber, true, getUnsignedLength(value));
  encodeBacnetUnsigned(buffer, value);
};

export const encodeContextEnumerated = (buffer: EncodeBuffer, tagNumber: number, value: number) => {
  encodeContextUnsigned(buffer, tagNumber, value);
};

const encodeOctetString = (buffer: EncodeBuffer, octetString: number[], octetOffset: number, octetCount: number) => {
  if (octetString) {
    for (let i = octetOffset; i < (octetOffset + octetCount); i++) {
      buffer.buffer[buffer.offset++] = octetString[i];
    }
  }
};

export const encodeApplicationOctetString = (buffer: EncodeBuffer, octetString: number[], octetOffset: number, octetCount: number) => {
  encodeTag(buffer, baEnum.ApplicationTags.OCTET_STRING, false, octetCount);
  encodeOctetString(buffer, octetString, octetOffset, octetCount);
};

const encodeApplicationNull = (buffer: EncodeBuffer) => {
  buffer.buffer[buffer.offset++] = baEnum.ApplicationTags.NULL;
};

export const encodeApplicationBoolean = (buffer: EncodeBuffer, booleanValue: boolean) => {
  encodeTag(buffer, baEnum.ApplicationTags.BOOLEAN, false, booleanValue ? 1 : 0);
};

const encodeApplicationReal = (buffer: EncodeBuffer, value: number) => {
  encodeTag(buffer, baEnum.ApplicationTags.REAL, false, 4);
  encodeBacnetReal(buffer, value);
};

const encodeApplicationDouble = (buffer: EncodeBuffer, value: number) => {
  encodeTag(buffer, baEnum.ApplicationTags.DOUBLE, false, 8);
  encodeBacnetDouble(buffer, value);
};

const bitstringBytesUsed = (bitString: BACNetBitString) => {
  let len = 0;
  if (bitString.bitsUsed > 0) {
    const lastBit = bitString.bitsUsed - 1;
    const usedBytes = (lastBit / 8) + 1;
    len = Math.floor(usedBytes);
  }
  return len;
};

export const encodeApplicationObjectId = (buffer: EncodeBuffer, objectType: number, instance: number) => {
  const tmp = getBuffer();
  encodeBacnetObjectId(tmp, objectType, instance);
  encodeTag(buffer, baEnum.ApplicationTags.OBJECTIDENTIFIER, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

export const encodeApplicationUnsigned = (buffer: EncodeBuffer, value: number) => {
  const tmp = getBuffer();
  encodeBacnetUnsigned(tmp, value);
  encodeTag(buffer, baEnum.ApplicationTags.UNSIGNED_INTEGER, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

export const encodeApplicationEnumerated = (buffer: EncodeBuffer, value: number) => {
  const tmp = getBuffer();
  encodeBacnetEnumerated(tmp, value);
  encodeTag(buffer, baEnum.ApplicationTags.ENUMERATED, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

export const encodeApplicationSigned = (buffer: EncodeBuffer, value: number) => {
  const tmp = getBuffer();
  encodeBacnetSigned(tmp, value);
  encodeTag(buffer, baEnum.ApplicationTags.SIGNED_INTEGER, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

const byteReverseBits = (inByte: number) => {
  let outByte = 0;
  if ((inByte & 1) > 0) {
    outByte |= 0x80;
  }
  if ((inByte & 2) > 0) {
    outByte |= 0x40;
  }
  if ((inByte & 4) > 0) {
    outByte |= 0x20;
  }
  if ((inByte & 8) > 0) {
    outByte |= 0x10;
  }
  if ((inByte & 16) > 0) {
    outByte |= 0x8;
  }
  if ((inByte & 32) > 0) {
    outByte |= 0x4;
  }
  if ((inByte & 64) > 0) {
    outByte |= 0x2;
  }
  if ((inByte & 128) > 0) {
    outByte |= 1;
  }
  return outByte;
};

const bitstringOctet = (bitString: BACNetBitString, octetIndex: number) => {
  let octet = 0;
  if (bitString.value) {
    if (octetIndex < baEnum.ASN1_MAX_BITSTRING_BYTES) {
      octet = bitString.value[octetIndex];
    }
  }
  return octet;
};

const encodeBitstring = (buffer: EncodeBuffer, bitString: BACNetBitString) => {
  if (bitString.bitsUsed === 0) {
    buffer.buffer[buffer.offset++] = 0;
  } else {
    const usedBytes = bitstringBytesUsed(bitString);
    const remainingUsedBits = bitString.bitsUsed - ((usedBytes - 1) * 8);
    buffer.buffer[buffer.offset++] = 8 - remainingUsedBits;
    for (let i = 0; i < usedBytes; i++) {
      buffer.buffer[buffer.offset++] = byteReverseBits(bitstringOctet(bitString, i));
    }
  }
};

export const encodeApplicationBitstring = (buffer: EncodeBuffer, bitString: BACNetBitString) => {
  let bitStringEncodedLength = 1;
  bitStringEncodedLength += bitstringBytesUsed(bitString);
  encodeTag(buffer, baEnum.ApplicationTags.BIT_STRING, false, bitStringEncodedLength);
  encodeBitstring(buffer, bitString);
};

const encodeBacnetDate = (buffer: EncodeBuffer, value: Date) => {
  if (value === new Date(1, 1, 1)) {
    buffer.buffer[buffer.offset++] = 0xFF;
    buffer.buffer[buffer.offset++] = 0xFF;
    buffer.buffer[buffer.offset++] = 0xFF;
    buffer.buffer[buffer.offset++] = 0xFF;
    return;
  }
  if (value.getFullYear() >= 1900) {
    buffer.buffer[buffer.offset++] = (value.getFullYear() - 1900);
  } else if (value.getFullYear() < 0x100) {
    buffer.buffer[buffer.offset++] = value.getFullYear();
  } else {
    return;
  }
  buffer.buffer[buffer.offset++] = value.getMonth();
  buffer.buffer[buffer.offset++] = value.getDate();
  buffer.buffer[buffer.offset++] = (value.getDay() === 0) ? 7 : value.getDay();
};

export const encodeApplicationDate = (buffer: EncodeBuffer, value: Date) => {
  encodeTag(buffer, baEnum.ApplicationTags.DATE, false, 4);
  encodeBacnetDate(buffer, value);
};

const encodeBacnetTime = (buffer: EncodeBuffer, value: Date) => {
  buffer.buffer[buffer.offset++] = value.getHours();
  buffer.buffer[buffer.offset++] = value.getMinutes();
  buffer.buffer[buffer.offset++] = value.getSeconds();
  buffer.buffer[buffer.offset++] = value.getMilliseconds() / 10;
};

export const encodeApplicationTime = (buffer: EncodeBuffer, value: Date) => {
  encodeTag(buffer, baEnum.ApplicationTags.TIME, false, 4);
  encodeBacnetTime(buffer, value);
};

const bacappEncodeDatetime = (buffer: EncodeBuffer, value: Date) => {
  if (value !== new Date(1, 1, 1)) {
    encodeApplicationDate(buffer, value);
    encodeApplicationTime(buffer, value);
  }
};

export const encodeContextObjectId = (buffer: EncodeBuffer, tagNumber: number, objectType: number, instance: number) => {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetObjectId(buffer, objectType, instance);
};

export const encodeOpeningTag = (buffer: EncodeBuffer, tagNumber: number) => {
  let len = 1;
  const tmp = new Array(2);
  tmp[0] = 0x8;
  if (tagNumber <= 14) {
    tmp[0] |= (tagNumber << 4);
  } else {
    tmp[0] |= 0xF0;
    tmp[1] = tagNumber;
    len++;
  }
  tmp[0] |= 6;
  Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
  buffer.offset += len;
};

export const encodeClosingTag = (buffer: EncodeBuffer, tagNumber: number) => {
  let len = 1;
  const tmp = new Array(2);
  tmp[0] = 0x8;
  if (tagNumber <= 14) {
    tmp[0] |= (tagNumber << 4);
  } else {
    tmp[0] |= 0xF0;
    tmp[1] = tagNumber;
    len++;
  }
  tmp[0] |= 7;
  Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
  buffer.offset += len;
};

export const encodeReadAccessSpecification = (buffer: EncodeBuffer, value: BACNetReadAccessSpecification) => {
  encodeContextObjectId(buffer, 0, value.objectId.type, value.objectId.instance);
  encodeOpeningTag(buffer, 1);
  value.properties.forEach((p) => {
    encodeContextEnumerated(buffer, 0, p.id);
    if (p.index && p.index !== baEnum.ASN1_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 1, p.index);
    }
  });
  encodeClosingTag(buffer, 1);
};

export const encodeContextBoolean = (buffer: EncodeBuffer, tagNumber: number, booleanValue: boolean) => {
  encodeTag(buffer, tagNumber, true, 1);
  buffer.buffer.writeUInt8(booleanValue ? 1 : 0, buffer.offset);
  buffer.offset += 1;
};

const encodeCovSubscription = (buffer: EncodeBuffer, value: BACNetCovSubscription) => {
  encodeOpeningTag(buffer, 0);
  encodeOpeningTag(buffer, 0);
  encodeOpeningTag(buffer, 1);
  encodeApplicationUnsigned(buffer, value.recipient.network);
  if (value.recipient.network === 0xFFFF) {
    encodeApplicationOctetString(buffer, [0], 0, 0);
  } else {
    encodeApplicationOctetString(buffer, value.recipient.address, 0, value.recipient.address.length);
  }
  encodeClosingTag(buffer, 1);
  encodeClosingTag(buffer, 0);
  encodeContextUnsigned(buffer, 1, value.subscriptionProcessId);
  encodeClosingTag(buffer, 0);
  encodeOpeningTag(buffer, 1);
  encodeContextObjectId(buffer, 0, value.monitoredObjectId.type, value.monitoredObjectId.instance);
  encodeContextEnumerated(buffer, 1, value.monitoredProperty.id);
  if (value.monitoredProperty.index !== baEnum.ASN1_ARRAY_ALL) {
    encodeContextUnsigned(buffer, 2, value.monitoredProperty.index);
  }
  encodeClosingTag(buffer, 1);
  encodeContextBoolean(buffer, 2, value.issueConfirmedNotifications);
  encodeContextUnsigned(buffer, 3, value.timeRemaining);
  if (value.covIncrement > 0) {
    encodeContextReal(buffer, 4, value.covIncrement);
  }
};

export const bacappEncodeApplicationData = (buffer: EncodeBuffer, value: BACNetAppData) => {
  if (value.value === null) {
    value.type = baEnum.ApplicationTags.NULL;
  }
  switch (value.type) {
    case baEnum.ApplicationTags.NULL:
      encodeApplicationNull(buffer);
      break;
    case baEnum.ApplicationTags.BOOLEAN:
      encodeApplicationBoolean(buffer, value.value);
      break;
    case baEnum.ApplicationTags.UNSIGNED_INTEGER:
      encodeApplicationUnsigned(buffer, value.value);
      break;
    case baEnum.ApplicationTags.SIGNED_INTEGER:
      encodeApplicationSigned(buffer, value.value);
      break;
    case baEnum.ApplicationTags.REAL:
      encodeApplicationReal(buffer, value.value);
      break;
    case baEnum.ApplicationTags.DOUBLE:
      encodeApplicationDouble(buffer, value.value);
      break;
    case baEnum.ApplicationTags.OCTET_STRING:
      encodeApplicationOctetString(buffer, value.value, 0, value.value.length);
      break;
    case baEnum.ApplicationTags.CHARACTER_STRING:
      encodeApplicationCharacterString(buffer, value.value, value.encoding);
      break;
    case baEnum.ApplicationTags.BIT_STRING:
      encodeApplicationBitstring(buffer, value.value);
      break;
    case baEnum.ApplicationTags.ENUMERATED:
      encodeApplicationEnumerated(buffer, value.value);
      break;
    case baEnum.ApplicationTags.DATE:
      encodeApplicationDate(buffer, value.value);
      break;
    case baEnum.ApplicationTags.TIME:
      encodeApplicationTime(buffer, value.value);
      break;
    case baEnum.ApplicationTags.TIMESTAMP:
      bacappEncodeTimestamp(buffer, value.value);
      break;
    case baEnum.ApplicationTags.DATETIME:
      bacappEncodeDatetime(buffer, value.value);
      break;
    case baEnum.ApplicationTags.OBJECTIDENTIFIER:
      encodeApplicationObjectId(buffer, value.value.type, value.value.instance);
      break;
    case baEnum.ApplicationTags.COV_SUBSCRIPTION:
      encodeCovSubscription(buffer, value.value);
      break;
    case baEnum.ApplicationTags.READ_ACCESS_RESULT:
      encodeReadAccessResult(buffer, value.value);
      break;
    case baEnum.ApplicationTags.READ_ACCESS_SPECIFICATION:
      encodeReadAccessSpecification(buffer, value.value);
      break;
    default:
      throw new Error('Unknown type');
  }
};

const bacappEncodeDeviceObjPropertyRef = (buffer: EncodeBuffer, value: BACNetDevObjRef) => {
  encodeContextObjectId(buffer, 0, value.objectId.type, value.objectId.instance);
  encodeContextEnumerated(buffer, 1, value.id);
  if (value.arrayIndex !== baEnum.ASN1_ARRAY_ALL) {
    encodeContextUnsigned(buffer, 2, value.arrayIndex);
  }
  if (value.deviceIndentifier.type === baEnum.ObjectType.DEVICE) {
    encodeContextObjectId(buffer, 3, value.deviceIndentifier.type, value.deviceIndentifier.instance);
  }
};

export const bacappEncodeContextDeviceObjPropertyRef = (buffer: EncodeBuffer, tagNumber: number, value: BACNetDevObjRef) => {
  encodeOpeningTag(buffer, tagNumber);
  bacappEncodeDeviceObjPropertyRef(buffer, value);
  encodeClosingTag(buffer, tagNumber);
};

export const bacappEncodePropertyState = (buffer: EncodeBuffer, value: BACNetPropertyState) => {
  switch (value.type) {
    case baEnum.PropertyStates.BOOLEAN_VALUE:
      encodeContextBoolean(buffer, 0, value.state === 1 ? true : false);
      break;
    case baEnum.PropertyStates.BINARY_VALUE:
      encodeContextEnumerated(buffer, 1, value.state);
      break;
    case baEnum.PropertyStates.EVENT_TYPE:
      encodeContextEnumerated(buffer, 2, value.state);
      break;
    case baEnum.PropertyStates.POLARITY:
      encodeContextEnumerated(buffer, 3, value.state);
      break;
    case baEnum.PropertyStates.PROGRAM_CHANGE:
      encodeContextEnumerated(buffer, 4, value.state);
      break;
    case baEnum.PropertyStates.PROGRAM_STATE:
      encodeContextEnumerated(buffer, 5, value.state);
      break;
    case baEnum.PropertyStates.REASON_FOR_HALT:
      encodeContextEnumerated(buffer, 6, value.state);
      break;
    case baEnum.PropertyStates.RELIABILITY:
      encodeContextEnumerated(buffer, 7, value.state);
      break;
    case baEnum.PropertyStates.STATE:
      encodeContextEnumerated(buffer, 8, value.state);
      break;
    case baEnum.PropertyStates.SYSTEM_STATUS:
      encodeContextEnumerated(buffer, 9, value.state);
      break;
    case baEnum.PropertyStates.UNITS:
      encodeContextEnumerated(buffer, 10, value.state);
      break;
    case baEnum.PropertyStates.UNSIGNED_VALUE:
      encodeContextUnsigned(buffer, 11, value.state);
      break;
    case baEnum.PropertyStates.LIFE_SAFETY_MODE:
      encodeContextEnumerated(buffer, 12, value.state);
      break;
    case baEnum.PropertyStates.LIFE_SAFETY_STATE:
      encodeContextEnumerated(buffer, 13, value.state);
      break;
    default:
      break;
  }
};

export const encodeContextBitstring = (buffer: EncodeBuffer, tagNumber: number, bitString: BACNetBitString) => {
  const bitStringEncodedLength = bitstringBytesUsed(bitString) + 1;
  encodeTag(buffer, tagNumber, true, bitStringEncodedLength);
  encodeBitstring(buffer, bitString);
};

export const encodeContextSigned = (buffer: EncodeBuffer, tagNumber: number, value: number) => {
  encodeTag(buffer, tagNumber, true, getSignedLength(value));
  encodeBacnetSigned(buffer, value);
};

const encodeContextTime = (buffer: EncodeBuffer, tagNumber: number, value: Date) => {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetTime(buffer, value);
};

const bacappEncodeContextDatetime = (buffer: EncodeBuffer, tagNumber: number, value: Date) => {
  if (value !== new Date(1, 1, 1)) {
    encodeOpeningTag(buffer, tagNumber);
    bacappEncodeDatetime(buffer, value);
    encodeClosingTag(buffer, tagNumber);
  }
};

export const decodeTagNumber = (buffer: Buffer, offset: number) => {
  let len = 1;
  let tagNumber: number;
  if (isExtendedTagNumber(buffer[offset])) {
    tagNumber = buffer[offset + 1];
    len++;
  } else {
    tagNumber = buffer[offset] >> 4;
  }
  return {
    len: len,
    tagNumber: tagNumber
  };
};

export const decodeIsContextTag = (buffer: Buffer, offset: number, tagNumber: number) => {
  const result = decodeTagNumber(buffer, offset);
  return isContextSpecific(buffer[offset]) && result.tagNumber === tagNumber;
};

export const decodeIsOpeningTagNumber = (buffer: Buffer, offset: number, tagNumber: number) => {
  const result = decodeTagNumber(buffer, offset);
  return isOpeningTag(buffer[offset]) && result.tagNumber === tagNumber;
};

export const decodeIsClosingTagNumber = (buffer: Buffer, offset: number, tagNumber: number) => {
  const result = decodeTagNumber(buffer, offset);
  return isClosingTag(buffer[offset]) && result.tagNumber === tagNumber;
};

export const decodeIsClosingTag = (buffer: Buffer, offset: number) => {
  return (buffer[offset] & 0x07) === 7;
};

export const decodeIsOpeningTag = (buffer: Buffer, offset: number) => {
  return (buffer[offset] & 0x07) === 6;
};

export const decodeObjectId = (buffer: Buffer, offset: number) => {
  const result = decodeUnsigned(buffer, offset, 4);
  const objectType = (result.value >> baEnum.ASN1_INSTANCE_BITS) & baEnum.ASN1_MAX_OBJECT;
  const instance = result.value & baEnum.ASN1_MAX_INSTANCE;
  return {
    len: result.len,
    objectType: objectType,
    instance: instance
  };
};

const decodeObjectIdSafe = (buffer: Buffer, offset: number, lenValue: number) => {
  if (lenValue !== 4) {
    return {
      len: 0,
      objectType: 0,
      instance: 0
    };
  } else {
    return decodeObjectId(buffer, offset);
  }
};

export const decodeTagNumberAndValue = (buffer: Buffer, offset: number) => {
  let value: number;
  let tag = decodeTagNumber(buffer, offset);
  let len = tag.len;
  if (isExtendedValue(buffer[offset])) {
    if (buffer[offset + len] === 255) {
      len++;
      const result = decodeUnsigned(buffer, offset + len, 4);
      len += result.len;
      value = result.value;
    } else if (buffer[offset + len] === 254) {
      len++;
      const result = decodeUnsigned(buffer, offset + len, 2);
      len += result.len;
      value = result.value;
    } else {
      value = buffer[offset + len];
      len++;
    }
  } else if (isOpeningTag(buffer[offset])) {
    value = 0;
  } else if (isClosingTag(buffer[offset])) {
    value = 0;
  } else {
    value = buffer[offset] & 0x07;
  }
  return {
    len: len,
    tagNumber: tag.tagNumber,
    value: value
  };
};

export const bacappDecodeApplicationData = (buffer: Buffer, offset: number, maxOffset: number, objectType: number, propertyId: number): any => {
  if (!isContextSpecific(buffer[offset])) {
    const tag = decodeTagNumberAndValue(buffer, offset);
    if (tag) {
      const len = tag.len;
      const result = bacappDecodeData(buffer, offset + len, maxOffset, tag.tagNumber, tag.value);
      if (!result) return;
      const resObj: any = {
        len: len + result.len,
        type: result.type,
        value: result.value
      };
      // HACK: Drop string specific handling ASAP
      if (result.encoding !== undefined) resObj.encoding = result.encoding;
      return resObj;
    }
  } else {
    return bacappDecodeContextApplicationData(buffer, offset, maxOffset, objectType, propertyId);
  }
};

interface BACNetReadAccessResult {
  objectId: BACNetObjectID;
  values: {
    property: BACNetPropertyID;
    value: any[];
  }[];
};

export const encodeReadAccessResult = (buffer: EncodeBuffer, value: BACNetReadAccessResult) => {
  encodeContextObjectId(buffer, 0, value.objectId.type, value.objectId.instance);
  encodeOpeningTag(buffer, 1);
  value.values.forEach((item) => {
    encodeContextEnumerated(buffer, 2, item.property.id);
    if (item.property.index !== baEnum.ASN1_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 3, item.property.index);
    }
    if (item.value && item.value[0] && item.value[0].value && item.value[0].value.type === 'BacnetError') {
      encodeOpeningTag(buffer, 5);
      encodeApplicationEnumerated(buffer, item.value[0].value.errorClass);
      encodeApplicationEnumerated(buffer, item.value[0].value.errorCode);
      encodeClosingTag(buffer, 5);
    } else {
      encodeOpeningTag(buffer, 4);
      item.value.forEach((subItem) => bacappEncodeApplicationData(buffer, subItem));
      encodeClosingTag(buffer, 4);
    }
  });
  encodeClosingTag(buffer, 1);
};

export const decodeReadAccessResult = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any = {};
  if (!decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  let result: any = decodeObjectId(buffer, offset + len);
  value.objectId = {
    type: result.objectType,
    instance: result.instance
  };
  len += result.len;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;

  const values = [];
  while ((apduLen - len) > 0) {
    const newEntry: any = {};
    if (decodeIsClosingTagNumber(buffer, offset + len, 1)) {
      len++;
      break;
    }
    result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 2) return;
    result = decodeEnumerated(buffer, offset + len, result.value);
    newEntry.id = result.value;
    len += result.len;

    result = decodeTagNumberAndValue(buffer, offset + len);
    if (result.tagNumber === 3) {
      len += result.len;
      result = decodeUnsigned(buffer, offset + len, result.value);
      newEntry.index = result.value;
      len += result.len;
    } else {
      newEntry.index = baEnum.ASN1_ARRAY_ALL;
    }
    result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 4) {
      const localValues = [];
      while ((len + offset) <= buffer.length && !decodeIsClosingTagNumber(buffer, offset + len, 4)) {
        const localResult = bacappDecodeApplicationData(buffer, offset + len, apduLen + offset - 1, value.objectId.type, newEntry.id);
        if (!localResult) return;
        len += localResult.len;
        const resObj: {value: any, type: number, encoding?: number} = {
          value: localResult.value,
          type: localResult.type
        };
        // HACK: Drop string specific handling ASAP
        if (localResult.encoding !== undefined) resObj.encoding = localResult.encoding;
        localValues.push(resObj);
      }
      if (!decodeIsClosingTagNumber(buffer, offset + len, 4)) return;
      if ((localValues.length === 2) && (localValues[0].type === baEnum.ApplicationTags.DATE) && (localValues[1].type === baEnum.ApplicationTags.TIME)) {
        const date = localValues[0].value;
        const time = localValues[1].value;
        const bdatetime = new Date(date.year, date.month, date.day, time.hour, time.minute, time.second, time.millisecond);
        newEntry.value = [{type: baEnum.ApplicationTags.DATETIME, value: bdatetime}];
      } else {
        newEntry.value = localValues;
      }
      len++;
    } else if (result.tagNumber === 5) {
      const err: any = {};
      result = decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      result = decodeEnumerated(buffer, offset + len, result.value);
      len += result.len;
      err.errorClass = result.value;
      result = decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      result = decodeEnumerated(buffer, offset + len, result.value);
      len += result.len;
      err.errorCode = result.value;
      if (!decodeIsClosingTagNumber(buffer, offset + len, 5)) return;
      len++;
      newEntry.value = [{
        type: baEnum.ApplicationTags.ERROR,
        value: err
      }];
    }
    values.push(newEntry);
  }
  value.values = values;
  return {
    len: len,
    value: value
  };
};

export const decodeSigned = (buffer: Buffer, offset: number, length: number) => ({
  len: length,
  value: buffer.readIntBE(offset, length)
});

export const decodeReal = (buffer: Buffer, offset: number) => ({
  len: 4,
  value: buffer.readFloatBE(offset)
});

const decodeRealSafe = (buffer: Buffer, offset: number, lenValue: number) => {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: 0
    };
  } else {
    return decodeReal(buffer, offset);
  }
};

const decodeDouble = (buffer: Buffer, offset: number) => ({
  len: 8,
  value: buffer.readDoubleBE(offset)
});

const decodeDoubleSafe = (buffer: Buffer, offset: number, lenValue: number) => {
  if (lenValue !== 8) {
    return {
      len: lenValue,
      value: 0
    };
  } else {
    return decodeDouble(buffer, offset);
  }
};

export const decodeOctetString = (buffer: Buffer, offset: number, maxLength: number, octetStringOffset: number, octetStringLength: number) => {
  const octetString = [];
  for (let i = octetStringOffset; i < (octetStringOffset + octetStringLength); i++) {
    octetString.push(buffer[offset + i]);
  }
  return {
    len: octetStringLength,
    value: octetString
  };
};

const multiCharsetCharacterstringDecode = (buffer: Buffer, offset: number, maxLength: number, encoding: number, length: number) => {
  const stringBuf = Buffer.alloc(length);
  buffer.copy(stringBuf, 0, offset, offset + length);
  return {
    value: iconv.decode(stringBuf, getEncodingType(encoding, buffer, offset)),
    len: length + 1,
    encoding: encoding
  };
};

export const decodeCharacterString = (buffer: Buffer, offset: number, maxLength: number, lenValue: number) => {
  return multiCharsetCharacterstringDecode(buffer, offset + 1, maxLength, buffer[offset], lenValue - 1);
};

const bitstringSetBitsUsed = (bitString: BACNetBitString, bytesUsed: number, unusedBits: number) => {
  bitString.bitsUsed = bytesUsed * 8;
  bitString.bitsUsed -= unusedBits;
};

export const decodeBitstring = (buffer: Buffer, offset: number, lenValue: number) => {
  let len = 0;
  const bitString: {value: number[], bitsUsed: 0} = {value: [], bitsUsed: 0};
  if (lenValue > 0) {
    const bytesUsed = lenValue - 1;
    if (bytesUsed <= baEnum.ASN1_MAX_BITSTRING_BYTES) {
      len = 1;
      for (let i = 0; i < bytesUsed; i++) {
        bitString.value.push(byteReverseBits(buffer[offset + len++]));
      }
      const unusedBits = buffer[offset] & 0x07;
      bitstringSetBitsUsed(bitString, bytesUsed, unusedBits);
    }
  }
  return {
    len: len,
    value: bitString
  };
};

export const decodeDate = (buffer: Buffer, offset: number) => {
  let date: Date;
  const year = buffer[offset] + 1900;
  const month = buffer[offset + 1];
  const day = buffer[offset + 2];
  const wday = buffer[offset + 3];
  if (month === 0xFF && day === 0xFF && wday === 0xFF && (year - 1900) === 0xFF) {
    date = new Date(1, 1, 1);
  } else {
    date = new Date(year, month, day);
  }
  return {
    len: 4,
    value: date
  };
};

const decodeDateSafe = (buffer: Buffer, offset: number, lenValue: number) => {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: new Date(1, 1, 1)
    };
  } else {
    return decodeDate(buffer, offset);
  }
};

export const decodeApplicationDate = (buffer: Buffer, offset: number) => {
  const result = decodeTagNumber(buffer, offset);
  if (result.tagNumber === baEnum.ApplicationTags.DATE) {
    const value = decodeDate(buffer, offset + 1);
    return {
      len: value.len + 1,
      value: value.value
    };
  }
};

export const decodeBacnetTime = (buffer: Buffer, offset: number) => {
  let value: Date;
  const hour = buffer[offset + 0];
  const min = buffer[offset + 1];
  const sec = buffer[offset + 2];
  let hundredths = buffer[offset + 3];
  if (hour === 0xFF && min === 0xFF && sec === 0xFF && hundredths === 0xFF) {
    value = new Date(1, 1, 1);
  } else {
    if (hundredths > 100) hundredths = 0;
    value = new Date(1, 1, 1, hour, min, sec, hundredths * 10);
  }
  return {
    len: 4,
    value: value
  };
};

const decodeBacnetTimeSafe = (buffer: Buffer, offset: number, len: number) => {
  if (len !== 4) {
    return { len, value: new Date(1, 1, 1) };
  } else {
    return decodeBacnetTime(buffer, offset);
  }
};

export const decodeApplicationTime = (buffer: Buffer, offset: number) => {
  const result = decodeTagNumber(buffer, offset);
  if (result.tagNumber === baEnum.ApplicationTags.TIME) {
    const value = decodeBacnetTime(buffer, offset + 1);
    return {
      len: value.len + 1,
      value: value.value
    };
  }
};

const decodeBacnetDatetime = (buffer: Buffer, offset: number) => {
  let len = 0;
  const rawDate = decodeApplicationDate(buffer, offset + len);
  len += rawDate.len;
  const date = rawDate.value;
  const rawTime = decodeApplicationTime(buffer, offset + len);
  len += rawTime.len;
  const time = rawTime.value;
  return {
    len: len,
    value: new Date(date.getFullYear(), date.getMonth(), date.getDay(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds())
  };
};

const bacappDecodeData = (buffer: Buffer, offset: number, maxLength: number, tagDataType: number, lenValueType: number) => {
  let result: any;
  const value: any = {
    len: 0,
    type: tagDataType
  };
  switch (tagDataType) {
    case baEnum.ApplicationTags.NULL:
      value.value = null;
      break;
    case baEnum.ApplicationTags.BOOLEAN:
      value.value = lenValueType > 0 ? true : false;
      break;
    case baEnum.ApplicationTags.UNSIGNED_INTEGER:
      result = decodeUnsigned(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.SIGNED_INTEGER:
      result = decodeSigned(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.REAL:
      result = decodeRealSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.DOUBLE:
      result = decodeDoubleSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.OCTET_STRING:
      result = decodeOctetString(buffer, offset, maxLength, 0, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.CHARACTER_STRING:
      result = decodeCharacterString(buffer, offset, maxLength, lenValueType);
      value.len += result.len;
      value.value = result.value;
      value.encoding = result.encoding;
      break;
    case baEnum.ApplicationTags.BIT_STRING:
      result = decodeBitstring(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.ENUMERATED:
      result = decodeEnumerated(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.DATE:
      result = decodeDateSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.TIME:
      result = decodeBacnetTimeSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.ApplicationTags.OBJECTIDENTIFIER:
      result = decodeObjectIdSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = {type: result.objectType, instance: result.instance};
      break;
    default:
      break;
  }
  return value;
};

const bacappContextTagType = (property: number, tagNumber: number) => {
  let tag = 0;
  switch (property) {
    case baEnum.PropertyIdentifier.ACTUAL_SHED_LEVEL:
    case baEnum.PropertyIdentifier.REQUESTED_SHED_LEVEL:
    case baEnum.PropertyIdentifier.EXPECTED_SHED_LEVEL:
      switch (tagNumber) {
        case 0:
        case 1:
          tag = baEnum.ApplicationTags.UNSIGNED_INTEGER;
          break;
        case 2:
          tag = baEnum.ApplicationTags.REAL;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.ACTION:
      switch (tagNumber) {
        case 0:
        case 1:
          tag = baEnum.ApplicationTags.OBJECTIDENTIFIER;
          break;
        case 2:
          tag = baEnum.ApplicationTags.ENUMERATED;
          break;
        case 3:
        case 5:
        case 6:
          tag = baEnum.ApplicationTags.UNSIGNED_INTEGER;
          break;
        case 7:
        case 8:
          tag = baEnum.ApplicationTags.BOOLEAN;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.LIST_OF_GROUP_MEMBERS:
      switch (tagNumber) {
        case 0:
          tag = baEnum.ApplicationTags.OBJECTIDENTIFIER;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.EXCEPTION_SCHEDULE:
      switch (tagNumber) {
        case 1:
          tag = baEnum.ApplicationTags.OBJECTIDENTIFIER;
          break;
        case 3:
          tag = baEnum.ApplicationTags.UNSIGNED_INTEGER;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.LOG_DEVICE_OBJECT_PROPERTY:
      switch (tagNumber) {
        case 0:
        case 3:
          tag = baEnum.ApplicationTags.OBJECTIDENTIFIER;
          break;
        case 1:
          tag = baEnum.ApplicationTags.ENUMERATED;
          break;
        case 2:
          tag = baEnum.ApplicationTags.UNSIGNED_INTEGER;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.SUBORDINATE_LIST:
      switch (tagNumber) {
        case 0:
        case 1:
          tag = baEnum.ApplicationTags.OBJECTIDENTIFIER;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.RECIPIENT_LIST:
      switch (tagNumber) {
        case 0:
          tag = baEnum.ApplicationTags.OBJECTIDENTIFIER;
          break;
        default:
          break;
      }
      break;
    case baEnum.PropertyIdentifier.ACTIVE_COV_SUBSCRIPTIONS:
      switch (tagNumber) {
        case 0:
        case 1:
          break;
        case 2:
          tag = baEnum.ApplicationTags.BOOLEAN;
          break;
        case 3:
          tag = baEnum.ApplicationTags.UNSIGNED_INTEGER;
          break;
        case 4:
          tag = baEnum.ApplicationTags.REAL;
          break;
        default:
          break;
      }
      break;
    default:
      break;
  }
  return tag;
};

const decodeDeviceObjPropertyRef = (buffer: Buffer, offset: number) => {
  let len = 0;
  let arrayIndex: any = baEnum.ASN1_ARRAY_ALL;
  if (!decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  let objectId = decodeObjectId(buffer, offset + len);
  len += objectId.len;
  let result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  const id = decodeEnumerated(buffer, offset + len, result.value);
  len += id.len;
  result = decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    // FIXME: This doesn't seem to be used
    arrayIndex = decodeUnsigned(buffer, offset + len, result.value);
    len += arrayIndex.len;
  }
  if (decodeIsContextTag(buffer, offset + len, 3)) {
    if (!isClosingTag(buffer[offset + len])) {
      len++;
      objectId = decodeObjectId(buffer, offset + len);
      len += objectId.len;
    }
  }
  return {
    len: len,
    value: {
      objectId: objectId,
      id: id
    }
  };
};

export const decodeReadAccessSpecification = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any = {};
  if (!decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  let decodedValue: any  = decodeObjectId(buffer, offset + len);
  value.objectId = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  len += decodedValue.len;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  const propertyIdAndArrayIndex = [];
  while ((apduLen - len) > 1 && !decodeIsClosingTagNumber(buffer, offset + len, 1)) {
    const propertyRef: any  = {};
    if (!isContextSpecific(buffer[offset + len])) return;
    const result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    if ((len + result.value) >= apduLen) return;
    decodedValue = decodeEnumerated(buffer, offset + len, result.value);
    propertyRef.id = decodedValue.value;
    len += decodedValue.len;
    propertyRef.index = baEnum.ASN1_ARRAY_ALL;
    if (isContextSpecific(buffer[offset + len]) && !isClosingTag(buffer[offset + len])) {
      const tmp = decodeTagNumberAndValue(buffer, offset + len);
      if (tmp.tagNumber === 1) {
        len += tmp.len;
        if ((len + tmp.value) >= apduLen) return;
        decodedValue = decodeUnsigned(buffer, offset + len, tmp.value);
        propertyRef.index = decodedValue.value;
        len += decodedValue.len;
      }
    }
    propertyIdAndArrayIndex.push(propertyRef);
  }
  if (!decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  value.properties = propertyIdAndArrayIndex;
  return {
    len: len,
    value: value
  };
};

const decodeCovSubscription = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const value: any  = {};
  let result: any ;
  let decodedValue: any ;
  value.recipient = {};
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 0)) return;
  len++;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 0)) return;
  len++;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.UNSIGNED_INTEGER) return;
  decodedValue = decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.recipient.net = decodedValue.value;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.OCTET_STRING) return;
  decodedValue = decodeOctetString(buffer, offset + len, apduLen, 0, result.value);
  len += decodedValue.len;
  value.recipient.adr = decodedValue.value;
  if (!decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  if (!decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.subscriptionProcessId = decodedValue.value;
  if (!decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
  len++;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  decodedValue = decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.monitoredObjectId = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.monitoredProperty = {};
  value.monitoredProperty.id = decodedValue.value;
  result = decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.monitoredProperty.index = decodedValue.value;
  } else {
    value.monitoredProperty.index = baEnum.ASN1_ARRAY_ALL;
  }
  if (!decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 2) return;
  value.issueConfirmedNotifications = buffer[offset + len] > 0 ? true : false;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 3) return;
  decodedValue = decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.timeRemaining = decodedValue.value;
  if (len < apduLen && !isClosingTag(buffer[offset + len])) {
    result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 4) return;
    decodedValue = decodeReal(buffer, offset + len);
    len += decodedValue.len;
    value.covIncrement = decodedValue.value;
  }
  return {
    len: len,
    value: value
  };
};

const decodeCalendarDate = (buffer: Buffer, offset: number) => ({
  len: 4,
  year: buffer[offset],
  month: buffer[offset + 1],
  day: buffer[offset + 2],
  wday: buffer[offset + 3]
});

const decodeCalendarDateRange = (buffer: Buffer, offset: number) => {
  let len = 1;
  const startDate = decodeDate(buffer, offset + len);
  len += startDate.len + 1;
  const endDate = decodeDate(buffer, offset + len);
  len += endDate.len + 1;
  return {
    len: len,
    startDate: startDate,
    endDate: endDate
  };
};

const decodeCalendarWeekDay = (buffer: Buffer, offset: number) => ({
  len: 3,
  month: buffer[offset],
  week: buffer[offset + 1],
  wday: buffer[offset + 2]
});

const decodeCalendar = (buffer: Buffer, offset: number, apduLen: number) => {
  let len = 0;
  const entries = [];
  while (len < apduLen) {
    const result = decodeTagNumber(buffer, offset + len);
    len += result.len;
    switch (result.tagNumber) {
      case 0: {
        const decodedValue = decodeCalendarDate(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      } case 1: {
        const decodedValue = decodeCalendarDateRange(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      } case 2: {
        const decodedValue = decodeCalendarWeekDay(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      } default:
        return {
          len: len - 1,
          value: entries
        };
    }
  }
};

const bacappDecodeContextApplicationData = (buffer: Buffer, offset: number, maxOffset: number, objectType: number, propertyId: number) => {
  let len = 0;
  if (isContextSpecific(buffer[offset])) {
    if (propertyId === baEnum.PropertyIdentifier.LIST_OF_GROUP_MEMBERS) {
      const result = decodeReadAccessSpecification(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.ApplicationTags.READ_ACCESS_SPECIFICATION,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.PropertyIdentifier.ACTIVE_COV_SUBSCRIPTIONS) {
      const result = decodeCovSubscription(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.ApplicationTags.COV_SUBSCRIPTION,
        value: result.value,
        len: result.len
      };
    } else if (objectType === baEnum.ObjectType.GROUP && propertyId === baEnum.PropertyIdentifier.PRESENT_VALUE) {
      const result = decodeReadAccessResult(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.ApplicationTags.READ_ACCESS_RESULT,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.PropertyIdentifier.LIST_OF_OBJECT_PROPERTY_REFERENCES || propertyId === baEnum.PropertyIdentifier.LOG_DEVICE_OBJECT_PROPERTY || propertyId === baEnum.PropertyIdentifier.OBJECT_PROPERTY_REFERENCE) {
      const result = decodeDeviceObjPropertyRef(buffer, offset);
      if (!result) return;
      return {
        type: baEnum.ApplicationTags.OBJECT_PROPERTY_REFERENCE,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.PropertyIdentifier.DATE_LIST) {
      const result = decodeCalendar(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.ApplicationTags.CONTEXT_SPECIFIC_DECODED,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.PropertyIdentifier.EVENT_TIME_STAMPS) {
      let subEvtResult;
      const evtResult = decodeTagNumberAndValue(buffer, offset + len);
      len += 1;
      if (evtResult.tagNumber === 0) {
        subEvtResult = decodeBacnetTime(buffer, offset + 1);
        return {
          type: baEnum.ApplicationTags.TIMESTAMP,
          value: subEvtResult.value,
          len: subEvtResult.len + 1
        };
      } else if (evtResult.tagNumber === 1) {
        subEvtResult = decodeUnsigned(buffer, offset + len, evtResult.value);
        return {
          type: baEnum.ApplicationTags.UNSIGNED_INTEGER,
          value: subEvtResult.value,
          len: subEvtResult.len + 1
        };
      } else if (evtResult.tagNumber === 2) {
        subEvtResult = decodeBacnetDatetime(buffer, offset + len);
        return {
          type: baEnum.ApplicationTags.TIMESTAMP,
          value: subEvtResult.value,
          len: subEvtResult.len + 2
        };
      } else {
        return;
      }
    }
    const list = [];
    const tagResult = decodeTagNumberAndValue(buffer, offset + len);
    const multipleValues = isOpeningTag(buffer[offset + len]);
    while (((len + offset) <= maxOffset) && !isClosingTag(buffer[offset + len])) {
      const subResult = decodeTagNumberAndValue(buffer, offset + len);
      if (!subResult) return;
      if (subResult.value === 0) {
        len += subResult.len;
        const result = bacappDecodeApplicationData(buffer, offset + len, maxOffset, baEnum.ASN1_MAX_OBJECT_TYPE, baEnum.ASN1_MAX_PROPERTY_ID);
        if (!result) return;
        list.push(result);
        len += result.len;
      } else {
        const overrideTagNumber = bacappContextTagType(propertyId, subResult.tagNumber);
        if (overrideTagNumber !== baEnum.ASN1_MAX_APPLICATION_TAG) {
          subResult.tagNumber = overrideTagNumber;
        }
        const bacappResult = bacappDecodeData(buffer, offset + len + subResult.len, maxOffset, subResult.tagNumber, subResult.value);
        if (!bacappResult) return;
        if (bacappResult.len === subResult.value) {
          const resObj: {value: any, type: number, encoding?: number} = {
            value: bacappResult.value,
            type: bacappResult.type
          };
          // HACK: Drop string specific handling ASAP
          if (bacappResult.encoding !== undefined) resObj.encoding = bacappResult.encoding;
          list.push(resObj);
          len += subResult.len + subResult.value;
        } else {
          list.push({
            value: buffer.slice(offset + len + subResult.len, offset + len + subResult.len + subResult.value),
            type: baEnum.ApplicationTags.CONTEXT_SPECIFIC_ENCODED
          });
          len += subResult.len + subResult.value;
        }
      }
      if (multipleValues === false) {
        return {
          len: len,
          value: list[0],
          type: baEnum.ApplicationTags.CONTEXT_SPECIFIC_DECODED
        };
      }
    }
    if ((len + offset) > maxOffset) return;
    if (decodeIsClosingTagNumber(buffer, offset + len, tagResult.tagNumber)) {
      len++;
    }
    return {
      len: len,
      value: list,
      type: baEnum.ApplicationTags.CONTEXT_SPECIFIC_DECODED
    };
  } else {
    return;
  }
};

export const bacappEncodeTimestamp = (buffer: EncodeBuffer, value: {type: number, value: any}) => {
  switch (value.type) {
    case baEnum.TimeStamp.TIME:
      encodeContextTime(buffer, 0, value.value);
      break;
    case baEnum.TimeStamp.SEQUENCE_NUMBER:
      encodeContextUnsigned(buffer, 1, value.value);
      break;
    case baEnum.TimeStamp.DATETIME:
      bacappEncodeContextDatetime(buffer, 2, value.value);
      break;
    default:
      throw new Error('NOT_IMPLEMENTED');
  }
};

export const bacappEncodeContextTimestamp = (buffer: EncodeBuffer, tagNumber: number, value: {type: number, value: any}) => {
  encodeOpeningTag(buffer, tagNumber);
  bacappEncodeTimestamp(buffer, value);
  encodeClosingTag(buffer, tagNumber);
};

export const decodeContextCharacterString = (buffer: Buffer, offset: number, maxLength: number, tagNumber: number) => {
  let len = 0;
  if (!decodeIsContextTag(buffer, offset + len, tagNumber)) return;
  const result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  const decodedValue = multiCharsetCharacterstringDecode(buffer, offset + 1 + len, maxLength, buffer[offset + len], result.value - 1);
  if (!decodedValue) return;
  len += result.value;
  return {
    len: len,
    value: decodedValue.value,
    encoding: decodedValue.encoding
  };
};

const decodeIsContextTagWithLength = (buffer: Buffer, offset: number, tagNumber: number) => {
  const result = decodeTagNumber(buffer, offset);
  return {
    len: result.len,
    value: isContextSpecific(buffer[offset]) && (result.tagNumber === tagNumber)
  };
};

export const decodeContextObjectId = (buffer: Buffer, offset: number, tagNumber: number) => {
  const result = decodeIsContextTagWithLength(buffer, offset, tagNumber);
  if (!result.value) return;
  const decodedValue = decodeObjectId(buffer, offset + result.len);
  decodedValue.len = decodedValue.len + result.len;
  return decodedValue;
};

const encodeBacnetCharacterString = (buffer: EncodeBuffer, value: string, encoding?: number) => {
  encoding = encoding || baEnum.CharacterStringEncoding.UTF_8;
  buffer.buffer[buffer.offset++] = encoding;
  const bufEncoded = iconv.encode(value, getEncodingType(encoding));
  buffer.offset += bufEncoded.copy(buffer.buffer, buffer.offset);
};

export const encodeApplicationCharacterString = (buffer: EncodeBuffer, value: string, encoding?: number) => {
  const tmp = getBuffer();
  encodeBacnetCharacterString(tmp, value, encoding);
  encodeTag(buffer, baEnum.ApplicationTags.CHARACTER_STRING, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

export const encodeContextCharacterString = (buffer: EncodeBuffer, tagNumber: number, value: string, encoding?: number) => {
  const tmp = getBuffer();
  encodeBacnetCharacterString(tmp, value, encoding);
  encodeTag(buffer, tagNumber, true, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};
