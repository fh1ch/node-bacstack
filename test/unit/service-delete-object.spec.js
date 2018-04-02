'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baServices  = require('../../lib/services');

describe('bacstack - Services layer DeleteObject unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.deleteObject.encode(buffer, {type: 1, instance: 10});
    const result = baServices.deleteObject.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).to.deep.equal({
      objectType: 1,
      instance: 10
    });
  });
});
