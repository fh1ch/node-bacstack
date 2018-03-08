'use strict';

const baEnum      = require('./enum');

const getDecodedType = module.exports.getDecodedType = (buffer, offset) => {
  return buffer[offset];
};

module.exports.setDecodedType = (buffer, offset, type) => {
  buffer[offset] = type;
};

module.exports.getDecodedInvokeId = (buffer, offset) => {
  const type = getDecodedType(buffer, offset);
  switch (type & baEnum.PDU_TYPE_MASK) {
    case baEnum.PduTypes.PDU_TYPE_SIMPLE_ACK:
    case baEnum.PduTypes.PDU_TYPE_COMPLEX_ACK:
    case baEnum.PduTypes.PDU_TYPE_ERROR:
    case baEnum.PduTypes.PDU_TYPE_REJECT:
    case baEnum.PduTypes.PDU_TYPE_ABORT:
      return buffer[offset + 1];
    case baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST:
      return buffer[offset + 2];
    default:
      return;
  }
};

module.exports.encodeConfirmedServiceRequest = (buffer, type, service, maxSegments, maxAdpu, invokeId, sequencenumber, proposedWindowSize) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = maxSegments | maxAdpu;
  buffer.buffer[buffer.offset++] = invokeId;
  if ((type & baEnum.ConfirmedRequestPduFlags.SEGMENTED_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = sequencenumber;
    buffer.buffer[buffer.offset++] = proposedWindowSize;
  }
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeConfirmedServiceRequest = (buffer, offset) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const maxSegments = buffer[offset] & 0xF0;
  const maxAdpu = buffer[offset++] & 0x0F;
  const invokeId = buffer[offset++];
  let sequencenumber = 0;
  let proposedWindowNumber = 0;
  if ((type & baEnum.ConfirmedRequestPduFlags.SEGMENTED_MESSAGE) > 0) {
    sequencenumber = buffer[offset++];
    proposedWindowNumber = buffer[offset++];
  }
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    maxSegments: maxSegments,
    maxAdpu: maxAdpu,
    invokeId: invokeId,
    sequencenumber: sequencenumber,
    proposedWindowNumber: proposedWindowNumber
  };
};

module.exports.encodeUnconfirmedServiceRequest = (buffer, type, service) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeUnconfirmedServiceRequest = (buffer, offset) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service
  };
};

module.exports.encodeSimpleAck = (buffer, type, service, invokeId) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeSimpleAck = (buffer, offset) => {
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

module.exports.encodeComplexAck = (buffer, type, service, invokeId, sequencenumber, proposedWindowNumber) => {
  let len = 3;
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  if ((type & baEnum.ComplexAckPduFlags.SEGMENTED_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = sequencenumber;
    buffer.buffer[buffer.offset++] = proposedWindowNumber;
    len += 2;
  }
  buffer.buffer[buffer.offset++] = service;
  return len;
};

module.exports.decodeComplexAck = (buffer, offset) => {
  const orgOffset = offset;
  const type = buffer[offset++];
  const invokeId = buffer[offset++];
  let sequencenumber = 0;
  let proposedWindowNumber = 0;
  if ((type & baEnum.ComplexAckPduFlags.SEGMENTED_MESSAGE) > 0) {
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

module.exports.encodeSegmentAck = (buffer, type, originalInvokeId, sequencenumber, actualWindowSize) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = originalInvokeId;
  buffer.buffer[buffer.offset++] = sequencenumber;
  buffer.buffer[buffer.offset++] = actualWindowSize;
};

module.exports.decodeSegmentAck = (buffer, offset) => {
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

module.exports.encodeError = (buffer, type, service, invokeId) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeError = (buffer, offset) => {
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

module.exports.encodeAbort = (buffer, type, invokeId, reason) => {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = reason;
};

module.exports.decodeAbort = (buffer, offset) => {
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
