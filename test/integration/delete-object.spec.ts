'use strict';

import * as utils from './utils';

describe('bacstack - deleteObject integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.deleteObject('127.0.0.1', {type: 2, instance: 15}, {}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
