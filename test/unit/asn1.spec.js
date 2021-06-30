'use strict';

const baAsn1 = require('../../lib/asn1');

describe('bacstack - ASN1 layer', () => {
  describe('decodeUnsigned', () => {
    it('should fail if unsuport length', () => {
      expect(() => baAsn1.decodeUnsigned(Buffer.from([0xFF, 0xFF]), 0, 5)).toThrow('outside buffer bounds');
    });

    it('should successfully decode 8-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 1);
      expect(result).toEqual({len: 1, value: 255});
    });

    it('should successfully decode 16-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 2);
      expect(result).toEqual({len: 2, value: 65535});
    });

    it('should successfully decode 24-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 3);
      expect(result).toEqual({len: 3, value: 16777215});
    });

    it('should successfully decode 32-bit unsigned integer', () => {
      const result = baAsn1.decodeUnsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 4);
      expect(result).toEqual({len: 4, value: 4294967295});
    });
  });

  describe('encodeBacnetObjectId', () => {
    it('should successfully encode with object-type > 512', () => {
      const buffer = {buffer: Buffer.alloc(4), offset: 0};
      baAsn1.encodeBacnetObjectId(buffer, 600, 600);
      expect(buffer).toEqual({buffer: Buffer.from([150, 0, 2, 88]), offset: 4});
    });
  });
});
