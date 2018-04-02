'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');

describe('bacstack - reinitializeDevice integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.reinitializeDevice('127.0.0.1', 1, {password: 'Test1234'},  (err, value) => {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
