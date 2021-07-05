'use strict';

import * as utils from './utils';

describe('bacstack - reinitializeDevice integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.reinitializeDevice('127.0.0.1', 1, {password: 'Test1234'}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
