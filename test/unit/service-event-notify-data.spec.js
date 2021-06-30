'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');
const baEnum = require('../../lib/enum');

describe('bacstack - Services layer EventNotifyData unit', () => {
  it('should successfully encode and decode a change of bitstring event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {type: 60, instance: 12},
      eventObjectId: {type: 61, instance: 1121},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 0,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: true,
      fromState: 5,
      toState: 6,
      changeOfBitstringReferencedBitString: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
      changeOfBitstringStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 60, instance: 12},
      eventObjectId: {type: 61, instance: 1121},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 0,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: true,
      fromState: 5,
      toState: 6
    });
  });

  it('should successfully encode and decode a change of state event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 1,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 1,
      toState: 2,
      changeOfStateNewState: {type: 2, state: 2},
      changeOfStateStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 1,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 1,
      toState: 2
    });
  });

  it('should successfully encode and decode a change of value event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 2,
      messageText: 'Test1234$',
      notifyType: 1,
      changeOfValueTag: baEnum.CovTypes.REAL,
      changeOfValueChangeValue: 90,
      changeOfValueStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 2,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 0,
      toState: 0
    });
  });

  it('should successfully encode and decode a floating limit event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 4,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: true,
      fromState: 19,
      toState: 12,
      floatingLimitReferenceValue: 121,
      floatingLimitStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
      floatingLimitSetPointValue: 120,
      floatingLimitErrorLimit: 120
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 4,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: true,
      fromState: 19,
      toState: 12
    });
  });

  it('should successfully encode and decode an out of range event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 5,
      messageText: 'Test1234$',
      notifyType: 1,
      outOfRangeExceedingValue: 155,
      outOfRangeStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
      outOfRangeDeadband: 50,
      outOfRangeExceededLimit: 150
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 5,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 0,
      toState: 0
    });
  });

  it('should successfully encode and decode a change of life-safety event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 8,
      messageText: 'Test1234$',
      notifyType: 1,
      changeOfLifeSafetyNewState: 8,
      changeOfLifeSafetyNewMode: 9,
      changeOfLifeSafetyStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
      changeOfLifeSafetyOperationExpected: 2
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 8,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 0,
      toState: 0
    });
  });

  it('should successfully encode and decode a buffer ready event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 10,
      messageText: 'Test1234$',
      notifyType: 1,
      bufferReadyBufferProperty: {
        objectId: {type: 65, instance: 2},
        id: 85,
        arrayIndex: 3,
        deviceIndentifier: {type: 8, instance: 443}
      },
      bufferReadyPreviousNotification: 121,
      bufferReadyCurrentNotification: 281
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 10,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 0,
      toState: 0
    });
  });

  it('should successfully encode and decode a unsigned range event', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(880);
    baServices.eventNotifyData.encode(buffer, {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 11,
      messageText: 'Test1234$',
      notifyType: 1,
      unsignedRangeExceedingValue: 101,
      unsignedRangeStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
      unsignedRangeExceededLimit: 100
    });
    const result = baServices.eventNotifyData.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      processId: 3,
      initiatingObjectId: {type: 0, instance: 0},
      eventObjectId: {type: 0, instance: 0},
      timeStamp: date,
      notificationClass: 9,
      priority: 7,
      eventType: 11,
      messageText: 'Test1234$',
      notifyType: 1,
      ackRequired: false,
      fromState: 0,
      toState: 0
    });
  });
});
