'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baBvlc      = require('../../lib/bvlc');

describe('bacstack - BVLC layer', () => {
  it('should successfuly encode and decode a package', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 4,
      func: 10,
      msgLength: 1482,
      originatingIP: null,
    });
  });

  it('should successfuly encode and decode a forwarded package', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 4, 1482, '1.2.255.0');
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 10,
      func: 4,
      msgLength: 1482,
      originatingIP: '1.2.255.0', // omit port if default
    });
  });

  it('should successfuly encode and decode a forwarded package on a different port', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 4, 1482, '1.2.255.0:47810');
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      len: 10,
      func: 4,
      msgLength: 1482,
      originatingIP: '1.2.255.0:47810', // include port if non-default
    });
  });

  it('should fail forwarding a non FORWARDED_NPU', () => {
    const buffer = utils.getBuffer();
    expect(() => {
      baBvlc.encode(buffer.buffer, 3, 1482, '1.2.255.0');
    }).to.throw(Error);
  });

  it('should fail if invalid BVLC type', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1482);
    buffer.buffer[0] = 8;
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if invalid length', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1481);
    buffer.buffer[0] = 8;
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if invalid function', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 100, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if unsuported function', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 99, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });
});
