'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer SubscribeCOV unit', () => {
  it('should successfully encode and decode a cancelation request', () => {
    const buffer = utils.getBuffer();
    baServices.subscribeCov.encode(buffer, 10, {type: 3, instance: 1}, true);
    const result = baServices.subscribeCov.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      cancellationRequest: true,
      monitoredObjectId: {type: 3, instance: 1},
      subscriberProcessId: 10
    });
  });

  it('should successfully encode and decode subscription request', () => {
    const buffer = utils.getBuffer();
    baServices.subscribeCov.encode(buffer, 11, {type: 3, instance: 2}, false, true, 5000);
    const result = baServices.subscribeCov.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      cancellationRequest: false,
      issueConfirmedNotifications: true,
      lifetime: 5000,
      monitoredObjectId: {type: 3, instance: 2},
      subscriberProcessId: 11
    });
  });
});
