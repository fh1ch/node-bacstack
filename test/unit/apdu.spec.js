'use strict';

const utils = require('./utils');
const baApdu = require('../../lib/apdu');

describe('bacstack - APDU layer', () => {
  describe('decodedType', () => {
    it('should correctly encode and decode a package', () => {
      const value = [0, 128, 4, 5];
      baApdu.setDecodedType(value, 1, 48);
      const result = baApdu.getDecodedInvokeId(value, 1);
      expect(result).toEqual(4);
    });

    it('should correctly encode and decode a confirmed service package', () => {
      const value = [0, 128, 4, 5];
      baApdu.setDecodedType(value, 1, 0);
      const result = baApdu.getDecodedInvokeId(value, 1);
      expect(result).toEqual(5);
    });

    it('should fail if decode an invalid package', () => {
      const value = [0, 128, 4, 5];
      const result = baApdu.getDecodedInvokeId(value, 1);
      expect(result).toBeUndefined();
    });
  });

  describe('confirmedServiceRequest', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeConfirmedServiceRequest(buffer, 0, 41, 176, 12, 44, 45, 46);
      const result = baApdu.decodeConfirmedServiceRequest(buffer.buffer, 0);
      expect(result).toEqual({
        len: 4,
        type: 0,
        service: 41,
        maxSegments: 176,
        maxApdu: 12,
        invokeId: 44,
        sequencenumber: 0,
        proposedWindowNumber: 0
      });
    });

    it('should correctly encode and decode a segmented package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeConfirmedServiceRequest(buffer, 8, 47, 208, 14, 50, 51, 52);
      const result = baApdu.decodeConfirmedServiceRequest(buffer.buffer, 0);
      expect(result).toEqual({
        len: 6,
        type: 8,
        service: 47,
        maxSegments: 208,
        maxApdu: 14,
        invokeId: 50,
        sequencenumber: 51,
        proposedWindowNumber: 52
      });
    });
  });

  describe('unconfirmedServiceRequest', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeUnconfirmedServiceRequest(buffer, 33, 34);
      const result = baApdu.decodeUnconfirmedServiceRequest(buffer.buffer, 0);
      expect(result).toEqual({
        len: 2,
        type: 33,
        service: 34
      });
    });
  });

  describe('simpleAck', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeSimpleAck(buffer, 11, 12, 13);
      const result = baApdu.decodeSimpleAck(buffer.buffer, 0);
      expect(result).toEqual({
        len: 3,
        type: 11,
        service: 12,
        invokeId: 13
      });
    });
  });

  describe('complexAck', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeComplexAck(buffer, 0, 15, 16, 20, 21);
      const result = baApdu.decodeComplexAck(buffer.buffer, 0);
      expect(result).toEqual({
        len: 3,
        type: 0,
        service: 15,
        invokeId: 16,
        sequencenumber: 0,
        proposedWindowNumber: 0
      });
    });

    it('should correctly encode and decode a segmented package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeComplexAck(buffer, 8, 18, 19, 20, 21);
      const result = baApdu.decodeComplexAck(buffer.buffer, 0);
      expect(result).toEqual({
        len: 5,
        type: 8,
        service: 18,
        invokeId: 19,
        sequencenumber: 20,
        proposedWindowNumber: 21
      });
    });
  });

  describe('segmentAck', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeSegmentAck(buffer, 6, 7, 8, 9);
      const result = baApdu.decodeSegmentAck(buffer.buffer, 0);
      expect(result).toEqual({
        len: 4,
        type: 6,
        originalInvokeId: 7,
        sequencenumber: 8,
        actualWindowSize: 9
      });
    });
  });

  describe('error', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeError(buffer, 5, 6, 7);
      const result = baApdu.decodeError(buffer.buffer, 0);
      expect(result).toEqual({
        len: 3,
        type: 5,
        service: 6,
        invokeId: 7
      });
    });
  });

  describe('abort', () => {
    it('should correctly encode and decode a package', () => {
      const buffer = utils.getBuffer();
      baApdu.encodeAbort(buffer, 4, 5, 6);
      const result = baApdu.decodeAbort(buffer.buffer, 0);
      expect(result).toEqual({
        len: 3,
        type: 4,
        invokeId: 5,
        reason: 6
      });
    });
  });
});
