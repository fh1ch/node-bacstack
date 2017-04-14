var expect = require('chai').expect;
var client = require('./utils');

describe('bacstack - readProperty integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    this.timeout(5000);
    client.readProperty('127.0.0.1', 8, 44301, 28, null, function(err, value) {
      expect(err).to.eql(new Error('ERR_TIMEOUT'));
      expect(value).to.eql(undefined);
      next();
    });
  });
});
