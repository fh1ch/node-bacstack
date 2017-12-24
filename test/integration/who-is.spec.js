'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');

describe('bacstack - whoIs integration', () => {
  it('should not invoke a event if no device is available', (next) => {
    const client = new utils.bacnetClient({adpuTimeout: 200});
    client.on('iAm', (address, deviceId, maxAdpu, segmentation, vendorId) => {
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
