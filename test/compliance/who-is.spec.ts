'use strict';

import {Client} from '../../lib/client';
import * as baEnum from '../../lib/enum';

describe('bacstack - whoIs compliance', () => {
  let client: Client;

  beforeEach(() => client = new Client({apduTimeout: 1000}));
  afterEach(() => client.close());

  it('should find the device simulator', (next) => {
    client.on('iAm', (device) => {
      expect(device.deviceId).toEqual(1234);
      expect(device.maxApdu).toEqual(1476);
      expect(device.segmentation).toEqual(baEnum.Segmentation.NO_SEGMENTATION);
      expect(device.vendorId).toEqual(260);
      next();
    });
    client.whoIs();
  });

  it('should find the device simulator with provided min device ID', (next) => {
    client.on('iAm', (device) => {
      expect(device.deviceId).toEqual(1234);
      next();
    });
    client.whoIs({lowLimit: 1233});
  });

  it('should find the device simulator with provided min/max device ID and IP', (next) => {
    client.on('iAm', (device) => {
      expect(device.deviceId).toEqual(1234);
      next();
    });
    client.whoIs({lowLimit: 1233, highLimit: 1235, address: 'bacnet-device'});
  });
});
