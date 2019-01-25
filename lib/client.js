'use strict';

// Util Modules
const EventEmitter      = require('events').EventEmitter;
const debug             = require('debug')('bacstack');
debug.trace             = require('debug')('bacstack:trace');

// Local Modules
const baTransport       = require('./transport');
const baServices        = require('./services');
const baAsn1            = require('./asn1');
const baApdu            = require('./apdu');
const baNpdu            = require('./npdu');
const baBvlc            = require('./bvlc');
const baEnum            = require('./enum');

const BVLC_HEADER_LENGTH = 4;
const BVLC_FWD_HEADER_LENGTH = 10; // FORWARDED_NPDU

const beU = baEnum.UnconfirmedServiceChoice;
const unconfirmedServiceMap = {
  [beU.I_AM]:                           'iAm',
  [beU.WHO_IS]:                         'whoIs',
  [beU.WHO_HAS]:                        'whoHas',
  [beU.UNCONFIRMED_COV_NOTIFICATION]:   'covNotifyUnconfirmed',
  [beU.TIME_SYNCHRONIZATION]:           'timeSync',
  [beU.UTC_TIME_SYNCHRONIZATION]:       'timeSyncUTC',
  [beU.UNCONFIRMED_EVENT_NOTIFICATION]: 'eventNotify',
  [beU.I_HAVE]:                         'iHave',
  [beU.UNCONFIRMED_PRIVATE_TRANSFER]:   'privateTransfer',
};
const beC = baEnum.ConfirmedServiceChoice;
const confirmedServiceMap = {
  [beC.READ_PROPERTY]:                'readProperty',
  [beC.WRITE_PROPERTY]:               'writeProperty',
  [beC.READ_PROPERTY_MULTIPLE]:       'readPropertyMultiple',
  [beC.WRITE_PROPERTY_MULTIPLE]:      'writePropertyMultiple',
  [beC.CONFIRMED_COV_NOTIFICATION]:   'covNotify',
  [beC.ATOMIC_WRITE_FILE]:            'atomicWriteFile',
  [beC.ATOMIC_READ_FILE]:             'atomicReadFile',
  [beC.SUBSCRIBE_COV]:                'subscribeCov',
  [beC.SUBSCRIBE_COV_PROPERTY]:       'subscribeProperty',
  [beC.DEVICE_COMMUNICATION_CONTROL]: 'deviceCommunicationControl',
  [beC.REINITIALIZE_DEVICE]:          'reinitializeDevice',
  [beC.CONFIRMED_EVENT_NOTIFICATION]: 'eventNotify',
  [beC.READ_RANGE]:                   'readRange',
  [beC.CREATE_OBJECT]:                'createObject',
  [beC.DELETE_OBJECT]:                'deleteObject',
  [beC.ACKNOWLEDGE_ALARM]:            'alarmAcknowledge',
  [beC.GET_ALARM_SUMMARY]:            'getAlarmSummary',
  [beC.GET_ENROLLMENT_SUMMARY]:       'getEnrollmentSummary',
  [beC.GET_EVENT_INFORMATION]:        'getEventInformation',
  [beC.LIFE_SAFETY_OPERATION]:        'lifeSafetyOperation',
  [beC.ADD_LIST_ELEMENT]:             'addListElement',
  [beC.REMOVE_LIST_ELEMENT]:          'removeListElement',
  [beC.CONFIRMED_PRIVATE_TRANSFER]:   'privateTransfer',
};

/**
 * To be able to communicate to BACNET devices, you have to initialize a new bacstack instance.
 * @class bacstack
 * @param {object=} this._settings - The options object used for parameterizing the bacstack.
 * @param {number=} [options.port=47808] - BACNET communication port for listening and sending.
 * @param {string=} options.interface - Specific BACNET communication interface if different from primary one.
 * @param {string=} [options.broadcastAddress=255.255.255.255] - The address used for broadcast messages.
 * @param {number=} [options.apduTimeout=3000] - The timeout in milliseconds until a transaction should be interpreted as error.
 * @example
 * const bacnet = require('bacstack');
 *
 * const client = new bacnet({
 *   port: 47809,                          // Use BAC1 as communication port
 *   interface: '192.168.251.10',          // Listen on a specific interface
 *   broadcastAddress: '192.168.251.255',  // Use the subnet broadcast address
 *   apduTimeout: 6000                     // Wait twice as long for response
 * });
 */
class Client extends EventEmitter {
  constructor(options) {
    super();

    options = options || {};

    this._invokeCounter = 1;
    this._invokeStore = {};

    this._lastSequenceNumber = 0;
    this._segmentStore = [];

    this._settings = {
      port: options.port || 47808,
      interface: options.interface,
      transport: options.transport,
      broadcastAddress: options.broadcastAddress || '255.255.255.255',
      apduTimeout: options.apduTimeout || 3000
    };

    this._transport = this._settings.transport || new baTransport({
      port: this._settings.port,
      interface: this._settings.interface,
      broadcastAddress: this._settings.broadcastAddress
    });

    // Setup code
    this._transport.on('message', this._receiveData.bind(this));
    this._transport.on('error', this._receiveError.bind(this));
    this._transport.open();
  }

  // Helper utils
  _getInvokeId() {
    const id = this._invokeCounter++;
    if (id >= 256) this._invokeCounter = 1;
    return id - 1;
  }

  _invokeCallback(id, err, result) {
    const callback = this._invokeStore[id];
    if (callback) return callback(err, result);
    debug('InvokeId ', id, ' not found -> drop package');
  }

  _addCallback(id, callback) {
    const timeout = setTimeout(() => {
      delete this._invokeStore[id];
      callback(new Error('ERR_TIMEOUT'));
    }, this._settings.apduTimeout);
    this._invokeStore[id] = (err, data) => {
      clearTimeout(timeout);
      delete this._invokeStore[id];
      callback(err, data);
    };
  }

  _getBuffer(isForwarded) {
    return {
      buffer: Buffer.alloc(this._transport.getMaxPayload()),
      offset: isForwarded ? BVLC_FWD_HEADER_LENGTH : BVLC_HEADER_LENGTH
    };
  }

  // Service Handlers
  _processError(invokeId, buffer, offset, length) {
    const result = baServices.error.decode(buffer, offset, length);
    if (!result) return debug('Couldn`t decode Error');
    this._invokeCallback(invokeId, new Error('BacnetError - Class:' + result.class + ' - Code:' + result.code));
  }

  _processAbort(invokeId, reason) {
    this._invokeCallback(invokeId, new Error('BacnetAbort - Reason:' + reason));
  }

  _segmentAckResponse(receiver, negative, server, originalInvokeId, sequencenumber, actualWindowSize) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK, 0);
    baApdu.encodeSegmentAck(buffer, baEnum.PduTypes.SEGMENT_ACK | (negative ? baEnum.PduSegAckBits.NEGATIVE_ACK : 0) | (server ? baEnum.PduSegAckBits.SERVER : 0), originalInvokeId, sequencenumber, actualWindowSize);
    this.sendBvlc(receiver, buffer);
  }

  _performDefaultSegmentHandling(msg, first, moreFollows, buffer, offset, length) {
    if (first) {
      this._segmentStore = [];
      msg.type &= ~baEnum.PduConReqBits.SEGMENTED_MESSAGE;
      let apduHeaderLen = 3;
      if ((msg.type & baEnum.PDU_TYPE_MASK) === baEnum.PduTypes.CONFIRMED_REQUEST) {
        apduHeaderLen = 4;
      }
      const apdubuffer = this._getBuffer();
      apdubuffer.offset = 0;
      buffer.copy(apdubuffer.buffer, apduHeaderLen, offset, offset + length);
      if ((msg.type & baEnum.PDU_TYPE_MASK) === baEnum.PduTypes.CONFIRMED_REQUEST) {
        baApdu.encodeConfirmedServiceRequest(
          apdubuffer,
          msg.type,
          msg.service,
          msg.maxSegments,
          msg.maxApdu,
          msg.invokeId,
          0,
          0
        );
      } else {
        baApdu.encodeComplexAck(apdubuffer, msg.type, msg.service, msg.invokeId, 0, 0);
      }
      this._segmentStore.push(apdubuffer.buffer.slice(0, length + apduHeaderLen));
    } else {
      this._segmentStore.push(buffer.slice(offset, offset + length));
    }
    if (!moreFollows) {
      const apduBuffer = Buffer.concat(this._segmentStore);
      this._segmentStore = [];
      msg.type &= ~baEnum.PduConReqBits.SEGMENTED_MESSAGE;
      this._handlePdu(apduBuffer, 0, apduBuffer.length, msg.header);
    }
  }

  _processSegment(msg, server, buffer, offset, length) {
    let first = false;
    if (msg.sequencenumber === 0 && this._lastSequenceNumber === 0) {
      first = true;
    } else {
      if (msg.sequencenumber !== this._lastSequenceNumber + 1) {
        return this._segmentAckResponse(msg.header.address, true, server, msg.invokeId, this._lastSequenceNumber, msg.proposedWindowNumber);
      }
    }
    this._lastSequenceNumber = msg.sequencenumber;
    const moreFollows = type & baEnum.PduConReqBits.MORE_FOLLOWS;
    if (!moreFollows) {
      this._lastSequenceNumber = 0;
    }
    if ((msg.sequencenumber % msg.proposedWindowNumber) === 0 || !moreFollows) {
      this._segmentAckResponse(msg.header.address, false, server, msg.invokeId, msg.sequencenumber, msg.proposedWindowNumber);
    }
    this._performDefaultSegmentHandling(msg, first, moreFollows, buffer, offset, length);
  }

  _processServiceRequest(serviceMap, content, buffer, offset, length) {
    let result;

    const name = serviceMap[content.service];
    if (!name) {
      debug('Received unsupported service request:', content.service);
      return;
    }
    debug.trace('Received service request:', name);

    // Find a function to decode the packet.
    const serviceHandler = baServices[name];
    if (serviceHandler) {
      try {
        content.payload = serviceHandler.decode(buffer, offset, length);
      } catch (e) {
        // Sometimes incomplete or corrupted messages will cause exceptions
        // during decoding, but we don't want these to terminate the program, so
        // we'll just log them and ignore them.
        debug('Exception thrown when processing message:', e);
        debug('Original message was', name + ':', content);
        return;
      }
      if (!content.payload) return debug('Received invalid', name, 'message');
    } else {
      debug('No serviceHandler defined for:', name);
      // Call the callback anyway, just with no payload.
    }
    debug.trace('Passing payload over to callback:', content);

    // Call the user code, if they've defined a callback.
    if (!this.emit(name, content)) {
      // No callback was defined
      if (!this.emit('unhandledEvent', content)) {
        // No 'unhandled event' handler, so respond with an error ourselves.
        // This is better than doing nothing, which can often make the other
        // device think we have gone offline.
        if (content.header.expectingReply) {
          debug('Replying with error for unhandled service:', name);
          this.errorResponse(
            content.sender,
            content.service,
            content.invokeId,
            baEnum.ErrorClass.SERVICES,
            baEnum.ErrorCode.REJECT_UNRECOGNIZED_SERVICE
          );
        }
      }
    }
  }

  _handlePdu(buffer, offset, length, header) {
    let msg;
    // Handle different PDU types
    switch (header.apduType & baEnum.PDU_TYPE_MASK) {
      case baEnum.PduTypes.UNCONFIRMED_REQUEST:
        msg = baApdu.decodeUnconfirmedServiceRequest(buffer, offset);
        msg.header = header;
        this._processServiceRequest(unconfirmedServiceMap, msg, buffer, offset + msg.len, length - msg.len);
        break;
      case baEnum.PduTypes.SIMPLE_ACK:
        msg = baApdu.decodeSimpleAck(buffer, offset);
        offset += msg.len;
        length -= msg.len;
        this._invokeCallback(msg.invokeId, null, {msg: msg, buffer: buffer, offset: offset + msg.len, length: length - msg.len});
        break;
      case baEnum.PduTypes.COMPLEX_ACK:
        msg = baApdu.decodeComplexAck(buffer, offset);
        if ((header.apduType & baEnum.PduConReqBits.SEGMENTED_MESSAGE) === 0) {
          this._invokeCallback(msg.invokeId, null, {msg: msg, buffer: buffer, offset: offset + msg.len, length: length - msg.len});
        } else {
          this._processSegment(address, msg.type, msg.service, msg.invokeId, baEnum.MaxSegmentsAccepted.SEGMENTS_0, baEnum.MaxApduLengthAccepted.OCTETS_50, false, msg.sequencenumber, msg.proposedWindowNumber, buffer, offset + msg.len, length - msg.len);
        }
        break;
      case baEnum.PduTypes.SEGMENT_ACK:
        msg = baApdu.decodeSegmentAck(buffer, offset);
        //m_last_segment_ack.Set(address, msg.originalInvokeId, msg.sequencenumber, msg.actualWindowSize);
        //this._processSegmentAck(address, msg.type, msg.originalInvokeId, msg.sequencenumber, msg.actualWindowSize, buffer, offset + msg.len, length - msg.len);
        break;
      case baEnum.PduTypes.ERROR:
        msg = baApdu.decodeError(buffer, offset);
        this._processError(msg.invokeId, buffer, offset + msg.len, length - msg.len);
        break;
      case baEnum.PduTypes.REJECT:
      case baEnum.PduTypes.ABORT:
        msg = baApdu.decodeAbort(buffer, offset);
        this._processAbort(msg.invokeId, msg.reason);
        break;
      case baEnum.PduTypes.CONFIRMED_REQUEST:
        msg = baApdu.decodeConfirmedServiceRequest(buffer, offset);
        msg.header = header;
        if ((header.apduType & baEnum.PduConReqBits.SEGMENTED_MESSAGE) === 0) {
          this._processServiceRequest(confirmedServiceMap, msg, buffer, offset + msg.len, length - msg.len);
        } else {
          this._processSegment(msg, true, buffer, offset + result.len, length - result.len);
        }
        break;
      default:
        debug(`Received unknown PDU type ${header.apduType} -> Drop packet`);
        break;
    }
  }

  _handleNpdu(buffer, offset, msgLength, header) {
    // Check data length
    if (msgLength <= 0) return debug.trace('No NPDU data -> Drop package');
    // Parse baNpdu header
    const result = baNpdu.decode(buffer, offset);
    if (!result) return debug.trace('Received invalid NPDU header -> Drop package');
    if (result.funct & baEnum.NpduControlBits.NETWORK_LAYER_MESSAGE) {
      return debug.trace('Received network layer message -> Drop package');
    }
    offset += result.len;
    msgLength -= result.len;
    if (msgLength <= 0) return debug.trace('No APDU data -> Drop package');
    header.apduType = baApdu.getDecodedType(buffer, offset);
    header.expectingReply = !!(result.funct & baEnum.NpduControlBits.EXPECTING_REPLY);
    this._handlePdu(buffer, offset, msgLength, header);
  }

  _receiveData(buffer, remoteAddress) {
    // Check data length
    if (buffer.length < baBvlc.BVLC_HEADER_LENGTH) return debug.trace('Received invalid data -> Drop package');
    // Parse BVLC header
    const result = baBvlc.decode(buffer, 0);
    if (!result) return debug.trace('Received invalid BVLC header -> Drop package');
    let header = {
      // Which function the packet came in on, so later code can distinguish
      // between ORIGINAL_BROADCAST_NPDU and DISTRIBUTE_BROADCAST_TO_NETWORK.
      func: result.func,
      sender: {
        // Address of the host we are directly connected to. String, IP:port.
        address: remoteAddress,
        // If the host is a BBMD passing messages along to another node, this
        // is the address of the distant BACnet node.  String, IP:port.
        // Typically we won't have network connectivity to this address, but
        // we have to include it in replies so the host we are connect to knows
        // where to forward the messages.
        forwardedFrom: null,
      },
    };
    // Check BVLC function
    switch (result.func) {
      case baEnum.BvlcResultPurpose.ORIGINAL_UNICAST_NPDU:
      case baEnum.BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU:
        this._handleNpdu(buffer, result.len, buffer.length - result.len, header);
        break;
      case baEnum.BvlcResultPurpose.FORWARDED_NPDU:
        // Preserve the IP of the node behind the BBMD so we know where to send
        // replies back to.
        header.sender.forwardedFrom = result.originatingIP;
        this._handleNpdu(buffer, result.len, buffer.length - result.len, header);
        break;
      case baEnum.BvlcResultPurpose.REGISTER_FOREIGN_DEVICE:
        let decodeResult = baServices.registerForeignDevice.decode(buffer, result.len, buffer.length - result.len);
        if (!decodeResult) return debug.trace('Received invalid registerForeignDevice message');
        this.emit('registerForeignDevice', {
          header: header,
          payload: decodeResult,
        });
        break;
      case baEnum.BvlcResultPurpose.DISTRIBUTE_BROADCAST_TO_NETWORK:
        this._handleNpdu(buffer, result.len, buffer.length - result.len, header);
        break;
      default:
        debug('Received unknown BVLC function ' + result.func + ' -> Drop package');
        break;
    }
  }

  _receiveError(err) {
    /**
     * @event bacstack.error
     * @param {error} err - The error object thrown by the underlying transport layer.
     * @example
     * const bacnet = require('bacstack');
     * const client = new bacnet();
     *
     * client.on('error', (err) => {
     *   console.log('Error occurred: ', err);
     *   client.close();
     * });
     */
    this.emit('error', err);
  }

  /**
   * The whoIs command discovers all BACNET devices in a network.
   * @function bacstack.whoIs
   * @param {object=} options
   * @param {number=} options.lowLimit - Minimal device instance number to search for.
   * @param {number=} options.highLimit - Maximal device instance number to search for.
   * @param {string=} options.address - Unicast address if command should address a device directly.
   * @fires bacstack.iAm
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.whoIs();
   */
  whoIs(receiver, payload = {}) {
    const settings = {
      lowLimit: payload.lowLimit,
      highLimit: payload.highLimit,
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK, 0);
    baApdu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.WHO_IS);
    baServices.whoIs.encode(buffer, settings.lowLimit, settings.highLimit);
    this.sendBvlc(receiver, buffer);
  }

  /**
   * The timeSync command sets the time of a target device.
   * @function bacstack.timeSync
   * @param {string} address - IP address of the target device.
   * @param {date} dateTime - The date and time to set on the target device.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.timeSync('192.168.1.43', new Date());
   */
  timeSync(receiver, dateTime) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.TIME_SYNCHRONIZATION);
    baServices.timeSync.encode(buffer, dateTime);
    this.sendBvlc(receiver, buffer);
  }

  /**
   * The timeSyncUTC command sets the UTC time of a target device.
   * @function bacstack.timeSyncUTC
   * @param {string} address - IP address of the target device.
   * @param {date} dateTime - The date and time to set on the target device.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.timeSyncUTC('192.168.1.43', new Date());
   */
  timeSyncUTC(receiver, dateTime) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.UTC_TIME_SYNCHRONIZATION);
    baServices.timeSync.encode(buffer, dateTime);
    this.sendBvlc(receiver, buffer);
  }

  /**
   * The readProperty command reads a single property of an object from a device.
   * @function bacstack.readProperty
   * @param {string} address - IP address of the target device.
   * @param {object} objectId - The BACNET object ID to read.
   * @param {number} objectId.type - The BACNET object type to read.
   * @param {number} objectId.instance - The BACNET object instance to read.
   * @param {number} propertyId - The BACNET property id in the specified object to read.
   * @param {object=} options
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {number=} options.arrayIndex - The array index of the property to be read.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.readProperty('192.168.1.43', {type: 8, instance: 44301}, 28, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  readProperty(receiver, objectId, propertyId, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId(),
      arrayIndex: options.arrayIndex || baEnum.ASN1_ARRAY_ALL
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK, 0);
    const type = baEnum.PduTypes.CONFIRMED_REQUEST | (settings.maxSegments !== baEnum.MaxSegmentsAccepted.SEGMENTS_0 ? baEnum.PduConReqBits.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baApdu.encodeConfirmedServiceRequest(buffer, type, baEnum.ConfirmedServiceChoice.READ_PROPERTY, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.readProperty.encode(buffer, objectId.type, objectId.instance, propertyId, settings.arrayIndex);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.readProperty.decodeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

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
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {number=} options.arrayIndex - The array index of the property to be read.
   * @param {number=} options.priority - The priority of the value to be written.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.writeProperty('192.168.1.43', {type: 8, instance: 44301}, 28, [
   *   {type: bacnet.enum.ApplicationTags.REAL, value: 100}
   * ], (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  writeProperty(receiver, objectId, propertyId, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId(),
      arrayIndex: options.arrayIndex || baEnum.ASN1_ARRAY_ALL,
      priority: options.priority
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK, 0);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.WRITE_PROPERTY, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.writeProperty.encode(buffer, objectId.type, objectId.instance, propertyId, settings.arrayIndex, settings.priority, values);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

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
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * const requestArray = [
   *   {objectId: {type: 8, instance: 4194303}, properties: [{id: 8}]}
   * ];
   * client.readPropertyMultiple('192.168.1.43', requestArray, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  readPropertyMultiple(receiver, propertiesArray, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK, 0);
    const type = baEnum.PduTypes.CONFIRMED_REQUEST | (settings.maxSegments !== baEnum.MaxSegmentsAccepted.SEGMENTS_0 ? baEnum.PduConReqBits.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baApdu.encodeConfirmedServiceRequest(buffer, type, baEnum.ConfirmedServiceChoice.READ_PROPERTY_MULTIPLE, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.readPropertyMultiple.encode(buffer, propertiesArray);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.readPropertyMultiple.decodeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

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
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * const values = [
   *   {objectId: {type: 8, instance: 44301}, values: [
   *     {property: {id: 28, index: 12}, value: [{type: bacnet.enum.ApplicationTags.BOOLEAN, value: true}], priority: 8}
   *   ]}
   * ];
   * client.writePropertyMultiple('192.168.1.43', values, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  writePropertyMultiple(receiver, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.WRITE_PROPERTY_MULTIPLE, settings.maxSegments, settings.maxApdu, settings.invokeId);
    baServices.writePropertyMultiple.encodeObject(buffer, values);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

  /**
   * The confirmedCOVNotification command is used to push notifications to other
   * systems that have registered with us via a subscribeCOV message.
   * @function bacstack.confirmedCOVNotification
   * @param {string} address - IP address of the target device.
   * @param {object} monitoredObject - The object being monitored, from subscribeCOV.
   * @param {number} monitoredObject.type - Object type.
   * @param {number} monitoredObject.instance - Object instance.
   * @param {number} subscribeId - Subscriber ID from subscribeCOV,
   * @param {number} initiatingDeviceId - Our BACnet device ID.
   * @param {number} lifetime - Number of seconds left until the subscription expires.
   * @param {array} values - values for the monitored object.  See example.
   * @param {object=} options
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * const settings = {deviceId: 123}; // our BACnet device
   *
   * // Items saved from subscribeCOV message
   * const monitoredObject = {type: 1, instance: 1};
   * const subscriberProcessId = 123;
   *
   * client.confirmedCOVNotification(
   *   '192.168.1.43',
   *   monitoredObject,
   *   subscriberProcessId,
   *   settings.deviceId,
   *   30, // should be lifetime of subscription really
   *   [
   *     {
   *       property: { id: bacnet.enum.PropertyIdentifier.PRESENT_VALUE },
   *       value: [
   *         {value: 123, type: bacnet.enum.ApplicationTags.REAL},
   *       ],
   *     },
   *   ],
   *   (err) => {
   *     console.log('error: ', err);
   *   }
   * );
   */
  confirmedCOVNotification(address, monitoredObject, subscribeId, initiatingDeviceId, lifetime, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, address);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.CONFIRMED_COV_NOTIFICATION, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.covNotify.encode(buffer, subscribeId, initiatingDeviceId, monitoredObject, lifetime, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcResultPurpose.ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  /**
   * The deviceCommunicationControl command enables or disables network communication of the target device.
   * @function bacstack.deviceCommunicationControl
   * @param {string} address - IP address of the target device.
   * @param {number} timeDuration - The time to hold the network communication state in seconds. 0 for infinite.
   * @param {EnableDisable} enableDisable - The network communication state to set.
   * @param {object=} options
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {string=} options.password - The optional password used to set the network communication state.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.deviceCommunicationControl('192.168.1.43', 0, bacnet.enum.EnableDisable.DISABLE, (err) => {
   *   console.log('error: ', err);
   * });
   */
  deviceCommunicationControl(receiver, timeDuration, enableDisable, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId(),
      password: options.password
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.DEVICE_COMMUNICATION_CONTROL, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.deviceCommunicationControl.encode(buffer, timeDuration, enableDisable, settings.password);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

  /**
   * The reinitializeDevice command initiates a restart of the target device.
   * @function bacstack.reinitializeDevice
   * @param {string} address - IP address of the target device.
   * @param {ReinitializedState} state - The type of restart to be initiated.
   * @param {object=} options
   * @param {MaxSegmentsAccepted=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxApduLengthAccepted=} options.maxApdu - The maximal allowed APDU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {string=} options.password - The optional password used to restart the device.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.reinitializeDevice('192.168.1.43', bacnet.enum.ReinitializedState.COLDSTART, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  reinitializeDevice(receiver, state, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId(),
      password: options.password
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.REINITIALIZE_DEVICE, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.reinitializeDevice.encode(buffer, state, settings.password);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

  writeFile(receiver, objectId, position, fileBuffer, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.ATOMIC_WRITE_FILE, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.atomicWriteFile.encode(buffer, false, objectId, position, fileBuffer);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.atomicWriteFile.decodeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  readFile(receiver, objectId, position, count, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.ATOMIC_READ_FILE, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.atomicReadFile.encode(buffer, true, objectId, position, count);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.atomicReadFile.decodeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  readRange(receiver, objectId, idxBegin, quantity, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.READ_RANGE, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.readRange.encode(buffer, objectId, baEnum.PropertyIdentifier.LOG_BUFFER, baEnum.ASN1_ARRAY_ALL, baEnum.ReadRangeType.BY_POSITION, idxBegin, new Date(), quantity);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.readRange.decodeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  subscribeCov(receiver, objectId, subscribeId, cancel, issueConfirmedNotifications, lifetime, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.SUBSCRIBE_COV, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.subscribeCov.encode(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, lifetime);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  subscribeProperty(receiver, objectId, monitoredProperty, subscribeId, cancel, issueConfirmedNotifications, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.SUBSCRIBE_COV_PROPERTY, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.subscribeProperty.encode(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, 0, monitoredProperty, false, 0x0f);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  createObject(receiver, objectId, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.CREATE_OBJECT, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.createObject.encode(buffer, objectId, values);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  deleteObject(receiver, objectId, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.DELETE_OBJECT, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.deleteObject.encode(buffer, objectId);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  removeListElement(receiver, objectId, reference, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.REMOVE_LIST_ELEMENT, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.addListElement.encode(buffer, objectId, reference.id, reference.index, values);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  addListElement(receiver, objectId, reference, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.ADD_LIST_ELEMENT, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.addListElement.encode(buffer, objectId, reference.id, reference.index, values);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  getAlarmSummary(receiver, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.GET_ALARM_SUMMARY, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.alarmSummary.decode(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  getEventInformation(receiver, objectId, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.GET_EVENT_INFORMATION, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.eventInformation.decode(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  acknowledgeAlarm(receiver, objectId, eventState, ackText, evTimeStamp, ackTimeStamp, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.ACKNOWLEDGE_ALARM, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.alarmAcknowledge.encode(buffer, 57, objectId, eventState, ackText, evTimeStamp, ackTimeStamp);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  confirmedPrivateTransfer(receiver, vendorId, serviceNumber, data, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.CONFIRMED_PRIVATE_TRANSFER, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.privateTransfer.encode(buffer, vendorId, serviceNumber, data);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  unconfirmedPrivateTransfer(receiver, vendorId, serviceNumber, data) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.UNCONFIRMED_PRIVATE_TRANSFER);
    baServices.privateTransfer.encode(buffer, vendorId, serviceNumber, data);
    this.sendBvlc(receiver, buffer);
  }

  getEnrollmentSummary(receiver, acknowledgmentFilter, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.GET_ENROLLMENT_SUMMARY, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.getEnrollmentSummary.encode(buffer, acknowledgmentFilter, options.enrollmentFilter, options.eventStateFilter, options.eventTypeFilter, options.priorityFilter, options.notificationClassFilter);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.getEnrollmentSummary.decodeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  unconfirmedEventNotification(receiver, eventNotification) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.UNCONFIRMED_EVENT_NOTIFICATION);
    baServices.eventNotifyData.encode(buffer, eventNotification);
    this.sendBvlc(receiver, buffer);
  }

  confirmedEventNotification(receiver, eventNotification, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegmentsAccepted.SEGMENTS_65,
      maxApdu: options.maxApdu || baEnum.MaxApduLengthAccepted.OCTETS_1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE | baEnum.NpduControlBits.EXPECTING_REPLY, receiver);
    baApdu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_REQUEST, baEnum.ConfirmedServiceChoice.CONFIRMED_EVENT_NOTIFICATION, settings.maxSegments, settings.maxApdu, settings.invokeId, 0, 0);
    baServices.eventNotifyData.encode(buffer, eventNotification);
    this.sendBvlc(receiver, buffer);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  // Public Device Functions

  /**
   * The readPropertyResponse call sends a response with information about one of our properties.
   * @function bacstack.readPropertyResponse
   * @param {string} receiver - IP address of the target device.
   * @param {number} invokeId - ID of the original readProperty request.
   * @param {object} objectId - objectId from the original request,
   * @param {object} property - property being read, taken from the original request.
   * @param {object=} options varying behaviour for special circumstances
   * @param {string=} options.forwardedFrom - If functioning as a BBMD, the IP address this message originally came from.
   */
  readPropertyResponse(receiver, invokeId, objectId, property, value, options = {}) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeComplexAck(buffer, baEnum.PduTypes.COMPLEX_ACK, baEnum.ConfirmedServiceChoice.READ_PROPERTY, invokeId);
    baServices.readProperty.encodeAcknowledge(buffer, objectId, property.id, property.index, value);
    this.sendBvlc(receiver, buffer);
  }

  readPropertyMultipleResponse(receiver, invokeId, values) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeComplexAck(buffer, baEnum.PduTypes.COMPLEX_ACK, baEnum.ConfirmedServiceChoice.READ_PROPERTY_MULTIPLE, invokeId);
    baServices.readPropertyMultiple.encodeAcknowledge(buffer, values);
    this.sendBvlc(receiver, buffer);
  }

  /**
   * The iAmResponse command is sent as a reply to a whoIs request.
   * @function bacstack.iAmResponse
   * @param {object} receiver - address to send packet to, null for local broadcast.
   * @param {number} deviceId - Our device ID.
   * @param {number} segmentation - an enum.Segmentation value.
   * @param {number} vendorId - The numeric ID assigned to the organisation providing this application.
   * @param {object=} options varying behaviour for special circumstances
   * @param {string=} options.forwardedFrom - If talking to a BBMD, the IP address this message originally came from.  The recipient may then try to contact the device directly using this IP.
   * @param {string=} options.address - Where to send the packet to.  Normally this will be the default value of null which will broadcast to the local subnet, but if communicating with a BBMD, the BBMD's address will go here.  An object like {net: 65535} is also permitted.
   * @param {number=} options.hops - Number of hops until packet should be dropped, default 255.
   */
  iAmResponse(receiver, deviceId, segmentation, vendorId) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.I_AM);
    baServices.iAmBroadcast.encode(buffer, deviceId, this._transport.getMaxPayload(), segmentation, vendorId);
    this.sendBvlc(receiver, buffer);
  }

  iHaveResponse(receiver, deviceId, objectId, objectName) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.EecodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_REQUEST, baEnum.UnconfirmedServiceChoice.I_HAVE);
    baServices.EncodeIhaveBroadcast(buffer, deviceId, objectId, objectName);
    this.sendBvlc(receiver, buffer);
  }

  simpleAckResponse(receiver, service, invokeId) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeSimpleAck(buffer, baEnum.PduTypes.SIMPLE_ACK, service, invokeId);
    this.sendBvlc(receiver, buffer);
  }

  errorResponse(receiver, service, invokeId, errorClass, errorCode) {
    const buffer = this._getBuffer(receiver && receiver.forwardedFrom);
    baNpdu.encode(buffer, baEnum.NpduControlPriority.NORMAL_MESSAGE, receiver);
    baApdu.encodeError(buffer, baEnum.PduTypes.ERROR, service, invokeId);
    baServices.error.encode(buffer, errorClass, errorCode);
    this.sendBvlc(receiver, buffer);
  }

  sendBvlc(receiver, buffer) {
    if (receiver && receiver.forwardedFrom) {
      // Remote node address given, forward to BBMD
      baBvlc.encode(buffer.buffer, baEnum.BvlcResultPurpose.FORWARDED_NPDU, buffer.offset, receiver.forwardedFrom);
    } else if (receiver && receiver.address) {
      // Specific address, unicast
      baBvlc.encode(buffer.buffer, baEnum.BvlcResultPurpose.ORIGINAL_UNICAST_NPDU, buffer.offset);
    } else {
      // No address, broadcast
      baBvlc.encode(buffer.buffer, baEnum.BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU, buffer.offset);
    }
    this._transport.send(
      buffer.buffer,
      buffer.offset,
      (receiver && receiver.address) || null
    );
  }

  /**
   * The resultResponse is a BVLC-Result message used to respond to certain events, such as BBMD registration.
   * This message cannot be wrapped for passing through a BBMD, as it is used as a BBMD control message.
   * @function bacstack.resultResponse
   * @param {string} receiver - IP address of the target device.
   * @param {number} resultCode - Single value from BvlcResultFormat enum.
   */
  resultResponse(receiver, resultCode) {
    const buffer = this._getBuffer();
    baApdu.encodeResult(buffer, resultCode);
    baBvlc.encode(buffer.buffer, baEnum.BvlcResultPurpose.BVLC_RESULT, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, receiver.address);
  }

  /**
   * Unloads the current BACstack instance and closes the underlying UDP socket.
   * @function bacstack.close
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.close();
   */
  close() {
    this._transport.close();
  }

  /**
   * Helper function to take an array of enums and produce a bitstring suitable
   * for inclusion as a property.
   *
   * @example
   * [bacnet.enum.PropertyIdentifier.PROTOCOL_OBJECT_TYPES_SUPPORTED]: [
   *   {value: bacnet.createBitstring([
   *     bacnet.enum.ObjectTypesSupported.ANALOG_INPUT,
   *     bacnet.enum.ObjectTypesSupported.ANALOG_OUTPUT,
   *   ]),
   *   type: bacnet.enum.ApplicationTags.BIT_STRING},
   * ],
   */
  static createBitstring(items) {
    let offset = 0;
    let bytes = [];
    let bitsUsed = 0;
    while (items.length) {
      // Find any values between offset and offset+8, for the next byte
      let value = 0;
      items = items.filter(i => {
        if (i >= offset + 8) return true; // leave for future iteration
        value |= 1 << (i - offset);
        bitsUsed = Math.max(bitsUsed, i);
        return false; // remove from list
      });
      bytes.push(value);
      offset += 8;
    }
    bitsUsed++;

    return {
      value: bytes,
      bitsUsed: bitsUsed,
    };
  }

}
module.exports = Client;
