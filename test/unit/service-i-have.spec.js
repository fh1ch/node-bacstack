'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baServices  = require('../../lib/services');

describe('bacstack - Services layer iHave unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.iHave.encode(buffer, {type: 8, instance: 443}, {type: 0, instance: 4}, 'LgtCmd01');
    const result = baServices.iHave.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).to.deep.equal({
      deviceId: {type: 8, instance: 443},
      objectId: {type: 0, instance: 4},
      objectName: 'LgtCmd01'
    });
  });
});
