'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer AtomicWriteFile unit', () => {
  it('should successfully encode and decode as stream', () => {
    const buffer = utils.getBuffer();
    baServices.atomicWriteFile.encode(buffer, true, {type: 12, instance: 51}, 5, [[12, 12]]);
    const result = baServices.atomicWriteFile.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 12, instance: 51},
      isStream: true,
      position: 5,
      blocks: [[12, 12]]
    });
  });

  it('should successfully encode and decode as non-stream', () => {
    const buffer = utils.getBuffer();
    baServices.atomicWriteFile.encode(buffer, false, {type: 12, instance: 88}, 10, [[12, 12], [12, 12]]);
    const result = baServices.atomicWriteFile.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 12, instance: 88},
      isStream: false,
      position: 10,
      blocks: [[12, 12], [12, 12]]
    });
  });
});

describe('AtomicWriteFileAcknowledge', () => {
  it('should successfully encode and decode streamed file', () => {
    const buffer = utils.getBuffer();
    baServices.atomicWriteFile.encodeAcknowledge(buffer, true, -10);
    const result = baServices.atomicWriteFile.decodeAcknowledge(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      isStream: true,
      position: -10
    });
  });

  it('should successfully encode and decode non-streamed file', () => {
    const buffer = utils.getBuffer();
    baServices.atomicWriteFile.encodeAcknowledge(buffer, false, 10);
    const result = baServices.atomicWriteFile.decodeAcknowledge(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      isStream: false,
      position: 10
    });
  });
});
