var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - writeFile integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.writeFile('127.0.0.1', {type: 10, instance: 2}, 0, 4, [5, 6, 7 , 8], function(err, value) {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
