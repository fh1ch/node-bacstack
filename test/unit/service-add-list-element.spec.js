'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer AddListElement unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.addListElement.encode(buffer, {type: 11, instance: 560}, 85, 2, [
      {type: 1, value: false},
      {type: 2, value: 1}
    ]);
    const result = baServices.addListElement.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 11, instance: 560},
      property: {id: 85, index: 2},
      values: [
        {type: 1, value: false},
        {type: 2, value: 1}
      ]
    });
  });
});
