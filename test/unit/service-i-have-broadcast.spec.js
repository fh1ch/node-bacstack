'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer IhaveBroadcast unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.iHaveBroadcast.encode(buffer, {type: 8, instance: 443}, {type: 0, instance: 4}, 'LgtCmd01');
    const result = baServices.iHaveBroadcast.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      deviceId: {type: 8, instance: 443},
      objectId: {type: 0, instance: 4},
      objectName: 'LgtCmd01'
    });
  });
});
