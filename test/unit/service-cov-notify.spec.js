'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer COVNotify unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    const time = new Date(1, 1, 1);
    time.setMilliseconds(990);
    baServices.covNotify.encode(buffer, 7, 443, {type: 2, instance: 12}, 120, [
      {property: {id: 81, index: 0xFFFFFFFF}, value: [
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
        {type: 4, value: 0.1},
        {type: 5, value: 100.121212},
        {type: 6, value: [1, 2, 100, 200]},
        {type: 7, value: 'Test1234$'},
        {type: 8, value: {bitsUsed: 0, value: []}},
        {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
        {type: 9, value: 4},
        {type: 10, value: date},
        {type: 11, value: time}
      ], priority: 0},
      {property: {id: 82, index: 0}, value: [
        {type: 12, value: {type: 3, instance: 0}}
      ], priority: 8}
    ]);
    const result = baServices.covNotify.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    result.values[0].value[12].value = Math.floor(result.values[0].value[12].value * 1000) / 1000;
    expect(result).toEqual({
      initiatingDeviceId: {
        type: 8,
        instance: 443
      },
      monitoredObjectId: {
        type: 2,
        instance: 12
      },
      subscriberProcessId: 7,
      timeRemaining: 120,
      values: [
        {
          priority: 0,
          property: {
            index: 0xFFFFFFFF,
            id: 81
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
            {type: 4, value: 0.1},
            {type: 5, value: 100.121212},
            {type: 6, value: [1, 2, 100, 200]},
            {type: 7, value: 'Test1234$', encoding: 0},
            {type: 8, value: {bitsUsed: 0, value: []}},
            {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
            {type: 9, value: 4},
            {type: 10, value: date},
            {type: 11, value: time}
          ]
        },
        {
          priority: 0,
          property: {
            index: 0xFFFFFFFF,
            id: 82
          },
          value: [
            {type: 12, value: {type: 3, instance: 0}}
          ]
        }
      ]
    });
  });
});
