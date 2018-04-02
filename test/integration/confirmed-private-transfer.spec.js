'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');

describe('bacstack - confirmedPrivateTransfer integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.confirmedPrivateTransfer('127.0.0.1', 0, 8, [0x00, 0xaa, 0xfa, 0xb1, 0x00], (err, value) => {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
