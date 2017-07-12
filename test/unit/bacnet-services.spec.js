var expect        = require('chai').expect;
var utils         = require('./utils');
var baServices    = require('../../lib/bacnet-services');

describe('bacstack - Services layer', function() {
  describe('Iam', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeIamBroadcast(buffer, 47, 1, 1, 7);
      var result = baServices.decodeIamBroadcast(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        deviceId: 47,
        maxApdu: 1,
        segmentation: 1,
        vendorId: 7
      });
    });
  });

  describe('WhoHas', function() {
    it('should successfully encode and decode by id', function() {
      var buffer = utils.getBuffer();
      baServices.encodeWhoHasBroadcast(buffer, 3, 4000, {type: 3, instance: 15});
      var result = baServices.decodeWhoHasBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        lowLimit: 3,
        highLimit: 4000,
        objId: {
          type: 3,
          instance: 15
        }
      });
    });

    it('should successfully encode and decode by name', function() {
      var buffer = utils.getBuffer();
      baServices.encodeWhoHasBroadcast(buffer, 3, 4000, {}, 'analog-output-1');
      var result = baServices.decodeWhoHasBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        lowLimit: 3,
        highLimit: 4000,
        objName: 'analog-output-1'
      });
    });
  });

  describe('WhoIs', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeWhoIsBroadcast(buffer, 1, 3000);
      var result = baServices.decodeWhoIsBroadcast(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        lowLimit: 1,
        highLimit: 3000
      });
    });
  });

  describe('ReadPropertyAcknowledge', function() {
    it('should successfully encode and decode a boolean value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 1, value: true},
        {tag: 1, value: false}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 1, value: true, len: 1},
          {type: 1, value: false, len: 1}
        ]
      });
    });

    it('should successfully encode and decode a boolean value with array index', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 2, [
        {tag: 1, value: true}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 2,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 1, value: true, len: 1}
        ]
      });
    });

    it('should successfully encode and decode an unsigned value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 2, value: 1},
        {tag: 2, value: 1000},
        {tag: 2, value: 1000000},
        {tag: 2, value: 1000000000}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 2, value: 1, len: 2},
          {type: 2, value: 1000, len: 3},
          {type: 2, value: 1000000, len: 4},
          {type: 2, value: 1000000000, len: 5}
        ]
      });
    });

    it('should successfully encode and decode a signed value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 3, value: -1},
        {tag: 3, value: -1000},
        {tag: 3, value: -1000000},
        {tag: 3, value: -1000000000}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 3, value: -1, len: 2},
          {type: 3, value: -1000, len: 3},
          {type: 3, value: -1000000, len: 4},
          {type: 3, value: -1000000000, len: 5}
        ]
      });
    });

    it('should successfully encode and decode an real value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 4, value: 0},
        {tag: 4, value: 0.1}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(Math.floor(0.1 * 10000)).to.equal(Math.floor(result.valueList[1].value * 10000));
      result.valueList[1].value = 0;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 4, value: 0, len: 5},
          {type: 4, value: 0, len: 5}
        ]
      });
    });

    it('should successfully encode and decode a double value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 5, value: 0},
        {tag: 5, value: 100.121212}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 5, value: 0, len: 10},
          {type: 5, value: 100.121212, len: 10}
        ]
      });
    });

    it('should successfully encode and decode an octet-string value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 6, value: []},
        {tag: 6, value: [1, 2, 100, 200]}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 6, value: [], len: 1},
          {type: 6, value: [1, 2, 100, 200], len: 5}
        ]
      });
    });

    it('should successfully encode and decode a character-string value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 7, value: ''},
        {tag: 7, value: 'Test1234$'}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 7, value: '', len: 2},
          {type: 7, value: 'Test1234$', len: 12}
        ]
      });
    });

    it('should successfully encode and decode a bit-string value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 8, value: {bitsUsed: 0, value: []}},
        {tag: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 8, value: {bitsUsed: 0, value: []}, len: 2},
          {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}, len: 5}
        ]
      });
    });

    it('should successfully encode and decode a enumeration value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 9, value: 0},
        {tag: 9, value: 4}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 9, value: 0, len: 2},
          {type: 9, value: 4, len: 2}
        ]
      });
    });

    it('should successfully encode and decode a date value', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 10, value: date}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 10, value: date, len: 5}
        ]
      });
    });

    it('should successfully encode and decode a time value', function() {
      var buffer = utils.getBuffer();
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 11, value: time}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 11, value: time, len: 5}
        ]
      });
    });

    it('should successfully encode and decode a object-identifier value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 8, instance: 40000}, 81, 0xFFFFFFFF, [
        {tag: 12, value: {type: 3, instance: 0}},
        {tag: 12, value: {type: 3, instance: 50000}},
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 8,
          instance: 40000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 81
        },
        valueList: [
          {type: 12, value: {type: 3, instance: 0}, len: 5},
          {type: 12, value: {type: 3, instance: 50000}, len: 5}
        ]
      });
    });

    it('should successfully encode and decode a cov-subscription value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 222, instance: 3}, 152, 0xFFFFFFFF, [
        {tag: 111, value: {
          Recipient: {net: 12, adr: [0, 1]},
          subscriptionProcessIdentifier: 3,
          monitoredObjectIdentifier: {type: 2, instance: 1},
          monitoredProperty: {propertyIdentifier: 85, propertyArrayIndex: 0},
          IssueConfirmedNotifications: false,
          TimeRemaining: 5,
          COVIncrement: 1
        }},
        {tag: 111, value: {
          Recipient: {net: 0xFFFF, adr: []},
          subscriptionProcessIdentifier: 3,
          monitoredObjectIdentifier: {type: 2, instance: 1},
          monitoredProperty: {propertyIdentifier: 85, propertyArrayIndex: 5},
          IssueConfirmedNotifications: true,
          TimeRemaining: 5
        }}
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 222,
          instance: 3
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 152
        },
        valueList: [
          {type: 111, value: {
            recipient: {net: 12, adr: [0, 1]},
            subscriptionProcessIdentifier: 3,
            monitoredObjectIdentifier: {type: 2, instance: 1},
            monitoredProperty: {propertyIdentifier: 85, propertyArrayIndex: 0},
            issueConfirmedNotifications: false,
            timeRemaining: 5,
            covIncrement: 1
          }, len: 33},
          {type: 111, value: {
            recipient: {net: 0xFFFF, adr: []},
            subscriptionProcessIdentifier: 3,
            monitoredObjectIdentifier: {type: 2, instance: 1},
            monitoredProperty: {propertyIdentifier: 85, propertyArrayIndex: 5},
            issueConfirmedNotifications: true,
            timeRemaining: 5,
          }, len: 27}
        ]
      });
    });

    it('should successfully encode and decode a read-access-specification value', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyAcknowledge(buffer, {type: 223, instance: 90000}, 53, 0xFFFFFFFF, [
        {tag: 115, value: {objectIdentifier: {type: 3, instance: 0}, propertyReferences: []}},
        {tag: 115, value: {objectIdentifier: {type: 3, instance: 50000}, propertyReferences: [
          {propertyIdentifier: 85},
          {propertyIdentifier: 1, propertyArrayIndex: 2}
        ]}},
      ]);
      var result = baServices.decodeReadPropertyAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 223,
          instance: 90000
        },
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 53
        },
        valueList: [
          {type: 115, value: {objectIdentifier: {type: 3, instance: 0}, propertyReferences: []}, len: 7},
          {type: 115, value: {objectIdentifier: {type: 3, instance: 50000}, propertyReferences: [
            {propertyIdentifier: 85, propertyArrayIndex: 0xFFFFFFFF},
            {propertyIdentifier: 1, propertyArrayIndex: 2}
          ]}, len: 13}
        ]
      });
    });
  });

  describe('ReadPropertyMultipleAcknowledge', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeReadPropertyMultipleAcknowledge(buffer, [
        {objectIdentifier: {type: 9, instance: 50000}, values: [
          {property: {propertyIdentifier: 81, propertyArrayIndex: 0xFFFFFFFF}, value: [
            {tag: 1, value: true},
            {tag: 1, value: false},
            {tag: 2, value: 1},
            {tag: 2, value: 1000},
            {tag: 2, value: 1000000},
            {tag: 2, value: 1000000000},
            {tag: 3, value: -1},
            {tag: 3, value: -1000},
            {tag: 3, value: -1000000},
            {tag: 3, value: -1000000000},
            {tag: 4, value: 0.1},
            {tag: 5, value: 100.121212},
            // FIXME: correct octet-string implementation
            // {tag: 6, value: [1, 2, 100, 200]},
            {tag: 7, value: 'Test1234$'},
            // FIXME: correct bit-string implementation
            // {tag: 8, value: {bitsUsed: 0, value: []}},
            // {tag: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
            {tag: 9, value: 4},
            {tag: 10, value: date},
            {tag: 11, value: time},
            {tag: 12, value: {type: 3, instance: 0}}
          ]}
        ]}
      ]);
      var result = baServices.decodeReadPropertyMultipleAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(Math.floor(0.1 * 10000)).to.equal(Math.floor(result.values[0].values[0].value[10].value * 10000));
      result.values[0].values[0].value[10].value = 0;
      expect(result).to.deep.equal({
        values: [{
          objectIdentifier: {
            type: 9,
            instance: 50000
          },
          values: [{
            propertyArrayIndex: 4294967295,
            propertyIdentifier: 81,
            value: [
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
            ]
          }]
        }]
      });
    });
  });

  describe('WriteProperty', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWriteProperty(buffer, 31, 12, 80, 0xFFFFFFFF, 0, [
        {tag: 1, value: true},
        {tag: 1, value: false},
        {tag: 2, value: 1},
        {tag: 2, value: 1000},
        {tag: 2, value: 1000000},
        {tag: 2, value: 1000000000},
        {tag: 3, value: -1},
        {tag: 3, value: -1000},
        {tag: 3, value: -1000000},
        {tag: 3, value: -1000000000},
        {tag: 4, value: 0},
        {tag: 5, value: 100.121212},
        {tag: 7, value: 'Test1234$'},
        {tag: 9, value: 4},
        {tag: 10, value: date},
        {tag: 11, value: time},
        {tag: 12, value: {type: 3, instance: 0}}
      ]);
      var result = baServices.decodeWriteProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          instance: 12,
          type: 31
        },
        value: {
          priority: 16,
          property: {
            propertyArrayIndex: 4294967295,
            propertyIdentifier: 80
          },
          value: [
            true,
            false,
            1,
            1000,
            1000000,
            1000000000,
            -1,
            -1000,
            -1000000,
            -1000000000,
            0,
            100.121212,
            'Test1234$',
            4,
            date,
            time,
            {instance: 0, type: 3}
          ]
        }
      });
    });

    it('should successfully encode and decode with defined priority', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWriteProperty(buffer, 31, 12, 80, 0xFFFFFFFF, 8, [
        {tag: 1, value: true},
        {tag: 1, value: false},
        {tag: 2, value: 1},
        {tag: 2, value: 1000},
        {tag: 2, value: 1000000},
        {tag: 2, value: 1000000000},
        {tag: 3, value: -1},
        {tag: 3, value: -1000},
        {tag: 3, value: -1000000},
        {tag: 3, value: -1000000000},
        {tag: 4, value: 0},
        {tag: 5, value: 100.121212},
        {tag: 7, value: 'Test1234$'},
        {tag: 9, value: 4},
        {tag: 10, value: date},
        {tag: 11, value: time},
        {tag: 12, value: {type: 3, instance: 0}}
      ]);
      var result = baServices.decodeWriteProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          instance: 12,
          type: 31
        },
        value: {
          priority: 8,
          property: {
            propertyArrayIndex: 4294967295,
            propertyIdentifier: 80
          },
          value: [
            true,
            false,
            1,
            1000,
            1000000,
            1000000000,
            -1,
            -1000,
            -1000000,
            -1000000000,
            0,
            100.121212,
            'Test1234$',
            4,
            date,
            time,
            {instance: 0, type: 3}
          ]
        }
      });
    });

    it('should successfully encode and decode with defined array index', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWriteProperty(buffer, 31, 12, 80, 2, 0, [
        {tag: 1, value: true},
        {tag: 1, value: false},
        {tag: 2, value: 1},
        {tag: 2, value: 1000},
        {tag: 2, value: 1000000},
        {tag: 2, value: 1000000000},
        {tag: 3, value: -1},
        {tag: 3, value: -1000},
        {tag: 3, value: -1000000},
        {tag: 3, value: -1000000000},
        {tag: 4, value: 0},
        {tag: 5, value: 100.121212},
        {tag: 7, value: 'Test1234$'},
        {tag: 9, value: 4},
        {tag: 10, value: date},
        {tag: 11, value: time},
        {tag: 12, value: {type: 3, instance: 0}}
      ]);
      var result = baServices.decodeWriteProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          instance: 12,
          type: 31
        },
        value: {
          priority: 16,
          property: {
            propertyArrayIndex: 2,
            propertyIdentifier: 80
          },
          value: [
            true,
            false,
            1,
            1000,
            1000000,
            1000000000,
            -1,
            -1000,
            -1000000,
            -1000000000,
            0,
            100.121212,
            'Test1234$',
            4,
            date,
            time,
            {instance: 0, type: 3}
          ]
        }
      });
    });
  });

  describe('WritePropertyMultiple', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWritePropertyMultiple(buffer, {type: 39, instance: 2400}, [
        {property: {propertyIdentifier: 81, propertyArrayIndex: 0xFFFFFFFF}, value: [
          {tag: 1, value: true},
          {tag: 1, value: false},
          {tag: 2, value: 1},
          {tag: 2, value: 1000},
          {tag: 2, value: 1000000},
          {tag: 2, value: 1000000000},
          {tag: 3, value: -1},
          {tag: 3, value: -1000},
          {tag: 3, value: -1000000},
          {tag: 3, value: -1000000000},
          {tag: 4, value: 0.1},
          {tag: 5, value: 100.121212},
          // FIXME: correct octet-string implementation
          // {tag: 6, value: [1, 2, 100, 200]},
          {tag: 7, value: 'Test1234$'},
          // FIXME: correct bit-string implementation
          // {tag: 8, value: {bitsUsed: 0, value: []}},
          // {tag: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
          {tag: 9, value: 4},
          {tag: 10, value: date},
          {tag: 11, value: time},
          {tag: 12, value: {type: 3, instance: 0}}
        ], priority: 0}
      ]);
      var result = baServices.decodeWritePropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      result.valuesRefs[0].value[10].value = Math.floor(result.valuesRefs[0].value[10].value * 1000) / 1000;
      expect(result).to.deep.equal({
        objectId: {
          type: 39,
          instance: 2400
        },
        valuesRefs: [
          {
            priority: 0,
            property: {
              arrayIndex: 0xFFFFFFFF,
              propertyId: 81
            },
            value: [
              {type: 1, value: true, len: 1},
              {type: 1, value: false, len: 1},
              {type: 2, value: 1, len: 2},
              {type: 2, value: 1000, len: 3},
              {type: 2, value: 1000000, len: 4},
              {type: 2, value: 1000000000, len: 5},
              {type: 3, value: -1, len: 2},
              {type: 3, value: -1000, len: 3},
              {type: 3, value: -1000000, len: 4},
              {type: 3, value: -1000000000, len: 5},
              {type: 4, value: 0.1, len: 5},
              {type: 5, value: 100.121212, len: 10},
              // FIXME: correct octet-string implementation
              // {type: 6, value: [1, 2, 100, 200]},
              {type: 7, value: 'Test1234$', len: 12},
              // FIXME: correct bit-string implementation
              // {type: 8, value: {bitsUsed: 0, value: []}},
              // {type: 8, value: {bitsUsed: 24, value: [0xAA, 0xAA, 0xAA]}},
              {type: 9, value: 4, len: 2},
              {type: 10, value: date, len: 5},
              {type: 11, value: time, len: 5},
              {type: 12, value: {type: 3, instance: 0}, len: 5}
            ]
          }
        ]
      });
    });

    it('should successfully encode and decode with defined priority', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWritePropertyMultiple(buffer, {type: 39, instance: 2400}, [
        {property: {propertyIdentifier: 81, propertyArrayIndex: 0xFFFFFFFF}, value: [
          {tag: 7, value: 'Test1234$'}
        ], priority: 12}
      ]);
      var result = baServices.decodeWritePropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 39,
          instance: 2400
        },
        valuesRefs: [
          {
            priority: 12,
            property: {
              arrayIndex: 0xFFFFFFFF,
              propertyId: 81
            },
            value: [
              {type: 7, value: 'Test1234$', len: 12}
            ]
          }
        ]
      });
    });

    it('should successfully encode and decode with defined array index', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      var time = new Date(1, 1, 1);
      time.setMilliseconds(990);
      baServices.encodeWritePropertyMultiple(buffer, {type: 39, instance: 2400}, [
        {property: {propertyIdentifier: 81, propertyArrayIndex: 414141}, value: [
          {tag: 7, value: 'Test1234$'}
        ], priority: 0}
      ]);
      var result = baServices.decodeWritePropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {
          type: 39,
          instance: 2400
        },
        valuesRefs: [
          {
            priority: 0,
            property: {
              arrayIndex: 414141,
              propertyId: 81
            },
            value: [
              {type: 7, value: 'Test1234$', len: 12}
            ]
          }
        ]
      });
    });
  });

  describe('DeviceCommunicationControl', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeDeviceCommunicationControl(buffer, 30, 1);
      var result = baServices.decodeDeviceCommunicationControl(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        timeDuration: 30,
        enableDisable: 1
      });
    });

    it('should successfully encode and decode with password', function() {
      var buffer = utils.getBuffer();
      baServices.encodeDeviceCommunicationControl(buffer, 30, 1, 'Test1234!');
      var result = baServices.decodeDeviceCommunicationControl(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        timeDuration: 30,
        enableDisable: 1,
        password: 'Test1234!'
      });
    });
  });

  describe('ReinitializeDevice', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReinitializeDevice(buffer, 5);
      var result = baServices.decodeReinitializeDevice(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        state: 5
      });
    });

    it('should successfully encode and decode with password', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReinitializeDevice(buffer, 5, 'Test1234$');
      var result = baServices.decodeReinitializeDevice(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        state: 5,
        password: 'Test1234$'
      });
    });
  });

  describe('TimeSync', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(990);
      baServices.encodeTimeSync(buffer, date);
      var result = baServices.decodeTimeSync(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        value: date,
      });
    });
  });

  describe('Error', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeError(buffer, 15, 25);
      var result = baServices.decodeError(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        class: 15,
        code: 25
      });
    });
  });

  describe('ReadPropertyMultiple', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadPropertyMultiple(buffer, [
        {objectIdentifier: {type: 51, instance: 1}, propertyReferences: [
          {propertyIdentifier: 85, propertyArrayIndex: 0xFFFFFFFF},
          {propertyIdentifier: 85, propertyArrayIndex: 4}
        ]}
      ]);
      var result = baServices.decodeReadPropertyMultiple(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({properties: [{objectIdentifier: {type: 51, instance: 1}, propertyReferences: [
        {propertyIdentifier: 85, propertyArrayIndex: 0xFFFFFFFF},
        {propertyIdentifier: 85, propertyArrayIndex: 4}
      ]}]});
    });
  });

  describe('SubscribeProperty', function() {
    it('should successfully encode and decode with cancellation request', function() {
      var buffer = utils.getBuffer();
      baServices.encodeSubscribeProperty(buffer, 7, {type: 148, instance: 362}, true, false, 1, {propertyIdentifier: 85, propertyArrayIndex: 0xFFFFFFFF}, true, 1);
      var result = baServices.decodeSubscribeProperty(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: true,
        covIncrement: 1,
        issueConfirmedNotifications: false,
        lifetime: 0,
        monitoredObjectIdentifier: {
          instance: 362,
          type: 148
        },
        monitoredProperty: {
          propertyArrayIndex: 4294967295,
          propertyIdentifier: 85
        },
        subscriberProcessIdentifier: 7
      });
    });

    it('should successfully encode and decode without cancellation request', function() {
      var buffer = utils.getBuffer();
      baServices.encodeSubscribeProperty(buffer, 8, {type: 149, instance: 363}, false, true, 2, {propertyIdentifier: 86, propertyArrayIndex: 3}, false, 10);
      var result = baServices.decodeSubscribeProperty(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: false,
        covIncrement: 0,
        issueConfirmedNotifications: true,
        lifetime: 2,
        monitoredObjectIdentifier: {
          instance: 363,
          type: 149
        },
        monitoredProperty: {
          propertyArrayIndex: 3,
          propertyIdentifier: 86
        },
        subscriberProcessIdentifier: 8
      });
    });
  });

  describe('SubscribeCOV', function() {
    it('should successfully encode and decode a cancelation request', function() {
      var buffer = utils.getBuffer();
      baServices.encodeSubscribeCOV(buffer, 10, {type: 3, instance: 1}, true);
      var result = baServices.decodeSubscribeCOV(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: true,
        monitoredObjectIdentifier: {type: 3, instance: 1},
        subscriberProcessIdentifier: 10
      });
    });

    it('should successfully encode and decode subscription request', function() {
      var buffer = utils.getBuffer();
      baServices.encodeSubscribeCOV(buffer, 11, {type: 3, instance: 2}, false, true, 5000);
      var result = baServices.decodeSubscribeCOV(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        cancellationRequest: false,
        issueConfirmedNotifications: true,
        lifetime: 5000,
        monitoredObjectIdentifier: {type: 3, instance: 2},
        subscriberProcessIdentifier: 11
      });
    });
  });

  describe('AtomicWriteFileAcknowledge', function() {
    it('should successfully encode and decode streamed file', function() {
      var buffer = utils.getBuffer();
      baServices.encodeAtomicWriteFileAcknowledge(buffer, true, -10);
      var result = baServices.decodeAtomicWriteFileAcknowledge(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        isStream: true,
        position: -10
      });
    });

    it('should successfully encode and decode non-streamed file', function() {
      var buffer = utils.getBuffer();
      baServices.encodeAtomicWriteFileAcknowledge(buffer, false, 10);
      var result = baServices.decodeAtomicWriteFileAcknowledge(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        isStream: false,
        position: 10
      });
    });
  });

  describe('ReadProperty', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadProperty(buffer, 4, 630, 85, 0xFFFFFFFF);
      var result = baServices.decodeReadProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 4, instance: 630},
        property: {propertyIdentifier: 85, propertyArrayIndex: 0xFFFFFFFF}
      });
    });

    it('should successfully encode and decode with array index', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadProperty(buffer, 4, 630, 85, 2);
      var result = baServices.decodeReadProperty(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 4, instance: 630},
        property: {propertyIdentifier: 85, propertyArrayIndex: 2}
      });
    });
  });

  describe('AtomicReadFile', function() {
    it('should successfully encode and decode as stream', function() {
      var buffer = utils.getBuffer();
      baServices.encodeAtomicReadFile(buffer, true, {type: 13, instance: 5000}, -50, 12);
      var result = baServices.decodeAtomicReadFile(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 13, instance: 5000},
        count: 12,
        isStream: true,
        position: -50
      });
    });

    it('should successfully encode and decode as non-stream', function() {
      var buffer = utils.getBuffer();
      baServices.encodeAtomicReadFile(buffer, false, {type: 14, instance: 5001}, 60, 13);
      var result = baServices.decodeAtomicReadFile(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 14, instance: 5001},
        count: 13,
        isStream: false,
        position: 60
      });
    });
  });

  describe('AtomicReadFileAcknowledge', function() {
    it('should successfully encode and decode as stream', function() {
      var buffer = utils.getBuffer();
      baServices.encodeAtomicReadFileAcknowledge(buffer, true, false, 0, 90, [[12, 12, 12]], [3]);
      var result = baServices.decodeAtomicReadFileAcknowledge(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        isStream: true,
        position: 0,
        endOfFile: false,
        buffer: Buffer.from([12, 12, 12])
      });
    });

    it('should successfully encode and decode as non-stream', function() {
      var buffer = utils.getBuffer();
      baServices.encodeAtomicReadFileAcknowledge(buffer, false, false, 0, 90, [12, 12, 12], 3);
      // TODO: AtomicReadFileAcknowledge as non-stream not yet implemented
      expect(function() {
        baServices.decodeAtomicReadFileAcknowledge(buffer.buffer, 0);
      }).to.throw('NotImplemented');
    });
  });

  // TODO: Correct test behaviour
  describe.skip('AtomicWriteFile', function() {
    it('should successfully encode and decode as stream', function() {
      var buffer = utils.getBuffer();
      // (buffer, isStream, objectId, position, blockCount, blocks, counts);
      baServices.encodeAtomicWriteFile(buffer, true, {type: 51, instance: 2}, 0, 100, [12, 12], 2);
      var result = baServices.decodeAtomicWriteFile(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 51, instance: 2},
        count: 12,
        isStream: true,
        position: -50
      });
    });

    it('should successfully encode and decode as non-stream', function() {
      var buffer = utils.getBuffer();
      // (buffer, isStream, objectId, position, blockCount, blocks, counts);
      baServices.encodeAtomicWriteFile(buffer, false, {type: 51, instance: 2}, 0, 100, [12, 12], 2);
      var result = baServices.decodeAtomicWriteFile(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        objectId: {type: 51, instance: 2},
        count: 12,
        isStream: true,
        position: -50
      });
    });
  });

  describe('ReadRange', function() {
    it('should successfully encode and decode by position', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, 1, 10, null, 0);
      var result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 0,
        objectId: {type: 61, instance: 35},
        position: 10,
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 85
        },
        requestType: 1,
        time: undefined
      });
    });

    it('should successfully encode and decode by position with array index', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 12, 2, 1, 10, null, 0);
      var result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 0,
        objectId: {type: 61, instance: 35},
        position: 10,
        property: {
          propertyArrayIndex: 2,
          propertyIdentifier: 12
        },
        requestType: 1,
        time: undefined
      });
    });

    it('should successfully encode and decode by sequence', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, 2, 11, null, 1111);
      var result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 1111,
        objectId: {type: 61, instance: 35},
        position: 11,
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 85
        },
        requestType: 2,
        time: undefined
      });
    });

    it('should successfully encode and decode by time', function() {
      var buffer = utils.getBuffer();
      var date = new Date(1, 1, 1);
      date.setMilliseconds(990);
      baServices.encodeReadRange(buffer, {type: 61, instance: 35}, 85, 0xFFFFFFFF, 4, null, date, -1111);
      var result = baServices.decodeReadRange(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: -1111,
        objectId: {type: 61, instance: 35},
        position: undefined,
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 85
        },
        requestType: 4,
        time: date
      });
    });
  });

  describe('EventNotifyData', function() {
    it('should successfully encode and decode a change of bitstring event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 60, instance: 12},
        eventObjectIdentifier: {type: 61, instance: 1121},
        timeStamp: {tag: 2, value: date},
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
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 60, instance: 12},
        eventObjectIdentifier: {type: 61, instance: 1121},
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

    it('should successfully encode and decode a change of state event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 1,
        messageText: 'Test1234$',
        notifyType: 1,
        ackRequired: false,
        fromState: 1,
        toState: 2,
        changeOfStateNewState: {tag: 2, state: 2},
        changeOfStateStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
      });
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

    it('should successfully encode and decode a change of value event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 2,
        messageText: 'Test1234$',
        notifyType: 1,
        changeOfValueTag: 1,
        changeOfValueChangeValue: 90,
        changeOfValueStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]}
      });
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

    it('should successfully encode and decode a floating limit event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
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
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

    it('should successfully encode and decode an out of range event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
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
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

    it('should successfully encode and decode a change of life-safety event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
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
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

    it('should successfully encode and decode a buffer ready event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 10,
        messageText: 'Test1234$',
        notifyType: 1,
        bufferReadyBufferProperty: {
          objectIdentifier: {type: 65, instance: 2},
          propertyIdentifier: 85,
          arrayIndex: 3,
          deviceIndentifier: {type: 8, instance: 443}
        },
        bufferReadyPreviousNotification: 121,
        bufferReadyCurrentNotification: 281
      });
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

    it('should successfully encode and decode a unsigned range event', function() {
      var buffer = utils.getBuffer();
      var date = new Date();
      date.setMilliseconds(880);
      baServices.encodeEventNotifyData(buffer, {
        processIdentifier: 3,
        initiatingObjectIdentifier: {},
        eventObjectIdentifier: {},
        timeStamp: {tag: 2, value: date},
        notificationClass: 9,
        priority: 7,
        eventType: 11,
        messageText: 'Test1234$',
        notifyType: 1,
        unsignedRangeExceedingValue: 101,
        unsignedRangeStatusFlags: {bitsUsed: 24, value: [0xaa, 0xaa, 0xaa]},
        unsignedRangeExceededLimit: 100
      });
      var result = baServices.decodeEventNotifyData(buffer.buffer, 0);
      delete result.len;
      expect(result).to.deep.equal({
        processIdentifier: 3,
        initiatingObjectIdentifier: {type: 0, instance: 0},
        eventObjectIdentifier: {type: 0, instance: 0},
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

  // TODO: Correct test behaviour
  describe.skip('ReadRangeAcknowledge', function() {
    it('should successfully encode and decode', function() {
      var buffer = utils.getBuffer();
      baServices.encodeReadRangeAcknowledge(buffer, {type: 12, instance: 500}, 5048, 0xFFFFFFFF, {bitsUsed: 24, value: [1, 2, 3]}, 12, Buffer.from([1, 2, 3]), 2, 2);
      var result = baServices.decodeReadRangeAcknowledge(buffer.buffer, 0, buffer.offset);
      delete result.len;
      expect(result).to.deep.equal({
        count: 0,
        objectId: {type: 61, instance: 35},
        position: 10,
        property: {
          propertyArrayIndex: 0xFFFFFFFF,
          propertyIdentifier: 85
        },
        requestType: 1,
        time: undefined
      });
    });
  });
});
