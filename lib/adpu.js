var baEnum = require('./enum');

var getDecodedType = module.exports.getDecodedType = function(buffer, offset) {
  return buffer[offset];
};

module.exports.setDecodedType = function(buffer, offset, type) {
  buffer[offset] = type;
};

module.exports.getDecodedInvokeId = function(buffer, offset) {
  var type = getDecodedType(buffer, offset);
  switch (type & baEnum.PduTypes.PDU_TYPE_MASK) {
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

module.exports.encodeConfirmedServiceRequest = function(buffer, type, service, maxSegments, maxAdpu, invokeId, sequencenumber, proposedWindowSize) {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = maxSegments | maxAdpu;
  buffer.buffer[buffer.offset++] = invokeId;
  if ((type & baEnum.PduTypes.SEGMENTED_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = sequencenumber;
    buffer.buffer[buffer.offset++] = proposedWindowSize;
  }
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeConfirmedServiceRequest = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var maxSegments = buffer[offset] & 0xF0;
  var maxAdpu = buffer[offset++] & 0x0F;
  var invokeId = buffer[offset++];
  var sequencenumber = 0;
  var proposedWindowNumber = 0;
  if ((type & baEnum.PduTypes.SEGMENTED_MESSAGE) > 0) {
    sequencenumber = buffer[offset++];
    proposedWindowNumber = buffer[offset++];
  }
  var service = buffer[offset++];
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

module.exports.encodeUnconfirmedServiceRequest = function(buffer, type, service) {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeUnconfirmedServiceRequest = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service
  };
};

module.exports.encodeSimpleAck = function(buffer, type, service, invokeId) {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeSimpleAck = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var invokeId = buffer[offset++];
  var service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    invokeId: invokeId
  };
};

module.exports.encodeComplexAck = function(buffer, type, service, invokeId, sequencenumber, proposedWindowNumber) {
  var len = 3;
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  if ((type & baEnum.PduTypes.SEGMENTED_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = sequencenumber;
    buffer.buffer[buffer.offset++] = proposedWindowNumber;
    len += 2;
  }
  buffer.buffer[buffer.offset++] = service;
  return len;
};

module.exports.decodeComplexAck = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var invokeId = buffer[offset++];
  var sequencenumber = 0;
  var proposedWindowNumber = 0;
  if ((type & baEnum.PduTypes.SEGMENTED_MESSAGE) > 0) {
    sequencenumber = buffer[offset++];
    proposedWindowNumber = buffer[offset++];
  }
  var service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    invokeId: invokeId,
    sequencenumber: sequencenumber,
    proposedWindowNumber: proposedWindowNumber
  };
};

module.exports.encodeSegmentAck = function(buffer, type, originalInvokeId, sequencenumber, actualWindowSize) {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = originalInvokeId;
  buffer.buffer[buffer.offset++] = sequencenumber;
  buffer.buffer[buffer.offset++] = actualWindowSize;
};

module.exports.decodeSegmentAck = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var originalInvokeId = buffer[offset++];
  var sequencenumber = buffer[offset++];
  var actualWindowSize = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    originalInvokeId: originalInvokeId,
    sequencenumber: sequencenumber,
    actualWindowSize: actualWindowSize
  };
};

module.exports.encodeError = function(buffer, type, service, invokeId) {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = service;
};

module.exports.decodeError = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var invokeId = buffer[offset++];
  var service = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    service: service,
    invokeId: invokeId
  };
};

module.exports.encodeAbort = function(buffer, type, invokeId, reason) {
  buffer.buffer[buffer.offset++] = type;
  buffer.buffer[buffer.offset++] = invokeId;
  buffer.buffer[buffer.offset++] = reason;
};

module.exports.decodeAbort = function(buffer, offset) {
  var orgOffset = offset;
  var type = buffer[offset++];
  var invokeId = buffer[offset++];
  var reason = buffer[offset++];
  return {
    len: offset - orgOffset,
    type: type,
    invokeId: invokeId,
    reason: reason
  };
};
