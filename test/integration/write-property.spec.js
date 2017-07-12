var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - writeProperty integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.writeProperty('127.0.0.1', 8, 44301, 28, 12, [{tag: 4, value: 100}], function(err, value) {
      expect(err).to.eql(new Error('ERR_TIMEOUT'));
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
