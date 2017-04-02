var expect = require('chai').expect;

var baApdu = require('../../lib/bacnet-adpu');

describe('bacstack - APDU layer', function() {
  describe('setDecodedType', function() {
    it('should correctly set the type', function() {
      var result = [0, 0 , 0];
      baApdu.setDecodedType(result, 1, 5);
      expect(result).to.eql([0, 5, 0]);
    });
  });
});
