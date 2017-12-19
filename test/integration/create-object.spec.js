var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - createObject integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.createObject('127.0.0.1', {type: 2, instance: 300}, [
      {property: {id: 85, index: 1}, value: [{type: 1, value: true}]}
    ], function(err, value) {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
