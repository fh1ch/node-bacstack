var expect = require('chai').expect;

var baAsn1 = require('../../lib/bacnet-asn1');

describe('bacstack - ASN1 layer', function() {
  describe('decode_unsigned', function() {
    it('should fail if unsuport length', function() {
      var result = baAsn1.decode_unsigned(Buffer.from([0xFF, 0xFF]), 0, 5);
      expect(result).to.eql({len: 5, value: NaN});
    });

    it('should successfully decode 8-bit unsigned integer', function() {
      var result = baAsn1.decode_unsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 1);
      expect(result.value).to.eql(255);
      expect(result.len).to.eql(1);
    });

    it('should successfully decode 16-bit unsigned integer', function() {
      var result = baAsn1.decode_unsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 2);
      expect(result.value).to.eql(65535);
      expect(result.len).to.eql(2);
    });

    it('should successfully decode 24-bit unsigned integer', function() {
      var result = baAsn1.decode_unsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 3);
      expect(result.value).to.eql(16777215);
      expect(result.len).to.eql(3);
    });

    it('should successfully decode 32-bit unsigned integer', function() {
      var result = baAsn1.decode_unsigned(Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]), 1, 4);
      expect(result.value).to.eql(4294967295);
      expect(result.len).to.eql(4);
    });
  });
});
