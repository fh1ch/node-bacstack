'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baServices  = require('../../lib/services');

describe('bacstack - Services layer iAm unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.iAm.encode(buffer, 47, 1, 1, 7);
    const result = baServices.iAm.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).to.deep.equal({
      deviceId: 47,
      maxApdu: 1,
      segmentation: 1,
      vendorId: 7
    });
  });
});
