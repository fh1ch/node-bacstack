'use strict';

import * as utils from './utils';

describe('bacstack - subscribeProperty integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    client.subscribeProperty('127.0.0.1', {type: 5, instance: 33}, {id: 80, index: 0}, 8, false, false, {}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
