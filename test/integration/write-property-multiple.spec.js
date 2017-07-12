var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - writePropertyMultiple integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    var valueList = [
      {objectIdentifier: {type: 8, instance: 44301}, values: [
        {property: {propertyIdentifier: 28, propertyArrayIndex: 12}, value: [{tag: 1, value: true}], priority: 8}
      ]}
    ];
    client.writePropertyMultiple('127.0.0.1', valueList, function(err, value) {
      expect(err).to.eql(new Error('ERR_TIMEOUT'));
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
