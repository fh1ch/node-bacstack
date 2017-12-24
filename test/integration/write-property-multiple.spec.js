var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - writePropertyMultiple integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    var values = [
      {objectId: {type: 8, instance: 44301}, values: [
        {property: {id: 28, index: 12}, value: [{type: 1, value: true}], priority: 8}
      ]}
    ];
    client.writePropertyMultiple('127.0.0.1', values, function(err, value) {
      expect(err.message).to.eql('ERR_TIMEOUT');
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
