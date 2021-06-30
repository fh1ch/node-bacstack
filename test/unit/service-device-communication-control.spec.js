'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer DeviceCommunicationControl unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.deviceCommunicationControl.encode(buffer, 30, 1);
    const result = baServices.deviceCommunicationControl.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      timeDuration: 30,
      enableDisable: 1
    });
  });

  it('should successfully encode and decode with password', () => {
    const buffer = utils.getBuffer();
    baServices.deviceCommunicationControl.encode(buffer, 30, 1, 'Test1234!');
    const result = baServices.deviceCommunicationControl.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      timeDuration: 30,
      enableDisable: 1,
      password: 'Test1234!'
    });
  });
});
