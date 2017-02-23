// Util Modules
var debug         = require('debug')('node-bacstack');

// Local Modules
var baTransport   = require('./bacnet-transport');
var baServices    = require('./bacnet-services');
var baAsn1        = require('./bacnet-asn1');
var baAdpu        = require('./bacnet-adpu');
var baNpdu        = require('./bacnet-npdu');
var baBvlc        = require('./bacnet-bvlc');
var baEnum        = require('./bacnet-enum');

// Local Definitions
var invokeCounter = 0;
var invokeStore = {};
var transport = baTransport();

// Local Handlers
var whoIsHandler;

// Helper utils
var invokeCallback = function(result) {
  var callback = invokeStore[result.result.invokeId];
  if (callback) callback(null, result);
  else debug('InvokeId ', result.result.invokeId, ' not found -> drop package');
};

var addCallback = function(id, callback) {
  var timeout = setTimeout(function() {
    delete invokeStore[id];
    callback(new Error('ERR_TIMEOUT'));
  }, 3000);
  invokeStore[id] = function(err, data) {
    clearTimeout(timeout);
    callback(err, data);
  };
};

// Service Handlers
var ProcessError = function(adr, type, service, invoke_id, buffer, offset, length) {
  Trace.WriteLine("Error", null);
  var result = Services.DecodeError(buffer, offset, length);
  if (result) {
    debug('Couldn`t decode Error');
  }
}

var AssembleSegments = function() {
  var count = 0;
  m_segments.forEach(function(arr) {
    count += arr.Length;
  });
  var ret = new byte[count];
  count = 0;
  m_segments.forEach(function(arr) {
    Array.Copy(arr, 0, ret, count, arr.Length);
    count += arr.Length;
  });
  return ret;
};

var PerformDefaultSegmentHandling = function(sender, adr, type, service, invoke_id, max_segments, max_adpu, sequence_number, first, more_follows, buffer, offset, length) {
  if (first) {
    m_segments.Clear();
    type &= ~BacnetPduTypes.SEGMENTED_MESSAGE;
    var adpu_header_len = 3;
    if ((type & BacnetPduTypes.PDU_TYPE_MASK) === BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST) {
      adpu_header_len = 4;
    }
    var copy = new byte[length + adpu_header_len];
    Array.Copy(buffer, offset, copy, adpu_header_len, length);
    if ((type & BacnetPduTypes.PDU_TYPE_MASK) === BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST) {
      APDU.EncodeConfirmedServiceRequest(new EncodeBuffer(copy, 0), type, service, max_segments, max_adpu, invoke_id, 0, 0);
    } else{
      APDU.EncodeComplexAck(new EncodeBuffer(copy, 0), type, service, invoke_id, 0, 0);
    }
    m_segments.AddLast(copy);
  } else {
    var copy = new byte[length];
    Array.Copy(buffer, offset, copy, 0, copy.Length);
    m_segments.AddLast(copy);
  }
  if (!more_follows) {
    var apdu_buffer = AssembleSegments();
    m_segments.Clear();
    ProcessApdu(adr, type, apdu_buffer, 0, apdu_buffer.Length);
  }
}

var processSegment = function(adr, type, service, invoke_id, max_segments, max_adpu, server, sequence_number, proposed_window_number, buffer, offset, length) {
  var first = false;
  if (sequence_number === 0 && m_last_sequence_number === 0) {
    first = true;
  } else {
    if (sequence_number !== (m_last_sequence_number + 1)) {
      SegmentAckResponse(adr, true, server, invoke_id, m_last_sequence_number, proposed_window_number);
      debug('Segment sequence out of order');
      return;
    }
  }
  m_last_sequence_number = sequence_number;
  var more_follows = (type & BacnetPduTypes.MORE_FOLLOWS) === BacnetPduTypes.MORE_FOLLOWS;
  if (!more_follows) {
    m_last_sequence_number = 0;
  }
  if ((sequence_number % proposed_window_number) === 0 || !more_follows) {
    if (m_force_window_size) {
      proposed_window_number = m_proposed_window_size;
    }
    SegmentAckResponse(adr, false, server, invoke_id, sequence_number, proposed_window_number);
  }
  if (m_default_segmentation_handling) {
    PerformDefaultSegmentHandling(this, adr, type, service, invoke_id, max_segments, max_adpu, sequence_number, first, more_follows, buffer, offset, length);
  }
}

var processUnconfirmedServiceRequest = function(address, type, service, buffer, offset, length) {
  debug('Handle processUnconfirmedServiceRequest');
  if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_I_AM) {
    var result = baServices.decodeIamBroadcast(buffer, offset);
    if (result) {
      //whoIsHandler(address, result.deviceId, result.maxApdu, result.segmentation, result.vendorId);
    } else {
      debug('Received invalid iAm message');
    }
  } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS) {
    debug('TODO: Implement');
    return;
    var result = baServices.decodeWhoIsBroadcast(buffer, offset, length);
    if (result) {
      OnWhoIs(this, address, result.lowLimit, result.highLimit);
    } else {
      debug('Received invalid whoIs message');
    }
  } else {
    debug('Received unsupported unconfirmed service request');
  }
};

var handlePdu = function(address, type, buffer, offset, length) {
  // Handle different PDU types
  switch (type & baEnum.BacnetPduTypes.PDU_TYPE_MASK) {
    case baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST:
      var result = baAdpu.decodeUnconfirmedServiceRequest(buffer, offset);
      processUnconfirmedServiceRequest(address, result.type, result.service, buffer, offset + result.len, length - result.len);
      break;
    case baEnum.BacnetPduTypes.PDU_TYPE_SIMPLE_ACK:
      var result = baAdpu.decodeSimpleAck(buffer, offset);
      offset += result.len;
      length -= result.len;
      //processSimpleAck(address, result.type, result.service, result.invokeId, buffer, offset, length);
      break;
    case baEnum.BacnetPduTypes.PDU_TYPE_COMPLEX_ACK:
      var result = baAdpu.decodeComplexAck(buffer, offset);
      if ((type & baEnum.BacnetPduTypes.SEGMENTED_MESSAGE) === 0) {
        invokeCallback({result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        //eventer.emit('complexAck', address, result.type, result.service, result.invokeId, buffer, offset + result.len, length - result.len);
        //processComplexAck(address, result.type, result.service, result.invokeId, buffer, offset + result.len, length - result.len);
      } else {
        //processSegment(address, result.type, result.service, result.invokeId, BacnetMaxSegments.MAX_SEG0, BacnetMaxAdpu.MAX_baAdpu50, false, result.sequenceNumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
      }
      break;
    case baEnum.BacnetPduTypes.PDU_TYPE_SEGMENT_ACK:
      var result = baAdpu.decodeSegmentAck(buffer, offset);
      m_last_segment_ack.Set(address, result.originalInvokeId, result.sequenceNumber, result.actualWindowSize);
      processSegmentAck(address, result.type, result.originalInvokeId, result.sequenceNumber, result.actualWindowSize, buffer, offset + result.len, length - result.len);
      break;
    case baEnum.BacnetPduTypes.PDU_TYPE_ERROR:
      var result = baAdpu.decodeError(buffer, offset);
      //processError(address, result.type, result.service, result.invokeId, buffer, offset + result.len, length - result.len);
      break;
    case baEnum.BacnetPduTypes.PDU_TYPE_REJECT:
    case baEnum.BacnetPduTypes.PDU_TYPE_ABORT:
      var result = baAdpu.decodeAbort(buffer, offset);
      //processAbort(address, result.type, result.invokeId, result.reason, buffer, offset + result.len, length - result.len);
      break;
    case baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST:
      var result = baAdpu.decodeConfirmedServiceRequest(buffer, offset);
      if ((type & baEnum.BacnetPduTypes.SEGMENTED_MESSAGE) === 0) {
        //processConfirmedServiceRequest(address, result.type, result.service, result.maxSegments, result.maxAdpu, result.invokeId, buffer, offset + result.len, length - result.len);
      } else {
        processSegment(address, result.type, result.service, result.invokeId, result.maxSegments, result.maxAdpu, true, result.sequenceNumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
      }
      break;
    default:
      debug('Received unknown PDU type -> Drop package');
      break;
  }
};

var handleNpdu = function(buffer, offset, msgLength, remoteAddress) {
  // Check data length
  if (msgLength <= 0) {
    debug('No NPDU data -> Drop package');
    return;
  }
  // Parse baNpdu header
  var result = baNpdu.Decode(buffer, offset);
  if (!result) {
    debug('Received invalid NPDU header -> Drop package');
    return;
  }
  if ((result.npdu_function & baEnum.BacnetNpduControls.NetworkLayerMessage) === baEnum.BacnetNpduControls.NetworkLayerMessage) {
    debug('Received network layer message -> Drop package');
    return;
  }
  offset += result.len;
  msgLength -= result.len;
  if (msgLength <= 0) {
    debug('No APDU data -> Drop package');
    return;
  }
  var apduType = baAdpu.getDecodedType(buffer, offset);
  handlePdu(remoteAddress, apduType, buffer, offset, msgLength);
}

var receiveData = module.exports.receiveData = function(buffer, remoteAddress) {
  // Check data length
  if (buffer.length < baBvlc.BVLC_HEADER_LENGTH) {
    debug('Received invalid data -> Drop package');
    return;
  }
  // Parse BVLC header
  var result = baBvlc.decode(buffer, 0);
  if (!result) {
    debug('Received invalid BVLC header -> Drop package');
    return;
  }
  // Check BVLC function
  if (result.func === baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU || result.func === baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU || result.func === baEnum.BacnetBvlcFunctions.BVLC_FORWARDED_NPDU) {
    handleNpdu(buffer, result.len, buffer.length - result.len, remoteAddress);
  } else {
    debug('Received unknown BVLC function -> Drop package');
  }
};

// Util Functions
var DEFAULT_HOP_COUNT = 0xFF;
var BVLC_HEADER_LENGTH = 4;
var getBuffer = function() {
  return {
    buffer: Buffer.alloc(transport.getMaxPayload()),
    offset: BVLC_HEADER_LENGTH,
    max_offset: 0,
    serialize_counter: 0,
    min_limit: 0,
    result: false
  };
};

// Public Functions
module.exports.whoIs = function(lowLimit, highLimit, receiver, handler) {
  whoIsHandler = handler;

  var buffer = getBuffer();
  receiver = receiver || transport.getBroadcastAddress();
  baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage, receiver, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
  baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS);
  baServices.EncodeWhoIsBroadcast(buffer, lowLimit, highLimit);
  // TODO: Differentiate between uni & broadcast
  baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
  transport.send(buffer.buffer, buffer.offset, receiver);
};

module.exports.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex) {
  arrayIndex = arrayIndex || baAsn1.BACNET_ARRAY_ALL;
  // HACK: Use real value
  var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
  var buffer = getBuffer();
  // TODO: Replace address
  baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage | baEnum.BacnetNpduControls.ExpectingReply, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
  baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (maxSegments !== baEnum.BacnetMaxSegments.MAX_SEG0 ? baEnum.BacnetPduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0), baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeCounter, 0, 0);
  baServices.EncodeReadProperty(buffer, objectType, objectInstance, propertyId, arrayIndex);
  baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
  transport.send(buffer.buffer, buffer.offset, address);
  addCallback(invokeCounter++, function(err, data) {
    if (err) return next(err);
    var result = baServices.DecodeReadPropertyAcknowledge(data.buffer, data.offset, data.length);
    next(null, result);
  });
};

module.exports.writeProperty = function(address, objectType, objectInstance, propertyId, priority, valueList) {
  var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
  var buffer = getBuffer();
  baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage | baEnum.BacnetNpduControls.ExpectingReply, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
  baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeCounter++, 0, 0);
  baServices.EncodeWriteProperty(buffer, objectType, objectInstance, propertyId, baAsn1.BACNET_ARRAY_ALL, priority, valueList);
  baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
  transport.send(buffer.buffer, buffer.offset, address);
};

module.exports.readPropertyMultiple = function(address, propertiesArray, next) {
  // HACK: Use real value
  var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
  var buffer = getBuffer();
  baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage | baEnum.BacnetNpduControls.ExpectingReply, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
  baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (baEnum.maxSegments !== baEnum.BacnetMaxSegments.MAX_SEG0 ? baEnum.BacnetPduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0), baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeCounter, 0, 0);
  //FIXME: WHat about objectType, objectInstance,?
  baServices.EncodeReadPropertyMultiple(buffer, propertiesArray);
  baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
  transport.send(buffer.buffer, buffer.offset, address);
  addCallback(invokeCounter++, function(err, data) {
    if (err) return next(err);
    var result = baServices.DecodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
    next(null, result);
  });
};

module.exports.writePropertyMultiple = function(address, propertiesArray, cb) {

};

transport.setHandler(receiveData);
