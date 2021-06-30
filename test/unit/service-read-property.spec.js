'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');
const baEnum = require('../../lib/enum');

describe('bacstack - Services layer ReadProperty unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encode(buffer, 4, 630, 85, 0xFFFFFFFF);
    const result = baServices.readProperty.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 4, instance: 630},
      property: {id: 85, index: 0xFFFFFFFF}
    });
  });

  it('should successfully encode and decode with object-tye > 512', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encode(buffer, 630, 5, 12, 0xFFFFFFFF);
    const result = baServices.readProperty.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 630, instance: 5},
      property: {id: 12, index: 0xFFFFFFFF}
    });
  });

  it('should successfully encode and decode with array index', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encode(buffer, 4, 630, 85, 2);
    const result = baServices.readProperty.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {type: 4, instance: 630},
      property: {id: 85, index: 2}
    });
  });
});

describe('ReadPropertyAcknowledge', () => {
  it('should successfully encode and decode a boolean value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 1, value: true},
      {type: 1, value: false}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 1, value: true},
        {type: 1, value: false}
      ]
    });
  });

  it('should successfully encode and decode a boolean value with array index', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 2, [
      {type: 1, value: true}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 2,
        id: 81
      },
      values: [
        {type: 1, value: true}
      ]
    });
  });

  it('should successfully encode and decode an unsigned value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 2, value: 1},
      {type: 2, value: 1000},
      {type: 2, value: 1000000},
      {type: 2, value: 1000000000}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 2, value: 1},
        {type: 2, value: 1000},
        {type: 2, value: 1000000},
        {type: 2, value: 1000000000}
      ]
    });
  });

  it('should successfully encode and decode a signed value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 3, value: -1},
      {type: 3, value: -1000},
      {type: 3, value: -1000000},
      {type: 3, value: -1000000000}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 3, value: -1},
        {type: 3, value: -1000},
        {type: 3, value: -1000000},
        {type: 3, value: -1000000000}
      ]
    });
  });

  it('should successfully encode and decode an real value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 4, value: 0},
      {type: 4, value: 0.1}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(Math.floor(0.1 * 10000)).toEqual(Math.floor(result.values[1].value * 10000));
    result.values[1].value = 0;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 4, value: 0},
        {type: 4, value: 0}
      ]
    });
  });

  it('should successfully encode and decode a double value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 5, value: 0},
      {type: 5, value: 100.121212}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 5, value: 0},
        {type: 5, value: 100.121212}
      ]
    });
  });

  it('should successfully encode and decode an octet-string value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 6, value: []},
      {type: 6, value: [1, 2, 100, 200]}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 6, value: []},
        {type: 6, value: [1, 2, 100, 200]}
      ]
    });
  });

  it('should successfully encode and decode a character-string value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 7, value: ''},
      {type: 7, value: 'Test1234$äöü'}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 7, value: '', encoding: 0},
        {type: 7, value: 'Test1234$äöü', encoding: 0}
      ]
    });
  });

  it('should successfully encode and decode a character-string value with ISO-8859-1 encoding', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.ISO_8859_1},
      {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncoding.ISO_8859_1}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.ISO_8859_1},
        {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncoding.ISO_8859_1}
      ]
    });
  });

  it('should successfully encode and decode a character-string value with UCS2 encoding', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.UCS_2},
      {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncoding.UCS_2}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.UCS_2},
        {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncoding.UCS_2}
      ]
    });
  });

  it('should successfully encode and decode a character-string value with Codepage850 encoding', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.MICROSOFT_DBCS},
      {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncoding.MICROSOFT_DBCS}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.MICROSOFT_DBCS},
        {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncoding.MICROSOFT_DBCS}
      ]
    });
  });

  it('should successfully encode and decode a character-string value with JISX-0208 encoding', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.JIS_X_0208},
      {type: 7, value: 'できます', encoding: baEnum.CharacterStringEncoding.JIS_X_0208}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncoding.JIS_X_0208},
        {type: 7, value: 'できます', encoding: baEnum.CharacterStringEncoding.JIS_X_0208}
      ]
    });
  });

  it('should successfully encode and decode a bit-string value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 8, value: {bitsUsed: 0, value: []}},
      {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 8, value: {bitsUsed: 0, value: []}},
        {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}}
      ]
    });
  });

  it('should successfully encode and decode a enumeration value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 9, value: 0},
      {type: 9, value: 4}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 9, value: 0},
        {type: 9, value: 4}
      ]
    });
  });

  it('should successfully encode and decode a date value', () => {
    const buffer = utils.getBuffer();
    const date = new Date(1, 1, 1);
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 10, value: date}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 10, value: date}
      ]
    });
  });

  it('should successfully encode and decode a time value', () => {
    const buffer = utils.getBuffer();
    const time = new Date(1, 1, 1);
    time.setMilliseconds(990);
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 11, value: time}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 11, value: time}
      ]
    });
  });

  it('should successfully encode and decode a object-identifier value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
      {type: 12, value: {type: 3, instance: 0}},
      {type: 12, value: {type: 3, instance: 50000}}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 8,
        instance: 40000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 81
      },
      values: [
        {type: 12, value: {type: 3, instance: 0}},
        {type: 12, value: {type: 3, instance: 50000}}
      ]
    });
  });

  it('should successfully encode and decode a cov-subscription value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 222, instance: 3}, 152, 0xFFFFFFFF, [
      {type: 111, value: {
        recipient: {network: 12, address: [0, 1]},
        subscriptionProcessId: 3,
        monitoredObjectId: {type: 2, instance: 1},
        monitoredProperty: {id: 85, index: 0},
        issueConfirmedNotifications: false,
        timeRemaining: 5,
        covIncrement: 1
      }},
      {type: 111, value: {
        recipient: {network: 0xFFFF, address: []},
        subscriptionProcessId: 3,
        monitoredObjectId: {type: 2, instance: 1},
        monitoredProperty: {id: 85, index: 5},
        issueConfirmedNotifications: true,
        timeRemaining: 5
      }}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 222,
        instance: 3
      },
      property: {
        index: 0xFFFFFFFF,
        id: 152
      },
      values: [
        {type: 111, value: {
          recipient: {net: 12, adr: [0, 1]},
          subscriptionProcessId: 3,
          monitoredObjectId: {type: 2, instance: 1},
          monitoredProperty: {id: 85, index: 0},
          issueConfirmedNotifications: false,
          timeRemaining: 5,
          covIncrement: 1
        }},
        {type: 111, value: {
          recipient: {net: 0xFFFF, adr: []},
          subscriptionProcessId: 3,
          monitoredObjectId: {type: 2, instance: 1},
          monitoredProperty: {id: 85, index: 5},
          issueConfirmedNotifications: true,
          timeRemaining: 5
        }}
      ]
    });
  });

  it('should successfully encode and decode a read-access-specification value', () => {
    const buffer = utils.getBuffer();
    baServices.readProperty.encodeAcknowledge(buffer, {type: 223, instance: 90000}, 53, 0xFFFFFFFF, [
      {type: 115, value: {objectId: {type: 3, instance: 0}, properties: []}},
      {type: 115, value: {objectId: {type: 3, instance: 50000}, properties: [
        {id: 85},
        {id: 1, index: 2}
      ]}}
    ]);
    const result = baServices.readProperty.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectId: {
        type: 223,
        instance: 90000
      },
      property: {
        index: 0xFFFFFFFF,
        id: 53
      },
      values: [
        {type: 115, value: {objectId: {type: 3, instance: 0}, properties: []}},
        {type: 115, value: {objectId: {type: 3, instance: 50000}, properties: [
          {id: 85, index: 0xFFFFFFFF},
          {id: 1, index: 2}
        ]}}
      ]
    });
  });
});
