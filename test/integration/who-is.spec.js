var expect = require('chai').expect;
var client = require('./utils');

describe('bacstack - whoIs integration', function() {
  it('should not invoke a event if no device is available', function(next) {
    this.timeout(5000);
    client.on('iAm', function(address, deviceId, maxAdpu, segmentation, vendorId) {
      next(new Erro('Unallowed Callback'));
    });
    setTimeout(function() {
      next();
    }, 3100);
    client.whoIs();
  });
});
