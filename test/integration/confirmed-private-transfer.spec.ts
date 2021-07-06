'use strict';

import * as utils from './utils';

describe('bacstack - confirmedPrivateTransfer integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    client.confirmedPrivateTransfer('127.0.0.1', 0, 8, [0x00, 0xaa, 0xfa, 0xb1, 0x00], {}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
