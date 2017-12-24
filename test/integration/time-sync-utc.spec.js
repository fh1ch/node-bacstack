var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - timeSyncUTC integration', function() {
  it('should send a time UTC sync package', function() {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.timeSyncUTC('127.0.0.1', new Date());
    client.close();
  });
});
