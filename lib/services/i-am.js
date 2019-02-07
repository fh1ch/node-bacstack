/**
 * The iAm event represents the response to a whoIs request to detect all
 * devices in a BACNET network.
 *
 * @event bacstack.iAm
 * @param {number} deviceId - The BACNET device-id of the detected device.
 * @param {number} maxApdu - The max APDU size the detected device supports.
 * @param {number} segmentation - The type of segmentation the detected device supports.
 * @param {number} vendorId - The BACNET vendor-id of the detected device.
 *
 * @example
 * const bacnet = require('bacstack');
 * const client = new bacnet();
 *
 * client.on('iAm', (msg) => {
 *   console.log(
 *     'address: ', msg.header.address,
 *     ' - deviceId: ', msg.payload.deviceId,
 *     ' - maxApdu: ', msg.payload.maxApdu,
 *     ' - segmentation: ', msg.payload.segmentation,
 *     ' - vendorId: ', msg.payload.vendorId
 *   );
 * });
 */

'use strict';

const baAsn1      = require('../asn1');
const baEnum      = require('../enum');

module.exports.encode = (buffer, deviceId, maxApdu, segmentation, vendorId) => {
  baAsn1.encodeApplicationObjectId(buffer, baEnum.ObjectType.DEVICE, deviceId);
  baAsn1.encodeApplicationUnsigned(buffer, maxApdu);
  baAsn1.encodeApplicationEnumerated(buffer, segmentation);
  baAsn1.encodeApplicationUnsigned(buffer, vendorId);
};

module.exports.decode = (buffer, offset) => {
  let result;
  let apduLen = 0;
  const orgOffset = offset;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.OBJECTIDENTIFIER) return;
  result = baAsn1.decodeObjectId(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.objectType !== baEnum.ObjectType.DEVICE) return;
  const deviceId = result.instance;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.UNSIGNED_INTEGER) return;
  result = baAsn1.decodeUnsigned(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  const maxApdu = result.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.ENUMERATED) return;
  result = baAsn1.decodeEnumerated(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  if (result.value > baEnum.Segmentation.NO_SEGMENTATION) return;
  const segmentation = result.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.UNSIGNED_INTEGER) return;
  result = baAsn1.decodeUnsigned(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  if (result.value > 0xFFFF) return;
  const vendorId = result.value;
  return {
    len: offset - orgOffset,
    deviceId: deviceId,
    maxApdu: maxApdu,
    segmentation: segmentation,
    vendorId: vendorId
  };
};
