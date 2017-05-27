var expect = require('chai').expect;

var utils = require('./utils');
var baServices = require('../../lib/bacnet-services');

describe('bacstack - Services layer', function() {
  describe('Iam', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeIamBroadcast(buffer, 47, 1, 1, 7);
      var result = baServices.decodeIamBroadcast(buffer.buffer, 0);
      expect(result.deviceId).to.deep.equal(47);
      expect(result.maxApdu).to.deep.equal(1);
      expect(result.segmentation).to.deep.equal(1);
      expect(result.vendorId).to.deep.equal(7);
    });
  });

  describe('WhoHas', function() {
    it('should successfully encode and decode by id', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeWhoHasBroadcast(buffer, 3, 4000, {type: 3, instance: 15});
      var result = baServices.DecodeWhoHasBroadcast(buffer.buffer, 0, buffer.offset);
      expect(result.lowLimit).to.deep.equal(3);
      expect(result.highLimit).to.deep.equal(4000);
      expect(result.objId.type).to.deep.equal(3);
      expect(result.objId.instance).to.deep.equal(15);
    });

    it('should successfully encode and decode by name', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeWhoHasBroadcast(buffer, 3, 4000, {}, 'analog-output-1');
      var result = baServices.DecodeWhoHasBroadcast(buffer.buffer, 0, buffer.offset);
      expect(result.lowLimit).to.deep.equal(3);
      expect(result.highLimit).to.deep.equal(4000);
      expect(result.objName).to.deep.equal('analog-output-1');
    });
  });

  describe('WhoIs', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeWhoIsBroadcast(buffer, 1, 3000);
      var result = baServices.DecodeWhoIsBroadcast(buffer.buffer, 0, buffer.offset);
      expect(result.lowLimit).to.deep.equal(1);
      expect(result.highLimit).to.deep.equal(3000);
    });
  });


  describe('DeviceCommunicationControl', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeDeviceCommunicationControl(buffer, 30, 1);
      var result = baServices.DecodeDeviceCommunicationControl(buffer.buffer, 0, buffer.offset);
      expect(result.timeDuration).to.deep.equal(30);
      expect(result.enableDisable).to.deep.equal(1);
    });

    it('should successfully encode and decode with password', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeDeviceCommunicationControl(buffer, 30, 1, 'Test1234!');
      var result = baServices.DecodeDeviceCommunicationControl(buffer.buffer, 0, buffer.offset);
      expect(result.timeDuration).to.deep.equal(30);
      expect(result.enableDisable).to.deep.equal(1);
      expect(result.password).to.deep.equal('Test1234!');
    });
  });

  describe('ReinitializeDevice', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeReinitializeDevice(buffer, 5);
      var result = baServices.DecodeReinitializeDevice(buffer.buffer, 0, buffer.offset);
      expect(result.state).to.deep.equal(5);
    });

    it('should successfully encode and decode with password', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeReinitializeDevice(buffer, 5, 'Test1234$');
      var result = baServices.DecodeReinitializeDevice(buffer.buffer, 0, buffer.offset);
      expect(result.state).to.deep.equal(5);
      expect(result.password).to.deep.equal('Test1234$');
    });
  });


  describe('TimeSync', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(990);
      baServices.EncodeTimeSync(buffer, date);
      var result = baServices.DecodeTimeSync(buffer.buffer, 0, buffer.offset);
      expect(result.value).to.deep.equal(date);
    });
  });

  describe('Error', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.EncodeError(buffer, 15, 25);
      var result = baServices.DecodeError(buffer.buffer, 0);
      expect(result.class).to.deep.equal(15);
      expect(result.code).to.deep.equal(25);
    });
  });
});
