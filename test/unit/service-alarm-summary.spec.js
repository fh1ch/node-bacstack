'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer AlarmSummary unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.alarmSummary.encode(buffer, [
      {objectId: {type: 12, instance: 12}, alarmState: 12, acknowledgedTransitions: {value: [12], bitsUsed: 5}},
      {objectId: {type: 13, instance: 13}, alarmState: 13, acknowledgedTransitions: {value: [13], bitsUsed: 6}}
    ]);
    const result = baServices.alarmSummary.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      alarms: [
        {objectId: {type: 12, instance: 12}, alarmState: 12, acknowledgedTransitions: {value: [12], bitsUsed: 5}},
        {objectId: {type: 13, instance: 13}, alarmState: 13, acknowledgedTransitions: {value: [13], bitsUsed: 6}}
      ]
    });
  });
});
