'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');
const baEnum = require('../../lib/enum');

describe('bacstack - Services layer ReadRange unit', () => {
  it('should successfully encode and decode by position', () => {
    const buffer = utils.getBuffer();
    baServices.readRange.encode(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, baEnum.ReadRangeType.BY_POSITION, 10, null, 0);
    const result = baServices.readRange.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      count: 0,
      objectId: {type: 61, instance: 35},
      position: 10,
      property: {
        index: 0xFFFFFFFF,
        id: 85
      },
      requestType: baEnum.ReadRangeType.BY_POSITION,
      time: undefined
    });
  });

  it('should successfully encode and decode by position with array index', () => {
    const buffer = utils.getBuffer();
    baServices.readRange.encode(buffer, {type: 61, instance: 35}, 12, 2, baEnum.ReadRangeType.BY_SEQUENCE_NUMBER, 10, null, 0);
    const result = baServices.readRange.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      count: 0,
      objectId: {type: 61, instance: 35},
      position: 10,
      property: {
        index: 2,
        id: 12
      },
      requestType: baEnum.ReadRangeType.BY_SEQUENCE_NUMBER,
      time: undefined
    });
  });

  it('should successfully encode and decode by sequence', () => {
    const buffer = utils.getBuffer();
    baServices.readRange.encode(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, baEnum.ReadRangeType.BY_SEQUENCE_NUMBER, 11, null, 1111);
    const result = baServices.readRange.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      count: 1111,
      objectId: {type: 61, instance: 35},
      position: 11,
      property: {
        index: 0xFFFFFFFF,
        id: 85
      },
      requestType: baEnum.ReadRangeType.BY_SEQUENCE_NUMBER,
      time: undefined
    });
  });

  it('should successfully encode and decode by time', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    date.setMilliseconds(990);
    baServices.readRange.encode(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, baEnum.ReadRangeType.BY_TIME_REFERENCE_TIME_COUNT, null, date, -1111);
    const result = baServices.readRange.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      count: -1111,
      objectId: {type: 61, instance: 35},
      position: undefined,
      property: {
        index: 0xFFFFFFFF,
        id: 85
      },
      requestType: baEnum.ReadRangeType.BY_TIME_REFERENCE_TIME_COUNT,
      time: date
    });
  });
});

describe('ReadRangeAcknowledge', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.readRange.encodeAcknowledge(buffer, {type: 12, instance: 500}, 5048, 0xFFFFFFFF, {bitsUsed: 24, value: [1, 2, 3]}, 12, Buffer.from([1, 2, 3]), 2, 2);
    const result = baServices.readRange.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 12, instance: 500},
      itemCount: 12,
      property: {id: 5048, index: 0xFFFFFFFF},
      resultFlag: {bitsUsed: 24, value: [1, 2, 3]},
      rangeBuffer: Buffer.from([1, 2, 3])
    });
  });
});
