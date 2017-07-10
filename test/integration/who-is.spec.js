var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - whoIs integration', function() {
  it('should not invoke a event if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.on('iAm', function(address, deviceId, maxAdpu, segmentation, vendorId) {
      client.close();
      next(new Error('Unallowed Callback'));
    });
    setTimeout(function() {
      client.close();
      next();
    }, 300);
    client.whoIs();
  });
});
