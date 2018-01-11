'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baServices  = require('../../lib/services');
const baEnum      = require('../../lib/enum');

describe('bacstack - Services layer', () => {
  describe('Iam', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeIamBroadcast(buffer, 47, 1, 1, 7);
      const result = baServices.decodeIamBroadcast(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        deviceId: 47,
        maxApdu: 1,
        segmentation: 1,
        vendorId: 7
      });
    });
  });

  describe('WhoHas', () => {
    it('should successfully encode and decode by id', () => {
      const buffer = utils.getBuffer();
      baServices.encodeWhoHasBroadcast(buffer, 3, 4000, {type: 3, instance: 15});
      const result = baServices.decodeWhoHasBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        lowLimit: 3,
        highLimit: 4000,
        objectId: {
          type: 3,
          instance: 15
        }
      });
    });

    it('should successfully encode and decode by name', () => {
      const buffer = utils.getBuffer();
      baServices.encodeWhoHasBroadcast(buffer, 3, 4000, {}, 'analog-output-1');
      const result = baServices.decodeWhoHasBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        lowLimit: 3,
        highLimit: 4000,
        objectName: 'analog-output-1'
      });
    });
  });

  describe('WhoIs', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeWhoIsBroadcast(buffer, 1, 3000);
      const result = baServices.decodeWhoIsBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        lowLimit: 1,
        highLimit: 3000
      });
    });
  });

  describe('ReadPropertyAcknowledge', () => {
    it('should successfully encode and decode a boolean value', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 1, value: true},
        {type: 1, value: false}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 2, [
        {type: 1, value: true}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 2, value: 1},
        {type: 2, value: 1000},
        {type: 2, value: 1000000},
        {type: 2, value: 1000000000}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 3, value: -1},
        {type: 3, value: -1000},
        {type: 3, value: -1000000},
        {type: 3, value: -1000000000}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 4, value: 0},
        {type: 4, value: 0.1}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(Math.floor(0.1 * 10000)).to.equal(Math.floor(result.values[1].value * 10000));
      result.values[1].value = 0;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 5, value: 0},
        {type: 5, value: 100.121212}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 6, value: []},
        {type: 6, value: [1, 2, 100, 200]}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 7, value: ''},
        {type: 7, value: 'Test1234$äöü'}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_ISO8859_1},
        {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncodings.CHARACTER_ISO8859_1}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          index: 0xFFFFFFFF,
          id: 81
        },
        values: [
          {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_ISO8859_1},
          {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncodings.CHARACTER_ISO8859_1}
        ]
      });
    });

    it('should successfully encode and decode a character-string value with UCS2 encoding', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_UCS2},
        {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncodings.CHARACTER_UCS2}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          index: 0xFFFFFFFF,
          id: 81
        },
        values: [
          {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_UCS2},
          {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncodings.CHARACTER_UCS2}
        ]
      });
    });

    it('should successfully encode and decode a character-string value with Codepage850 encoding', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_MS_DBCS},
        {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncodings.CHARACTER_MS_DBCS}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          index: 0xFFFFFFFF,
          id: 81
        },
        values: [
          {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_MS_DBCS},
          {type: 7, value: 'Test1234$äöü', encoding: baEnum.CharacterStringEncodings.CHARACTER_MS_DBCS}
        ]
      });
    });

    it('should successfully encode and decode a character-string value with JISX-0208 encoding', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_JISX_0208},
        {type: 7, value: 'できます', encoding: baEnum.CharacterStringEncodings.CHARACTER_JISX_0208}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          index: 0xFFFFFFFF,
          id: 81
        },
        values: [
          {type: 7, value: '', encoding: baEnum.CharacterStringEncodings.CHARACTER_JISX_0208},
          {type: 7, value: 'できます', encoding: baEnum.CharacterStringEncodings.CHARACTER_JISX_0208}
        ]
      });
    });

    it('should successfully encode and decode a bit-string value', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 8, value: {bitsUsed: 0, value: []}},
        {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 9, value: 0},
        {type: 9, value: 4}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 10, value: date}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 11, value: time}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {type: 12, value: {type: 3, instance: 0}},
        {type: 12, value: {type: 3, instance: 50000}}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 222, instance: 3}, 152, 0xFFFFFFFF, [
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
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 223, instance: 90000}, 53, 0xFFFFFFFF, [
        {type: 115, value: {objectId: {type: 3, instance: 0}, properties: []}},
        {type: 115, value: {objectId: {type: 3, instance: 50000}, properties: [
          {id: 85},
          {id: 1, index: 2}
        ]}}
      ]);
      const result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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

  describe('ReadPropertyMultipleAcknowledge', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeReadPropertyMultipleAcknowledge(buffer, [
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
      const result = baServices.decodeReadPropertyMultipleAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(Math.floor(0.1 * 10000)).to.equal(Math.floor(result.values[0].values[0].value[12].value * 10000));
      result.values[0].values[0].value[12].value = 0;
      expect(result).to.deep.equal({
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
      baServices.encodeReadPropertyMultipleAcknowledge(buffer, [
        {objectId: {type: 9, instance: 50000}, values: [
          {property: {id: 81, index: 0xFFFFFFFF}, value: [
            {type: 0, value: {type: 'BacnetError', errorClass: 12, errorCode: 13}}
          ]}
        ]}
      ]);
      const result = baServices.decodeReadPropertyMultipleAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        values: [{
          objectId: {
            type: 9,
            instance: 50000
          },
          values: [{
            index: 4294967295,
            id: 81,
            value: {
              type: 105,
              value: {
                errorClass: 12,
                errorCode: 13
              }
            }
          }]
        }]
      });
    });
  });

  describe('WriteProperty', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWriteProperty(buffer, 31, 12, 80, 0xFFFFFFFF, 0, [
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
      const result = baServices.decodeWriteProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeWriteProperty(buffer, 31, 12, 80, 0xFFFFFFFF, 8, [
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
      const result = baServices.decodeWriteProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeWriteProperty(buffer, 31, 12, 80, 2, 0, [
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
      const result = baServices.decodeWriteProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
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

  describe('WritePropertyMultiple', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWritePropertyMultiple(buffer, {type: 39, instance: 2400}, [
        {property: {id: 81, index: 0xFFFFFFFF}, value: [
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
          {type: 7, value: 'Test1234$'},
          {type: 8, value: {bitsUsed: 0, value: []}},
          {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
          {type: 9, value: 4},
          {type: 10, value: date},
          {type: 11, value: time},
          {type: 12, value: {type: 3, instance: 0}}
        ], priority: 0}
      ]);
      const result = baServices.decodeWritePropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      result.values[0].value[12].value = Math.floor(result.values[0].value[12].value * 1000) / 1000;
      expect(result).to.deep.equal({
        objectId: {
          type: 39,
          instance: 2400
        },
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
              {type: 11, value: time},
              {type: 12, value: {type: 3, instance: 0}}
            ]
          }
        ]
      });
    });

    it('should successfully encode and decode with defined priority', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWritePropertyMultiple(buffer, {type: 39, instance: 2400}, [
        {property: {id: 81, index: 0xFFFFFFFF}, value: [
          {type: 7, value: 'Test1234$'}
        ], priority: 12}
      ]);
      const result = baServices.decodeWritePropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 39,
          instance: 2400
        },
        values: [
          {
            priority: 12,
            property: {
              index: 0xFFFFFFFF,
              id: 81
            },
            value: [
              {type: 7, value: 'Test1234$', encoding: 0}
            ]
          }
        ]
      });
    });

    it('should successfully encode and decode with defined array index', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWritePropertyMultiple(buffer, {type: 39, instance: 2400}, [
        {property: {id: 81, index: 414141}, value: [
          {type: 7, value: 'Test1234$'}
        ], priority: 0}
      ]);
      const result = baServices.decodeWritePropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 39,
          instance: 2400
        },
        values: [
          {
            priority: 0,
            property: {
              index: 414141,
              id: 81
            },
            value: [
              {type: 7, value: 'Test1234$', encoding: 0}
            ]
          }
        ]
      });
    });
  });

  describe('DeviceCommunicationControl', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeDeviceCommunicationControl(buffer, 30, 1);
      const result = baServices.decodeDeviceCommunicationControl(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        timeDuration: 30,
        enableDisable: 1
      });
    });

    it('should successfully encode and decode with password', () => {
      const buffer = utils.getBuffer();
      baServices.encodeDeviceCommunicationControl(buffer, 30, 1, 'Test1234!');
      const result = baServices.decodeDeviceCommunicationControl(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        timeDuration: 30,
        enableDisable: 1,
        password: 'Test1234!'
      });
    });
  });

  describe('ReinitializeDevice', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReinitializeDevice(buffer, 5);
      const result = baServices.decodeReinitializeDevice(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        state: 5
      });
    });

    it('should successfully encode and decode with password', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReinitializeDevice(buffer, 5, 'Test1234$');
      const result = baServices.decodeReinitializeDevice(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        state: 5,
        password: 'Test1234$'
      });
    });
  });

  describe('TimeSync', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(990);
      baServices.encodeTimeSync(buffer, date);
      const result = baServices.decodeTimeSync(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        value: date
      });
    });
  });

  describe('Error', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeError(buffer, 15, 25);
      const result = baServices.decodeError(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        class: 15,
        code: 25
      });
    });
  });

  describe('ReadPropertyMultiple', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadPropertyMultiple(buffer, [
        {objectId: {type: 51, instance: 1}, properties: [
          {id: 85, index: 0xFFFFFFFF},
          {id: 85, index: 4}
        ]}
      ]);
      const result = baServices.decodeReadPropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({properties: [{objectId: {type: 51, instance: 1}, properties: [
        {id: 85, index: 0xFFFFFFFF},
        {id: 85, index: 4}
      ]}]});
    });
  });

  describe('SubscribeProperty', () => {
    it('should successfully encode and decode with cancellation request', () => {
      const buffer = utils.getBuffer();
      baServices.encodeSubscribeProperty(buffer, 7, {type: 148, instance: 362}, true, false, 1, {id: 85, index: 0xFFFFFFFF}, true, 1);
      const result = baServices.decodeSubscribeProperty(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: true,
        covIncrement: 1,
        issueConfirmedNotifications: false,
        lifetime: 0,
        monitoredObjectId: {
          instance: 362,
          type: 148
        },
        monitoredProperty: {
          index: 4294967295,
          id: 85
        },
        subscriberProcessId: 7
      });
    });

    it('should successfully encode and decode without cancellation request', () => {
      const buffer = utils.getBuffer();
      baServices.encodeSubscribeProperty(buffer, 8, {type: 149, instance: 363}, false, true, 2, {id: 86, index: 3}, false, 10);
      const result = baServices.decodeSubscribeProperty(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: false,
        covIncrement: 0,
        issueConfirmedNotifications: true,
        lifetime: 2,
        monitoredObjectId: {
          instance: 363,
          type: 149
        },
        monitoredProperty: {
          index: 3,
          id: 86
        },
        subscriberProcessId: 8
      });
    });
  });

  describe('SubscribeCOV', () => {
    it('should successfully encode and decode a cancelation request', () => {
      const buffer = utils.getBuffer();
      baServices.encodeSubscribeCOV(buffer, 10, {type: 3, instance: 1}, true);
      const result = baServices.decodeSubscribeCOV(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: true,
        monitoredObjectId: {type: 3, instance: 1},
        subscriberProcessId: 10
      });
    });

    it('should successfully encode and decode subscription request', () => {
      const buffer = utils.getBuffer();
      baServices.encodeSubscribeCOV(buffer, 11, {type: 3, instance: 2}, false, true, 5000);
      const result = baServices.decodeSubscribeCOV(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: false,
        issueConfirmedNotifications: true,
        lifetime: 5000,
        monitoredObjectId: {type: 3, instance: 2},
        subscriberProcessId: 11
      });
    });
  });

  describe('AtomicWriteFileAcknowledge', () => {
    it('should successfully encode and decode streamed file', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicWriteFileAcknowledge(buffer, true, -10);
      const result = baServices.decodeAtomicWriteFileAcknowledge(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        isStream: true,
        position: -10
      });
    });

    it('should successfully encode and decode non-streamed file', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicWriteFileAcknowledge(buffer, false, 10);
      const result = baServices.decodeAtomicWriteFileAcknowledge(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        isStream: false,
        position: 10
      });
    });
  });

  describe('ReadProperty', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadProperty(buffer, 4, 630, 85, 0xFFFFFFFF);
      const result = baServices.decodeReadProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 4, instance: 630},
        property: {id: 85, index: 0xFFFFFFFF}
      });
    });

    it('should successfully encode and decode with array index', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadProperty(buffer, 4, 630, 85, 2);
      const result = baServices.decodeReadProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 4, instance: 630},
        property: {id: 85, index: 2}
      });
    });
  });

  describe('AtomicReadFile', () => {
    it('should successfully encode and decode as stream', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicReadFile(buffer, true, {type: 13, instance: 5000}, -50, 12);
      const result = baServices.decodeAtomicReadFile(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 13, instance: 5000},
        count: 12,
        isStream: true,
        position: -50
      });
    });

    it('should successfully encode and decode as non-stream', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicReadFile(buffer, false, {type: 14, instance: 5001}, 60, 13);
      const result = baServices.decodeAtomicReadFile(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
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
      baServices.encodeAtomicReadFileAcknowledge(buffer, true, false, 0, 90, [[12, 12, 12]], [3]);
      const result = baServices.decodeAtomicReadFileAcknowledge(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        isStream: true,
        position: 0,
        endOfFile: false,
        buffer: Buffer.from([12, 12, 12])
      });
    });

    it('should successfully encode and decode as non-stream', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicReadFileAcknowledge(buffer, false, false, 0, 90, [12, 12, 12], 3);
      // TODO: AtomicReadFileAcknowledge as non-stream not yet implemented
      expect(() => {
        baServices.decodeAtomicReadFileAcknowledge(buffer.buffer, 0);
      }).to.throw('NotImplemented');
    });
  });

  describe('AtomicWriteFile', () => {
    it('should successfully encode and decode as stream', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicWriteFile(buffer, true, {type: 12, instance: 51}, 5, [[12, 12]]);
      const result = baServices.decodeAtomicWriteFile(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 12, instance: 51},
        isStream: true,
        position: 5,
        blocks: [[12, 12]]
      });
    });

    it('should successfully encode and decode as non-stream', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAtomicWriteFile(buffer, false, {type: 12, instance: 88}, 10, [[12, 12], [12, 12]]);
      const result = baServices.decodeAtomicWriteFile(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 12, instance: 88},
        isStream: false,
        position: 10,
        blocks: [[12, 12], [12, 12]]
      });
    });
  });

  describe('ReadRange', () => {
    it('should successfully encode and decode by position', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, 1, 10, null, 0);
      const result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 0,
        objectId: {type: 61, instance: 35},
        position: 10,
        property: {
          index: 0xFFFFFFFF,
          id: 85
        },
        requestType: 1,
        time: undefined
      });
    });

    it('should successfully encode and decode by position with array index', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 12, 2, 1, 10, null, 0);
      const result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 0,
        objectId: {type: 61, instance: 35},
        position: 10,
        property: {
          index: 2,
          id: 12
        },
        requestType: 1,
        time: undefined
      });
    });

    it('should successfully encode and decode by sequence', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, 2, 11, null, 1111);
      const result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 1111,
        objectId: {type: 61, instance: 35},
        position: 11,
        property: {
          index: 0xFFFFFFFF,
          id: 85
        },
        requestType: 2,
        time: undefined
      });
    });

    it('should successfully encode and decode by time', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      date.setMilliseconds(990);
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, 4, null, date, -1111);
      const result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: -1111,
        objectId: {type: 61, instance: 35},
        position: undefined,
        property: {
          index: 0xFFFFFFFF,
          id: 85
        },
        requestType: 4,
        time: date
      });
    });
  });

  describe('EventNotifyData', () => {
    it('should successfully encode and decode a change of bitstring event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {type: 60, instance: 12},
        eventObjectId: {type: 61, instance: 1121},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 0,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: true,
        fromState: 5,
        toState: 6,
        changeOfBitstringReferencedBitString: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
        changeOfBitstringStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 60, instance: 12},
        eventObjectId: {type: 61, instance: 1121},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 0,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: true,
        fromState: 5,
        toState: 6
      });
    });

    it('should successfully encode and decode a change of state event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 1,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 1,
        toState: 2,
        changeOfStateNewState: {type: 2, state: 2},
        changeOfStateStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 1,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 1,
        toState: 2
      });
    });

    it('should successfully encode and decode a change of value event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 2,
        messageText: 'Test1234$',
        notifyType: 1,
        changeOfValueTag: 1,
        changeOfValueChangeValue: 90,
        changeOfValueStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 2,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 0,
        toState: 0
      });
    });

    it('should successfully encode and decode a floating limit event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 4,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: true,
        fromState: 19,
        toState: 12,
        floatingLimitReferenceValue: 121,
        floatingLimitStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
        floatingLimitSetPointValue: 120,
        floatingLimitErrorLimit: 120
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 4,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: true,
        fromState: 19,
        toState: 12
      });
    });

    it('should successfully encode and decode an out of range event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 5,
        messageText: 'Test1234$',
        notifyType: 1,
        outOfRangeExceedingValue: 155,
        outOfRangeStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
        outOfRangeDeadband: 50,
        outOfRangeExceededLimit: 150
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 5,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 0,
        toState: 0
      });
    });

    it('should successfully encode and decode a change of life-safety event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 8,
        messageText: 'Test1234$',
        notifyType: 1,
        changeOfLifeSafetyNewState: 8,
        changeOfLifeSafetyNewMode: 9,
        changeOfLifeSafetyStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
        changeOfLifeSafetyOperationExpected: 2
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 8,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 0,
        toState: 0
      });
    });

    it('should successfully encode and decode a buffer ready event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 10,
        messageText: 'Test1234$',
        notifyType: 1,
        bufferReadyBufferProperty: {
          objectId: {type: 65, instance: 2},
          id: 85,
          arrayIndex: 3,
          deviceIndentifier: {type: 8, instance: 443}
        },
        bufferReadyPreviousNotification: 121,
        bufferReadyCurrentNotification: 281
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 10,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 0,
        toState: 0
      });
    });

    it('should successfully encode and decode a unsigned range event', () => {
      const buffer = utils.getBuffer();
      const date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processId: 3,
        initiatingObjectId: {},
        eventObjectId: {},
        timeStamp: {type: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 11,
        messageText: 'Test1234$',
        notifyType: 1,
        unsignedRangeExceedingValue: 101,
        unsignedRangeStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
        unsignedRangeExceededLimit: 100
      });
      const result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 3,
        initiatingObjectId: {type: 0, instance: 0},
        eventObjectId: {type: 0, instance: 0},
        timeStamp: date,
        notificationClass: 9,
        priority: 7,
        eventType: 11,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 0,
        toState: 0
      });
    });
  });

  describe('ReadRangeAcknowledge', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeReadRangeAcknowledge(buffer, {type: 12, instance: 500}, 5048, 0xFFFFFFFF, {bitsUsed: 24, value: [1, 2, 3]}, 12, Buffer.from([1, 2, 3]), 2, 2);
      const result = baServices.decodeReadRangeAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 12, instance: 500},
        itemCount: 12,
        property: {id: 5048, index: 0xFFFFFFFF},
        resultFlag: {bitsUsed: 24, value: [1, 2, 3]},
        rangeBuffer: Buffer.from([1, 2, 3])
      });
    });
  });

  describe('DeleteObject', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeDeleteObject(buffer, {type: 1, instance: 10});
      const result = baServices.decodeDeleteObject(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectType: 1,
        instance: 10
      });
    });
  });

  describe('CreateObject', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeCreateObject(buffer, {type: 1, instance: 10}, [
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
        ], priority: 0}
      ]);
      const result = baServices.decodeCreateObject(buffer.buffer, 0, buffer.offset);
      delete result.len;
      result.values[0].value[12].value = Math.floor(result.values[0].value[12].value * 1000) / 1000;
      expect(result).to.deep.equal({
        objectId: {
          type: 1,
          instance: 10
        },
        values: [
          {
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

  describe('COVNotify', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date = new Date(1, 1, 1);
      const time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeCOVNotify(buffer, 7, 443, {type: 2, instance: 12}, 120, [
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
      const result = baServices.decodeCOVNotify(buffer.buffer, 0, buffer.offset);
      delete result.len;
      result.values[0].value[12].value = Math.floor(result.values[0].value[12].value * 1000) / 1000;
      expect(result).to.deep.equal({
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

  describe('AlarmSummary', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAlarmSummary(buffer, [
        {objectId: {type: 12, instance: 12}, alarmState: 12, acknowledgedTransitions: {value: [12], bitsUsed: 5}},
        {objectId: {type: 13, instance: 13}, alarmState: 13, acknowledgedTransitions: {value: [13], bitsUsed: 6}}
      ]);
      const result = baServices.decodeAlarmSummary(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        alarms: [
          {objectId: {type: 12, instance: 12}, alarmState: 12, acknowledgedTransitions: {value: [12], bitsUsed: 5}},
          {objectId: {type: 13, instance: 13}, alarmState: 13, acknowledgedTransitions: {value: [13], bitsUsed: 6}}
        ]
      });
    });
  });

  describe('EventInformation', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      const date1 = new Date();
      date1.setMilliseconds(990);
      const date2 = new Date();
      date2.setMilliseconds(990);
      const date3 = new Date();
      date3.setMilliseconds(990);
      baServices.encodeEventInformation(buffer, [
        {objectId: {type: 0, instance: 32}, eventState: 12, acknowledgedTransitions: {value: [14], bitsUsed: 6}, eventTimeStamps: [date1, date2, date3], notifyType: 5, eventEnable: {value: [15], bitsUsed: 7}, eventPriorities: [2, 3, 4]}
      ], false);
      const result = baServices.decodeEventInformation(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        alarms: [
          {
            objectId: {
              type: 0,
              instance: 32
            },
            eventState: 12,
            acknowledgedTransitions: {
              bitsUsed: 6,
              value: [14]
            },
            eventTimeStamps: [
              date1,
              date2,
              date3
            ],
            notifyType: 5,
            eventEnable: {
              bitsUsed: 7,
              value: [15]
            },
            eventPriorities: [2, 3, 4]
          }
        ],
        moreEvents: false
      });
    });
  });

  describe('AlarmAcknowledge', () => {
    it('should successfully encode and decode with time timestamp', () => {
      const buffer = utils.getBuffer();
      const eventTime = new Date(1, 1, 1);
      eventTime.setMilliseconds(990);
      const ackTime = new Date(1, 1, 1);
      ackTime.setMilliseconds(880);
      baServices.encodeAlarmAcknowledge(buffer, 57, {type: 0, instance: 33}, 5, 'Alarm Acknowledge Test', {value: eventTime, type: baEnum.TimestampTags.TIME_STAMP_TIME}, {value: ackTime, type: baEnum.TimestampTags.TIME_STAMP_TIME});
      const result = baServices.decodeAlarmAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        acknowledgedProcessId: 57,
        eventObjectId: {
          type: 0,
          instance: 33
        },
        eventStateAcknowledged: 5,
        acknowledgeSource: 'Alarm Acknowledge Test',
        eventTimeStamp: eventTime,
        acknowledgeTimeStamp: ackTime
      });
    });

    it('should successfully encode and decode with sequence timestamp', () => {
      const buffer = utils.getBuffer();
      const eventTime = 5;
      const ackTime = 6;
      baServices.encodeAlarmAcknowledge(buffer, 57, {type: 0, instance: 33}, 5, 'Alarm Acknowledge Test', {value: eventTime, type: baEnum.TimestampTags.TIME_STAMP_SEQUENCE}, {value: ackTime, type: baEnum.TimestampTags.TIME_STAMP_SEQUENCE});
      const result = baServices.decodeAlarmAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        acknowledgedProcessId: 57,
        eventObjectId: {
          type: 0,
          instance: 33
        },
        eventStateAcknowledged: 5,
        acknowledgeSource: 'Alarm Acknowledge Test',
        eventTimeStamp: eventTime,
        acknowledgeTimeStamp: ackTime
      });
    });

    it('should successfully encode and decode with datetime timestamp', () => {
      const buffer = utils.getBuffer();
      const eventTime = new Date(1, 1, 1);
      eventTime.setMilliseconds(990);
      const ackTime = new Date(1, 1, 2);
      ackTime.setMilliseconds(880);
      baServices.encodeAlarmAcknowledge(buffer, 57, {type: 0, instance: 33}, 5, 'Alarm Acknowledge Test', {value: eventTime, type: baEnum.TimestampTags.TIME_STAMP_DATETIME}, {value: ackTime, type: baEnum.TimestampTags.TIME_STAMP_DATETIME});
      const result = baServices.decodeAlarmAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        acknowledgedProcessId: 57,
        eventObjectId: {
          type: 0,
          instance: 33
        },
        eventStateAcknowledged: 5,
        acknowledgeSource: 'Alarm Acknowledge Test',
        eventTimeStamp: eventTime,
        acknowledgeTimeStamp: ackTime
      });
    });
  });

  describe('PrivateTransfer', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodePrivateTransfer(buffer, 255, 8, [1, 2, 3, 4, 5]);
      const result = baServices.decodePrivateTransfer(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        vendorId: 255,
        serviceNumber: 8,
        data: [1, 2, 3, 4, 5]
      });
    });
  });

  describe('GetEventInformation', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeGetEventInformation(buffer, {type: 8, instance: 15});
      const result = baServices.decodeGetEventInformation(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        lastReceivedObjectId: {type: 8, instance: 15}
      });
    });
  });

  describe('IhaveBroadcast', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeIhaveBroadcast(buffer, {type: 8, instance: 443}, {type: 0, instance: 4}, 'LgtCmd01');
      const result = baServices.decodeIhaveBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        deviceId: {type: 8, instance: 443},
        objectId: {type: 0, instance: 4},
        objectName: 'LgtCmd01'
      });
    });
  });

  describe('LifeSafetyOperation', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeLifeSafetyOperation(buffer, 8, 'User01', 7, {type: 0, instance: 77});
      const result = baServices.decodeLifeSafetyOperation(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        processId: 8,
        requestingSource: 'User01',
        operation: 7,
        targetObjectId: {type: 0, instance: 77}
      });
    });
  });

  describe('AddListElement', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeAddListElement(buffer, {type: 11, instance: 560}, 85, 2, [
        {type: 1, value: false},
        {type: 2, value: 1}
      ]);
      const result = baServices.decodeAddListElement(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 11, instance: 560},
        property: {id: 85, index: 2},
        values: [
          {type: 1, value: false},
          {type: 2, value: 1}
        ]
      });
    });
  });

  describe('GetEventInformationAcknowledge', () => {
    it('should successfully encode and decode', () => {
      const timeStamp = new Date(1, 1, 1);
      timeStamp.setMilliseconds(990);
      const buffer = utils.getBuffer();
      baServices.encodeGetEventInformationAcknowledge(buffer, [
        {
          objectId: {type: 2, instance: 17},
          eventState: 3,
          acknowledgedTransitions: {value: [14], bitsUsed: 6},
          eventTimeStamps: [{value: timeStamp, type: baEnum.TimestampTags.TIME_STAMP_DATETIME}, {value: 5, type: baEnum.TimestampTags.TIME_STAMP_SEQUENCE}, {value: timeStamp, type: baEnum.TimestampTags.TIME_STAMP_TIME}],
          notifyType: 12,
          eventEnable: {value: [14], bitsUsed: 6},
          eventPriorities: [1, 2, 3]
        }
      ], false);
      const result = baServices.decodeGetEventInformationAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        events: [
          {
            objectId: {type: 2, instance: 17},
            eventState: 3,
            acknowledgedTransitions: {value: [14], bitsUsed: 6}, eventTimeStamps: [{value: timeStamp, type: baEnum.TimestampTags.TIME_STAMP_DATETIME}, {value: 5, type: baEnum.TimestampTags.TIME_STAMP_SEQUENCE}, {value: timeStamp, type: baEnum.TimestampTags.TIME_STAMP_TIME}],
            notifyType: 12,
            eventEnable: {value: [14], bitsUsed: 6},
            eventPriorities: [1, 2, 3]
          }
        ],
        moreEvents: false
      });
    });

    it('should successfully encode and decode empty payload', () => {
      const buffer = utils.getBuffer();
      baServices.encodeGetEventInformationAcknowledge(buffer, [], true);
      const result = baServices.decodeGetEventInformationAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        events: [],
        moreEvents: true
      });
    });
  });

  describe('GetEnrollmentSummary', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeGetEnrollmentSummary(buffer, 2);
      const result = baServices.decodeGetEnrollmentSummary(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        acknowledgmentFilter: 2
      });
    });

    it('should successfully encode and decode full payload', () => {
      const buffer = utils.getBuffer();
      baServices.encodeGetEnrollmentSummary(buffer, 2, {objectId: {type: 5, instance: 33}, processId: 7}, 1, 3, {min: 1, max: 65}, 5);
      const result = baServices.decodeGetEnrollmentSummary(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        acknowledgmentFilter: 2,
        enrollmentFilter: {objectId: {type: 5, instance: 33}, processId: 7},
        eventStateFilter: 1,
        eventTypeFilter: 3,
        priorityFilter: {min: 1, max: 65},
        notificationClassFilter: 5
      });
    });
  });

  describe('GetEnrollmentSummaryAcknowledge', () => {
    it('should successfully encode and decode', () => {
      const buffer = utils.getBuffer();
      baServices.encodeGetEnrollmentSummaryAcknowledge(buffer, [
        {objectId: {type: 12, instance: 120}, eventType: 3, eventState: 2, priority: 18, notificationClass: 11}
      ]);
      const result = baServices.decodeGetEnrollmentSummaryAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        enrollmentSummaries: [{objectId: {type: 12, instance: 120}, eventType: 3, eventState: 2, priority: 18, notificationClass: 11}]
      });
    });
  });
});
