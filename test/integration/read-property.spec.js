'use strict';

const utils = require('./utils');

describe('bacstack - readProperty integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.readProperty('127.0.0.1', {type: 8, instance: 44301}, 28, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
