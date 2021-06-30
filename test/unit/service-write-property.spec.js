'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer WriteProperty unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    const time = new Date(1, 1, 1);
    time.setMilliseconds(990);
    baServices.writeProperty.encode(buffer, 31, 12, 80, 0xFFFFFFFF, 0, [
      {type: 0},
      {type: 1, value: null},
      {type: 1, value: true},
      {type: 1, value: false},
      {type: 2, value: 1},
      {type: 2, value: 1000},
      {type: 2, value: 1000000},
      {type: 2, value: 1000000000},
      {type: 3, value: -1},
      {type: 3, value: -1000},
      {type: 3, value: -1000000},
      {type: 3, value: -1000000000},
      {type: 4, value: 0},
      {type: 5, value: 100.121212},
      {type: 7, value: 'Test1234$'},
      {type: 9, value: 4},
      {type: 10, value: date},
      {type: 11, value: time},
      {type: 12, value: {type: 3, instance: 0}}
    ]);
    const result = baServices.writeProperty.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        instance: 12,
        type: 31
      },
      value: {
        priority: 16,
        property: {
          index: 4294967295,
          id: 80
        },
        value: [
          {type: 0, value: null},
          {type: 0, value: null},
          {type: 1, value: true},
          {type: 1, value: false},
          {type: 2, value: 1},
          {type: 2, value: 1000},
          {type: 2, value: 1000000},
          {type: 2, value: 1000000000},
          {type: 3, value: -1},
          {type: 3, value: -1000},
          {type: 3, value: -1000000},
          {type: 3, value: -1000000000},
          {type: 4, value: 0},
          {type: 5, value: 100.121212},
          {type: 7, value: 'Test1234$', encoding: 0},
          {type: 9, value: 4},
          {type: 10, value: date},
          {type: 11, value: time},
          {type: 12, value: {type: 3, instance: 0}}
        ]
      }
    });
  });

  it('should successfully encode and decode with defined priority', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    const time = new Date(1, 1, 1);
    time.setMilliseconds(990);
    baServices.writeProperty.encode(buffer, 31, 12, 80, 0xFFFFFFFF, 8, [
      {type: 0},
      {type: 1, value: null},
      {type: 1, value: true},
      {type: 1, value: false},
      {type: 2, value: 1},
      {type: 2, value: 1000},
      {type: 2, value: 1000000},
      {type: 2, value: 1000000000},
      {type: 3, value: -1},
      {type: 3, value: -1000},
      {type: 3, value: -1000000},
      {type: 3, value: -1000000000},
      {type: 4, value: 0},
      {type: 5, value: 100.121212},
      {type: 7, value: 'Test1234$'},
      {type: 9, value: 4},
      {type: 10, value: date},
      {type: 11, value: time},
      {type: 12, value: {type: 3, instance: 0}}
    ]);
    const result = baServices.writeProperty.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        instance: 12,
        type: 31
      },
      value: {
        priority: 8,
        property: {
          index: 4294967295,
          id: 80
        },
        value: [
          {type: 0, value: null},
          {type: 0, value: null},
          {type: 1, value: true},
          {type: 1, value: false},
          {type: 2, value: 1},
          {type: 2, value: 1000},
          {type: 2, value: 1000000},
          {type: 2, value: 1000000000},
          {type: 3, value: -1},
          {type: 3, value: -1000},
          {type: 3, value: -1000000},
          {type: 3, value: -1000000000},
          {type: 4, value: 0},
          {type: 5, value: 100.121212},
          {type: 7, value: 'Test1234$', encoding: 0},
          {type: 9, value: 4},
          {type: 10, value: date},
          {type: 11, value: time},
          {type: 12, value: {type: 3, instance: 0}}
        ]
      }
    });
  });

  it('should successfully encode and decode with defined array index', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    const time = new Date(1, 1, 1);
    time.setMilliseconds(990);
    baServices.writeProperty.encode(buffer, 31, 12, 80, 2, 0, [
      {type: 0, value: null},
      {type: 0, value: null},
      {type: 1, value: true},
      {type: 1, value: false},
      {type: 2, value: 1},
      {type: 2, value: 1000},
      {type: 2, value: 1000000},
      {type: 2, value: 1000000000},
      {type: 3, value: -1},
      {type: 3, value: -1000},
      {type: 3, value: -1000000},
      {type: 3, value: -1000000000},
      {type: 4, value: 0},
      {type: 5, value: 100.121212},
      {type: 7, value: 'Test1234$', encoding: 0},
      {type: 9, value: 4},
      {type: 10, value: date},
      {type: 11, value: time},
      {type: 12, value: {type: 3, instance: 0}}
    ]);
    const result = baServices.writeProperty.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        instance: 12,
        type: 31
      },
      value: {
        priority: 16,
        property: {
          index: 2,
          id: 80
        },
        value: [
          {type: 0, value: null},
          {type: 0, value: null},
          {type: 1, value: true},
          {type: 1, value: false},
          {type: 2, value: 1},
          {type: 2, value: 1000},
          {type: 2, value: 1000000},
          {type: 2, value: 1000000000},
          {type: 3, value: -1},
          {type: 3, value: -1000},
          {type: 3, value: -1000000},
          {type: 3, value: -1000000000},
          {type: 4, value: 0},
          {type: 5, value: 100.121212},
          {type: 7, value: 'Test1234$', encoding: 0},
          {type: 9, value: 4},
          {type: 10, value: date},
          {type: 11, value: time},
          {type: 12, value: {type: 3, instance: 0}}
        ]
      }
    });
  });
});
