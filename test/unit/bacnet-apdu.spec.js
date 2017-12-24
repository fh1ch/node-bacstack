var expect        = require('chai').expect;
var utils         = require('./utils');
var baApdu        = require('../../lib/adpu');

describe('bacstack - APDU layer', function() {
  describe('decodedType', function() {
    it('should correctly encode and decode a package', function() {
      var value = [0, 128, 4, 5];
      baApdu.setDecodedType(value, 1, 48);
      var result = baApdu.getDecodedInvokeId(value, 1);
      expect(result).to.equal(4);
    });

    it('should correctly encode and decode a confirmed service package', function() {
      var value = [0, 128, 4, 5];
      baApdu.setDecodedType(value, 1, 0);
      var result = baApdu.getDecodedInvokeId(value, 1);
      expect(result).to.equal(5);
    });

    it('should fail if decode an invalid package', function() {
      var value = [0, 128, 4, 5];
      var result = baApdu.getDecodedInvokeId(value, 1);
      expect(result).to.equal(undefined);
    });
  });

  describe('confirmedServiceRequest', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeConfirmedServiceRequest(buffer, 0, 41, 176, 12, 44, 45, 46);
      var result = baApdu.decodeConfirmedServiceRequest(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 4,
        type: 0,
        service: 41,
        maxSegments: 176,
        maxAdpu: 12,
        invokeId: 44,
        sequencenumber: 0,
        proposedWindowNumber: 0
      });
    });

    it('should correctly encode and decode a segmented package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeConfirmedServiceRequest(buffer, 8, 47, 208, 14, 50, 51, 52);
      var result = baApdu.decodeConfirmedServiceRequest(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 6,
        type: 8,
        service: 47,
        maxSegments: 208,
        maxAdpu: 14,
        invokeId: 50,
        sequencenumber: 51,
        proposedWindowNumber: 52
      });
    });
  });

  describe('unconfirmedServiceRequest', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeUnconfirmedServiceRequest(buffer, 33, 34);
      var result = baApdu.decodeUnconfirmedServiceRequest(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 2,
        type: 33,
        service: 34
      });
    });
  });

  describe('simpleAck', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeSimpleAck(buffer, 11, 12, 13);
      var result = baApdu.decodeSimpleAck(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 3,
        type: 11,
        service: 12,
        invokeId: 13
      });
    });
  });

  describe('complexAck', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeComplexAck(buffer, 0, 15, 16, 20, 21);
      var result = baApdu.decodeComplexAck(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 3,
        type: 0,
        service: 15,
        invokeId: 16,
        sequencenumber: 0,
        proposedWindowNumber: 0
      });
    });

    it('should correctly encode and decode a segmented package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeComplexAck(buffer, 8, 18, 19, 20, 21);
      var result = baApdu.decodeComplexAck(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 5,
        type: 8,
        service: 18,
        invokeId: 19,
        sequencenumber: 20,
        proposedWindowNumber: 21
      });
    });
  });

  describe('segmentAck', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeSegmentAck(buffer, 6, 7, 8, 9);
      var result = baApdu.decodeSegmentAck(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 4,
        type: 6,
        originalInvokeId: 7,
        sequencenumber: 8,
        actualWindowSize: 9
      });
    });
  });

  describe('error', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeError(buffer, 5, 6, 7);
      var result = baApdu.decodeError(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 3,
        type: 5,
        service: 6,
        invokeId: 7
      });
    });
  });

  describe('abort', function() {
    it('should correctly encode and decode a package', function() {
      var buffer = utils.getBuffer();
      baApdu.encodeAbort(buffer, 4, 5, 6);
      var result = baApdu.decodeAbort(buffer.buffer, 0);
      expect(result).to.deep.equal({
        len: 3,
        type: 4,
        invokeId: 5,
        reason: 6
      });
    });
  });
});
