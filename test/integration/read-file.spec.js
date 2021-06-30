'use strict';

const utils = require('./utils');

describe('bacstack - readFile integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.readFile('127.0.0.1', {type: 10, instance: 100}, 0, 100, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
