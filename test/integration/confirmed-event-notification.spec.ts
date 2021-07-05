'use strict';

import * as utils from './utils';

describe('bacstack - confirmedEventNotification integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    const date = new Date();
    date.setMilliseconds(880);
    client.confirmedEventNotification('127.0.0.1', {
      processId: 3,
      initiatingObjectId: {},
      eventObjectId: {},
      timeStamp: {type: 2, value: date},
      notificationClass: 9,
      priority: 7,
      eventType: 2,
      messageText: 'Test1234$',
      notifyType: 1,
      changeOfValueTag: 0,
      changeOfValueChangeValue: 90,
      changeOfValueStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
    }, {}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
