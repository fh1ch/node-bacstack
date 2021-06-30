'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer TimeSync unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    const date = new Date();
    date.setMilliseconds(990);
    baServices.timeSync.encode(buffer, date);
    const result = baServices.timeSync.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      value: date
    });
  });
});
