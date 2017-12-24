var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - subscribeProperty integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.subscribeProperty('127.0.0.1', {type: 5, instance: 33}, {id: 80, index: 0}, 8, false, false, function(err, value) {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
