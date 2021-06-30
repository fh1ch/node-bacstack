'use strict';

const utils = require('./utils');

describe('bacstack - deviceCommunicationControl integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.deviceCommunicationControl('127.0.0.1', 60, 1, {password: 'Test1234'}, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
