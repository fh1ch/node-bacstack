'use strict';

const baAsn1 = require('../asn1');
const baEnum = require('../enum');

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
