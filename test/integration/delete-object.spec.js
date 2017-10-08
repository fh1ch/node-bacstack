var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - deleteObject integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.deleteObject('127.0.0.1', {type: 2, instance: 15}, function(err, value) {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
