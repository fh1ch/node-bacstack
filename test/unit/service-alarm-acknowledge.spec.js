'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');
const baEnum = require('../../lib/enum');

describe('bacstack - Services layer AlarmAcknowledge unit', () => {
  it('should successfully encode and decode with time timestamp', () => {
    const buffer = utils.getBuffer();
    const eventTime = new Date(1, 1, 1);
    eventTime.setMilliseconds(990);
    const ackTime = new Date(1, 1, 1);
    ackTime.setMilliseconds(880);
    baServices.alarmAcknowledge.encode(buffer, 57, {type: 0, instance: 33}, 5, 'Alarm Acknowledge Test', {value: eventTime, type: baEnum.TimeStamp.TIME}, {value: ackTime, type: baEnum.TimeStamp.TIME});
    const result = baServices.alarmAcknowledge.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      acknowledgedProcessId: 57,
      eventObjectId: {
        type: 0,
        instance: 33
      },
      eventStateAcknowledged: 5,
      acknowledgeSource: 'Alarm Acknowledge Test',
      eventTimeStamp: eventTime,
      acknowledgeTimeStamp: ackTime
    });
  });

  it('should successfully encode and decode with sequence timestamp', () => {
    const buffer = utils.getBuffer();
    const eventTime = 5;
    const ackTime = 6;
    baServices.alarmAcknowledge.encode(buffer, 57, {type: 0, instance: 33}, 5, 'Alarm Acknowledge Test', {value: eventTime, type: baEnum.TimeStamp.SEQUENCE_NUMBER}, {value: ackTime, type: baEnum.TimeStamp.SEQUENCE_NUMBER});
    const result = baServices.alarmAcknowledge.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      acknowledgedProcessId: 57,
      eventObjectId: {
        type: 0,
        instance: 33
      },
      eventStateAcknowledged: 5,
      acknowledgeSource: 'Alarm Acknowledge Test',
      eventTimeStamp: eventTime,
      acknowledgeTimeStamp: ackTime
    });
  });

  it('should successfully encode and decode with datetime timestamp', () => {
    const buffer = utils.getBuffer();
    const eventTime = new Date(1, 1, 1);
    eventTime.setMilliseconds(990);
    const ackTime = new Date(1, 1, 2);
    ackTime.setMilliseconds(880);
    baServices.alarmAcknowledge.encode(buffer, 57, {type: 0, instance: 33}, 5, 'Alarm Acknowledge Test', {value: eventTime, type: baEnum.TimeStamp.DATETIME}, {value: ackTime, type: baEnum.TimeStamp.DATETIME});
    const result = baServices.alarmAcknowledge.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      acknowledgedProcessId: 57,
      eventObjectId: {
        type: 0,
        instance: 33
      },
      eventStateAcknowledged: 5,
      acknowledgeSource: 'Alarm Acknowledge Test',
      eventTimeStamp: eventTime,
      acknowledgeTimeStamp: ackTime
    });
  });
});
