'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer LifeSafetyOperation unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.lifeSafetyOperation.encode(buffer, 8, 'User01', 7, {type: 0, instance: 77});
    const result = baServices.lifeSafetyOperation.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      processId: 8,
      requestingSource: 'User01',
      operation: 7,
      targetObjectId: {type: 0, instance: 77}
    });
  });
});
