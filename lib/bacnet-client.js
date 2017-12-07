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

/**
 * To be able to communicate to BACNET devices, you have to initialize a new bacstack instance.
 * @class bacstack
 * @param {object=} settings - The options object used for parameterizing the bacstack.
 * @param {number=} [settings.port=47808] - BACNET communication port for listening and sending.
 * @param {string=} settings.interface - Specific BACNET communication interface if different from primary one.
 * @param {string=} [settings.broadcastAddress=255.255.255.255] - The address used for broadcast messages.
 * @param {number=} [settings.adpuTimeout=3000] - The timeout in milliseconds until a transaction should be interpreted as error.
 * @example
 * var bacnet = require('bacstack');
 *
 * var client = new bacnet({
 *   port: 47809,                          // Use BAC1 as communication port
 *   interface: '192.168.251.10',          // Listen on a specific interface
 *   broadcastAddress: '192.168.251.255',  // Use the subnet broadcast address
 *   adpuTimeout: 6000                     // Wait twice as long for response
 * });
 */
module.exports = function(options) {
  var self = new events.EventEmitter();

  var DEFAULT_HOP_COUNT = 0xFF;
  var BVLC_HEADER_LENGTH = 4;

  var invokeCounter = 1;
  var invokeStore = {};

  var lastSequenceNumber = 0;
  var segmentStore = [];

  options = options || {};
  var settings = {
    port: options.port || 47808,
    interface: options.interface,
    transport: options.transport,
    broadcastAddress: options.broadcastAddress || '255.255.255.255',
    adpuTimeout: options.adpuTimeout || 3000
  };

  var transport = settings.transport || new baTransport({
    port: settings.port,
    interface: settings.interface,
    broadcastAddress: settings.broadcastAddress
  });

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

  var processConfirmedServiceRequest = function(address, type, service, maxSegments, maxAdpu, invokeId, buffer, offset, length) {
    var result;
    debug('Handle processConfirmedServiceRequest');
    if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY) {
      result = baServices.decodeReadProperty(buffer, offset, length);
      if (!result) return debug('Received invalid readProperty message');
      self.emit('readProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY) {
      result = baServices.decodeWriteProperty(buffer, offset, length);
      if (!result) return debug('Received invalid writeProperty message');
      self.emit('writeProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE) {
      result = baServices.decodeReadPropertyMultiple(buffer, offset, length);
      if (!result) return debug('Received invalid readPropertyMultiple message');
      self.emit('readPropertyMultiple', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_WRITE_PROP_MULTIPLE) {
      result = baServices.decodeWritePropertyMultiple(buffer, offset, length);
      if (!result) return debug('Received invalid writePropertyMultiple message');
      self.emit('writePropertyMultiple', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_COV_NOTIFICATION) {
      result = baServices.decodeCOVNotify(buffer, offset, length);
      if (!result) return debug('Received invalid covNotify message');
      self.emit('covNotify', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_ATOMIC_WRITE_FILE) {
      result = baServices.decodeAtomicWriteFile(buffer, offset, length);
      if (!result) return debug('Received invalid atomicWriteFile message');
      self.emit('atomicWriteFile', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_ATOMIC_READ_FILE) {
      result = baServices.decodeAtomicReadFile(buffer, offset, length);
      if (!result) return debug('Received invalid atomicReadFile message');
      self.emit('atomicReadFile', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV) {
      result = baServices.decodeSubscribeCOV(buffer, offset, length);
      if (!result) return debug('Received invalid subscribeCOV message');
      self.emit('subscribeCOV', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV_PROPERTY) {
      result = baServices.decodeSubscribeProperty(buffer, offset, length);
      if (!result) return debug('Received invalid subscribeProperty message');
      self.emit('subscribeProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_DEVICE_COMMUNICATION_CONTROL) {
      result = baServices.decodeDeviceCommunicationControl(buffer, offset, length);
      if (!result) return debug('Received invalid deviceCommunicationControl message');
      self.emit('deviceCommunicationControl', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_REINITIALIZE_DEVICE) {
      result = baServices.decodeReinitializeDevice(buffer, offset, length);
      if (!result) return debug('Received invalid reinitializeDevice message');
      self.emit('reinitializeDevice', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_EVENT_NOTIFICATION) {
      result = baServices.decodeEventNotifyData(buffer, offset, length);
      if (!result) return debug('Received invalid eventNotifyData message');
      self.emit('eventNotifyData', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_RANGE) {
      result = baServices.decodeReadRange(buffer, offset, length);
      if (!result) return debug('Received invalid readRange message');
      self.emit('readRange', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_CREATE_OBJECT) {
      result = baServices.decodeCreateObject(buffer, offset, length);
      if (!result) return debug('Received invalid createObject message');
      self.emit('createObject', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_DELETE_OBJECT) {
      result = baServices.decodeDeleteObject(buffer, offset, length);
      if (!result) return debug('Received invalid deleteObject message');
      self.emit('deleteObject', {address: address, invokeId: invokeId, request: result});
    } else {
      debug('Received unsupported confirmed service request');
    }
  };

  var processUnconfirmedServiceRequest = function(address, type, service, buffer, offset, length) {
    var result;
    debug('Handle processUnconfirmedServiceRequest');
    if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_I_AM) {
      result = baServices.decodeIamBroadcast(buffer, offset);
      if (!result) return debug('Received invalid iAm message');

      /**
       * @event bacstack.iAm
       * @param {object} device - An object representing the detected device.
       * @param {string} device.address - The IP address of the detected device.
       * @param {number} device.deviceId - The BACNET device-id of the detected device.
       * @param {number} device.maxAdpu - The max ADPU size the detected device is supporting.
       * @param {number} device.segmentation - The type of segmentation the detected device is supporting.
       * @param {number} device.vendorId - The BACNET vendor-id of the detected device.
       * @example
       * var bacnet = require('bacstack');
       * var client = new bacnet();
       *
       * client.on('iAm', function(device) {
       *   console.log('address: ', device.address, ' - deviceId: ', device.deviceId, ' - maxAdpu: ', device.maxAdpu, ' - segmentation: ', device.segmentation, ' - vendorId: ', device.vendorId);
       * });
       */
      self.emit('iAm', {address: address, deviceId: result.deviceId, maxApdu: result.maxApdu, segmentation: result.segmentation, vendorId: result.vendorId});
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS) {
      result = baServices.decodeWhoIsBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoIs message');
      self.emit('whoIs', {address: address, lowLimit: result.lowLimit, highLimit: result.highLimit});
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_HAS) {
      result = baServices.decodeWhoHasBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoHas message');
      self.emit('whoHas', {address: address, lowLimit: result.lowLimit, highLimit: result.highLimit, objId: result.objId, objName: result.objName});
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_COV_NOTIFICATION) {
      result = baServices.decodeCOVNotify(buffer, offset, length);
      if (!result) return debug('Received invalid covNotifyUnconfirmed message');
      self.emit('covNotifyUnconfirmed', {address: address, request: result});
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSync message');
      self.emit('timeSync', {address: address, dateTime: result.dateTime});
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSyncUTC message');
      self.emit('timeSyncUTC', {address: address, dateTime: result.dateTime});
    } else if (service === baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_EVENT_NOTIFICATION) {
      result = baServices.decodeEventNotifyData(buffer, offset, length);
      if (!result) return debug('Received invalid EventNotify message');
      self.emit('eventNotify', {address: address, eventData: result.eventData});
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
          processConfirmedServiceRequest(address, result.type, result.service, result.maxSegments, result.maxAdpu, result.invokeId, buffer, offset + result.len, length - result.len);
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

    /**
     * @event bacstack.error
     * @param {error} err - The IP address of the detected device.
     * @example
     * var bacnet = require('bacstack');
     * var client = new bacnet();
     *
     * client.on('error', function(err) {
     *   console.log('Error occurred: ', err);
     *   client.close();
     * });
     */
    self.emit('error', err);
  };

  /**
   * The whoIs command discovers all BACNET devices in a network.
   * @function bacstack.whoIs
   * @param {number=} lowLimit - Minimal device instance number to search for.
   * @param {number=} highLimit - Maximal device instance number to search for.
   * @param {string=} address - Unicast address if command should device directly.
   * @fires bacstack.iAm
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.whoIs();
   */
  self.whoIs = function(lowLimit, highLimit, address) {
    var buffer = getBuffer();
    address = address || transport.getBroadcastAddress();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, address, null, DEFAULT_HOP_COUNT, baEnum.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS);
    baServices.encodeWhoIsBroadcast(buffer, lowLimit, highLimit);
    var npduType = (address !== transport.getBroadcastAddress()) ? baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  /**
   * The timeSync command sets the time of a target device.
   * @function bacstack.timeSync
   * @param {string} address - IP address of the target device.
   * @param {date} dateTime - The date and time to set on the target device.
   * @param {boolean} [isUtc=false] - Identifier if UTC time sync service shall be used.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.timeSync('192.168.1.43', new Date(), true);
   */
  self.timeSync = function(address, dateTime, isUtc) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, address);
    if (!isUtc) {
      baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION);
    } else {
      baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION);
    }
    baServices.encodeTimeSync(buffer, dateTime);
    var npduType = (address !== transport.getBroadcastAddress()) ? baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  /**
   * The readProperty command reads a single property of an object from a device.
   * @function bacstack.readProperty
   * @param {string} address - IP address of the target device.
   * @param {number} objectType - The BACNET object type to read.
   * @param {number} objectInstance - The BACNET object instance to read.
   * @param {number} propertyId - The BACNET property id in the specified object to read.
   * @param {number=} arrayIndex - The array index of the property to be read.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.readProperty('192.168.1.43', 8, 44301, 28, null, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
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

  /**
   * The writeProperty command writes a single property of an object to a device.
   * @function bacstack.writeProperty
   * @param {string} address - IP address of the target device.
   * @param {number} objectType - The BACNET object type to write.
   * @param {number} objectInstance - The BACNET object instance to write.
   * @param {number} propertyId - The BACNET property id in the specified object to write.
   * @param {number} priority - The priority to be used for writing to the property.
   * @param {object[]} valueList - A list of values to be written to the specified property.
   * @param {BacnetApplicationTags} valueList.tag - The data-type of the value to be written.
   * @param {number} valueList.value - The actual value to be written.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.writeProperty('192.168.1.43', 8, 44301, 28, 12, [
   *   {type: bacnet.enum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL, value: 100}
   * ], function(err, value) {
   *   console.log('value: ', value);
   * });
   */
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
      next(err);
    });
  };

  /**
   * The readPropertyMultiple command reads multiple properties in multiple objects from a device.
   * @function bacstack.readPropertyMultiple
   * @param {string} address - IP address of the target device.
   * @param {object[]} propertyIdAndArrayIndex - List of object and property specifications to be read.
   * @param {object} propertyIdAndArrayIndex.objectIdentifier - Specifies which object to read.
   * @param {number} propertyIdAndArrayIndex.objectIdentifier.type - The BACNET object type to read.
   * @param {number} propertyIdAndArrayIndex.objectIdentifier.instance - The BACNET object instance to read.
   * @param {object[]} propertyIdAndArrayIndex.propertyReferences - List of properties to be read.
   * @param {number} propertyIdAndArrayIndex.propertyReferences.propertyIdentifier - The BACNET property id in the specified object to read. Also supports 8 for all properties.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * var requestArray = [
   *   {objectIdentifier: {type: 8, instance: 4194303}, propertyReferences: [{propertyIdentifier: 8}]}
   * ];
   * client.readPropertyMultiple('192.168.1.43', requestArray, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
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

  /**
   * The writePropertyMultiple command writes multiple properties in multiple objects to a device.
   * @function bacstack.writePropertyMultiple
   * @param {string} address - IP address of the target device.
   * @param {object[]} valueList - List of object and property specifications to be written.
   * @param {object} valueList.objectIdentifier - Specifies which object to read.
   * @param {number} valueList.objectIdentifier.type - The BACNET object type to read.
   * @param {number} valueList.objectIdentifier.instance - The BACNET object instance to read.
   * @param {object[]} valueList.values - List of properties to be written.
   * @param {object} valueList.values.property - Property specifications to be written.
   * @param {number} valueList.values.property.propertyIdentifier - The BACNET property id in the specified object to write.
   * @param {number} valueList.values.property.propertyArrayIndex - The array index of the property to be written.
   * @param {object[]} valueList.values.value - A list of values to be written to the specified property.
   * @param {BacnetApplicationTags} valueList.values.value.tag - The data-type of the value to be written.
   * @param {object} valueList.values.value.value - The actual value to be written.
   * @param {number} valueList.values.priority - The priority to be used for writing to the property.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * var valueList = [
   *   {objectIdentifier: {type: 8, instance: 44301}, values: [
   *     {property: {propertyIdentifier: 28, propertyArrayIndex: 12}, value: [{type: bacnet.enum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, value: true}], priority: 8}
   *   ]}
   * ];
   * client.writePropertyMultiple('192.168.1.43', valueList, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
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
      next(err);
    });
  };

  /**
   * The deviceCommunicationControl command enables or disables network communication of the target device.
   * @function bacstack.deviceCommunicationControl
   * @param {string} address - IP address of the target device.
   * @param {number} timeDuration - The time to hold the network communication state in seconds. 0 for infinite.
   * @param {BacnetEnableDisable} enableDisable - The network communication state to set.
   * @param {string=} password - The optional password used to set the network communication state.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.deviceCommunicationControl('192.168.1.43', 0, bacnet.enum.BacnetEnableDisable.DISABLE, 'Test1234$', function(err, value) {
   *   console.log('value: ', value);
   * });
   */
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
      next(err);
    });
  };

  /**
   * The reinitializeDevice command initiates a restart of the target device.
   * @function bacstack.reinitializeDevice
   * @param {string} address - IP address of the target device.
   * @param {BacnetReinitializedStates} state - The type of restart to be initiated.
   * @param {string=} password - The optional password used to restart the device.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.reinitializeDevice('192.168.1.43', bacnet.enum.BacnetReinitializedStates.BACNET_REINIT_COLDSTART, 'Test1234$', function(err, value) {
   *   console.log('value: ', value);
   * });
   */
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
      next(err);
    });
  };

  self.writeFile = function(address, objectId, position, count, fileBuffer, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_ATOMIC_WRITE_FILE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeAtomicWriteFile(buffer, true, objectId, position, 1, fileBuffer, count);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeAtomicWriteFileAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.readFile = function(address, objectId, position, count, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_ATOMIC_READ_FILE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeAtomicReadFile(buffer, true, objectId, position, count);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeAtomicReadFileAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.readRange = function(address, objectId, idxBegin, quantity, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_RANGE, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeReadRange(buffer, objectId, baEnum.BacnetPropertyIds.PROP_LOG_BUFFER, baAsn1.BACNET_ARRAY_ALL, baEnum.BacnetReadRangeRequestTypes.RR_BY_POSITION, idxBegin, new Date(), quantity);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeReadRangeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.subscribeCOV = function(address, objectId, subscribeId, cancel, issueConfirmedNotifications, lifetime, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeSubscribeCOV(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, lifetime);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.subscribeProperty = function(address, objectId, monitoredProperty, subscribeId, cancel, issueConfirmedNotifications, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV_PROPERTY, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeSubscribeProperty(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, 0, monitoredProperty, false, 0x0f);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.createObject = function(address, objectId, valueList, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_CREATE_OBJECT, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeCreateObject(buffer, objectId, valueList);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.deleteObject = function(address, objectId, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_DELETE_OBJECT, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeDeleteObject(buffer, objectId);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.removeListElement = function(address, objectId, reference, valueList, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_REMOVE_LIST_ELEMENT, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeAddListElement(buffer, objectId, reference.propertyIdentifier, reference.propertyArrayIndex, valueList);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.addListElement = function(address, objectId, reference, valueList, next) {
    var maxSegments = baEnum.BacnetMaxSegments.MAX_SEG65;
    var buffer = getBuffer();
    var invokeId = getInvokeId();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.BacnetNpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_ADD_LIST_ELEMENT, maxSegments, baEnum.BacnetMaxAdpu.MAX_APDU1476, invokeId, 0, 0);
    baServices.encodeAddListElement(buffer, objectId, reference.propertyIdentifier, reference.propertyArrayIndex, valueList);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  // Public Device Functions
  self.readPropertyResponse = function(receiver, invokeId, objectId, property, value) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeComplexAck(buffer, baEnum.BacnetPduTypes.PDU_TYPE_COMPLEX_ACK, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, invokeId);
    baServices.encodeReadPropertyAcknowledge(buffer, objectId, property.propertyIdentifier, property.propertyArrayIndex, value);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  self.readPropertyMultipleResponse = function(receiver, invokeId, values) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeComplexAck(buffer, baEnum.BacnetPduTypes.PDU_TYPE_COMPLEX_ACK, baEnum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, invokeId);
    baServices.encodeReadPropertyMultipleAcknowledge(buffer, values);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  self.iAmResponse = function(deviceId, segmentation, vendorId) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, transport.getBroadcastAddress());
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_I_AM);
    baServices.encodeIamBroadcast(buffer, deviceId, transport.getMaxPayload(), segmentation, vendorId);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, transport.getBroadcastAddress());
  };

  self.iHaveResponse = function(deviceId, objId, objName) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, transport.getBroadcastAddress());
    baAdpu.EecodeUnconfirmedServiceRequest(buffer, baEnum.BacnetPduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.BacnetUnconfirmedServices.SERVICE_UNCONFIRMED_I_HAVE);
    baServices.EncodeIhaveBroadcast(buffer, deviceId, objId, objName);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, transport.getBroadcastAddress());
  };

  self.simpleAckResponse = function(receiver, service, invokeId) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeSimpleAck(buffer, baEnum.BacnetPduTypes.PDU_TYPE_SIMPLE_ACK, service, invokeId);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  self.errorResponse = function(receiver, service, invokeId, errorClass, errorCode) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.BacnetNpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeError(buffer, baEnum.BacnetPduTypes.PDU_TYPE_ERROR, service, invokeId);
    baServices.encodeError(buffer, errorClass, errorCode);
    baBvlc.encode(buffer.buffer, baEnum.BacnetBvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  /**
   * Unloads the current BACstack instance and closes the underlying UDP socket.
   * @function bacstack.close
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.close();
   */
  self.close = function() {
    transport.close();
  };

  // Setup code
  transport.setMessageHandler(receiveData);
  transport.setErrorHandler(receiveError);
  transport.open();

  return self;
};
