'use strict';

const utils = require('./utils');

describe('bacstack - createObject integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.createObject('127.0.0.1', {type: 2, instance: 300}, [
      {property: {id: 85, index: 1}, value: [{type: 1, value: true}]}
    ], (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
