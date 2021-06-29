'use strict';

const utils = require('./utils');

describe('bacstack - unconfirmedEventNotification integration', () => {
  it('should correctly send a telegram', () => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    const date = new Date();
    date.setMilliseconds(880);
    client.unconfirmedEventNotification('127.0.0.1', {
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
    client.close();
  });
});
