var baAsn1        = require('./asn1');
var baEnum        = require('./enum');

module.exports.encodeIamBroadcast = function(buffer, deviceId, maxApdu, segmentation, vendorId) {
  baAsn1.encodeApplicationObjectId(buffer, baEnum.ObjectTypes.OBJECT_DEVICE, deviceId);
  baAsn1.encodeApplicationUnsigned(buffer, maxApdu);
  baAsn1.encodeApplicationEnumerated(buffer, segmentation);
  baAsn1.encodeApplicationUnsigned(buffer, vendorId);
};

module.exports.decodeIamBroadcast = function(buffer, offset) {
  var result;
  var apduLen = 0;
  var orgOffset = offset;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID) return;
  result = baAsn1.decodeObjectId(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.objectType !== baEnum.ObjectTypes.OBJECT_DEVICE) return;
  var deviceId = result.instance;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
  result = baAsn1.decodeUnsigned(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  var maxApdu = result.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED) return;
  result = baAsn1.decodeEnumerated(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  if (result.value > baEnum.Segmentations.SEGMENTATION_NONE) return;
  var segmentation = result.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
  result = baAsn1.decodeUnsigned(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  if (result.value > 0xFFFF) return;
  var vendorId = result.value;
  return {
    len: offset - orgOffset,
    deviceId: deviceId,
    maxApdu: maxApdu,
    segmentation: segmentation,
    vendorId: vendorId
  };
};

module.exports.encodeWhoHasBroadcast = function(buffer, lowLimit, highLimit, objectId, objectName) {
  if ((lowLimit >= 0) && (lowLimit <= baAsn1.BACNET_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baAsn1.BACNET_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
  if (objectName && objectName !== '') {
    baAsn1.encodeContextCharacterString(buffer, 3, objectName);
  } else {
    baAsn1.encodeContextObjectId(buffer, 2, objectId.type, objectId.instance);
  }
};

module.exports.decodeWhoHasBroadcast = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var decodedValue;
  var result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === 0) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
      value.lowLimit = decodedValue.value;
    }
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 1) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
      value.highLimit = decodedValue.value;
    }
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 2) {
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  }
  if (result.tagNumber === 3) {
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    len += decodedValue.len;
    value.objectName = decodedValue.value;
  }
  value.len = len;
  return value;
};

module.exports.encodeWhoIsBroadcast = function(buffer, lowLimit, highLimit) {
  if ((lowLimit >= 0) && (lowLimit <= baAsn1.BACNET_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baAsn1.BACNET_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
};

module.exports.decodeWhoIsBroadcast = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  if (apduLen <= 0) return {};
  var result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  if (apduLen <= len) return;
  var decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
    value.lowLimit = decodedValue.value;
  }
  if (apduLen <= len) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  if (apduLen <= len) return;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
    value.highLimit = decodedValue.value;
  }
  value.len = len;
  return value;
};

module.exports.encodeAtomicReadFile = function(buffer, isStream, objectId, position, count) {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
  if (isStream) {
    baAsn1.encodeOpeningTag(buffer, 0);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationUnsigned(buffer, count);
    baAsn1.encodeClosingTag(buffer, 0);
  } else {
    baAsn1.encodeOpeningTag(buffer, 1);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationUnsigned(buffer, count);
    baAsn1.encodeClosingTag(buffer, 1);
  }
};

module.exports.decodeAtomicReadFile = function(buffer, offset) {
  var len = 0;
  var result;
  var decodedValue;
  var isStream = true;
  var objectId = {};
  var position = -1;
  var count = 0;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID) return;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 0)) {
    isStream = true;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    count = decodedValue.value;
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
    len++;
  } else if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) {
    isStream = false;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    count = decodedValue.value;
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
    len++;
  } else {
    return;
  }
  return {
    len: len,
    isStream: isStream,
    objectId: objectId,
    position: position,
    count: count
  };
};

module.exports.encodeAtomicReadFileAcknowledge = function(buffer, isStream, endOfFile, position, blockCount, blocks, counts) {
  baAsn1.encodeApplicationBoolean(buffer, endOfFile);
  if (isStream) {
    baAsn1.encodeOpeningTag(buffer, 0);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationOctetString(buffer, blocks[0], 0, counts[0]);
    baAsn1.encodeClosingTag(buffer, 0);
  } else {
    baAsn1.encodeOpeningTag(buffer, 1);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationUnsigned(buffer, blockCount);
    for (var i = 0; i < blockCount; i++) {
      baAsn1.encodeApplicationOctetString(buffer, blocks[i], 0, counts[i]);
    }
    baAsn1.encodeClosingTag(buffer, 1);
  }
};

module.exports.decodeAtomicReadFileAcknowledge = function(buffer, offset) {
  var len = 0;
  var result;
  var decodedValue;
  var endOfFile;
  var isStream;
  var position;
  var targetBuffer;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN) return;
  endOfFile = result.value > 0;
  if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 0)) {
    isStream = true;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING) return;
    targetBuffer = buffer.slice(offset + len, offset + len + result.value);
    len += result.value;
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
    len++;
  } else if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) {
    isStream = false;
    throw new Error('NotImplemented');
  } else {
    return;
  }
  return {
    len: len,
    endOfFile: endOfFile,
    isStream: isStream,
    position: position,
    buffer: targetBuffer
  };
};

module.exports.encodeAtomicWriteFile = function(buffer, isStream, objectId, position, blockCount, blocks, counts) {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
  if (isStream) {
    baAsn1.encodeOpeningTag(buffer, 0);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationOctetString(buffer, blocks[0], 0, counts[0]);
    baAsn1.encodeClosingTag(buffer, 0);
  } else {
    baAsn1.encodeOpeningTag(buffer, 1);
    baAsn1.encodeApplicationSigned(buffer, position);
    baAsn1.encodeApplicationUnsigned(buffer, blockCount);
    for (var i = 0; i < blockCount; i++) {
      baAsn1.encodeApplicationOctetString(buffer, blocks[i], 0, counts[i]);
    }
    baAsn1.encodeClosingTag(buffer, 1);
  }
};

module.exports.decodeAtomicWriteFile = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var isStream = true;
  var position = -1;
  var blockCount = 0;
  var blocks = null;
  var counts = null;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.length;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID) return;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  var objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 0)) {
    isStream = true;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.length;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.length;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING) return;
    blockCount = 1;

    // TODO: Implement

    /*
    blocks = new byte[1][];
    blocks[0] = new byte[len_value_type];
    counts = new int[] { len_value_type };*/

    len += baAsn1.decodeOctetString(buffer, offset + len, apduLen, blocks[0], 0, result.value);

    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
    len++;
  } else if (baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) {
    isStream = false;
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.length;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT) return;
    decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    position = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.length;
    if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    blockCount = decodedValue.value;

    // TODO: Implement
    /*blocks = new byte[block_count][];
    counts = new int[block_count];*/

    for (var i = 0; i < blockCount; i++) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      /*blocks[i] = new byte[len_value_type];
      counts[i] = len_value_type;*/
      if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING) return;
      len += baAsn1.decodeOctetString(buffer, offset + len, apduLen, blocks[i], 0, result.value);

    }
    if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
    len++;
  } else {
    return;
  }
  return {
    len: len,
    isStream: isStream,
    objectId: objectId,
    position: position,
    blockCount: blockCount,
    blocks: blocks,
    counts: counts
  };
};

module.exports.encodeAtomicWriteFileAcknowledge = function(buffer, isStream, position) {
  if (isStream) {
    baAsn1.encodeContextSigned(buffer, 0, position);
  } else {
    baAsn1.encodeContextSigned(buffer, 1, position);
  }
};

module.exports.decodeAtomicWriteFileAcknowledge = function(buffer, offset) {
  var len = 0;
  var isStream = false;
  var position = 0;
  var decodedValue;
  var result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === 0) {
    isStream = true;
  } else if (result.tagNumber === 1) {
    isStream = false;
  } else {
    return;
  }
  decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  position = decodedValue.value;
  return {
    len: len,
    isStream: isStream,
    position: position
  };
};

module.exports.encodeDeviceCommunicationControl = function(buffer, timeDuration, enableDisable, password) {
  if (timeDuration > 0) {
    baAsn1.encodeContextUnsigned(buffer, 0, timeDuration);
  }
  baAsn1.encodeContextEnumerated(buffer, 1, enableDisable);
  if (password && password !== '') {
    baAsn1.encodeContextCharacterString(buffer, 2, password);
  }
};

module.exports.decodeDeviceCommunicationControl = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var decodedValue;
  var result;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 0)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    value.timeDuration = decodedValue.value;
    len += decodedValue.len;
  }
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  value.enableDisable = decodedValue.value;
  len += decodedValue.len;
  if (len < apduLen) {
    if (!baAsn1.decodeIsContextTag(buffer, offset + len, 2)) return;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    value.password = decodedValue.value;
    len += decodedValue.len;
  }
  value.len = len;
  return value;
};

module.exports.encodeReinitializeDevice = function(buffer, state, password) {
  baAsn1.encodeContextEnumerated(buffer, 0, state);
  if (password && password !== '') {
    baAsn1.encodeContextCharacterString(buffer, 1, password);
  }
};

module.exports.decodeReinitializeDevice = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var result;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  var decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  value.state = decodedValue.value;
  len += decodedValue.len;
  if (len < apduLen) {
    if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
    value.password = decodedValue.value;
    len += decodedValue.len;
  }
  value.len = len;
  return value;
};

module.exports.encodeReadRange = function(buffer, objectId, propertyId, arrayIndex, requestType, position, time, count) {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  switch (requestType) {
    case baEnum.ReadRangeRequestTypes.RR_BY_POSITION:
      baAsn1.encodeOpeningTag(buffer, 3);
      baAsn1.encodeApplicationUnsigned(buffer, position);
      baAsn1.encodeApplicationSigned(buffer, count);
      baAsn1.encodeClosingTag(buffer, 3);
      break;
    case baEnum.ReadRangeRequestTypes.RR_BY_SEQUENCE:
      baAsn1.encodeOpeningTag(buffer, 6);
      baAsn1.encodeApplicationUnsigned(buffer, position);
      baAsn1.encodeApplicationSigned(buffer, count);
      baAsn1.encodeClosingTag(buffer, 6);
      break;
    case baEnum.ReadRangeRequestTypes.RR_BY_TIME:
      baAsn1.encodeOpeningTag(buffer, 7);
      baAsn1.encodeApplicationDate(buffer, time);
      baAsn1.encodeApplicationTime(buffer, time);
      baAsn1.encodeApplicationSigned(buffer, count);
      baAsn1.encodeClosingTag(buffer, 7);
      break;
    case baEnum.ReadRangeRequestTypes.RR_READ_ALL:
      break;
    default:
      break;
  }
};

module.exports.decodeReadRange = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var requestType = baEnum.ReadRangeRequestTypes.RR_READ_ALL;
  var position;
  var time;
  var count;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len, 0);
  len += decodedValue.len;
  var objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  var property = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  property.id = decodedValue.value;
  if (len < apduLen && baAsn1.decodeIsContextTag(buffer, offset + len, 2)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    property.index = decodedValue.value;
  } else {
    property.index = baAsn1.BACNET_ARRAY_ALL;
  }
  if (len < apduLen) {
    result = baAsn1.decodeTagNumber(buffer, offset + len);
    len += result.len;
    switch (result.tagNumber) {
      case 3:
        requestType = baEnum.ReadRangeRequestTypes.RR_BY_POSITION;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        position = decodedValue.value;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        count = decodedValue.value;
        break;
      case 6:
        requestType = baEnum.ReadRangeRequestTypes.RR_BY_SEQUENCE;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        position = decodedValue.value;
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        count = decodedValue.value;
        break;
      case 7:
        requestType = baEnum.ReadRangeRequestTypes.RR_BY_TIME;
        decodedValue = baAsn1.decodeApplicationDate(buffer, offset + len);
        len += decodedValue.len;
        var tmpDate = decodedValue.value.value;
        decodedValue = baAsn1.decodeApplicationTime(buffer, offset + len);
        len += decodedValue.len;
        var tmpTime = decodedValue.value.value;
        time = new Date(tmpDate.getYear(), tmpDate.getMonth(), tmpDate.getDate(), tmpTime.getHours(), tmpTime.getMinutes(), tmpTime.getSeconds(), tmpTime.getMilliseconds());
        result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
        len += result.len;
        decodedValue = baAsn1.decodeSigned(buffer, offset + len, result.value);
        len += decodedValue.len;
        count = decodedValue.value;
        break;
      default:
        return;
    }
    result = baAsn1.decodeTagNumber(buffer, offset + len);
    len += result.len;
  }
  return {
    len: len,
    objectId: objectId,
    property: property,
    requestType: requestType,
    position: position,
    time: time,
    count: count
  };
};

module.exports.encodeReadProperty = function(buffer, objectType, objectInstance, propertyId, arrayIndex) {
  if (objectType <= baAsn1.BACNET_MAX_OBJECT) {
    baAsn1.encodeContextObjectId(buffer, 0, objectType, objectInstance);
  }
  if (propertyId <= baEnum.PropertyIds.MAX_BACNET_PROPERTY_ID) {
    baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  }
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex || baAsn1.BACNET_ARRAY_ALL);
  }
};

module.exports.decodeReadProperty = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  if (apduLen < 7) return;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  var objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  var property = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  property.id = decodedValue.value;
  property.index = baAsn1.BACNET_ARRAY_ALL;
  if (len < apduLen) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if ((result.tagNumber === 2) && (len < apduLen)) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      property.index = decodedValue.value;
    } else {
      return;
    }
  }
  if (len < apduLen) return;
  return {
    len: len,
    objectId: objectId,
    property: property
  };
};

module.exports.encodeReadPropertyAcknowledge = function(buffer, objectId, propertyId, arrayIndex, values) {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeOpeningTag(buffer, 3);
  values.forEach(function(value) {
    baAsn1.bacappEncodeApplicationData(buffer, value);
  });
  baAsn1.encodeClosingTag(buffer, 3);
};

module.exports.decodeReadPropertyAcknowledge = function(buffer, offset, apduLen) {
  var result;
  var decodedValue;
  var objectId = {};
  var property = {};
  if (!baAsn1.decodeIsContextTag(buffer, offset, 0)) return;
  var len = 1;
  result = baAsn1.decodeObjectId(buffer, offset + len);
  len += result.len;
  objectId.type = result.objectType;
  objectId.instance = result.instance;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  result = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += result.len;
  property.id = result.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    property.index = decodedValue.value;
  } else {
    property.index = baAsn1.BACNET_ARRAY_ALL;
  }
  var values = [];
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 3)) return;
  len++;
  while ((apduLen - len) > 1) {
    result = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, property.id);
    if (!result) return;
    len += result.len;
    delete result.len;
    values.push(result);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) return;
  len++;
  return {
    len: len,
    objectId: objectId,
    property: property,
    values: values
  };
};

module.exports.encodeReadPropertyMultiple = function(buffer, properties) {
  properties.forEach(function(value) {
    baAsn1.encodeReadAccessSpecification(buffer, value);
  });
};

module.exports.decodeReadPropertyMultiple = function(buffer, offset, apduLen) {
  var len = 0;
  var values = [];
  while ((apduLen - len) > 0) {
    var decodedValue = baAsn1.decodeReadAccessSpecification(buffer, offset + len, apduLen - len);
    if (!decodedValue) return;
    len += decodedValue.len;
    values.push(decodedValue.value);
  }
  return {
    len: len,
    properties: values
  };
};

module.exports.encodeReadPropertyMultipleAcknowledge = function(buffer, values) {
  values.forEach(function(value) {
    baAsn1.encodeReadAccessResult(buffer, value);
  });
};

module.exports.decodeReadPropertyMultipleAcknowledge = function(buffer, offset, apduLen) {
  var len = 0;
  var values = [];
  while ((apduLen - len) > 0) {
    var result = baAsn1.decodeReadAccessResult(buffer, offset + len, apduLen - len);
    if (!result) return;
    len += result.len;
    values.push(result.value);
  }
  return {
    len: len,
    values: values
  };
};

module.exports.encodeWriteProperty = function(buffer, objectType, objectInstance, propertyId, arrayIndex, priority, values) {
  baAsn1.encodeContextObjectId(buffer, 0, objectType, objectInstance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeOpeningTag(buffer, 3);
  values.forEach(function(value) {
    baAsn1.bacappEncodeApplicationData(buffer, value);
  });
  baAsn1.encodeClosingTag(buffer, 3);
  if (priority !== baAsn1.BACNET_NO_PRIORITY) {
    baAsn1.encodeContextUnsigned(buffer, 4, priority);
  }
};

module.exports.decodeWriteProperty = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {
    property: {}
  };
  var decodedValue;
  var result;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  var objectId = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  len += decodedValue.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.property.id = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.property.index = decodedValue.value;
  } else {
    value.property.index = baAsn1.BACNET_ARRAY_ALL;
  }
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 3)) return;
  len++;
  var values = [];
  while ((apduLen - len) > 1 && !baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) {
    decodedValue = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, value.property.id);
    if (!decodedValue) return;
    len += decodedValue.len;
    delete decodedValue.len;
    values.push(decodedValue);
  }
  value.value = values;
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 3)) return;
  len++;
  value.priority = baAsn1.BACNET_MAX_PRIORITY;
  if (len < apduLen) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    if (result.tagNumber === 4) {
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue;
      if ((decodedValue.value >= baAsn1.BACNET_MIN_PRIORITY) && (decodedValue.value <= baAsn1.BACNET_MAX_PRIORITY)) {
        value.priority = decodedValue.value;
      } else {
        return;
      }
    }
  }
  return {
    len: len,
    objectId: objectId,
    value: value
  };
};

var encodeWritePropertyMultiple = module.exports.encodeWritePropertyMultiple = function(buffer, objectId, values) {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeOpeningTag(buffer, 1);
  values.forEach(function(pValue) {
    baAsn1.encodeContextEnumerated(buffer, 0, pValue.property.id);
    if (pValue.property.index !== baAsn1.BACNET_ARRAY_ALL) {
      baAsn1.encodeContextUnsigned(buffer, 1, pValue.property.index);
    }
    baAsn1.encodeOpeningTag(buffer, 2);
    pValue.value.forEach(function(value) {
      baAsn1.bacappEncodeApplicationData(buffer, value);
    });
    baAsn1.encodeClosingTag(buffer, 2);
    if (pValue.priority !== baAsn1.BACNET_NO_PRIORITY) {
      baAsn1.encodeContextUnsigned(buffer, 3, pValue.priority);
    }
  });
  baAsn1.encodeClosingTag(buffer, 1);
};

module.exports.decodeWritePropertyMultiple = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var objectId;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if ((result.tagNumber !== 0) || (apduLen <= len)) return;
  apduLen -= len;
  if (apduLen < 4) return;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  objectId = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  var _values = [];
  while ((apduLen - len) > 1) {
    var newEntry = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    var propertyId = decodedValue.value;
    var arrayIndex = baAsn1.BACNET_ARRAY_ALL;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 1) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      arrayIndex = decodedValue.value;
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
    }
    newEntry.property = {id: propertyId, index: arrayIndex};
    if ((result.tagNumber !== 2) || (!baAsn1.decodeIsOpeningTag(buffer, offset + len - 1))) return;
    var values = [];
    while ((len + offset) <= buffer.length && !baAsn1.decodeIsClosingTag(buffer, offset + len)) {
      var value = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, propertyId);
      if (!value) return;
      len += value.len;
      delete value.len;
      values.push(value);
    }
    len++;
    newEntry.value = values;
    var priority = baAsn1.BACNET_NO_PRIORITY;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 3) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      priority = decodedValue.value;
    } else {
      len--;
    }
    newEntry.priority = priority;
    _values.push(newEntry);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  return {
    len: len,
    objectId: objectId,
    values: _values
  };
};

module.exports.encodeWriteObjectMultiple = function(buffer, values) {
  values.forEach(function(object) {
    encodeWritePropertyMultiple(buffer, object.objectId, object.values);
  });
};

module.exports.encodeCreateObjectAcknowledge = function(buffer, objectId) {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
};

module.exports.encodeTimeSync = function(buffer, time) {
  baAsn1.encodeApplicationDate(buffer, time);
  baAsn1.encodeApplicationTime(buffer, time);
};

module.exports.decodeTimeSync = function(buffer, offset, length) {
  var len = 0;
  var result;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_DATE) return;
  var date = baAsn1.decodeDate(buffer, offset + len);
  len += date.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_TIME) return;
  var time = baAsn1.decodeBacnetTime(buffer, offset + len);
  len += time.len;
  return {
    len: len,
    value: new Date(date.value.getFullYear(), date.value.getMonth(), date.value.getDate(), time.value.getHours(), time.value.getMinutes(), time.value.getSeconds(), time.value.getMilliseconds())
  };
};

module.exports.encodeError = function(buffer, errorClass, errorCode) {
  baAsn1.encodeApplicationEnumerated(buffer, errorClass);
  baAsn1.encodeApplicationEnumerated(buffer, errorCode);
};

module.exports.decodeError = function(buffer, offset) {
  var orgOffset = offset;
  var result;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  offset += result.len;
  var errorClass = baAsn1.decodeEnumerated(buffer, offset, result.value);
  offset += errorClass.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  offset += result.len;
  var errorCode = baAsn1.decodeEnumerated(buffer, offset, result.value);
  offset += errorClass.len;
  return {
    len: offset - orgOffset,
    class: errorClass.value,
    code: errorCode.value
  };
};

module.exports.encodeSubscribeCOV = function(buffer, subscriberProcessId, monitoredObjectId, cancellationRequest, issueConfirmedNotifications, lifetime) {
  baAsn1.encodeContextUnsigned(buffer, 0, subscriberProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, monitoredObjectId.type, monitoredObjectId.instance);
  if (!cancellationRequest) {
    baAsn1.encodeContextBoolean(buffer, 2, issueConfirmedNotifications);
    baAsn1.encodeContextUnsigned(buffer, 3, lifetime);
  }
};

module.exports.decodeSubscribeCOV = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var result;
  var decodedValue;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.subscriberProcessId = decodedValue.value;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.monitoredObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.cancellationRequest = true;
  if (len < apduLen) {
    value.issueConfirmedNotifications = false;
    if (baAsn1.decodeIsContextTag(buffer, offset + len, 2)) {
      value.cancellationRequest = false;
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      value.issueConfirmedNotifications = buffer[offset + len] > 0;
      len++;
    }
    value.lifetime = 0;
    if (baAsn1.decodeIsContextTag(buffer, offset + len, 3)) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      value.lifetime = decodedValue.value;
    }
  }
  value.len = len;
  return value;
};

module.exports.encodeSubscribeProperty = function(buffer, subscriberProcessId, monitoredObjectId, cancellationRequest, issueConfirmedNotifications, lifetime, monitoredProperty, covIncrementPresent, covIncrement) {
  baAsn1.encodeContextUnsigned(buffer, 0, subscriberProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, monitoredObjectId.type, monitoredObjectId.instance);
  if (!cancellationRequest) {
    baAsn1.encodeContextBoolean(buffer, 2, issueConfirmedNotifications);
    baAsn1.encodeContextUnsigned(buffer, 3, lifetime);
  }
  baAsn1.encodeOpeningTag(buffer, 4);
  baAsn1.encodeContextEnumerated(buffer, 0, monitoredProperty.id);
  if (monitoredProperty.index !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 1, monitoredProperty.index);
  }
  baAsn1.encodeClosingTag(buffer, 4);
  if (covIncrementPresent) {
    baAsn1.encodeContextReal(buffer, 5, covIncrement);
  }
};

module.exports.decodeSubscribeProperty = function(buffer, offset) {
  var len = 0;
  var value = {};
  var result;
  var decodedValue;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.subscriberProcessId = decodedValue.value;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.monitoredObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.cancellationRequest = true;
  value.issueConfirmedNotifications = false;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 2)) {
    value.cancellationRequest = false;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    value.issueConfirmedNotifications = buffer[offset + len] > 0;
    len++;
  }
  value.lifetime = 0;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 3)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.lifetime = decodedValue.value;
  }
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 4)) return;
  len++;
  value.monitoredProperty = {};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.monitoredProperty.id = decodedValue.value;
  value.monitoredProperty.index = baAsn1.BACNET_ARRAY_ALL;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 1)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.monitoredProperty.index = decodedValue.value;
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 4)) return;
  len++;
  value.covIncrement = 0;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 5)) {
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeReal(buffer, offset + len);
    len += decodedValue.len;
    value.covIncrement = decodedValue.value;
  }
  value.len = len;
  return value;
};

module.exports.encodeEventNotifyData = function(buffer, data) {
  baAsn1.encodeContextUnsigned(buffer, 0, data.processId);
  baAsn1.encodeContextObjectId(buffer, 1, data.initiatingObjectId.type, data.initiatingObjectId.instance);
  baAsn1.encodeContextObjectId(buffer, 2, data.eventObjectId.type, data.eventObjectId.instance);
  baAsn1.bacappEncodeContextTimestamp(buffer, 3, data.timeStamp);
  baAsn1.encodeContextUnsigned(buffer, 4, data.notificationClass);
  baAsn1.encodeContextUnsigned(buffer, 5, data.priority);
  baAsn1.encodeContextEnumerated(buffer, 6, data.eventType);
  if (data.messageText && data.messageText !== '') {
    baAsn1.encodeContextCharacterString(buffer, 7, data.messageText);
  }
  baAsn1.encodeContextEnumerated(buffer, 8, data.notifyType);
  switch (data.notifyType) {
    case baEnum.NotifyTypes.NOTIFY_ALARM:
    case baEnum.NotifyTypes.NOTIFY_EVENT:
      baAsn1.encodeContextBoolean(buffer, 9, data.ackRequired);
      baAsn1.encodeContextEnumerated(buffer, 10, data.fromState);
      break;
    default:
      break;
  }
  baAsn1.encodeContextEnumerated(buffer, 11, data.toState);
  switch (data.notifyType) {
    case baEnum.NotifyTypes.NOTIFY_ALARM:
    case baEnum.NotifyTypes.NOTIFY_EVENT:
      baAsn1.encodeOpeningTag(buffer, 12);
      switch (data.eventType) {
        case baEnum.EventTypes.EVENT_CHANGE_OF_BITSTRING:
          baAsn1.encodeOpeningTag(buffer, 0);
          baAsn1.encodeContextBitstring(buffer, 0, data.changeOfBitstringReferencedBitString);
          baAsn1.encodeContextBitstring(buffer, 1, data.changeOfBitstringStatusFlags);
          baAsn1.encodeClosingTag(buffer, 0);
          break;
        case baEnum.EventTypes.EVENT_CHANGE_OF_STATE:
          baAsn1.encodeOpeningTag(buffer, 1);
          baAsn1.encodeOpeningTag(buffer, 0);
          baAsn1.bacappEncodePropertyState(buffer, data.changeOfStateNewState);
          baAsn1.encodeClosingTag(buffer, 0);
          baAsn1.encodeContextBitstring(buffer, 1, data.changeOfStateStatusFlags);
          baAsn1.encodeClosingTag(buffer, 1);
          break;
        case baEnum.EventTypes.EVENT_CHANGE_OF_VALUE:
          baAsn1.encodeOpeningTag(buffer, 2);
          baAsn1.encodeOpeningTag(buffer, 0);
          switch (data.changeOfValueTag) {
            case baEnum.COVTypes.CHANGE_OF_VALUE_REAL:
              baAsn1.encodeContextReal(buffer, 1, data.changeOfValueChangeValue);
              break;
            case baEnum.COVTypes.CHANGE_OF_VALUE_BITS:
              baAsn1.encodeContextBitstring(buffer, 0, data.changeOfValueChangedBits);
              break;
            default:
              throw new Error('NotImplemented');
          }
          baAsn1.encodeClosingTag(buffer, 0);
          baAsn1.encodeContextBitstring(buffer, 1, data.changeOfValueStatusFlags);
          baAsn1.encodeClosingTag(buffer, 2);
          break;
        case baEnum.EventTypes.EVENT_FLOATING_LIMIT:
          baAsn1.encodeOpeningTag(buffer, 4);
          baAsn1.encodeContextReal(buffer, 0, data.floatingLimitReferenceValue);
          baAsn1.encodeContextBitstring(buffer, 1, data.floatingLimitStatusFlags);
          baAsn1.encodeContextReal(buffer, 2, data.floatingLimitSetPointValue);
          baAsn1.encodeContextReal(buffer, 3, data.floatingLimitErrorLimit);
          baAsn1.encodeClosingTag(buffer, 4);
          break;
        case baEnum.EventTypes.EVENT_OUT_OF_RANGE:
          baAsn1.encodeOpeningTag(buffer, 5);
          baAsn1.encodeContextReal(buffer, 0, data.outOfRangeExceedingValue);
          baAsn1.encodeContextBitstring(buffer, 1, data.outOfRangeStatusFlags);
          baAsn1.encodeContextReal(buffer, 2, data.outOfRangeDeadband);
          baAsn1.encodeContextReal(buffer, 3, data.outOfRangeExceededLimit);
          baAsn1.encodeClosingTag(buffer, 5);
          break;
        case baEnum.EventTypes.EVENT_CHANGE_OF_LIFE_SAFETY:
          baAsn1.encodeOpeningTag(buffer, 8);
          baAsn1.encodeContextEnumerated(buffer, 0, data.changeOfLifeSafetyNewState);
          baAsn1.encodeContextEnumerated(buffer, 1, data.changeOfLifeSafetyNewMode);
          baAsn1.encodeContextBitstring(buffer, 2, data.changeOfLifeSafetyStatusFlags);
          baAsn1.encodeContextEnumerated(buffer, 3, data.changeOfLifeSafetyOperationExpected);
          baAsn1.encodeClosingTag(buffer, 8);
          break;
        case baEnum.EventTypes.EVENT_BUFFER_READY:
          baAsn1.encodeOpeningTag(buffer, 10);
          baAsn1.bacappEncodeContextDeviceObjPropertyRef(buffer, 0, data.bufferReadyBufferProperty);
          baAsn1.encodeContextUnsigned(buffer, 1, data.bufferReadyPreviousNotification);
          baAsn1.encodeContextUnsigned(buffer, 2, data.bufferReadyCurrentNotification);
          baAsn1.encodeClosingTag(buffer, 10);
          break;
        case baEnum.EventTypes.EVENT_UNSIGNED_RANGE:
          baAsn1.encodeOpeningTag(buffer, 11);
          baAsn1.encodeContextUnsigned(buffer, 0, data.unsignedRangeExceedingValue);
          baAsn1.encodeContextBitstring(buffer, 1, data.unsignedRangeStatusFlags);
          baAsn1.encodeContextUnsigned(buffer, 2, data.unsignedRangeExceededLimit);
          baAsn1.encodeClosingTag(buffer, 11);
          break;
        case baEnum.EventTypes.EVENT_EXTENDED:
        case baEnum.EventTypes.EVENT_COMMAND_FAILURE:
          throw new Error('NotImplemented');
        default:
          throw new Error('NotImplemented');
      }
      baAsn1.encodeClosingTag(buffer, 12);
      break;
    case baEnum.NotifyTypes.NOTIFY_ACK_NOTIFICATION:
      throw new Error('NotImplemented');
    default:
      break;
  }
};

module.exports.decodeEventNotifyData = function(buffer, offset) {
  var len = 0;
  var result;
  var decodedValue;
  var eventData = {};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  eventData.processId = decodedValue.value;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  eventData.initiatingObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 2)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  eventData.eventObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 3)) return;
  len += 2;
  decodedValue = baAsn1.decodeApplicationDate(buffer, offset + len);
  len += decodedValue.len;
  var date = decodedValue.value.value;
  decodedValue = baAsn1.decodeApplicationTime(buffer, offset + len);
  len += decodedValue.len;
  var time = decodedValue.value.value;
  eventData.timeStamp = {};
  eventData.timeStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
  len += 2;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 4)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  eventData.notificationClass = decodedValue.value;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 5)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  eventData.priority = decodedValue.value;
  if (eventData.priority > 0xFF) return;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 6)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  eventData.eventType = decodedValue.value;
  if (baAsn1.decodeIsContextTag(buffer, offset + len, 7)) {
    decodedValue = baAsn1.decodeContextCharacterString(buffer, offset + len, 20000, 7);
    len += decodedValue.len;
    eventData.messageText = decodedValue.value;
  }
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 8)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  eventData.notifyType = decodedValue.value;
  switch (eventData.notifyType) {
    case baEnum.NotifyTypes.NOTIFY_ALARM:
    case baEnum.NotifyTypes.NOTIFY_EVENT:
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, 1);
      len += decodedValue.len;
      eventData.ackRequired = (decodedValue.value > 0);
      if (!baAsn1.decodeIsContextTag(buffer, offset + len, 10)) return;
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
      len += decodedValue.len;
      eventData.fromState = decodedValue.value;
      break;
    default:
      break;
  }
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 11)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  eventData.toState = decodedValue.value;
  eventData.len = len;
  return eventData;
};

module.exports.encodeReadRangeAcknowledge = function(buffer, objectId, propertyId, arrayIndex, resultFlags, itemCount, applicationData, requestType, firstSequence) {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex === baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeContextBitstring(buffer, 3, resultFlags);
  baAsn1.encodeContextUnsigned(buffer, 4, itemCount);
  baAsn1.encodeOpeningTag(buffer, 5);
  if (itemCount !== 0) {
    applicationData.copy(buffer.buffer, buffer.offset, 0, applicationData.length);
    buffer.offset += applicationData.length;
  }
  baAsn1.encodeClosingTag(buffer, 5);
  if ((itemCount !== 0) && (requestType !== baEnum.ReadRangeRequestTypes.RR_BY_POSITION) && (requestType !== baEnum.ReadRangeRequestTypes.RR_READ_ALL)) {
    baAsn1.encodeContextUnsigned(buffer, 6, firstSequence);
  }
};

module.exports.decodeReadRangeAcknowledge = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var resultFlag;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  var objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  var property = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  property.id = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if ((result.tagNumber === 2) && (len < apduLen)) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    property.index = decodedValue.value;
  } else {
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, 2);
    len += decodedValue.len;
    resultFlag = decodedValue.value;
  }
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  var itemCount = decodedValue.value;
  if (!(baAsn1.decodeIsOpeningTag(buffer, offset + len))) return;
  len += 1;
  var rangeBuffer = buffer.slice(offset + len, buffer.length - offset - len - 1);
  return {
    len: len,
    itemCount: itemCount,
    rangeBuffer: rangeBuffer
  };
};

module.exports.decodeDeleteObject = function(buffer, offset, apduLen) {
  var result = baAsn1.decodeTagNumberAndValue(buffer, offset);
  if (result.tagNumber !== 12) return;
  var len = 1;
  var value = baAsn1.decodeObjectId(buffer, offset + len);
  len += value.len;
  if (len !== apduLen) return;
  value.len = len;
  return value;
};

module.exports.encodeDeleteObject = function(buffer, objectId) {
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
};

module.exports.encodeCreateObject = function(buffer, objectId, values) {
  baAsn1.encodeOpeningTag(buffer, 0);
  baAsn1.encodeContextObjectId(buffer, 1, objectId.type, objectId.instance);
  baAsn1.encodeClosingTag(buffer, 0);
  baAsn1.encodeOpeningTag(buffer, 1);
  values.forEach(function(propertyValue) {
    baAsn1.encodeContextEnumerated(buffer, 0, propertyValue.property.id);
    if (propertyValue.property.index !== baAsn1.BACNET_ARRAY_ALL) {
      baAsn1.encodeContextUnsigned(buffer, 1, propertyValue.property.index);
    }
    baAsn1.encodeOpeningTag(buffer, 2);
    propertyValue.value.forEach(function(value) {
      baAsn1.bacappEncodeApplicationData(buffer, value);
    });
    baAsn1.encodeClosingTag(buffer, 2);
    if (propertyValue.priority !== baAsn1.BACNET_NO_PRIORITY) {
      baAsn1.encodeContextUnsigned(buffer, 3, propertyValue.priority);
    }
  });
  baAsn1.encodeClosingTag(buffer, 1);
};

module.exports.decodeCreateObject = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var objectId;
  var valueList = [];
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if ((result.tagNumber === 0) && (apduLen > len)) {
    apduLen -= len;
    if (apduLen < 4) return;
    decodedValue = baAsn1.decodeContextObjectId(buffer, offset + len, 1);
    len += decodedValue.len;
    objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  } else {
    return;
  }
  if (baAsn1.decodeIsClosingTag(buffer, offset + len)) {
    len++;
  }
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  while ((apduLen - len) > 1) {
    var newEntry = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    var propertyId = decodedValue.value;
    var arraIndex = baAsn1.BACNET_ARRAY_ALL;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 1) {
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      arraIndex += decodedValue.value;
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
    }
    newEntry.property = {id: propertyId, index: arraIndex};
    if ((result.tagNumber === 2) && (baAsn1.decodeIsOpeningTag(buffer, offset + len - 1))) {
      var values = [];
      while (!baAsn1.decodeIsClosingTag(buffer, offset + len)) {
        decodedValue = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, objectId.type, propertyId);
        if (!decodedValue) return;
        len += decodedValue.len;
        delete decodedValue.len;
        values.push(decodedValue);
      }
      len++;
      newEntry.value = values;
    } else {
      return;
    }
    valueList.push(newEntry);
  }
  if (!baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  return {
    len: len,
    objectId: objectId,
    values: valueList
  };
};

module.exports.encodeCOVNotify = function(buffer, subscriberProcessId, initiatingDeviceId, monitoredObjectId, timeRemaining, values) {
  baAsn1.encodeContextUnsigned(buffer, 0, subscriberProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, baEnum.ObjectTypes.OBJECT_DEVICE, initiatingDeviceId);
  baAsn1.encodeContextObjectId(buffer, 2, monitoredObjectId.type, monitoredObjectId.instance);
  baAsn1.encodeContextUnsigned(buffer, 3, timeRemaining);
  baAsn1.encodeOpeningTag(buffer, 4);
  values.forEach(function(value) {
    baAsn1.encodeContextEnumerated(buffer, 0, value.property.id);
    if (value.property.index === baAsn1.BACNET_ARRAY_ALL) {
      baAsn1.encodeContextUnsigned(buffer, 1, value.property.index);
    }
    baAsn1.encodeOpeningTag(buffer, 2);
    value.value.forEach(function(v) {
      baAsn1.bacappEncodeApplicationData(buffer, v);
    });
    baAsn1.encodeClosingTag(buffer, 2);
    if (value.priority === baAsn1.BACNET_NO_PRIORITY) {
      baAsn1.encodeContextUnsigned(buffer, 3, value.priority);
    }
    // TODO: Handle to too large telegrams -> ADPU limit
  });
  baAsn1.encodeClosingTag(buffer, 4);
};

module.exports.decodeCOVNotify = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  var subscriberProcessId = decodedValue.value;
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 1)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  var initiatingDeviceId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 2)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  var monitoredObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  if (!baAsn1.decodeIsContextTag(buffer, offset + len, 3)) return;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  var timeRemaining = decodedValue.value;
  if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 4)) return;
  len++;
  var values = [];
  while ((apduLen - len) > 1 && !baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 4)) {
    var newEntry = {};
    newEntry.property = {};
    if (!baAsn1.decodeIsContextTag(buffer, offset + len, 0)) return;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    newEntry.property.id = decodedValue.value;
    if (baAsn1.decodeIsContextTag(buffer, offset + len, 1)) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      newEntry.property.index = decodedValue.value;
    } else {
      newEntry.property.index = baAsn1.BACNET_ARRAY_ALL;
    }
    if (!baAsn1.decodeIsOpeningTagNumber(buffer, offset + len, 2)) return;
    len++;
    var properties = [];
    while ((apduLen - len) > 1 && !baAsn1.decodeIsClosingTagNumber(buffer, offset + len, 2)) {
      decodedValue = baAsn1.bacappDecodeApplicationData(buffer, offset + len, apduLen + offset, monitoredObjectId.type, newEntry.property.id);
      if (!decodedValue) return;
      len += decodedValue.len;
      delete decodedValue.len;
      properties.push(decodedValue);
    }
    newEntry.value = properties;
    len++;
    if (baAsn1.decodeIsContextTag(buffer, offset + len, 3)) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      newEntry.priority = decodedValue.value;
    } else {
      newEntry.priority = baAsn1.BACNET_NO_PRIORITY;
    }
    values.push(newEntry);
  }
  return {
    len: len,
    subscriberProcessId: subscriberProcessId,
    initiatingDeviceId: initiatingDeviceId,
    monitoredObjectId: monitoredObjectId,
    timeRemaining: timeRemaining,
    values: values
  };
};

module.exports.encodeAlarmSummary = function(buffer, alarms) {
  alarms.forEach(function(alarm) {
    baAsn1.encodeContextObjectId(buffer, 12, alarm.objectId.type, alarm.objectId.instance);
    baAsn1.encodeContextEnumerated(buffer, 9, alarm.alarmState);
    baAsn1.encodeContextBitstring(buffer, 8, alarm.acknowledgedTransitions);
  });
};

module.exports.decodeAlarmSummary = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var alarms = [];
  while ((apduLen - 3 - len) > 0) {
    var value = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.alarmState = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgedTransitions = decodedValue.value;
    alarms.push(value);
  }
  return {
    len: len,
    alarms: alarms
  };
};

module.exports.encodeAlarmAcknowledge = function(buffer, ackProcessId, eventObjectId, eventStateAcknowledged, ackSource, eventTimeStamp, ackTimeStamp) {
  baAsn1.encodeContextUnsigned(buffer, 0, ackProcessId);
  baAsn1.encodeContextObjectId(buffer, 1, eventObjectId.type, eventObjectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 2, eventStateAcknowledged);
  baAsn1.bacappEncodeContextTimestamp(buffer, 3, eventTimeStamp);
  baAsn1.encodeContextCharacterString(buffer, 4, ackSource);
  baAsn1.bacappEncodeContextTimestamp(buffer, 5, ackTimeStamp);
};

module.exports.decodeAlarmAcknowledge = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var result;
  var decodedValue;
  var date;
  var time;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.acknowledgedProcessId = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.eventObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.eventStateAcknowledged = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === baEnum.TimestampTags.TIME_STAMP_TIME) {
    decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimestampTags.TIME_STAMP_SEQUENCE) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimestampTags.TIME_STAMP_DATETIME) {
    date = baAsn1.decodeApplicationDate(buffer, offset + len);
    len += date.len;
    date = date.value.value;
    time = baAsn1.decodeApplicationTime(buffer, offset + len);
    len += time.len;
    time = time.value.value;
    value.eventTimeStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    len++;
  }
  len++;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
  value.acknowledgeSource = decodedValue.value;
  len += decodedValue.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === baEnum.TimestampTags.TIME_STAMP_TIME) {
    decodedValue = baAsn1.decodeBacnetTime(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgeTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimestampTags.TIME_STAMP_SEQUENCE) {
    decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgeTimeStamp = decodedValue.value;
  } else if (result.tagNumber === baEnum.TimestampTags.TIME_STAMP_DATETIME) {
    date = baAsn1.decodeApplicationDate(buffer, offset + len);
    len += date.len;
    date = date.value.value;
    time = baAsn1.decodeApplicationTime(buffer, offset + len);
    len += time.len;
    time = time.value.value;
    value.acknowledgeTimeStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    len++;
  }
  len++;
  value.len = len;
  return value;
};

module.exports.encodeEventInformation = function(buffer, events, moreEvents) {
  var i;
  baAsn1.encodeOpeningTag(buffer, 0);
  events.forEach(function(event) {
    baAsn1.encodeContextObjectId(buffer, 0, event.objectId.type, event.objectId.instance);
    baAsn1.encodeContextEnumerated(buffer, 1, event.eventState);
    baAsn1.encodeContextBitstring(buffer, 2, event.acknowledgedTransitions);
    baAsn1.encodeOpeningTag(buffer, 3);
    for (i = 0; i < 3; i++) {
      baAsn1.encodeApplicationDate(buffer, event.eventTimeStamps[i]);
      baAsn1.encodeApplicationTime(buffer, event.eventTimeStamps[i]);
    }
    baAsn1.encodeClosingTag(buffer, 3);
    baAsn1.encodeContextEnumerated(buffer, 4, event.notifyType);
    baAsn1.encodeContextBitstring(buffer, 5, event.eventEnable);
    baAsn1.encodeOpeningTag(buffer, 6);
    for (i = 0; i < 3; i++) {
      baAsn1.encodeApplicationUnsigned(buffer, event.eventPriorities[i]);
    }
    baAsn1.encodeClosingTag(buffer, 6);
  });
  baAsn1.encodeClosingTag(buffer, 0);
  baAsn1.encodeContextBoolean(buffer, 1, moreEvents);
};

module.exports.decodeEventInformation = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  len++;
  var alarms = [];
  var moreEvents;
  var i;
  while ((apduLen - 3 - len) > 0) {
    var value = {};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
    len += decodedValue.len;
    value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventState = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.acknowledgedTransitions = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    value.eventTimeStamps = [];
    for (i = 0; i < 3; i++) {
      if (result.tagNumber !== baEnum.ApplicationTags.BACNET_APPLICATION_TAG_NULL) {
        decodedValue = baAsn1.decodeApplicationDate(buffer, offset + len);
        len += decodedValue.len;
        var date = decodedValue.value.value;
        decodedValue = baAsn1.decodeApplicationTime(buffer, offset + len);
        len += decodedValue.len;
        var time = decodedValue.value.value;
        value.eventTimeStamps[i] =  new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
      } else {
        len += result.value;
      }
    }
    len++;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.notifyType = decodedValue.value;
    result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decodeBitstring(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.eventEnable = decodedValue.value;
    len++;
    value.eventPriorities = [];
    for (i = 0; i < 3; i++) {
      result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
      len += decodedValue.len;
      value.eventPriorities[i] = decodedValue.value;
    }
    len++;
    alarms.push(value);
  }
  moreEvents = (buffer[apduLen - 1] === 1);
  return {
    len: len,
    alarms: alarms,
    moreEvents: moreEvents
  };
};

module.exports.encodePrivateTransfer = function(buffer, vendorId, serviceNumber, data) {
  baAsn1.encodeContextUnsigned(buffer, 0, vendorId);
  baAsn1.encodeContextUnsigned(buffer, 1, serviceNumber);
  baAsn1.encodeOpeningTag(buffer, 2);
  for (var i = 0; i < data.length; i++) {
    buffer.buffer[buffer.offset++] = data[i];
  }
  baAsn1.encodeClosingTag(buffer, 2);
};

module.exports.decodePrivateTransfer = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var value = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.vendorId = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.serviceNumber = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  var size = apduLen - (offset + len + 1);
  var data = [];
  for (var i = 0; i < size; i++) {
    data.push(buffer[offset + len++]);
  }
  value.data = data;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  value.len = len;
  return value;
};

module.exports.encodeGetEventInformation = function(buffer, lastReceivedObjectId) {
  baAsn1.encodeContextObjectId(buffer, 0, lastReceivedObjectId.type, lastReceivedObjectId.instance);
};

module.exports.decodeGetEventInformation = function(buffer, offset) {
  var len = 0;
  var result;
  var decodedValue;
  var value = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.lastReceivedObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.len = len;
  return value;
};

module.exports.encodeIhaveBroadcast = function(buffer, deviceId, objectId, objectName) {
  baAsn1.encodeApplicationObjectId(buffer, deviceId.type, deviceId.instance);
  baAsn1.encodeApplicationObjectId(buffer, objectId.type, objectId.instance);
  baAsn1.encodeApplicationCharacterString(buffer, objectName);
};

module.exports.decodeIhaveBroadcast = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var value = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.deviceId = {type: decodedValue.objectType, instance: decodedValue.instance};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.objectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
  len += decodedValue.len;
  value.objectName = decodedValue.value;
  value.len = len;
  return value;
};

module.exports.encodeLifeSafetyOperation = function(buffer, processId, requestingSource, operation, targetObjectId) {
  baAsn1.encodeContextUnsigned(buffer, 0, processId);
  baAsn1.encodeContextCharacterString(buffer, 1, requestingSource);
  baAsn1.encodeContextEnumerated(buffer, 2, operation);
  baAsn1.encodeContextObjectId(buffer, 3, targetObjectId.type, targetObjectId.instance);
};

module.exports.decodeLifeSafetyOperation = function(buffer, offset, apduLen) {
  var len = 0;
  var result;
  var decodedValue;
  var value = {};
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.processId = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeCharacterString(buffer, offset + len, apduLen - (offset + len), result.value);
  len += decodedValue.len;
  value.requestingSource = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.operation = decodedValue.value;
  result = baAsn1.decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.targetObjectId = {type: decodedValue.objectType, instance: decodedValue.instance};
  value.len = len;
  return value;
};

// TODO: Implement decoding for following functions
module.exports.encodeAddListElement = function(buffer, objectId, propertyId, arrayIndex, values) {
  baAsn1.encodeContextObjectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encodeOpeningTag(buffer, 3);
  values.forEach(function(value) {
    baAsn1.bacappEncodeApplicationData(buffer, value);
  });
  baAsn1.encodeClosingTag(buffer, 3);
};

module.exports.encodeGetEventInformationAcknowledge = function(buffer, events, moreEvents) {
  var i;
  baAsn1.encodeOpeningTag(buffer, 0);
  events.forEach(function(eventData) {
    baAsn1.encodeContextObjectId(buffer, 0, eventData.objectId.type, eventData.objectId.instance);
    baAsn1.encodeContextEnumerated(buffer, 1, eventData.eventState);
    baAsn1.encodeContextBitstring(buffer, 2, eventData.acknowledgedTransitions);
    baAsn1.encodeOpeningTag(buffer, 3);
    for (i = 0; i < 3; i++) {
      baAsn1.bacappEncodeTimestamp(buffer, eventData.eventTimeStamps[i]);
    }
    baAsn1.encodeClosingTag(buffer, 3);
    baAsn1.encodeContextEnumerated(buffer, 4, eventData.notifyType);
    baAsn1.encodeContextBitstring(buffer, 5, eventData.eventEnable);
    baAsn1.encodeOpeningTag(buffer, 6);
    for (i = 0; i < 3; i++) {
      baAsn1.encodeApplicationUnsigned(buffer, eventData.eventPriorities[i]);
    }
    baAsn1.encodeClosingTag(buffer, 6);
  });
  baAsn1.encodeClosingTag(buffer, 0);
  baAsn1.encodeContextBoolean(buffer, 1, moreEvents);
};
