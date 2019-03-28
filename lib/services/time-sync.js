/**
 * The timeSync event represents the request to synchronize the local time to
 * the received time.
 *
 * @event bacstack.timeSync
 * @param {date} dateTime - The time to be synchronized to.
 *
 * @example
 * const bacnet = require('bacstack');
 * const client = new bacnet();
 *
 * client.on('timeSync', (msg) => {
 *   console.log(
 *     'address: ', msg.header.address,
 *     ' - dateTime: ', msg.payload.dateTime
 *   );
 * });
 */

'use strict';

const baAsn1      = require('../asn1');
const baEnum      = require('../enum');

module.exports.encode = (buffer, time) => {
  baAsn1.encodeApplicationDate(buffer, time);
  baAsn1.encodeApplicationTime(buffer, time);
};

module.exports.decode = (buffer, offset, length) => {
  let len = 0;
  let result;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.DATE) return;
  const date = baAsn1.decodeDate(buffer, offset + len);
  len += date.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.TIME) return;
  const time = baAsn1.decodeBacnetTime(buffer, offset + len);
  len += time.len;
  return {
    len: len,
    value: new Date(date.value.getFullYear(), date.value.getMonth(), date.value.getDate(), time.value.getHours(), time.value.getMinutes(), time.value.getSeconds(), time.value.getMilliseconds())
  };
};
