'use strict';

import * as utils from './utils';

describe('bacstack - acknowledgeAlarm integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    client.acknowledgeAlarm('127.0.0.1', {type: 2, instance: 3}, 2, 'Alarm Acknowledge Test', {value: new Date(), type: 2}, {value: new Date(), type: 2}, {}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
