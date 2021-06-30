'use strict';

const utils = require('./utils');

describe('bacstack - getEventInformation integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.getEventInformation('127.0.0.1', {type: 5, instance: 33}, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
