'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer Iam unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.iAmBroadcast.encode(buffer, 47, 1, 1, 7);
    const result = baServices.iAmBroadcast.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      deviceId: 47,
      maxApdu: 1,
      segmentation: 1,
      vendorId: 7
    });
  });
});
