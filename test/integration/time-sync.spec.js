var expect = require('chai').expect;
var utils = require('./utils');

describe('bacstack - timeSync integration', function() {
  it('should send a time sync package', function() {
    var client = new utils.bacnetClient({adpuTimeout: 200});
    client.timeSync('127.0.0.1', new Date());
    client.close();
  });
});
