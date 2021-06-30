'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer WhoHas unit', () => {
  it('should successfully encode and decode by id', () => {
    const buffer = utils.getBuffer();
    baServices.whoHas.encode(buffer, 3, 4000, {type: 3, instance: 15});
    const result = baServices.whoHas.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      lowLimit: 3,
      highLimit: 4000,
      objectId: {
        type: 3,
        instance: 15
      }
    });
  });

  it('should successfully encode and decode by name', () => {
    const buffer = utils.getBuffer();
    baServices.whoHas.encode(buffer, 3, 4000, {}, 'analog-output-1');
    const result = baServices.whoHas.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      lowLimit: 3,
      highLimit: 4000,
      objectName: 'analog-output-1'
    });
  });
});
