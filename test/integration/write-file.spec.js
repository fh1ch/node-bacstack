'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');

describe('bacstack - writeFile integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.writeFile('127.0.0.1', {type: 10, instance: 2}, 0, [[5, 6, 7, 8], [5, 6, 7, 8]], (err, value) => {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
