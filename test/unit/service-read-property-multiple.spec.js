'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer ReadPropertyMultiple unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.readPropertyMultiple.encode(buffer, [
      {objectId: {type: 51, instance: 1}, properties: [
        {id: 85, index: 0xFFFFFFFF},
        {id: 85, index: 4}
      ]}
    ]);
    const result = baServices.readPropertyMultiple.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({properties: [{objectId: {type: 51, instance: 1}, properties: [
      {id: 85, index: 0xFFFFFFFF},
      {id: 85, index: 4}
    ]}]});
  });
});

describe('ReadPropertyMultipleAcknowledge', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    const time = new Date(1, 1, 1);
    time.setMilliseconds(990);
    baServices.readPropertyMultiple.encodeAcknowledge(buffer, [
      {objectId: {type: 9, instance: 50000}, values: [
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
          {type: 11, value: time},
          {type: 12, value: {type: 3, instance: 0}}
        ]}
      ]}
    ]);
    const result = baServices.readPropertyMultiple.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(Math.floor(0.1 * 10000)).toEqual(Math.floor(result.values[0].values[0].value[12].value * 10000));
    result.values[0].values[0].value[12].value = 0;
    expect(result).toEqual({
      values: [{
        objectId: {
          type: 9,
          instance: 50000
        },
        values: [{
          index: 4294967295,
          id: 81,
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
            {type: 6, value: [1, 2, 100, 200]},
            {type: 7, value: 'Test1234$', encoding: 0},
            {type: 8, value: {bitsUsed: 0, value: []}},
            {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
            {type: 9, value: 4},
            {type: 10, value: date},
            {type: 11, value: time},
            {type: 12, value: {type: 3, instance: 0}}
          ]
        }]
      }]
    });
  });

  it('should successfully encode and decode an error', () => {
    const buffer = utils.getBuffer();
    baServices.readPropertyMultiple.encodeAcknowledge(buffer, [
      {objectId: {type: 9, instance: 50000}, values: [
        {property: {id: 81, index: 0xFFFFFFFF}, value: [
          {type: 0, value: {type: 'BacnetError', errorClass: 12, errorCode: 13}}
        ]}
      ]}
    ]);
    const result = baServices.readPropertyMultiple.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      values: [{
        objectId: {
          type: 9,
          instance: 50000
        },
        values: [{
          index: 4294967295,
          id: 81,
          value: [{
            type: 105,
            value: {
              errorClass: 12,
              errorCode: 13
            }
          }]
        }]
      }]
    });
  });
});
