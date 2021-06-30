'use strict';

const utils = require('./utils');

describe('bacstack - subscribeCOV integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.subscribeCOV('127.0.0.1', {type: 5, instance: 3}, 7, false, false, 0, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
