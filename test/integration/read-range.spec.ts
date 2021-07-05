'use strict';

import * as utils from './utils';

describe('bacstack - readRange integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    client.readRange('127.0.0.1', {type: 20, instance: 0}, 0, 200, {}, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
