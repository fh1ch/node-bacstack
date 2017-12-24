var expect        = require('chai').expect;
var utils         = require('./utils');
var baBvlc        = require('../../lib/bvlc');

describe('bacstack - BVLC layer', function() {
  it('should successfuly encode and decode a package', function() {
    var buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1482);
    var result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 4,
      func: 10,
      msgLength: 1482
    });
  });

  it('should successfuly encode and decode a forwarded package', function() {
    var buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 4, 1482);
    var result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 10,
      func: 4,
      msgLength: 1482
    });
  });

  it('should fail if invalid BVLC type', function() {
    var buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1482);
    buffer.buffer[0] = 8;
    var result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if invalid length', function() {
    var buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1481);
    buffer.buffer[0] = 8;
    var result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if invalid function', function() {
    var buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 100, 1482);
    var result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if unsuported function', function() {
    var buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 5, 1482);
    var result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });
});
