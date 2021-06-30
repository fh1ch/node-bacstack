'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer EventInformation unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    const date1 = new Date();
    date1.setMilliseconds(990);
    const date2 = new Date();
    date2.setMilliseconds(990);
    const date3 = new Date();
    date3.setMilliseconds(990);
    baServices.eventInformation.encode(buffer, [
      {objectId: {type: 0, instance: 32}, eventState: 12, acknowledgedTransitions: {value: [14], bitsUsed: 6}, eventTimeStamps: [date1, date2, date3], notifyType: 5, eventEnable: {value: [15], bitsUsed: 7}, eventPriorities: [2, 3, 4]}
    ], false);
    const result = baServices.eventInformation.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      alarms: [
        {
          objectId: {
            type: 0,
            instance: 32
          },
          eventState: 12,
          acknowledgedTransitions: {
            bitsUsed: 6,
            value: [14]
          },
          eventTimeStamps: [
            date1,
            date2,
            date3
          ],
          notifyType: 5,
          eventEnable: {
            bitsUsed: 7,
            value: [15]
          },
          eventPriorities: [2, 3, 4]
        }
      ],
      moreEvents: false
    });
  });
});
