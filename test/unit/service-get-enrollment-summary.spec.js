'use strict';

const utils = require('./utils');
const baServices = require('../../lib/services');

describe('bacstack - Services layer GetEnrollmentSummary unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.getEnrollmentSummary.encode(buffer, 2);
    const result = baServices.getEnrollmentSummary.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      acknowledgmentFilter: 2
    });
  });

  it('should successfully encode and decode full payload', () => {
    const buffer = utils.getBuffer();
    baServices.getEnrollmentSummary.encode(buffer, 2, {objectId: {type: 5, instance: 33}, processId: 7}, 1, 3, {min: 1, max: 65}, 5);
    const result = baServices.getEnrollmentSummary.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
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
    baServices.getEnrollmentSummary.encodeAcknowledge(buffer, [
      {objectId: {type: 12, instance: 120}, eventType: 3, eventState: 2, priority: 18, notificationClass: 11}
    ]);
    const result = baServices.getEnrollmentSummary.decodeAcknowledge(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      enrollmentSummaries: [{objectId: {type: 12, instance: 120}, eventType: 3, eventState: 2, priority: 18, notificationClass: 11}]
    });
  });
});
