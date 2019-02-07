'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baEnum      = require('../../lib/enum');
const client      = require('../../lib/client');

describe('bacstack - client', () => {
  it('should successfuly encode a bitstring > 32 bits', () => {
    const result = client.createBitstring([
      baEnum.ServicesSupported.CONFIRMED_COV_NOTIFICATION,
      baEnum.ServicesSupported.READ_PROPERTY,
      baEnum.ServicesSupported.WHO_IS,
    ]);
    expect(result).to.deep.equal({
      value: [2, 16, 0, 0, 4],
      bitsUsed: 35,
    });
  });
  it('should successfuly encode a bitstring < 8 bits', () => {
    const result = client.createBitstring([
      baEnum.ServicesSupported.GET_ALARM_SUMMARY,
    ]);
    expect(result).to.deep.equal({
      value: [8],
      bitsUsed: 4,
    });
  });
  it('should successfuly encode a bitstring of only one bit', () => {
    const result = client.createBitstring([
      baEnum.ServicesSupported.ACKNOWLEDGE_ALARM,
    ]);
    expect(result).to.deep.equal({
      value: [1],
      bitsUsed: 1,
    });
  });
});
