// Util Modules
var events        = require('events');
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

  var invokeCounter = 1;
  var invokeStore = {};

  var lastSequenceNumber = 0;
  var segmentStore = [];

  var transport = settings.transport || new baTransport({
    port: settings.port,
    interface: settings.interface,
    broadcastAddress: settings.broadcastAddress
  });

  // Local Handlers
  self.events = new events.EventEmitter();

  // Helper utils
  var getInvokeId = function() {
    var id = invokeCounter++;
    if (id >= 256) invokeCounter = 1;
    return id - 1;
  };

  var invokeCallback = function(id, err, result) {
    var callback = invokeStore[id];
    if (callback) return callback(err, result);
    debug('InvokeId ', id, ' not found -> drop package');
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
      offset: BVLC_HEADER_LENGTH
    };
  };

  // Service Handlers
  var processError = function(invokeId, buffer, offset, length) {
    var result = baServices.decodeError(buffer, offset, length);
    if (!result) return debug('Couldn`t decode Error');
    invokeCallback(invokeId, new Error('BacnetError - Class:' + result.class + ' - Code:' + result.code));
  };

  var processAbort = function(invokeId, reason) {
    invokeCallback(invokeId, new Error('BacnetAbort - Reason:' + reason));
  };

  var segmentAckResponse = function(receiver, negative, server, originalInvokeId, sequencenumber, actualWindowSize) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, receiver, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
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
    var result;
    debug('Handle processUnconfirmedServiceRequest');
    if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_I_AM) {
      result = baServices.decodeIamBroadcast(buffer, offset);
      if (!result) return debug('Received invalid iAm message');
      self.events.emit('iAm', address, result.deviceId, result.maxApdu, result.segmentation, result.vendorId);
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS) {
      result = baServices.decodeWhoIsBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoIs message');
      self.events.emit('whoIs', address, result.lowLimit, result.highLimit);
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_HAS) {
      result = baServices.decodeWhoHasBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoHas message');
      self.events.emit('whoHas', address, result.lowLimit, result.highLimit, result.objId, result.objName);
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_COV_NOTIFICATION) {
      debug('TODO: Implement COVNotify');
      //result = baServices.DecodeCOVNotifyUnconfirmed(buffer, offset, length);
      //if (!result) return debug('Received invalid COVNotify message');
      //self.events.emit('covNotify', address, result.subscriberProcessIdentifier, result.initiatingDeviceIdentifier, result.monitoredObjectIdentifier, result.timeRemaining, result.values);
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSync message');
      self.events.emit('timeSync', address, result.dateTime);
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSyncUTC message');
      self.events.emit('timeSyncUTC', address, result.dateTime);
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_EVENT_NOTIFICATION) {
      debug('TODO: Implement EventNotify');
      //result = baServices.decodeEventNotifyData(buffer, offset, length);
      //if (!result) return debug('Received invalid EventNotify message');
      //self.events.emit('eventNotify', address, result.eventData);
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
        invokeCallback(result.invokeId, null, {result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_COMPLEX_ACK:
        result = baAdpu.decodeComplexAck(buffer, offset);
        if ((type & baEnum.BacnetPduTypes.SEGMENTED_MESSAGE) === 0) {
          invokeCallback(result.invokeId, null, {result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        } else {
          processSegment(address, result.type, result.service, result.invokeId, baEnum.BacnetMaxSegments.MAX_SEG0, baEnum.BacnetMaxAdpu.MAX_APDU50, false, result.sequencenumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
        }
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_SEGMENT_ACK:
        result = baAdpu.decodeSegmentAck(buffer, offset);
        //m_last_segment_ack.Set(address, result.originalInvokeId, result.sequencenumber, result.actualWindowSize);
        //processSegmentAck(address, result.type, result.originalInvokeId, result.sequencenumber, result.actualWindowSize, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_ERROR:
        result = baAdpu.decodeError(buffer, offset);
        processError(result.invokeId, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.BacnetPduTypes.PDU_TYPE_REJECT:
      case baEnum.BacnetPduTypes.PDU_TYPE_ABORT:
        result = baAdpu.decodeAbort(buffer, offset);
        processAbort(result.invokeId, result.reason);
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
    if (msgLength <= 0) return debug('No NPDU data -> Drop package');
    // Parse baNpdu header
    var result = baNpdu.decode(buffer, offset);
    if (!result) return debug('Received invalid NPDU header -> Drop package');
    if ((result.funct & baEnum.BacnetNpduControls.NETWORK_LAYER_MESSAGE) === baEnum.BacnetNpduControls.NETWORK_LAYER_MESSAGE) {
      return debug('Received network layer message -> Drop package');
    }
    offset += result.len;
    msgLength -= result.len;
    if (msgLength <= 0) return debug('No APDU data -> Drop package');
    var apduType = baAdpu.getDecodedType(buffer, offset);
    handlePdu(remoteAddress, apduType, buffer, offset, msgLength);
  };

  var receiveData = self.receiveData = function(buffer, remoteAddress) {
    // Check data length
    if (buffer.length < baBvlc.BVLC_HEADER_LENGTH) return debug('Received invalid data -> Drop package');
    // Parse BVLC header
    var result = baBvlc.decode(buffer, 0);
    if (!result) return debug('Received invalid BVLC header -> Drop package');
    // Check BVLC function
    if (result.func === baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU || result.func === baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU || result.func === baEnum.BacnetBvlcFunctions.BVLC_FORWARDED_NPDU) {
      handleNpdu(buffer, result.len, buffer.length - result.len, remoteAddress);
    } else {
      debug('Received unknown BVLC function -> Drop package');
    }
  };

  var receiveError = function(err) {
    self.events.emit('error', err);
  };

  // Public Functions
  self.whoIs = function(lowLimit, highLimit, address) {
    var buffer = getBuffer();
    address = address || transport.getBroadcastAddress();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS);
    baServices.encodeWhoIsBroadcast(buffer, lowLimit, highLimit);
    // TODO: Differentiate between uni & broadcast
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  self.timeSync = function(address, dateTime, isUtc) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, address);
    if (!isUtc) {
      baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION);
    } else {
      baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION);
    }
    baServices.encodeTimeSync(buffer, dateTime);
    // TODO: Support broadcast
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  self.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex, next) {
    arrayIndex = arrayIndex || baAsn1.BACNET_ARRAY_ALL;
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    var type = baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (maxSegments !== baEnum.BacnetMaxSegments.MAX_SEG0 ? baEnum.BacnetPduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeReadProperty(buffer, objectType, objectInstance, propertyId, arrayIndex);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeReadPropertyAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.writeProperty = function(address, objectType, objectInstance, propertyId, priority, valueList, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeWriteProperty(buffer, objectType, objectInstance, propertyId, baAsn1.BACNET_ARRAY_ALL, priority, valueList);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      // FIXME: Implement decodeWritePropertyAcknowledge function
      //var result = baServices.decodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
      next(null, data);
    });
  };

  self.readPropertyMultiple = function(address, propertiesArray, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    var type = baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (baEnum.maxSegments !== baEnum.BacnetMaxSegments.MAX_SEG0 ? baEnum.BacnetPduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeReadPropertyMultiple(buffer, propertiesArray);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.writePropertyMultiple = function(address, valueList, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_WRITE_PROP_MULTIPLE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId);
    baServices.encodeWriteObjectMultiple(buffer, valueList);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      // TODO: Handle simple-ack
      var result = true;
      next(null, result);
    });
  };

  self.deviceCommunicationControl = function(address, timeDuration, enableDisable, password, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_DEVICE_COMMUNICATION_CONTROL, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeDeviceCommunicationControl(buffer, timeDuration, enableDisable, password);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      // TODO: Encode answer
      //var result = baServices.decodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
      //if (!result) return next(new Error('INVALID_DECODING'));
      var result = true;
      next(null, result);
    });
  };

  self.reinitializeDevice = function(address, state, password, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_REINITIALIZE_DEVICE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeReinitializeDevice(buffer, state, password);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      // TODO: Encode answer
      //var result = baServices.decodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
      //if (!result) return next(new Error('INVALID_DECODING'));
      var result = true;
      next(null, result);
    });
  };

  self.close = function() {
    transport.close();
  };

  transport.setMessageHandler(receiveData);
  transport.setErrorHandler(receiveError);
  transport.open();

  return self;
};
