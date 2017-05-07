var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - readPropertyMultiple integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = utils.globalBacnetClient;
    this.timeout(5000);
    var requestArray = [
      {objectIdentifier: {type: 8, instance: 4194303}, propertyReferences: [{propertyIdentifier: 8}]}
    ];
    client.readPropertyMultiple('127.0.0.1', requestArray, function(err, value) {
      expect(err).to.eql(new Error('ERR_TIMEOUT'));
      expect(value).to.eql(undefined);
      next();
    });
  });
});
