var expect        = require('chai').expect;
var utils         = require('./utils');
var baNpdu        = require('../../lib/npdu');

describe('bacstack - NPDU layer', function() {
  it('should successfully decode the NPDU function', function() {
    var result = baNpdu.decodeFunction([0, 1, 12], 1);
    expect(result).to.equal(12);
  });

  it('should fail decoding the NPDU function if invalid version', function() {
    var result = baNpdu.decodeFunction([0, 2, 12], 1);
    expect(result).to.equal(undefined);
  });

  it('should successfully encode and decode a basic NPDU package', function() {
    var buffer = utils.getBuffer();
    baNpdu.encode(buffer, 1);
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 2,
      funct: 1,
      destination: undefined,
      source: undefined,
      hopCount: 0,
      networkMsgType: 0,
      vendorId: 0
    });
  });

  it('should successfully encode and decode a NPDU package with destination', function() {
    var buffer = utils.getBuffer();
    var destination = {net: 1000, adr: [1, 2, 3]};
    baNpdu.encode(buffer, 1, destination, undefined, 11, 5, 7);
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 9,
      funct: 33,
      destination: {type: 0, net: 1000, adr: [1, 2, 3]},
      source: undefined,
      hopCount: 11,
      networkMsgType: 0,
      vendorId: 0
    });
  });

  it('should successfully encode and decode a NPDU package with destination and source', function() {
    var buffer = utils.getBuffer();
    var destination = {net: 1000, adr: [1, 2, 3]};
    var source = {net: 1000, adr: [1, 2, 3]};
    baNpdu.encode(buffer, 1, destination, source, 13, 10, 11);
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 15,
      funct: 41,
      destination: {type: 0, net: 1000, adr: [1, 2, 3]},
      source: {type: 0, net: 1000, adr: [1, 2, 3]},
      hopCount: 13,
      networkMsgType: 0,
      vendorId: 0
    });
  });

  it('should successfully encode and decode a NPDU package with broadcast destination and source', function() {
    var buffer = utils.getBuffer();
    var destination = {net: 65535};
    var source = {net: 1000};
    baNpdu.encode(buffer, 1, destination, source, 12, 8, 9);
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 9,
      funct: 41,
      destination: {type: 0, net: 65535},
      source: {type: 0, net: 1000},
      hopCount: 12,
      networkMsgType: 0,
      vendorId: 0
    });
  });

  it('should successfully encode and decode a network layer NPDU package', function() {
    var buffer = utils.getBuffer();
    baNpdu.encode(buffer, 128, undefined, undefined, 1, 128, 7777);
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 5,
      funct: 128,
      destination: undefined,
      source: undefined,
      hopCount: 0,
      networkMsgType: 128,
      vendorId: 7777
    });
  });

  it('should successfully encode and decode a who is router to network layer NPDU package', function() {
    var buffer = utils.getBuffer();
    baNpdu.encode(buffer, 128, undefined, undefined, 1, 0, 7777);
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 5,
      funct: 128,
      destination: undefined,
      source: undefined,
      hopCount: 0,
      networkMsgType: 0,
      vendorId: 0
    });
  });

  it('should fail if invalid BACNET version', function() {
    var buffer = utils.getBuffer();
    baNpdu.encode(buffer, 12, undefined, undefined, 1, 2, 3);
    buffer.buffer[0] = 2;
    var result = baNpdu.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });
});
