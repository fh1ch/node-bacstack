'use strict';

const utils = require('./utils');

describe('bacstack - readPropertyMultiple integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    const requestArray = [
      {objectId: {type: 8, instance: 4194303}, properties: [{id: 8}]}
    ];
    client.readPropertyMultiple('127.0.0.1', requestArray, (err, value) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      expect(value).toBeUndefined();
      client.close();
      next();
    });
  });

  it('should successfully decode a structured view', (next) => {
    const transport = new utils.transportStub();
    const client = new utils.bacnetClient({transport: transport});
    const data = Buffer.from('810a0109010030000e0c0740001f1e291c4e752900436f6c6c656374696f6e206f66206c69676874696e672070726573656e6365206465746563746f724f294b4ec40740001f4f294d4e7531005ac3a4686c657277656727466c6f6f72203427525365675456274c6774275073634f70274c6774507363446574436f6c4f294f4e911d4f29a84e751800372d42412d524453312d3034312d5342437631332e32304f29cf4e71004f29d04e91084f29d24e750c004c67745073634465745273750a00507363446574282a294f29d34e1c014000001c00c000004f2a13424e91004f2a134d4e91064f2a13a64e21004f2a13bd4e91004f2a13de4e8207808207004f2a13ee4e91294f1f', 'hex'); // eslint-disable-line max-len
    const requestArray = [
      {objectId: {type: 8, instance: 4194303}, properties: [{id: 8}]}
    ];
    client.readPropertyMultiple('127.0.0.1', requestArray, (err, response) => {
      expect(err).toBeNull();
      const object = utils.propertyFormater(response.values[0].values);
      expect(response.values[0].objectId).toEqual({type: 29, instance: 31});
      expect(object[28]).toEqual([{value: 'Collection of lighting presence detector', type: 7, encoding: 0}]);
      expect(object[75]).toEqual([{value: {type: 29, instance: 31}, type: 12}]);
      expect(object[77]).toEqual([{value: 'Zählerweg\'Floor 4\'RSegTV\'Lgt\'PscOp\'LgtPscDetCol', type: 7, encoding: 0}]);
      expect(object[79]).toEqual([{value: 29, type: 9}]);
      expect(object[168]).toEqual([{value: '7-BA-RDS1-041-SBCv13.20', type: 7, encoding: 0}]);
      expect(object[207]).toEqual([{value: '', type: 7, encoding: 0}]);
      expect(object[208]).toEqual([{value: 8, type: 9}]);
      expect(object[210]).toEqual([
        {value: 'LgtPscDetRs', type: 7, encoding: 0},
        {value: 'PscDet(*)', type: 7, encoding: 0}
      ]);
      expect(object[211]).toEqual([
        {value: {value: {type: 5, instance: 0}, type: 12}, type: 118},
        {value: {value: {type: 3, instance: 0}, type: 12}, type: 118}
      ]);
      expect(object[4930]).toEqual([{value: 0, type: 9}]);
      expect(object[4941]).toEqual([{value: 6, type: 9}]);
      expect(object[5030]).toEqual([{value: 0, type: 2}]);
      expect(object[5053]).toEqual([{value: 0, type: 9}]);
      expect(object[5086]).toEqual([
        {value: {value: [1], bitsUsed: 1}, type: 8},
        {value: {value: [0], bitsUsed: 1}, type: 8}
      ]);
      expect(object[5102]).toEqual([{value: 41, type: 9}]);
      client.close();
      next();
    });
    transport.emit('message', data, '127.0.0.1');
  });

  it('should successfully decode a value object', (next) => {
    const transport = new utils.transportStub();
    const client = new utils.bacnetClient({transport: transport});
    const data = Buffer.from('810a01eb010030000e0c04c0000a1e291c4e75070053656e736f724f29244e91004f294a4e21084f294b4ec404c0000a4f294d4e7525005ac3a4686c657277656727466c6f6f722034275253656754562753656e4465762753656e4f294f4e91134f29514e104f29554e21014f29674e91004f296e4e750c004f7065726174696f6e616c750f004465766963652073746f70706564751400446576696365206e6f742061737369676e6564750f00446576696365206d697373696e67751300436f6e6669677572696e6720646576696365750700556e75736564751f004d697373696e67206f722077726f6e6720636f6e66696775726174696f6e750a00536561726368696e674f296f4e8204004f29a84e751800372d42412d524453312d3032342d5342437631332e32304f2a13424e91004f2a134d4e91054f2a13884e91004f2a13894e91004f2a13af4e750800302e322e3234394f2a13df4e750e00355747313235382d32444231324f2a13e44e750b00504c2d313a444c3d313b4f2a13e64e21034f2a13ec4e750d003030303130303433656464634f2a13ed4e752d00504c3a4444543d303538362e303030312e30302e30312e30303b46573d302e312e31333b4d4f44453d504c3b4f2a13ee4e91184f2a13ef4e71004f2a13f04e91004f2a13f34e21014f1f', 'hex'); // eslint-disable-line max-len
    const requestArray = [
      {objectId: {type: 8, instance: 4194303}, properties: [{id: 8}]}
    ];
    client.readPropertyMultiple('127.0.0.1', requestArray, (err, response) => {
      expect(err).toBeNull();
      expect(response.values[0].objectId).toEqual({type: 19, instance: 10});
      const object = utils.propertyFormater(response.values[0].values);
      expect(object[28]).toEqual([{value: 'Sensor', type: 7, encoding: 0}]);
      expect(object[36]).toEqual([{value: 0, type: 9}]);
      expect(object[74]).toEqual([{value: 8, type: 2}]);
      expect(object[75]).toEqual([{value: {type: 19, instance: 10}, type: 12}]);
      expect(object[77]).toEqual([{value: 'Zählerweg\'Floor 4\'RSegTV\'SenDev\'Sen', type: 7, encoding: 0}]);
      expect(object[79]).toEqual([{value: 19, type: 9}]);
      expect(object[81]).toEqual([{value: false, type: 1}]);
      expect(object[85]).toEqual([{value: 1, type: 2}]);
      expect(object[103]).toEqual([{value: 0, type: 9}]);
      expect(object[110]).toEqual([
        {value: 'Operational', type: 7, encoding: 0},
        {value: 'Device stopped', type: 7, encoding: 0},
        {value: 'Device not assigned', type: 7, encoding: 0},
        {value: 'Device missing', type: 7, encoding: 0},
        {value: 'Configuring device', type: 7, encoding: 0},
        {value: 'Unused', type: 7, encoding: 0},
        {value: 'Missing or wrong configuration', type: 7, encoding: 0},
        {value: 'Searching', type: 7, encoding: 0}
      ]);
      expect(object[111]).toEqual([{value: {value: [0], bitsUsed: 4}, type: 8}]);
      expect(object[168]).toEqual([{value: '7-BA-RDS1-024-SBCv13.20', type: 7, encoding: 0}]);
      expect(object[4930]).toEqual([{value: 0, type: 9}]);
      expect(object[4941]).toEqual([{value: 5, type: 9}]);
      expect(object[5000]).toEqual([{value: 0, type: 9}]);
      expect(object[5001]).toEqual([{value: 0, type: 9}]);
      expect(object[5039]).toEqual([{value: '0.2.249', type: 7, encoding: 0}]);
      expect(object[5087]).toEqual([{value: '5WG1258-2DB12', type: 7, encoding: 0}]);
      expect(object[5092]).toEqual([{value: 'PL-1:DL=1;', type: 7, encoding: 0}]);
      expect(object[5094]).toEqual([{value: 3, type: 2}]);
      expect(object[5100]).toEqual([{value: '00010043eddc', type: 7, encoding: 0}]);
      expect(object[5101]).toEqual([{value: 'PL:DDT=0586.0001.00.01.00;FW=0.1.13;MODE=PL;', type: 7, encoding: 0}]);
      expect(object[5102]).toEqual([{value: 24, type: 9}]);
      expect(object[5103]).toEqual([{value: '', type: 7, encoding: 0}]);
      expect(object[5104]).toEqual([{value: 0, type: 9}]);
      expect(object[5107]).toEqual([{value: 1, type: 2}]);
      client.close();
      next();
    });
    transport.emit('message', data, '127.0.0.1');
  });
});
