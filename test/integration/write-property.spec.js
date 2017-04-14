var expect = require('chai').expect;
var client = require('./utils');

describe('bacstack - writeProperty integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    this.timeout(5000);
    client.writeProperty('127.0.0.1', 8, 44301, 28, 12, [{Tag: 4, Value: 100}], function(err, value) {
      expect(err).to.eql(new Error('ERR_TIMEOUT'));
      expect(value).to.eql(undefined);
      next();
    });
  });
});
