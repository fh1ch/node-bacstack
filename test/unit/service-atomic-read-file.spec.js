'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer AtomicReadFile unit', () => {
  it('should successfully encode and decode as stream', () => {
    const buffer = utils.getBuffer();
    baServices.atomicReadFile.encode(buffer, true, {type: 13, instance: 5000}, -50, 12);
    const result = baServices.atomicReadFile.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 13, instance: 5000},
      count: 12,
      isStream: true,
      position: -50
    });
  });

  it('should successfully encode and decode as non-stream', () => {
    const buffer = utils.getBuffer();
    baServices.atomicReadFile.encode(buffer, false, {type: 14, instance: 5001}, 60, 13);
    const result = baServices.atomicReadFile.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 14, instance: 5001},
      count: 13,
      isStream: false,
      position: 60
    });
  });
});

describe('AtomicReadFileAcknowledge', () => {
  it('should successfully encode and decode as stream', () => {
    const buffer = utils.getBuffer();
    baServices.atomicReadFile.encodeAcknowledge(buffer, true, false, 0, 90, [[12, 12, 12]], [3]);
    const result = baServices.atomicReadFile.decodeAcknowledge(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      isStream: true,
      position: 0,
      endOfFile: false,
      buffer: Buffer.from([12, 12, 12])
    });
  });

  it('should successfully encode and decode as non-stream', () => {
    const buffer = utils.getBuffer();
    baServices.atomicReadFile.encodeAcknowledge(buffer, false, false, 0, 90, [12, 12, 12], 3);
    // TODO: AtomicReadFileAcknowledge as non-stream not yet implemented
    expect(() => baServices.atomicReadFile.decodeAcknowledge(buffer.buffer, 0)).toThrow('NotImplemented');
  });
});
