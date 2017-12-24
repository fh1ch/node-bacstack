// Util Modules
var events        = require('events');
var debug         = require('debug')('bacstack');

// Local Modules
var baTransport   = require('./transport');
var baServices    = require('./services');
var baAsn1        = require('./asn1');
var baAdpu        = require('./adpu');
var baNpdu        = require('./npdu');
var baBvlc        = require('./bvlc');
var baEnum        = require('./enum');

/**
 * To be able to communicate to BACNET devices, you have to initialize a new bacstack instance.
 * @class bacstack
 * @param {object=} settings - The options object used for parameterizing the bacstack.
 * @param {number=} [options.port=47808] - BACNET communication port for listening and sending.
 * @param {string=} options.interface - Specific BACNET communication interface if different from primary one.
 * @param {string=} [options.broadcastAddress=255.255.255.255] - The address used for broadcast messages.
 * @param {number=} [options.adpuTimeout=3000] - The timeout in milliseconds until a transaction should be interpreted as error.
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
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeSegmentAck(buffer, baEnum.PduTypes.PDU_TYPE_SEGMENT_ACK | (negative ? baEnum.PduTypes.NEGATIVE_ACK : 0) | (server ? baEnum.PduTypes.SERVER : 0), originalInvokeId, sequencenumber, actualWindowSize);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  var performDefaultSegmentHandling = function(sender, adr, type, service, invokeId, maxSegments, maxAdpu, sequencenumber, first, moreFollows, buffer, offset, length) {
    if (first) {
      segmentStore = [];
      type &= ~baEnum.PduTypes.SEGMENTED_MESSAGE;
      var adpuHeaderLen = 3;
      if ((type & baEnum.PduTypes.PDU_TYPE_MASK) === baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST) {
        adpuHeaderLen = 4;
      }
      var adpubuffer = getBuffer();
      adpubuffer.offset = 0;
      buffer.copy(adpubuffer.buffer, adpuHeaderLen, offset, offset + length);
      if ((type & baEnum.PduTypes.PDU_TYPE_MASK) === baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST) {
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
      type &= ~baEnum.PduTypes.SEGMENTED_MESSAGE;
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
    var moreFollows = ((type & baEnum.PduTypes.MORE_FOLLOWS) === baEnum.PduTypes.MORE_FOLLOWS);
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
    if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY) {
      result = baServices.decodeReadProperty(buffer, offset, length);
      if (!result) return debug('Received invalid readProperty message');
      self.emit('readProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY) {
      result = baServices.decodeWriteProperty(buffer, offset, length);
      if (!result) return debug('Received invalid writeProperty message');
      self.emit('writeProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE) {
      result = baServices.decodeReadPropertyMultiple(buffer, offset, length);
      if (!result) return debug('Received invalid readPropertyMultiple message');
      self.emit('readPropertyMultiple', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROP_MULTIPLE) {
      result = baServices.decodeWritePropertyMultiple(buffer, offset, length);
      if (!result) return debug('Received invalid writePropertyMultiple message');
      self.emit('writePropertyMultiple', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_COV_NOTIFICATION) {
      result = baServices.decodeCOVNotify(buffer, offset, length);
      if (!result) return debug('Received invalid covNotify message');
      self.emit('covNotify', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_WRITE_FILE) {
      result = baServices.decodeAtomicWriteFile(buffer, offset, length);
      if (!result) return debug('Received invalid atomicWriteFile message');
      self.emit('atomicWriteFile', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_READ_FILE) {
      result = baServices.decodeAtomicReadFile(buffer, offset, length);
      if (!result) return debug('Received invalid atomicReadFile message');
      self.emit('atomicReadFile', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV) {
      result = baServices.decodeSubscribeCOV(buffer, offset, length);
      if (!result) return debug('Received invalid subscribeCOV message');
      self.emit('subscribeCOV', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV_PROPERTY) {
      result = baServices.decodeSubscribeProperty(buffer, offset, length);
      if (!result) return debug('Received invalid subscribeProperty message');
      self.emit('subscribeProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_DEVICE_COMMUNICATION_CONTROL) {
      result = baServices.decodeDeviceCommunicationControl(buffer, offset, length);
      if (!result) return debug('Received invalid deviceCommunicationControl message');
      self.emit('deviceCommunicationControl', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_REINITIALIZE_DEVICE) {
      result = baServices.decodeReinitializeDevice(buffer, offset, length);
      if (!result) return debug('Received invalid reinitializeDevice message');
      self.emit('reinitializeDevice', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_EVENT_NOTIFICATION) {
      result = baServices.decodeEventNotifyData(buffer, offset, length);
      if (!result) return debug('Received invalid eventNotifyData message');
      self.emit('eventNotifyData', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_RANGE) {
      result = baServices.decodeReadRange(buffer, offset, length);
      if (!result) return debug('Received invalid readRange message');
      self.emit('readRange', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_CREATE_OBJECT) {
      result = baServices.decodeCreateObject(buffer, offset, length);
      if (!result) return debug('Received invalid createObject message');
      self.emit('createObject', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_DELETE_OBJECT) {
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
    if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_I_AM) {
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
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS) {
      result = baServices.decodeWhoIsBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoIs message');
      self.emit('whoIs', {address: address, lowLimit: result.lowLimit, highLimit: result.highLimit});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_WHO_HAS) {
      result = baServices.decodeWhoHasBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoHas message');
      self.emit('whoHas', {address: address, lowLimit: result.lowLimit, highLimit: result.highLimit, objectId: result.objectId, objectName: result.objectName});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_COV_NOTIFICATION) {
      result = baServices.decodeCOVNotify(buffer, offset, length);
      if (!result) return debug('Received invalid covNotifyUnconfirmed message');
      self.emit('covNotifyUnconfirmed', {address: address, request: result});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSync message');
      self.emit('timeSync', {address: address, dateTime: result.dateTime});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSyncUTC message');
      self.emit('timeSyncUTC', {address: address, dateTime: result.dateTime});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_EVENT_NOTIFICATION) {
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
    switch (type & baEnum.PduTypes.PDU_TYPE_MASK) {
      case baEnum.PduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST:
        result = baAdpu.decodeUnconfirmedServiceRequest(buffer, offset);
        processUnconfirmedServiceRequest(address, result.type, result.service, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.PduTypes.PDU_TYPE_SIMPLE_ACK:
        result = baAdpu.decodeSimpleAck(buffer, offset);
        offset += result.len;
        length -= result.len;
        invokeCallback(result.invokeId, null, {result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        break;
      case baEnum.PduTypes.PDU_TYPE_COMPLEX_ACK:
        result = baAdpu.decodeComplexAck(buffer, offset);
        if ((type & baEnum.PduTypes.SEGMENTED_MESSAGE) === 0) {
          invokeCallback(result.invokeId, null, {result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        } else {
          processSegment(address, result.type, result.service, result.invokeId, baEnum.MaxSegments.MAX_SEG0, baEnum.MaxAdpu.MAX_APDU50, false, result.sequencenumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
        }
        break;
      case baEnum.PduTypes.PDU_TYPE_SEGMENT_ACK:
        result = baAdpu.decodeSegmentAck(buffer, offset);
        //m_last_segment_ack.Set(address, result.originalInvokeId, result.sequencenumber, result.actualWindowSize);
        //processSegmentAck(address, result.type, result.originalInvokeId, result.sequencenumber, result.actualWindowSize, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.PduTypes.PDU_TYPE_ERROR:
        result = baAdpu.decodeError(buffer, offset);
        processError(result.invokeId, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.PduTypes.PDU_TYPE_REJECT:
      case baEnum.PduTypes.PDU_TYPE_ABORT:
        result = baAdpu.decodeAbort(buffer, offset);
        processAbort(result.invokeId, result.reason);
        break;
      case baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST:
        result = baAdpu.decodeConfirmedServiceRequest(buffer, offset);
        if ((type & baEnum.PduTypes.SEGMENTED_MESSAGE) === 0) {
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
    if ((result.funct & baEnum.NpduControls.NETWORK_LAYER_MESSAGE) === baEnum.NpduControls.NETWORK_LAYER_MESSAGE) {
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
    if (result.func === baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU || result.func === baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU || result.func === baEnum.BvlcFunctions.BVLC_FORWARDED_NPDU) {
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
   * @param {object=} options
   * @param {number=} options.lowLimit - Minimal device instance number to search for.
   * @param {number=} options.highLimit - Maximal device instance number to search for.
   * @param {string=} options.address - Unicast address if command should address a device directly.
   * @fires bacstack.iAm
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.whoIs();
   */
  self.whoIs = function(options) {
    options = options || {};
    var settings = {
      lowLimit: options.lowLimit,
      highLimit: options.highLimit,
      address: options.address || transport.getBroadcastAddress()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, settings.address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS);
    baServices.encodeWhoIsBroadcast(buffer, settings.lowLimit, settings.highLimit);
    var npduType = (settings.address !== transport.getBroadcastAddress()) ? baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, settings.address);
  };

  /**
   * The timeSync command sets the time of a target device.
   * @function bacstack.timeSync
   * @param {string} address - IP address of the target device.
   * @param {date} dateTime - The date and time to set on the target device.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.timeSync('192.168.1.43', new Date());
   */
  self.timeSync = function(address, dateTime) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, address);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION);
    baServices.encodeTimeSync(buffer, dateTime);
    var npduType = (address !== transport.getBroadcastAddress()) ? baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  /**
   * The timeSyncUTC command sets the UTC time of a target device.
   * @function bacstack.timeSyncUTC
   * @param {string} address - IP address of the target device.
   * @param {date} dateTime - The date and time to set on the target device.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.timeSyncUTC('192.168.1.43', new Date());
   */
  self.timeSyncUTC = function(address, dateTime) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, address);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION);
    baServices.encodeTimeSync(buffer, dateTime);
    var npduType = (address !== transport.getBroadcastAddress()) ? baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
  };

  /**
   * The readProperty command reads a single property of an object from a device.
   * @function bacstack.readProperty
   * @param {string} address - IP address of the target device.
   * @param {object} objectId - The BACNET object ID to read.
   * @param {number} objectId.type - The BACNET object type to read.
   * @param {number} objectId.instance - The BACNET object instance to read.
   * @param {number} propertyId - The BACNET property id in the specified object to read.
   * @param {object=} options
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {number=} options.arrayIndex - The array index of the property to be read.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.readProperty('192.168.1.43', {type: 8, instance: 44301}, 28, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.readProperty = function(address, objectId, propertyId, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId(),
      arrayIndex: options.arrayIndex || baAsn1.BACNET_ARRAY_ALL
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    var type = baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (settings.maxSegments !== baEnum.MaxSegments.MAX_SEG0 ? baEnum.PduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReadProperty(buffer, objectId.type, objectId.instance, propertyId, settings.arrayIndex);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
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
   * @param {object} objectId - The BACNET object ID to write.
   * @param {number} objectId.type - The BACNET object type to write.
   * @param {number} objectId.instance - The BACNET object instance to write.
   * @param {number} propertyId - The BACNET property id in the specified object to write.
   * @param {object[]} values - A list of values to be written to the specified property.
   * @param {ApplicationTags} values.tag - The data-type of the value to be written.
   * @param {number} values.value - The actual value to be written.
   * @param {object=} options
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {number=} options.arrayIndex - The array index of the property to be read.
   * @param {number=} options.priority - The priority of the value to be written.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.writeProperty('192.168.1.43', {type: 8, instance: 44301}, 28, [
   *   {type: bacnet.enum.ApplicationTags.BACNET_APPLICATION_TAG_REAL, value: 100}
   * ], function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.writeProperty = function(address, objectId, propertyId, values, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId(),
      arrayIndex: options.arrayIndex || baAsn1.BACNET_ARRAY_ALL,
      priority: options.priority
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeWriteProperty(buffer, objectId.type, objectId.instance, propertyId, settings.arrayIndex, settings.priority, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      next(err);
    });
  };

  /**
   * The readPropertyMultiple command reads multiple properties in multiple objects from a device.
   * @function bacstack.readPropertyMultiple
   * @param {string} address - IP address of the target device.
   * @param {object[]} requestArray - List of object and property specifications to be read.
   * @param {object} requestArray.objectId - Specifies which object to read.
   * @param {number} requestArray.objectId.type - The BACNET object type to read.
   * @param {number} requestArray.objectId.instance - The BACNET object instance to read.
   * @param {object[]} requestArray.properties - List of properties to be read.
   * @param {number} requestArray.properties.id - The BACNET property id in the specified object to read. Also supports 8 for all properties.
   * @param {object=} options
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * var requestArray = [
   *   {objectId: {type: 8, instance: 4194303}, properties: [{id: 8}]}
   * ];
   * client.readPropertyMultiple('192.168.1.43', requestArray, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.readPropertyMultiple = function(address, propertiesArray, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    var type = baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST | (baEnum.maxSegments !== baEnum.MaxSegments.MAX_SEG0 ? baEnum.PduTypes.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReadPropertyMultiple(buffer, propertiesArray);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
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
   * @param {object[]} values - List of object and property specifications to be written.
   * @param {object} values.objectId - Specifies which object to read.
   * @param {number} values.objectId.type - The BACNET object type to read.
   * @param {number} values.objectId.instance - The BACNET object instance to read.
   * @param {object[]} values.values - List of properties to be written.
   * @param {object} values.values.property - Property specifications to be written.
   * @param {number} values.values.property.id - The BACNET property id in the specified object to write.
   * @param {number} values.values.property.index - The array index of the property to be written.
   * @param {object[]} values.values.value - A list of values to be written to the specified property.
   * @param {ApplicationTags} values.values.value.tag - The data-type of the value to be written.
   * @param {object} values.values.value.value - The actual value to be written.
   * @param {number} values.values.priority - The priority to be used for writing to the property.
   * @param {object=} options
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * var values = [
   *   {objectId: {type: 8, instance: 44301}, values: [
   *     {property: {id: 28, index: 12}, value: [{type: bacnet.enum.ApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, value: true}], priority: 8}
   *   ]}
   * ];
   * client.writePropertyMultiple('192.168.1.43', values, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.writePropertyMultiple = function(address, values, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROP_MULTIPLE, settings.maxSegments, settings.maxAdpu, settings.invokeId);
    baServices.encodeWriteObjectMultiple(buffer, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      next(err);
    });
  };

  /**
   * The deviceCommunicationControl command enables or disables network communication of the target device.
   * @function bacstack.deviceCommunicationControl
   * @param {string} address - IP address of the target device.
   * @param {number} timeDuration - The time to hold the network communication state in seconds. 0 for infinite.
   * @param {EnableDisable} enableDisable - The network communication state to set.
   * @param {object=} options
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {string=} options.password - The optional password used to set the network communication state.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.deviceCommunicationControl('192.168.1.43', 0, bacnet.enum.EnableDisable.DISABLE, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.deviceCommunicationControl = function(address, timeDuration, enableDisable, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId(),
      password: options.password
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_DEVICE_COMMUNICATION_CONTROL, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeDeviceCommunicationControl(buffer, timeDuration, enableDisable, settings.password);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      next(err);
    });
  };

  /**
   * The reinitializeDevice command initiates a restart of the target device.
   * @function bacstack.reinitializeDevice
   * @param {string} address - IP address of the target device.
   * @param {ReinitializedStates} state - The type of restart to be initiated.
   * @param {object=} options
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {string=} options.password - The optional password used to restart the device.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.reinitializeDevice('192.168.1.43', bacnet.enum.ReinitializedStates.BACNET_REINIT_COLDSTART, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.reinitializeDevice = function(address, state, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId(),
      password: options.password
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_REINITIALIZE_DEVICE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReinitializeDevice(buffer, state, settings.password);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      next(err);
    });
  };

  self.writeFile = function(address, objectId, position, count, fileBuffer, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_WRITE_FILE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAtomicWriteFile(buffer, true, objectId, position, 1, fileBuffer, count);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeAtomicWriteFileAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.readFile = function(address, objectId, position, count, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_READ_FILE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAtomicReadFile(buffer, true, objectId, position, count);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeAtomicReadFileAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.readRange = function(address, objectId, idxBegin, quantity, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_RANGE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReadRange(buffer, objectId, baEnum.PropertyIds.PROP_LOG_BUFFER, baAsn1.BACNET_ARRAY_ALL, baEnum.ReadRangeRequestTypes.RR_BY_POSITION, idxBegin, new Date(), quantity);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeReadRangeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.subscribeCOV = function(address, objectId, subscribeId, cancel, issueConfirmedNotifications, lifetime, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeSubscribeCOV(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, lifetime);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.subscribeProperty = function(address, objectId, monitoredProperty, subscribeId, cancel, issueConfirmedNotifications, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV_PROPERTY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeSubscribeProperty(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, 0, monitoredProperty, false, 0x0f);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.createObject = function(address, objectId, values, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_CREATE_OBJECT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeCreateObject(buffer, objectId, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.deleteObject = function(address, objectId, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_DELETE_OBJECT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeDeleteObject(buffer, objectId);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.removeListElement = function(address, objectId, reference, values, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_REMOVE_LIST_ELEMENT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAddListElement(buffer, objectId, reference.id, reference.index, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.addListElement = function(address, objectId, reference, values, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ADD_LIST_ELEMENT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAddListElement(buffer, objectId, reference.id, reference.index, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  self.getAlarmSummary = function(address, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_ALARM_SUMMARY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeAlarmSummary(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.getEventInformation = function(address, objectId, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_EVENT_INFORMATION, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      var result = baServices.decodeEventInformation(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  };

  self.acknowledgeAlarm = function(address, objectId, eventState, ackText, evTimeStamp, ackTimeStamp, options, next) {
    next = next || options;
    var settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || getInvokeId()
    };
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ACKNOWLEDGE_ALARM, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAlarmAcknowledge(buffer, 57, objectId, eventState, ackText, evTimeStamp, ackTimeStamp);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, address);
    addCallback(settings.invokeId, function(err, data) {
      if (err) return next(err);
      next();
    });
  };

  // Public Device Functions
  self.readPropertyResponse = function(receiver, invokeId, objectId, property, value) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeComplexAck(buffer, baEnum.PduTypes.PDU_TYPE_COMPLEX_ACK, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, invokeId);
    baServices.encodeReadPropertyAcknowledge(buffer, objectId, property.id, property.index, value);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  self.readPropertyMultipleResponse = function(receiver, invokeId, values) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeComplexAck(buffer, baEnum.PduTypes.PDU_TYPE_COMPLEX_ACK, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, invokeId);
    baServices.encodeReadPropertyMultipleAcknowledge(buffer, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  self.iAmResponse = function(deviceId, segmentation, vendorId) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, transport.getBroadcastAddress());
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_I_AM);
    baServices.encodeIamBroadcast(buffer, deviceId, transport.getMaxPayload(), segmentation, vendorId);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, transport.getBroadcastAddress());
  };

  self.iHaveResponse = function(deviceId, objectId, objectName) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, transport.getBroadcastAddress());
    baAdpu.EecodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.PDU_TYPE_UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_I_HAVE);
    baServices.EncodeIhaveBroadcast(buffer, deviceId, objectId, objectName);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, transport.getBroadcastAddress());
  };

  self.simpleAckResponse = function(receiver, service, invokeId) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeSimpleAck(buffer, baEnum.PduTypes.PDU_TYPE_SIMPLE_ACK, service, invokeId);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    transport.send(buffer.buffer, buffer.offset, receiver);
  };

  self.errorResponse = function(receiver, service, invokeId, errorClass, errorCode) {
    var buffer = getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeError(buffer, baEnum.PduTypes.PDU_TYPE_ERROR, service, invokeId);
    baServices.encodeError(buffer, errorClass, errorCode);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
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
