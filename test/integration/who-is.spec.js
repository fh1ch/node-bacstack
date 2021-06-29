'use strict';

const utils = require('./utils');

describe('bacstack - whoIs integration', () => {
  it('should not invoke a event if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.on('iAm', (address, deviceId, maxApdu, segmentation, vendorId) => {
      client.close();
      next(new Error('Unallowed Callback'));
    });
    setTimeout(() => {
      client.close();
      next();
    }, 300);
    client.whoIs();
  });
});
