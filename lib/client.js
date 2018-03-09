'use strict';

// Util Modules
const EventEmitter      = require('events').EventEmitter;
const debug             = require('debug')('bacstack');

// Local Modules
const baTransport       = require('./transport');
const baServices        = require('./services');
const baAsn1            = require('./asn1');
const baAdpu            = require('./adpu');
const baNpdu            = require('./npdu');
const baBvlc            = require('./bvlc');
const baEnum            = require('./enum');

const DEFAULT_HOP_COUNT = 0xFF;
const BVLC_HEADER_LENGTH = 4;

/**
 * To be able to communicate to BACNET devices, you have to initialize a new bacstack instance.
 * @class bacstack
 * @param {object=} this._settings - The options object used for parameterizing the bacstack.
 * @param {number=} [options.port=47808] - BACNET communication port for listening and sending.
 * @param {string=} options.interface - Specific BACNET communication interface if different from primary one.
 * @param {string=} [options.broadcastAddress=255.255.255.255] - The address used for broadcast messages.
 * @param {number=} [options.adpuTimeout=3000] - The timeout in milliseconds until a transaction should be interpreted as error.
 * @example
 * const bacnet = require('bacstack');
 *
 * const client = new bacnet({
 *   port: 47809,                          // Use BAC1 as communication port
 *   interface: '192.168.251.10',          // Listen on a specific interface
 *   broadcastAddress: '192.168.251.255',  // Use the subnet broadcast address
 *   adpuTimeout: 6000                     // Wait twice as long for response
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
      adpuTimeout: options.adpuTimeout || 3000
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
    }, this._settings.adpuTimeout);
    this._invokeStore[id] = (err, data) => {
      clearTimeout(timeout);
      delete this._invokeStore[id];
      callback(err, data);
    };
  }

  _getBuffer() {
    return {
      buffer: Buffer.alloc(this._transport.getMaxPayload()),
      offset: BVLC_HEADER_LENGTH
    };
  }

  // Service Handlers
  _processError(invokeId, buffer, offset, length) {
    const result = baServices.decodeError(buffer, offset, length);
    if (!result) return debug('Couldn`t decode Error');
    this._invokeCallback(invokeId, new Error('BacnetError - Class:' + result.class + ' - Code:' + result.code));
  }

  _processAbort(invokeId, reason) {
    this._invokeCallback(invokeId, new Error('BacnetAbort - Reason:' + reason));
  }

  _segmentAckResponse(receiver, negative, server, originalInvokeId, sequencenumber, actualWindowSize) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeSegmentAck(buffer, baEnum.PduTypes.SEGMENT_ACK | (negative ? baEnum.PduTypes.NEGATIVE_ACK : 0) | (server ? baEnum.PduTypes.SERVER : 0), originalInvokeId, sequencenumber, actualWindowSize);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, receiver);
  }

  _performDefaultSegmentHandling(sender, adr, type, service, invokeId, maxSegments, maxAdpu, sequencenumber, first, moreFollows, buffer, offset, length) {
    if (first) {
      this._segmentStore = [];
      type &= ~baEnum.ComplexAckPduFlags.SEGMENTED_MESSAGE;
      let adpuHeaderLen = 3;
      if ((type & baEnum.MASK) === baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST) {
        adpuHeaderLen = 4;
      }
      const adpubuffer = this._getBuffer();
      adpubuffer.offset = 0;
      buffer.copy(adpubuffer.buffer, adpuHeaderLen, offset, offset + length);
      if ((type & baEnum.MASK) === baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST) {
        baAdpu.encodeConfirmedServiceRequest(adpubuffer, type, service, maxSegments, maxAdpu, invokeId, 0, 0);
      } else {
        baAdpu.encodeComplexAck(adpubuffer, type, service, invokeId, 0, 0);
      }
      this._segmentStore.push(adpubuffer.buffer.slice(0, length + adpuHeaderLen));
    } else {
      this._segmentStore.push(buffer.slice(offset, offset + length));
    }

    if (!moreFollows) {
      const apduBuffer = Buffer.concat(this._segmentStore);
      this._segmentStore = [];
      type &= ~baEnum.ComplexAckPduFlags.SEGMENTED_MESSAGE;
      this._handlePdu(adr, type, apduBuffer, 0, apduBuffer.length);
    }
  }

  _processSegment(receiver, type, service, invokeId, maxSegments, maxAdpu, server, sequencenumber, proposedWindowNumber, buffer, offset, length) {
    let first = false;
    if (sequencenumber === 0 && this._lastSequenceNumber === 0) {
      first = true;
    } else {
      if (sequencenumber !== this._lastSequenceNumber + 1) {
        return this._segmentAckResponse(receiver, true, server, invokeId, this._lastSequenceNumber, proposedWindowNumber);
      }
    }
    this._lastSequenceNumber = sequencenumber;
    const moreFollows = ((type & baEnum.ConfirmedRequestPduFlags.MORE_FOLLOWS) === baEnum.ConfirmedRequestPduFlags.MORE_FOLLOWS);
    if (!moreFollows) {
      this._lastSequenceNumber = 0;
    }
    if ((sequencenumber % proposedWindowNumber) === 0 || !moreFollows) {
      this._segmentAckResponse(receiver, false, server, invokeId, sequencenumber, proposedWindowNumber);
    }
    this._performDefaultSegmentHandling(this, receiver, type, service, invokeId, maxSegments, maxAdpu, sequencenumber, first, moreFollows, buffer, offset, length);
  }

  _processConfirmedServiceRequest(address, type, service, maxSegments, maxAdpu, invokeId, buffer, offset, length) {
    let result;
    debug('Handle this._processConfirmedServiceRequest');
    if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY) {
      result = baServices.decodeReadProperty(buffer, offset, length);
      if (!result) return debug('Received invalid readProperty message');
      this.emit('readProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY) {
      result = baServices.decodeWriteProperty(buffer, offset, length);
      if (!result) return debug('Received invalid writeProperty message');
      this.emit('writeProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE) {
      result = baServices.decodeReadPropertyMultiple(buffer, offset, length);
      if (!result) return debug('Received invalid readPropertyMultiple message');
      this.emit('readPropertyMultiple', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROP_MULTIPLE) {
      result = baServices.decodeWritePropertyMultiple(buffer, offset, length);
      if (!result) return debug('Received invalid writePropertyMultiple message');
      this.emit('writePropertyMultiple', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_COV_NOTIFICATION) {
      result = baServices.decodeCOVNotify(buffer, offset, length);
      if (!result) return debug('Received invalid covNotify message');
      this.emit('covNotify', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_WRITE_FILE) {
      result = baServices.decodeAtomicWriteFile(buffer, offset, length);
      if (!result) return debug('Received invalid atomicWriteFile message');
      this.emit('atomicWriteFile', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_READ_FILE) {
      result = baServices.decodeAtomicReadFile(buffer, offset, length);
      if (!result) return debug('Received invalid atomicReadFile message');
      this.emit('atomicReadFile', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV) {
      result = baServices.decodeSubscribeCOV(buffer, offset, length);
      if (!result) return debug('Received invalid subscribeCOV message');
      this.emit('subscribeCOV', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV_PROPERTY) {
      result = baServices.decodeSubscribeProperty(buffer, offset, length);
      if (!result) return debug('Received invalid subscribeProperty message');
      this.emit('subscribeProperty', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_DEVICE_COMMUNICATION_CONTROL) {
      result = baServices.decodeDeviceCommunicationControl(buffer, offset, length);
      if (!result) return debug('Received invalid deviceCommunicationControl message');
      this.emit('deviceCommunicationControl', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_REINITIALIZE_DEVICE) {
      result = baServices.decodeReinitializeDevice(buffer, offset, length);
      if (!result) return debug('Received invalid reinitializeDevice message');
      this.emit('reinitializeDevice', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_EVENT_NOTIFICATION) {
      result = baServices.decodeEventNotifyData(buffer, offset, length);
      if (!result) return debug('Received invalid eventNotifyData message');
      this.emit('eventNotifyData', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_RANGE) {
      result = baServices.decodeReadRange(buffer, offset, length);
      if (!result) return debug('Received invalid readRange message');
      this.emit('readRange', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_CREATE_OBJECT) {
      result = baServices.decodeCreateObject(buffer, offset, length);
      if (!result) return debug('Received invalid createObject message');
      this.emit('createObject', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_DELETE_OBJECT) {
      result = baServices.decodeDeleteObject(buffer, offset, length);
      if (!result) return debug('Received invalid deleteObject message');
      this.emit('deleteObject', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_ACKNOWLEDGE_ALARM) {
      result = baServices.decodeAlarmAcknowledge(buffer, offset, length);
      if (!result) return debug('Received invalid alarmAcknowledge message');
      this.emit('alarmAcknowledge', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_ALARM_SUMMARY) {
      this.emit('getAlarmSummary', {address: address, invokeId: invokeId});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_ENROLLMENT_SUMMARY) {
      result = baServices.decodeGetEnrollmentSummary(buffer, offset, length);
      if (!result) return debug('Received invalid getEntrollmentSummary message');
      this.emit('getEntrollmentSummary', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_EVENT_INFORMATION) {
      result = baServices.decodeGetEventInformation(buffer, offset, length);
      if (!result) return debug('Received invalid getEventInformation message');
      this.emit('getEventInformation', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_LIFE_SAFETY_OPERATION) {
      result = baServices.decodeLifeSafetyOperation(buffer, offset, length);
      if (!result) return debug('Received invalid lifeSafetyOperation message');
      this.emit('lifeSafetyOperation', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_ADD_LIST_ELEMENT) {
      result = baServices.decodeAddListElement(buffer, offset, length);
      if (!result) return debug('Received invalid addListElement message');
      this.emit('addListElement', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_REMOVE_LIST_ELEMENT) {
      result = baServices.decodeAddListElement(buffer, offset, length);
      if (!result) return debug('Received invalid removeListElement message');
      this.emit('removeListElement', {address: address, invokeId: invokeId, request: result});
    } else if (service === baEnum.ConfirmedServices.SERVICE_CONFIRMED_PRIVATE_TRANSFER) {
      result = baServices.decodePrivateTransfer(buffer, offset, length);
      if (!result) return debug('Received invalid privateTransfer message');
      this.emit('privateTransfer', {address: address, invokeId: invokeId, request: result});
    } else {
      debug('Received unsupported confirmed service request');
    }
  }

  _processUnconfirmedServiceRequest(address, type, service, buffer, offset, length) {
    let result;
    debug('Handle this._processUnconfirmedServiceRequest');
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
       * const bacnet = require('bacstack');
       * const client = new bacnet();
       *
       * client.on('iAm', (device) => {
       *   console.log('address: ', device.address, ' - deviceId: ', device.deviceId, ' - maxAdpu: ', device.maxAdpu, ' - segmentation: ', device.segmentation, ' - vendorId: ', device.vendorId);
       * });
       */
      this.emit('iAm', {address: address, deviceId: result.deviceId, maxApdu: result.maxApdu, segmentation: result.segmentation, vendorId: result.vendorId});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS) {
      result = baServices.decodeWhoIsBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoIs message');
      this.emit('whoIs', {address: address, lowLimit: result.lowLimit, highLimit: result.highLimit});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_WHO_HAS) {
      result = baServices.decodeWhoHasBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid WhoHas message');
      this.emit('whoHas', {address: address, lowLimit: result.lowLimit, highLimit: result.highLimit, objectId: result.objectId, objectName: result.objectName});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_COV_NOTIFICATION) {
      result = baServices.decodeCOVNotify(buffer, offset, length);
      if (!result) return debug('Received invalid covNotifyUnconfirmed message');
      this.emit('covNotifyUnconfirmed', {address: address, request: result});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSync message');
      this.emit('timeSync', {address: address, dateTime: result.dateTime});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION) {
      result = baServices.decodeTimeSync(buffer, offset, length);
      if (!result) return debug('Received invalid TimeSyncUTC message');
      this.emit('timeSyncUTC', {address: address, dateTime: result.dateTime});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_EVENT_NOTIFICATION) {
      result = baServices.decodeEventNotifyData(buffer, offset, length);
      if (!result) return debug('Received invalid EventNotify message');
      this.emit('eventNotify', {address: address, eventData: result.eventData});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_I_HAVE) {
      result = baServices.decodeIhaveBroadcast(buffer, offset, length);
      if (!result) return debug('Received invalid ihaveBroadcast message');
      this.emit('ihaveBroadcast', {address: address, eventData: result.eventData});
    } else if (service === baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_PRIVATE_TRANSFER) {
      result = baServices.decodePrivateTransfer(buffer, offset, length);
      if (!result) return debug('Received invalid privateTransfer message');
      this.emit('privateTransfer', {address: address, eventData: result.eventData});
    } else {
      debug('Received unsupported unconfirmed service request');
    }
  }

  _handlePdu(address, type, buffer, offset, length) {
    let result;
    // Handle different PDU types
    switch (type & baEnum.MASK) {
      case baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST:
        result = baAdpu.decodeUnconfirmedServiceRequest(buffer, offset);
        this._processUnconfirmedServiceRequest(address, result.type, result.service, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.PduTypes.SIMPLE_ACK:
        result = baAdpu.decodeSimpleAck(buffer, offset);
        offset += result.len;
        length -= result.len;
        this._invokeCallback(result.invokeId, null, {result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        break;
      case baEnum.PduTypes.COMPLEX_ACK:
        result = baAdpu.decodeComplexAck(buffer, offset);
        if ((type & baEnum.ComplexAckPduFlags.SEGMENTED_MESSAGE) === 0) {
          this._invokeCallback(result.invokeId, null, {result: result, buffer: buffer, offset: offset + result.len, length: length - result.len});
        } else {
          this._processSegment(address, result.type, result.service, result.invokeId, baEnum.MaxSegments.MAX_SEG0, baEnum.MaxAdpu.MAX_APDU50, false, result.sequencenumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
        }
        break;
      case baEnum.PduTypes.SEGMENT_ACK:
        result = baAdpu.decodeSegmentAck(buffer, offset);
        //m_last_segment_ack.Set(address, result.originalInvokeId, result.sequencenumber, result.actualWindowSize);
        //this._processSegmentAck(address, result.type, result.originalInvokeId, result.sequencenumber, result.actualWindowSize, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.PduTypes.ERROR:
        result = baAdpu.decodeError(buffer, offset);
        this._processError(result.invokeId, buffer, offset + result.len, length - result.len);
        break;
      case baEnum.PduTypes.REJECT:
      case baEnum.PduTypes.ABORT:
        result = baAdpu.decodeAbort(buffer, offset);
        this._processAbort(result.invokeId, result.reason);
        break;
      case baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST:
        result = baAdpu.decodeConfirmedServiceRequest(buffer, offset);
        if ((type & baEnum.ConfirmedRequestPduFlags.SEGMENTED_MESSAGE) === 0) {
          this._processConfirmedServiceRequest(address, result.type, result.service, result.maxSegments, result.maxAdpu, result.invokeId, buffer, offset + result.len, length - result.len);
        } else {
          this._processSegment(address, result.type, result.service, result.invokeId, result.maxSegments, result.maxAdpu, true, result.sequencenumber, result.proposedWindowNumber, buffer, offset + result.len, length - result.len);
        }
        break;
      default:
        debug('Received unknown PDU type -> Drop package');
        break;
    }
  }

  _handleNpdu(buffer, offset, msgLength, remoteAddress) {
    // Check data length
    if (msgLength <= 0) return debug('No NPDU data -> Drop package');
    // Parse baNpdu header
    const result = baNpdu.decode(buffer, offset);
    if (!result) return debug('Received invalid NPDU header -> Drop package');
    if ((result.funct & baEnum.NpduControls.NETWORK_LAYER_MESSAGE) === baEnum.NpduControls.NETWORK_LAYER_MESSAGE) {
      return debug('Received network layer message -> Drop package');
    }
    offset += result.len;
    msgLength -= result.len;
    if (msgLength <= 0) return debug('No APDU data -> Drop package');
    const apduType = baAdpu.getDecodedType(buffer, offset);
    this._handlePdu(remoteAddress, apduType, buffer, offset, msgLength);
  }

  _receiveData(buffer, remoteAddress) {
    // Check data length
    if (buffer.length < baBvlc.BVLC_HEADER_LENGTH) return debug('Received invalid data -> Drop package');
    // Parse BVLC header
    const result = baBvlc.decode(buffer, 0);
    if (!result) return debug('Received invalid BVLC header -> Drop package');
    // Check BVLC function
    if (result.func === baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU || result.func === baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU || result.func === baEnum.BvlcFunctions.BVLC_FORWARDED_NPDU) {
      this._handleNpdu(buffer, result.len, buffer.length - result.len, remoteAddress);
    } else {
      debug('Received unknown BVLC function -> Drop package');
    }
  }

  _receiveError(err) {

    /**
     * @event bacstack.error
     * @param {error} err - The IP address of the detected device.
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
  whoIs(options) {
    options = options || {};
    const settings = {
      lowLimit: options.lowLimit,
      highLimit: options.highLimit,
      address: options.address || this._transport.getBroadcastAddress()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, this._settings.address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_WHO_IS);
    baServices.encodeWhoIsBroadcast(buffer, settings.lowLimit, settings.highLimit);
    const npduType = (this._settings.address !== this._transport.getBroadcastAddress()) ? baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, settings.address);
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
  timeSync(address, dateTime) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, address);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_TIME_SYNCHRONIZATION);
    baServices.encodeTimeSync(buffer, dateTime);
    const npduType = (address !== this._transport.getBroadcastAddress()) ? baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
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
  timeSyncUTC(address, dateTime) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, address);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_UTC_TIME_SYNCHRONIZATION);
    baServices.encodeTimeSync(buffer, dateTime);
    const npduType = (address !== this._transport.getBroadcastAddress()) ? baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU : baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU;
    baBvlc.encode(buffer.buffer, npduType, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
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
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
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
  readProperty(address, objectId, propertyId, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId(),
      arrayIndex: options.arrayIndex || baAsn1.BACNET_ARRAY_ALL
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    const type = baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST | (settings.maxSegments !== baEnum.MaxSegments.MAX_SEG0 ? baEnum.ConfirmedRequestPduFlags.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReadProperty(buffer, objectId.type, objectId.instance, propertyId, settings.arrayIndex);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeReadPropertyAcknowledge(data.buffer, data.offset, data.length);
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
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {number=} options.arrayIndex - The array index of the property to be read.
   * @param {number=} options.priority - The priority of the value to be written.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.writeProperty('192.168.1.43', {type: 8, instance: 44301}, 28, [
   *   {type: bacnet.enum.ApplicationTags.BACNET_APPLICATION_TAG_REAL, value: 100}
   * ], (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  writeProperty(address, objectId, propertyId, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId(),
      arrayIndex: options.arrayIndex || baAsn1.BACNET_ARRAY_ALL,
      priority: options.priority
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROPERTY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeWriteProperty(buffer, objectId.type, objectId.instance, propertyId, settings.arrayIndex, settings.priority, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
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
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
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
  readPropertyMultiple(address, propertiesArray, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address, null, DEFAULT_HOP_COUNT, baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK, 0);
    const type = baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST | (baEnum.maxSegments !== baEnum.MaxSegments.MAX_SEG0 ? baEnum.ConfirmedRequestPduFlags.SEGMENTED_RESPONSE_ACCEPTED : 0);
    baAdpu.encodeConfirmedServiceRequest(buffer, type, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReadPropertyMultiple(buffer, propertiesArray);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeReadPropertyMultipleAcknowledge(data.buffer, data.offset, data.length);
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
   * @param {MaxSegments=} options.maxSegments - The maximimal allowed number of segments.
   * @param {MaxAdpu=} options.maxAdpu - The maximal allowed ADPU size.
   * @param {number=} options.invokeId - The invoke ID of the confirmed service telegram.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * const values = [
   *   {objectId: {type: 8, instance: 44301}, values: [
   *     {property: {id: 28, index: 12}, value: [{type: bacnet.enum.ApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, value: true}], priority: 8}
   *   ]}
   * ];
   * client.writePropertyMultiple('192.168.1.43', values, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  writePropertyMultiple(address, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_WRITE_PROP_MULTIPLE, settings.maxSegments, settings.maxAdpu, settings.invokeId);
    baServices.encodeWriteObjectMultiple(buffer, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

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
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.deviceCommunicationControl('192.168.1.43', 0, bacnet.enum.EnableDisable.DISABLE, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  deviceCommunicationControl(address, timeDuration, enableDisable, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId(),
      password: options.password
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_DEVICE_COMMUNICATION_CONTROL, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeDeviceCommunicationControl(buffer, timeDuration, enableDisable, settings.password);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

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
   * const bacnet = require('bacstack');
   * const client = new bacnet();
   *
   * client.reinitializeDevice('192.168.1.43', bacnet.enum.ReinitializedStates.BACNET_REINIT_COLDSTART, (err, value) => {
   *   console.log('value: ', value);
   * });
   */
  reinitializeDevice(address, state, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId(),
      password: options.password
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_REINITIALIZE_DEVICE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReinitializeDevice(buffer, state, settings.password);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      next(err);
    });
  }

  writeFile(address, objectId, position, fileBuffer, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_WRITE_FILE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAtomicWriteFile(buffer, false, objectId, position, fileBuffer);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeAtomicWriteFileAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  readFile(address, objectId, position, count, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ATOMIC_READ_FILE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAtomicReadFile(buffer, true, objectId, position, count);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeAtomicReadFileAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  readRange(address, objectId, idxBegin, quantity, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_RANGE, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeReadRange(buffer, objectId, baEnum.PropertyIds.PROP_LOG_BUFFER, baAsn1.BACNET_ARRAY_ALL, baEnum.ReadRangeRequestTypes.RR_BY_POSITION, idxBegin, new Date(), quantity);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeReadRangeAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  subscribeCOV(address, objectId, subscribeId, cancel, issueConfirmedNotifications, lifetime, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeSubscribeCOV(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, lifetime);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  subscribeProperty(address, objectId, monitoredProperty, subscribeId, cancel, issueConfirmedNotifications, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_SUBSCRIBE_COV_PROPERTY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeSubscribeProperty(buffer, subscribeId, objectId, cancel, issueConfirmedNotifications, 0, monitoredProperty, false, 0x0f);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  createObject(address, objectId, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_CREATE_OBJECT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeCreateObject(buffer, objectId, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  deleteObject(address, objectId, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_DELETE_OBJECT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeDeleteObject(buffer, objectId);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  removeListElement(address, objectId, reference, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_REMOVE_LIST_ELEMENT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAddListElement(buffer, objectId, reference.id, reference.index, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  addListElement(address, objectId, reference, values, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ADD_LIST_ELEMENT, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAddListElement(buffer, objectId, reference.id, reference.index, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  getAlarmSummary(address, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_ALARM_SUMMARY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeAlarmSummary(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  getEventInformation(address, objectId, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_EVENT_INFORMATION, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeEventInformation(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  acknowledgeAlarm(address, objectId, eventState, ackText, evTimeStamp, ackTimeStamp, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_ACKNOWLEDGE_ALARM, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeAlarmAcknowledge(buffer, 57, objectId, eventState, ackText, evTimeStamp, ackTimeStamp);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  confirmedPrivateTransfer(address, vendorId, serviceNumber, data, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_PRIVATE_TRANSFER, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodePrivateTransfer(buffer, vendorId, serviceNumber, data);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  unconfirmedPrivateTransfer(address, vendorId, serviceNumber, data) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, address);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_PRIVATE_TRANSFER);
    baServices.encodePrivateTransfer(buffer, vendorId, serviceNumber, data);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
  }

  getEnrollmentSummary(address, acknowledgmentFilter, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_GET_ENROLLMENT_SUMMARY, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeGetEnrollmentSummary(buffer, acknowledgmentFilter, options.enrollmentFilter, options.eventStateFilter, options.eventTypeFilter, options.priorityFilter, options.notificationClassFilter);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      const result = baServices.decodeGetEnrollmentSummaryAcknowledge(data.buffer, data.offset, data.length);
      if (!result) return next(new Error('INVALID_DECODING'));
      next(null, result);
    });
  }

  unconfirmedEventNotification(address, eventNotification) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, address);
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_EVENT_NOTIFICATION);
    baServices.encodeEventNotifyData(buffer, eventNotification);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
  }

  confirmedEventNotification(address, eventNotification, options, next) {
    next = next || options;
    const settings = {
      maxSegments: options.maxSegments || baEnum.MaxSegments.MAX_SEG65,
      maxAdpu: options.maxAdpu || baEnum.MaxAdpu.MAX_APDU1476,
      invokeId: options.invokeId || this._getInvokeId()
    };
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE | baEnum.NpduControls.EXPECTING_REPLY, address);
    baAdpu.encodeConfirmedServiceRequest(buffer, baEnum.PduTypes.CONFIRMED_SERVICE_REQUEST, baEnum.ConfirmedServices.SERVICE_CONFIRMED_EVENT_NOTIFICATION, settings.maxSegments, settings.maxAdpu, settings.invokeId, 0, 0);
    baServices.encodeEventNotifyData(buffer, eventNotification);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, address);
    this._addCallback(settings.invokeId, (err, data) => {
      if (err) return next(err);
      next();
    });
  }

  // Public Device Functions
  readPropertyResponse(receiver, invokeId, objectId, property, value) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeComplexAck(buffer, baEnum.PduTypes.COMPLEX_ACK, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, invokeId);
    baServices.encodeReadPropertyAcknowledge(buffer, objectId, property.id, property.index, value);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, receiver);
  }

  readPropertyMultipleResponse(receiver, invokeId, values) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeComplexAck(buffer, baEnum.PduTypes.COMPLEX_ACK, baEnum.ConfirmedServices.SERVICE_CONFIRMED_READ_PROP_MULTIPLE, invokeId);
    baServices.encodeReadPropertyMultipleAcknowledge(buffer, values);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, receiver);
  }

  iAmResponse(deviceId, segmentation, vendorId) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, this._transport.getBroadcastAddress());
    baAdpu.encodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_I_AM);
    baServices.encodeIamBroadcast(buffer, deviceId, this._transport.getMaxPayload(), segmentation, vendorId);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, this._transport.getBroadcastAddress());
  }

  iHaveResponse(deviceId, objectId, objectName) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, this._transport.getBroadcastAddress());
    baAdpu.EecodeUnconfirmedServiceRequest(buffer, baEnum.PduTypes.UNCONFIRMED_SERVICE_REQUEST, baEnum.UnconfirmedServices.SERVICE_UNCONFIRMED_I_HAVE);
    baServices.EncodeIhaveBroadcast(buffer, deviceId, objectId, objectName);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, this._transport.getBroadcastAddress());
  }

  simpleAckResponse(receiver, service, invokeId) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeSimpleAck(buffer, baEnum.PduTypes.SIMPLE_ACK, service, invokeId);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, receiver);
  }

  errorResponse(receiver, service, invokeId, errorClass, errorCode) {
    const buffer = this._getBuffer();
    baNpdu.encode(buffer, baEnum.NpduControls.PRIORITY_NORMAL_MESSAGE, receiver);
    baAdpu.encodeError(buffer, baEnum.PduTypes.ERROR, service, invokeId);
    baServices.encodeError(buffer, errorClass, errorCode);
    baBvlc.encode(buffer.buffer, baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU, buffer.offset);
    this._transport.send(buffer.buffer, buffer.offset, receiver);
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
}
module.exports = Client;
