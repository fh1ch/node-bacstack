var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - addListElement integration', function() {
  it('should return a timeout error if no device is available', function(next) {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.addListElement('127.0.0.1', {type: 19, instance: 101}, {propertyIdentifier: 80, propertyArrayIndex: 0}, [
      {type: 1, value: true}
    ], function(err, value) {
      expect(err).to.eql(new Error('ERR_TIMEOUT'));
      expect(value).to.eql(undefined);
      client.close();
      next();
    });
  });
});
