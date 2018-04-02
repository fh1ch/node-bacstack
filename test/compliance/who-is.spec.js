'use strict';

const expect  = require('chai').expect;
const bacnet   = require('../../');

describe('bacstack - whoIs compliance', () => {
  let client;

  beforeEach(() => client = new bacnet({apduTimeout: 1000}));
  afterEach(() => client.close());

  it('should find the device simulator', (next) => {
    client.on('iAm', (device) => {
      expect(device.deviceId).to.eql(1234);
      expect(device.maxApdu).to.eql(1476);
      expect(device.segmentation).to.eql(bacnet.enum.Segmentation.NO_SEGMENTATION);
      expect(device.vendorId).to.eql(260);
      next();
    });
    client.whoIs();
  });

  it('should find the device simulator with provided min device ID', (next) => {
    client.on('iAm', (device) => {
      expect(device.deviceId).to.eql(1234);
      next();
    });
    client.whoIs(1233);
  });

  it('should find the device simulator with provided min/max device ID and IP', (next) => {
    client.on('iAm', (device) => {
      expect(device.deviceId).to.eql(1234);
      next();
    });
    client.whoIs(1233, 1235, 'bacnet-device');
  });
});
