'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');
const baEnum = require('../../lib/enum');

describe('bacstack - Services layer GetEventInformation unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.getEventInformation.encode(buffer, {type: 8, instance: 15});
    const result = baServices.getEventInformation.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      lastReceivedObjectId: {type: 8, instance: 15}
    });
  });
});

describe('GetEventInformationAcknowledge', () => {
  it('should successfully encode and decode', () => {
    const timeStamp = new Date(1, 1, 1);
    timeStamp.setMilliseconds(990);
    const buffer = utils.getBuffer();
    baServices.getEventInformation.encodeAcknowledge(buffer, [
      {
        objectId: {type: 2, instance: 17},
        eventState: 3,
        acknowledgedTransitions: {value: [14], bitsUsed: 6},
        eventTimeStamps: [{value: timeStamp, type: baEnum.TimeStamp.DATETIME}, {value: 5, type: baEnum.TimeStamp.SEQUENCE_NUMBER}, {value: timeStamp, type: baEnum.TimeStamp.TIME}],
        notifyType: 12,
        eventEnable: {value: [14], bitsUsed: 6},
        eventPriorities: [1, 2, 3]
      }
    ], false);
    const result = baServices.getEventInformation.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      events: [
        {
          objectId: {type: 2, instance: 17},
          eventState: 3,
          acknowledgedTransitions: {value: [14], bitsUsed: 6}, eventTimeStamps: [{value: timeStamp, type: baEnum.TimeStamp.DATETIME}, {value: 5, type: baEnum.TimeStamp.SEQUENCE_NUMBER}, {value: timeStamp, type: baEnum.TimeStamp.TIME}],
          notifyType: 12,
          eventEnable: {value: [14], bitsUsed: 6},
          eventPriorities: [1, 2, 3]
        }
      ],
      moreEvents: false
    });
  });

  it('should successfully encode and decode empty payload', () => {
    const buffer = utils.getBuffer();
    baServices.getEventInformation.encodeAcknowledge(buffer, [], true);
    const result = baServices.getEventInformation.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      events: [],
      moreEvents: true
    });
  });
});
