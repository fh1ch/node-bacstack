'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer PrivateTransfer unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.privateTransfer.encode(buffer, 255, 8, [1, 2, 3, 4, 5]);
    const result = baServices.privateTransfer.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      vendorId: 255,
      serviceNumber: 8,
      data: [1, 2, 3, 4, 5]
    });
  });
});
