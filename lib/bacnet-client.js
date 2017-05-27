// Util Modules
var debug         = require('debug')('bacstack');

// Local Modules
var baTransport   = require('./bacnet-transport');
var baServices    = require('./bacnet-services');
var baAsn1        = require('./bacnet-asn1');
var baAdpu        = require('./bacnet-adpu');
var baNpdu        = require('./bacnet-npdu');
var baBvlc        = require('./bacnet-bvlc');
var baEnum        = require('./bacnet-enum');

module.exports = function(settings) {
  var self = this;

  var DEFAULT_HOP_COUNT = 0xFF;
  var BVLC_HEADER_LENGTH = 4;

  var invokeCounter = 0;
  var lastSequenceNumber = 0;
  var invokeStore = {};
  var segmentStore = [];

  var transport = settings.transport || baTransport({
    port: settings.port,
    interface: settings.interface,
    broadcastAddress: settings.broadcastAddress
  });

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
    }, settings.adpuTimeout);
    invokeStore[id] = function(err, data) {
      clearTimeout(timeout);
      delete invokeStore[id];
      callback(err, data);
    };
  };

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

  // Service Handlers
  var ProcessError = function(adr, type, service, invokeId, buffer, offset, length) {
    debug('Handle Error');
    var result = baServices.DecodeError(buffer, offset, length);
    if (result) {
      debug('Couldn`t decode Error');
    }
  };

  var segmentAckResponse = function(receiver, negative, server, originalInvokeId, sequencenumber, actualWindowSize) {
    var buffer = getBuffer();
    baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage, receiver, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeSegmentAck(buffer, baEnum.BacnetPduTypes.PDU_TYPE_SEGMENT_ACK | (negative ? baEnum.BacnetPduTypes.NEGATIVE_ACK : 0) | (server ? baEnum.BacnetPduTypes.SERVER : 0), originalInvokeId, sequencenumber, actualWindowSize);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  var performDefaultSegmentHandling = function(sender, adr, type, service, invokeId, maxSegments, maxAdpu, sequencenumber, first, moreFollows, buffer, offset, length) {
    if (first) {
      segmentStore = [];
      type &= ~baEnum.BacnetPduTypes.SEGMENTED_MESSAGE;
      var adpuHeaderLen = 3;
      if ((type & baEnum.BacnetPduTypes.PDU_TYPE_MASK) === baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST) {
        adpuHeaderLen = 4;
      }
      var adpubuffer = getBuffer();
      adpubuffer.offset = 0;
      buffer.copy(adpubuffer.buffer, adpuHeaderLen, offset, offset + length);
      if ((type & baEnum.BacnetPduTypes.PDU_TYPE_MASK) === baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST) {
        baAdpu.encodeConfirmedServiceRequest(adpubuffer, type, service, maxSegments, maxAdpu, invokeId, 0, 0);
      } else {
        baAdpu.encodeComplexAck(adpubuffer, type, service, invokeId, 0, 0);
      }
      segmentStore.push(adpubuffer.buffer.slice(0, length + adpuHeaderLen));
    } else {
      segmentStore.push(buffer.slice(offset, offset + length));
    }
    if (!moreFollows) {
      var apduBuffer = Buffer.concat(segmentStore);
      segmentStore = [];
      type &= ~baEnum.BacnetPduTypes.SEGMENTED_MESSAGE;
      handlePdu(adr, type, apduBuffer, 0, apduBuffer.length);
    }
  };

  var processSegment = function(receiver, type, service, invokeId, maxSegments, maxAdpu, server, sequencenumber, proposedWindowNumber, buffer, offset, length) {
    var first = false;
    if (sequencenumber === 0 && lastSequenceNumber === 0) {
      first = true;
    } else {
      if (sequencenumber !== lastSequenceNumber + 1) {
        return segmentAckResponse(receiver, true, server, invokeId, lastSequenceNumber, proposedWindowNumber);
      }
    }
    lastSequenceNumber = sequencenumber;
    var moreFollows = ((type & baEnum.BacnetPduTypes.MORE_FOLLOWS) === baEnum.BacnetPduTypes.MORE_FOLLOWS);
    if (!moreFollows) {
      lastSequenceNumber = 0;
    }
    if ((sequencenumber % proposedWindowNumber) === 0 || !moreFollows) {
      segmentAckResponse(receiver, false, server, invokeId, sequencenumber, proposedWindowNumber);
    }
    performDefaultSegmentHandling(this, receiver, type, service, invokeId, maxSegments, maxAdpu, sequencenumber, first, moreFollows, buffer, offset, length);
  };

  var processUnconfirmedServiceRequest = function(address, type, service, buffer, offset, length) {
    debug('Handle processUnconfirmedServiceRequest');
    if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_I_AM) {
      var result = baServices.decodeIamBroadcast(buffer, offset);
      if (result) {
        whoIsHandler(address, result.deviceId, result.maxApdu, result.segmentation, result.vendorId);
      } else {
        debug('Received invalid iAm message');
      }
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS) {
      return debug('TODO: Implement');
      // TODO: Implement
      /*var result = baServices.decodeWhoIsBroadcast(buffer, offset, length);
      if (result) {
        OnWhoIs(this, address, result.lowLimit, result.highLimit);
      } else {
        debug('Received invalid whoIs message');
      }*/
    } else {
      debug('Received unsupported unconfirmed service request');
    }
  };

  var handlePdu = function(address, type, buffer, offset, length) {
    var result;
    // Handle different PDU types
    switch (type & baEnum.BacnetPduTypes.PDU_TYPE_MASK) {
      case baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST:
        result = baAdpu.decodeUnconfirmedServiceRequest(buffer, offset);
        processUnconfirmedServiceRequest(address, result.type, result.service, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_SIMPLE_ACK:
        result = baAdpu.decodeSimpleAck(buffer, offset);
        offset += result.len;
        length -= result.len;
        invokeCallback({result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_COMPLEX_ACK:
        result = baAdpu.decodeComplexAck(buffer, offset);
        if ((type & baEnum.BacnetPduTypes.SEGMENTED_MESSAGE) === 0) {
          invokeCallback({result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        } else {
          processSegment(address, result.type, result.service, result.invokeId, baEnum.BacnetMaxSegments.MAX_SEG0, baEnum.BacnetMaxAdpu.MAX_baAdpu50, false, result.sequencenumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
        }
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_SEGMENT_ACK:
        result = baAdpu.decodeSegmentAck(buffer, offset);
        //m_last_segment_ack.Set(address, result.originalInvokeId, result.sequencenumber, result.actualWindowSize);
        //processSegmentAck(address, result.type, result.originalInvokeId, result.sequencenumber, result.actualWindowSize, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_ERROR:
        result = baAdpu.decodeError(buffer, offset);
        //processError(address, result.type, result.service, result.invokeId, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_REJECT:
      case baEnum.BacnetPduTypes.PDU_TYPE_ABORT:
        result = baAdpu.decodeAbort(buffer, offset);
        //processAbort(address, result.type, result.invokeId, result.reason, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST:
        result = baAdpu.decodeConfirmedServiceRequest(buffer, offset);
        if ((type & baEnum.BacnetPduTypes.SEGMENTED_MESSAGE) === 0) {
          //processConfirmedServiceRequest(address, result.type, result.service, result.maxSegments, result.maxAdpu, result.invokeId, buffer, offset + result.len, length - result.len);
        } else {
          processSegment(address, result.type, result.service, result.invokeId, result.maxSegments, result.maxAdpu, true, result.sequencenumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
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
  };

  var receiveData = self.receiveData = function(buffer, remoteAddress) {
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

  // Public Functions
  self.whoIs = function(lowLimit, highLimit, address, handler) {
    whoIsHandler = handler;

    var buffer = getBuffer();
    address = address || transport.getBroadcastAddress();
    baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS);
    baServices.EncodeWhoIsBroadcast(buffer, lowLimit, highLimit);
    // TODO: Differentiate between uni & broadcast
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  self.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex, next) {
    arrayIndex = arrayIndex || baAsn1.BACNET_ARRAY_ALL;
    // HACK: Use real value
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    // TODO: Replace address
    baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage | baEnum.BacnetNpduControls.ExpectingReply, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    var type = baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (maxSegments !== baEnum.BacnetMaxSegments.MAX_SEG0 ? baEnum.BacnetPduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeCounter, 0, 0);
    baServices.EncodeReadProperty(buffer, objectType, objectInstance, propertyId, arrayIndex);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeCounter++, function(err, data) {
      if (err) return next(err);
      var result = baServices.DecodeReadPropertyAcknowledge(data.buffer, data.offset, data.length);
      next(null, result);
    });
  };

  self.writeProperty = function(address, objectType, objectInstance, propertyId, priority, valueList, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage | baEnum.BacnetNpduControls.ExpectingReply, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeCounter, 0, 0);
    baServices.EncodeWriteProperty(buffer, objectType, objectInstance, propertyId, baAsn1.BACNET_ARRAY_ALL, priority, valueList);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeCounter++, function(err, data) {
      if (err) return next(err);
      // FIXME: Implement DecodeWritePropertyAcknowledge function
      //var result = baServices.DecodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
      next(null, data);
    });
  };

  self.readPropertyMultiple = function(address, propertiesArray, next) {
    // HACK: Use real value
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    baNpdu.Encode(buffer, baEnum.BacnetNpduControls.PriorityNormalMessage | baEnum.BacnetNpduControls.ExpectingReply, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    var type = baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (baEnum.maxSegments !== baEnum.BacnetMaxSegments.MAX_SEG0 ? baEnum.BacnetPduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeCounter, 0, 0);
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

  self.writePropertyMultiple = function(address, propertiesArray, cb) {

  };

  transport.setHandler(receiveData);

  return self;
};
