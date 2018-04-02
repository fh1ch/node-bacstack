'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baAsn1      = require('../../lib/asn1');

describe('bacstack - ASN1 layer', () => {
  describe('decodeUnsigned', () => {
    it('should fail if unsuport length', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0xFF, 0xFF]), 0, 5);
      expect(result).to.deep.equal({len: 5, value: NaN});
    });

    it('should successfully decode 8-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 1);
      expect(result).to.deep.equal({len: 1, value: 255});
    });

    it('should successfully decode 16-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 2);
      expect(result).to.deep.equal({len: 2, value: 65535});
    });

    it('should successfully decode 24-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 3);
      expect(result).to.deep.equal({len: 3, value: 16777215});
    });

    it('should successfully decode 32-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 4);
      expect(result).to.deep.equal({len: 4, value: 4294967295});
    });
  });
});
