var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - readFile integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.readFile('127.0.0.1', {type: 10, instance: 100}, 0, 100, function(err, value) {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
