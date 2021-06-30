'use strict';

const utils = require('./utils');

describe('bacstack - writePropertyMultiple integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    const values = [
      {objectId: {type: 8, instance: 44301}, values: [
        {property: {id: 28, index: 12}, value: [{type: 1, value: true}], priority: 8}
      ]}
    ];
    client.writePropertyMultiple('127.0.0.1', values, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });
});
