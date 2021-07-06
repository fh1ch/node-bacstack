'use strict';

import * as baEnum from './enum';
import { EncodeBuffer } from './types';

export const getDecodedType = (buffer: Buffer, offset: number) => {
  return buffer[offset];
};

export const setDecodedType = (buffer: Buffer, offset: number, type: number) => {
  buffer[offset] = type;
};

export const getDecodedInvokeId = (buffer: Buffer, offset: number) => {
  const type = getDecodedType(buffer, offset);
  switch (type & baEnum.PDU_TYPE_MASK) {
    case baEnum.PduTypes.SIMPLE_ACK:
    case baEnum.PduTypes.COMPLEX_ACK:
    case baEnum.PduTypes.ERROR:
    case baEnum.PduTypes.REJECT:
    case baEnum.PduTypes.ABORT:
      return buffer[offset + 1];
    case baEnum.PduTypes.CONFIRMED_REQUEST:
      return buffer[offset + 2];
    default:
      return;
  }
};

export const encodeConfirmedServiceRequest = (buffer: EncodeBuffer, type: number, service: number, maxSegments: number, maxApdu: number, invokeId: number, sequencenumber?: number, proposedWindowSize?: number) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = maxSegments | maxApdu;
  buffer.buffer[buffer.offset++] = invokeId;
  if ((type & baEnum.PduConReqBits.SEGMENTED_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = sequencenumber;
    buffer.buffer[buffer.offset++] = proposedWindowSize;
  }
  buffer.buffer[buffer.offset++] = service;
};

export const decodeConfirmedServiceRequest = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const maxSegments = buffer[offset] & 0xF0;
  const maxApdu = buffer[offset++] & 0x0F;
  const invokeId = buffer[offset++];
  let sequencenumber = 0;
  let proposedWindowNumber = 0;
  if ((type & baEnum.PduConReqBits.SEGMENTED_MESSAGE) > 0) {
    sequencenumber = buffer[offset++];
    proposedWindowNumber = buffer[offset++];
  }
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    maxSegments: maxSegments,
    maxApdu: maxApdu,
    invokeId: invokeId,
    sequencenumber: sequencenumber,
    proposedWindowNumber: proposedWindowNumber
  };
};

export const encodeUnconfirmedServiceRequest = (buffer: EncodeBuffer, type: number, service: number) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = service;
};

export const decodeUnconfirmedServiceRequest = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service
  };
};

export const encodeSimpleAck = (buffer: EncodeBuffer, type: number, service: number, invokeId: number) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = service;
};

export const decodeSimpleAck = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const invokeId = buffer[offset++];
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    invokeId: invokeId
  };
};

export const encodeComplexAck = (buffer: EncodeBuffer, type: number, service: number, invokeId: number, sequencenumber?: number, proposedWindowNumber?: number) => {
  let len = 3;
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  if ((type & baEnum.PduConReqBits.SEGMENTED_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = sequencenumber;
    buffer.buffer[buffer.offset++] = proposedWindowNumber;
    len += 2;
  }
  buffer.buffer[buffer.offset++] = service;
  return len;
};

export const decodeComplexAck = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const invokeId = buffer[offset++];
  let sequencenumber = 0;
  let proposedWindowNumber = 0;
  if ((type & baEnum.PduConReqBits.SEGMENTED_MESSAGE) > 0) {
    sequencenumber = buffer[offset++];
    proposedWindowNumber = buffer[offset++];
  }
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    invokeId: invokeId,
    sequencenumber: sequencenumber,
    proposedWindowNumber: proposedWindowNumber
  };
};

export const encodeSegmentAck = (buffer: EncodeBuffer, type: number, originalInvokeId: number, sequencenumber: number, actualWindowSize: number) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = originalInvokeId;
  buffer.buffer[buffer.offset++] = sequencenumber;
  buffer.buffer[buffer.offset++] = actualWindowSize;
};

export const decodeSegmentAck = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const originalInvokeId = buffer[offset++];
  const sequencenumber = buffer[offset++];
  const actualWindowSize = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    originalInvokeId: originalInvokeId,
    sequencenumber: sequencenumber,
    actualWindowSize: actualWindowSize
  };
};

export const encodeError = (buffer: EncodeBuffer, type: number, service: number, invokeId: number) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = service;
};

export const decodeError = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const invokeId = buffer[offset++];
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    invokeId: invokeId
  };
};

export const encodeAbort = (buffer: EncodeBuffer, type: number, invokeId: number, reason: number) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = reason;
};

export const decodeAbort = (buffer: Buffer, offset: number) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const invokeId = buffer[offset++];
  const reason = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    invokeId: invokeId,
    reason: reason
  };
};
