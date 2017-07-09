var iconv = require('iconv-lite');
var baEnum = require('./bacnet-enum');

var BACNET_MAX_OBJECT = module.exports.BACNET_MAX_OBJECT = 0x3FF;
var BACNET_INSTANCE_BITS = module.exports.BACNET_INSTANCE_BITS = 22;
var BACNET_MAX_INSTANCE = module.exports.BACNET_MAX_INSTANCE = 0x3FFFFF;
var MAX_BITSTRING_BYTES = module.exports.MAX_BITSTRING_BYTES = 15;
var BACNET_ARRAY_ALL = module.exports.BACNET_ARRAY_ALL = 0xFFFFFFFF;
var BACNET_NO_PRIORITY = module.exports.BACNET_NO_PRIORITY = 0;
var BACNET_MIN_PRIORITY = module.exports.BACNET_MIN_PRIORITY = 1;
var BACNET_MAX_PRIORITY = module.exports.BACNET_MAX_PRIORITY = 16;

var encodeUnsigned = function(buffer, value, length) {
  buffer.buffer.writeUIntBE(value, buffer.offset, length, true);
  buffer.offset += length;
};

var encodeBacnetUnsigned = function(buffer, value) {
  if (value < 0x100) {
    encodeUnsigned(buffer, value, 1);
  } else if (value < 0x10000) {
    encodeUnsigned(buffer, value, 2);
  } else if (value < 0x1000000) {
    encodeUnsigned(buffer, value, 3);
  } else {
    encodeUnsigned(buffer, value, 4);
  }
};

var encodeSigned = function(buffer, value, length) {
  buffer.buffer.writeIntBE(value, buffer.offset, length, true);
  buffer.offset += length;
};

var encodeBacnetSigned = function(buffer, value) {
  if ((value >= -128) && (value < 128)) {
    encodeSigned(buffer, value, 1);
  } else if ((value >= -32768) && (value < 32768)) {
    encodeSigned(buffer, value, 2);
  } else if ((value > -8388608) && (value < 8388608)) {
    encodeSigned(buffer, value, 3);
  } else {
    encodeSigned(buffer, value, 4);
  }
};

var encodeBacnetReal = function(buffer, value) {
  buffer.buffer.writeFloatBE(value, buffer.offset, true);
  buffer.offset += 4;
};

var encodeBacnetDouble = function(buffer, value) {
  buffer.buffer.writeDoubleBE(value, buffer.offset, true);
  buffer.offset += 8;
};

var decodeUnsigned = module.exports.decodeUnsigned = function(buffer, offset, length) {
  return {
    len: length,
    value: buffer.readUIntBE(offset, length, true)
  };
};

var decodeEnumerated = module.exports.decodeEnumerated = function(buffer, offset, lenValue) {
  return decodeUnsigned(buffer, offset, lenValue);
};

var encodeBacnetObjectId = module.exports.encodeBacnetObjectId = function(buffer, objectType, instance) {
  var value = ((objectType & BACNET_MAX_OBJECT) << BACNET_INSTANCE_BITS) | (instance & BACNET_MAX_INSTANCE);
  encodeUnsigned(buffer, value, 4);
};

var encodeTag = module.exports.encodeTag = function(buffer, tagNumber, contextSpecific, lenValueType) {
  var len = 1;
  var tmp = new Array(3);
  tmp[0] = 0;
  if (contextSpecific) {
    tmp[0] |= 0x8;
  }
  if (tagNumber <= 14) {
    tmp[0] |= (tagNumber << 4);
  } else {
    tmp[0] |= 0xF0;
    tmp[1] = tagNumber;
    len++;
  }
  if (lenValueType <= 4) {
    tmp[0] |= lenValueType;
    Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
    buffer.offset += len;
  } else {
    tmp[0] |= 5;
    if (lenValueType <= 253) {
      tmp[len++] = lenValueType;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
    } else if (lenValueType <= 65535) {
      tmp[len++] = 254;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
      encodeUnsigned(buffer, lenValueType, 2);
    } else {
      tmp[len++] = 255;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
      encodeUnsigned(buffer, lenValueType, 4);
    }
  }
};

var encodeBacnetEnumerated = function(buffer, value) {
  encodeBacnetUnsigned(buffer, value);
};

var isExtendedTagNumber = function(x) {
  return (x & 0xF0) === 0xF0;
};

var isExtendedVALUE = function(x) {
  return (x & 0x07) === 5;
};

var isContextSpecific = function(x) {
  return (x & 0x8) === 0x8;
};

var isOpeningTag = function(x) {
  return (x & 0x07) === 6;
};

var isClosingTag = function(x) {
  return (x & 0x07) === 7;
};

var encodeContextReal = module.exports.encodeContextReal = function(buffer, tagNumber, value) {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetReal(buffer, value);
};

var encodeContextUnsigned = module.exports.encodeContextUnsigned = function(buffer, tagNumber, value) {
  var len;
  if (value < 0x100) {
    len = 1;
  } else if (value < 0x10000) {
    len = 2;
  } else if (value < 0x1000000) {
    len = 3;
  } else {
    len = 4;
  }
  encodeTag(buffer, tagNumber, true, len);
  encodeBacnetUnsigned(buffer, value);
};

var encodeContextEnumerated = module.exports.encodeContextEnumerated = function(buffer, tagNumber, value) {
  var len;
  if (value < 0x100) {
    len = 1;
  } else if (value < 0x10000) {
    len = 2;
  } else if (value < 0x1000000) {
    len = 3;
  } else {
    len = 4;
  }
  encodeTag(buffer, tagNumber, true, len);
  encodeBacnetEnumerated(buffer, value);
};

var encodeOctetString = function(buffer, octetString, octetOffset, octetCount) {
  if (octetString) {
    for (var i = octetOffset; i < (octetOffset + octetCount); i++) {
      buffer.buffer[buffer.offset++] = octetString[i];
    }
  }
};

var encodeApplicationOctetString = module.exports.encodeApplicationOctetString = function(buffer, octetString, octetOffset, octetCount) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING, false, octetCount);
  encodeOctetString(buffer, octetString, octetOffset, octetCount);
};

var encodeApplicationBoolean = module.exports.encodeApplicationBoolean = function(buffer, booleanValue) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, false, booleanValue ? 1 : 0);
};

var encodeApplicationReal = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL, false, 4);
  encodeBacnetReal(buffer, value);
};

var encodeApplicationDouble = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE, false, 8);
  encodeBacnetDouble(buffer, value);
};

var bitstringBytesUsed = function(bitString) {
  var len = 0;
  if (bitString.bitsUsed > 0) {
    var lastBit = bitString.bitsUsed - 1;
    var usedBytes = (lastBit / 8) + 1;
    len = Math.floor(usedBytes);
  }
  return len;
};

var encodeApplicationObjectId = module.exports.encodeApplicationObjectId = function(buffer, objectType, instance) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetObjectId(tmp, objectType, instance);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encodeApplicationUnsigned = module.exports.encodeApplicationUnsigned = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetUnsigned(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encodeApplicationEnumerated = module.exports.encodeApplicationEnumerated = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetEnumerated(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encodeApplicationSigned = module.exports.encodeApplicationSigned = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetSigned(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var byteReverseBits = function(inByte) {
  var outByte = 0;
  if ((inByte & 1) > 0) {
    outByte |= 0x80;
  }
  if ((inByte & 2) > 0) {
    outByte |= 0x40;
  }
  if ((inByte & 4) > 0) {
    outByte |= 0x20;
  }
  if ((inByte & 8) > 0) {
    outByte |= 0x10;
  }
  if ((inByte & 16) > 0) {
    outByte |= 0x8;
  }
  if ((inByte & 32) > 0) {
    outByte |= 0x4;
  }
  if ((inByte & 64) > 0) {
    outByte |= 0x2;
  }
  if ((inByte & 128) > 0) {
    outByte |= 1;
  }
  return outByte;
};

var bitstringOctet = function(bitString, octetIndex) {
  var octet = 0;
  if (bitString.value) {
    if (octetIndex < MAX_BITSTRING_BYTES) {
      octet = bitString.value[octetIndex];
    }
  }
  return octet;
};

var encodeBitstring = function(buffer, bitString) {
  if (bitString.bitsUsed === 0) {
    buffer.buffer[buffer.offset++] = 0;
  } else {
    var usedBytes = bitstringBytesUsed(bitString);
    var remainingUsedBits = bitString.bitsUsed - ((usedBytes - 1) * 8);
    buffer.buffer[buffer.offset++] = 8 - remainingUsedBits;
    for (var i = 0; i < usedBytes; i++) {
      buffer.buffer[buffer.offset++] = byteReverseBits(bitstringOctet(bitString, i));
    }
  }
};

var encodeApplicationBitstring = function(buffer, bitString) {
  var bitStringEncodedLength = 1;
  bitStringEncodedLength += bitstringBytesUsed(bitString);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING, false, bitStringEncodedLength);
  encodeBitstring(buffer, bitString);
};

var encodeBacnetDate = function(buffer, value) {
  if (value === new Date(1, 1, 1)) {
    buffer.buffer[buffer.offset++] = 0xFF;
    buffer.buffer[buffer.offset++] = 0xFF;
    buffer.buffer[buffer.offset++] = 0xFF;
    buffer.buffer[buffer.offset++] = 0xFF;
    return;
  }
  if (value.getFullYear() >= 1900) {
    buffer.buffer[buffer.offset++] = (value.getFullYear() - 1900);
  } else if (value.getFullYear() < 0x100) {
    buffer.buffer[buffer.offset++] = value.getFullYear();
  } else {
    return;
  }
  buffer.buffer[buffer.offset++] = value.getMonth();
  buffer.buffer[buffer.offset++] = value.getDate();
  buffer.buffer[buffer.offset++] = (value.getDay() === 0) ? 7 : value.getDay();
};

var encodeApplicationDate = module.exports.encodeApplicationDate = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE, false, 4);
  encodeBacnetDate(buffer, value);
};

var encodeBacnetTime = function(buffer, value) {
  buffer.buffer[buffer.offset++] = value.getHours();
  buffer.buffer[buffer.offset++] = value.getMinutes();
  buffer.buffer[buffer.offset++] = value.getSeconds();
  buffer.buffer[buffer.offset++] = value.getMilliseconds() / 10;
};

var encodeApplicationTime = module.exports.encodeApplicationTime = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME, false, 4);
  encodeBacnetTime(buffer, value);
};

var bacappEncodeDatetime = function(buffer, value) {
  if (value !== new Date(1, 1, 1)) {
    encodeApplicationDate(buffer, value);
    encodeApplicationTime(buffer, value);
  }
};

var encodeContextObjectId = module.exports.encodeContextObjectId = function(buffer, tagNumber, objectType, instance) {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetObjectId(buffer, objectType, instance);
};

var encodeOpeningTag = module.exports.encodeOpeningTag = function(buffer, tagNumber) {
  var len = 1;
  var tmp = new Array(2);
  tmp[0] = 0x8;
  if (tagNumber <= 14) {
    tmp[0] |= (tagNumber << 4);
  } else {
    tmp[0] |= 0xF0;
    tmp[1] = tagNumber;
    len++;
  }
  tmp[0] |= 6;
  Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
  buffer.offset += len;
};

var encodeClosingTag = module.exports.encodeClosingTag = function(buffer, tagNumber) {
  var len = 1;
  var tmp = new Array(2);
  tmp[0] = 0x8;
  if (tagNumber <= 14) {
    tmp[0] |= (tagNumber << 4);
  } else {
    tmp[0] |= 0xF0;
    tmp[1] = tagNumber;
    len++;
  }
  tmp[0] |= 7;
  Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
  buffer.offset += len;
};

var encodeReadAccessSpecification = module.exports.encodeReadAccessSpecification = function(buffer, value) {
  encodeContextObjectId(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encodeOpeningTag(buffer, 1);
  value.propertyReferences.forEach(function(p) {
    encodeContextEnumerated(buffer, 0, p.propertyIdentifier);
    if (p.propertyArrayIndex && p.propertyArrayIndex !== BACNET_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 1, p.propertyArrayIndex);
    }
  });
  encodeClosingTag(buffer, 1);
};

var encodeContextBoolean = module.exports.encodeContextBoolean = function(buffer, tagNumber, booleanValue) {
  encodeTag(buffer, tagNumber, true, 1);
  buffer.buffer.writeUInt8(booleanValue ? 1 : 0, buffer.offset, true);
  buffer.offset += 1;
};

var encodeCovSubscription = function(buffer, value) {
  encodeOpeningTag(buffer, 0);
  encodeOpeningTag(buffer, 0);
  encodeOpeningTag(buffer, 1);
  encodeApplicationUnsigned(buffer, value.Recipient.net);
  if (value.Recipient.net === 0xFFFF) {
    encodeApplicationOctetString(buffer, 0, 0, 0);
  } else {
    encodeApplicationOctetString(buffer, value.Recipient.adr, 0, value.Recipient.adr.length);
  }
  encodeClosingTag(buffer, 1);
  encodeClosingTag(buffer, 0);
  encodeContextUnsigned(buffer, 1, value.subscriptionProcessIdentifier);
  encodeClosingTag(buffer, 0);
  encodeOpeningTag(buffer, 1);
  encodeContextObjectId(buffer, 0, value.monitoredObjectIdentifier.type, value.monitoredObjectIdentifier.instance);
  encodeContextEnumerated(buffer, 1, value.monitoredProperty.propertyIdentifier);
  if (value.monitoredProperty.propertyArrayIndex !== BACNET_ARRAY_ALL) {
    encodeContextUnsigned(buffer, 2, value.monitoredProperty.propertyArrayIndex);
  }
  encodeClosingTag(buffer, 1);
  encodeContextBoolean(buffer, 2, value.IssueConfirmedNotifications);
  encodeContextUnsigned(buffer, 3, value.TimeRemaining);
  if (value.COVIncrement > 0) {
    encodeContextReal(buffer, 4, value.COVIncrement);
  }
};

var bacappEncodeApplicationData = module.exports.bacappEncodeApplicationData = function(buffer, value) {
  if (value.value === null) {
    buffer.Add(baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_NULL);
    return;
  }
  switch (value.tag) {
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_NULL:
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN:
      encodeApplicationBoolean(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT:
      encodeApplicationUnsigned(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT:
      encodeApplicationSigned(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL:
      encodeApplicationReal(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE:
      encodeApplicationDouble(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING:
      encodeApplicationOctetString(buffer, value.value, 0, value.value.length);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING:
      encodeApplicationCharacterString(buffer, value.value, value.encoding);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING:
      encodeApplicationBitstring(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED:
      encodeApplicationEnumerated(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE:
      encodeApplicationDate(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME:
      encodeApplicationTime(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP:
      bacappEncodeTimestamp(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATETIME:
      bacappEncodeDatetime(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID:
      encodeApplicationObjectId(buffer, (value.value).type, (value.value).instance);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_COV_SUBSCRIPTION:
      encodeCovSubscription(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_RESULT:
      encodeReadAccessResult(buffer, value.value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_SPECIFICATION:
      encodeReadAccessSpecification(buffer, value.value);
      break;
    default:
      throw 'Unknown type';
  }
};

var bacappEncodeDeviceObjPropertyRef = function(buffer, value) {
  encodeContextObjectId(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encodeContextEnumerated(buffer, 1, value.propertyIdentifier);
  if (value.arrayIndex !== BACNET_ARRAY_ALL) {
    encodeContextUnsigned(buffer, 2, value.arrayIndex);
  }
  if (value.deviceIndentifier.type === baEnum.BacnetObjectTypes.OBJECT_DEVICE) {
    encodeContextObjectId(buffer, 3, value.deviceIndentifier.type, value.deviceIndentifier.instance);
  }
};

var bacappEncodeContextDeviceObjPropertyRef = module.exports.bacappEncodeContextDeviceObjPropertyRef = function(buffer, tagNumber, value) {
  encodeOpeningTag(buffer, tagNumber);
  bacappEncodeDeviceObjPropertyRef(buffer, value);
  encodeClosingTag(buffer, tagNumber);
};

var bacappEncodePropertyState = module.exports.bacappEncodePropertyState = function(buffer, value) {
  switch (value.tag) {
    case baEnum.BacnetPropertyStateTypes.BOOLEAN_VALUE:
      encodeContextBoolean(buffer, 0, value.state === 1 ? true : false);
      break;
    case baEnum.BacnetPropertyStateTypes.BINARY_VALUE:
      encodeContextEnumerated(buffer, 1, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.EVENT_TYPE:
      encodeContextEnumerated(buffer, 2, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.POLARITY:
      encodeContextEnumerated(buffer, 3, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.PROGRAM_CHANGE:
      encodeContextEnumerated(buffer, 4, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.PROGRAM_STATE:
      encodeContextEnumerated(buffer, 5, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.REASON_FOR_HALT:
      encodeContextEnumerated(buffer, 6, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.RELIABILITY:
      encodeContextEnumerated(buffer, 7, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.STATE:
      encodeContextEnumerated(buffer, 8, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.SYSTEM_STATUS:
      encodeContextEnumerated(buffer, 9, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.UNITS:
      encodeContextEnumerated(buffer, 10, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.UNSIGNED_VALUE:
      encodeContextUnsigned(buffer, 11, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.LIFE_SAFETY_MODE:
      encodeContextEnumerated(buffer, 12, value.state);
      break;
    case baEnum.BacnetPropertyStateTypes.LIFE_SAFETY_STATE:
      encodeContextEnumerated(buffer, 13, value.state);
      break;
    default:
      break;
  }
};

var encodeContextBitstring = module.exports.encodeContextBitstring = function(buffer, tagNumber, bitString) {
  var bitStringEncodedLength = 1;
  bitStringEncodedLength += bitstringBytesUsed(bitString);
  encodeTag(buffer, tagNumber, true, bitStringEncodedLength);
  encodeBitstring(buffer, bitString);
};

var encodeContextSigned = module.exports.encodeContextSigned = function(buffer, tagNumber, value) {
  var len = 0;
  if ((value >= -128) && (value < 128)) {
    len = 1;
  } else if ((value >= -32768) && (value < 32768)) {
    len = 2;
  } else if ((value > -8388608) && (value < 8388608)) {
    len = 3;
  } else {
    len = 4;
  }
  encodeTag(buffer, tagNumber, true, len);
  encodeBacnetSigned(buffer, value);
};

var encodeContextTime = function(buffer, tagNumber, value) {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetTime(buffer, value);
};

var bacappEncodeContextDatetime = function(buffer, tagNumber, value) {
  if (value !== new Date(1, 1, 1)) {
    encodeOpeningTag(buffer, tagNumber);
    bacappEncodeDatetime(buffer, value);
    encodeClosingTag(buffer, tagNumber);
  }
};

var decodeTagNumber = module.exports.decodeTagNumber = function(buffer, offset) {
  var len = 1;
  var tagNumber;
  if (isExtendedTagNumber(buffer[offset])) {
    tagNumber = buffer[offset + 1];
    len++;
  } else {
    tagNumber = buffer[offset] >> 4;
  }
  return {
    len: len,
    tagNumber: tagNumber
  };
};

var decodeIsContextTag = module.exports.decodeIsContextTag = function(buffer, offset, tagNumber) {
  var result = decodeTagNumber(buffer, offset);
  return isContextSpecific(buffer[offset]) && result.tagNumber === tagNumber;
};

var decodeIsOpeningTagNumber = module.exports.decodeIsOpeningTagNumber = function(buffer, offset, tagNumber) {
  var result = decodeTagNumber(buffer, offset);
  return isOpeningTag(buffer[offset]) && result.tagNumber === tagNumber;
};

var decodeIsClosingTagNumber = module.exports.decodeIsClosingTagNumber = function(buffer, offset, tagNumber) {
  var result = decodeTagNumber(buffer, offset);
  return isClosingTag(buffer[offset]) && result.tagNumber === tagNumber;
};

var decodeIsClosingTag = module.exports.decodeIsClosingTag = function(buffer, offset) {
  return (buffer[offset] & 0x07) === 7;
};

var decodeIsOpeningTag = module.exports.decodeIsOpeningTag = function(buffer, offset) {
  return (buffer[offset] & 0x07) === 6;
};

var decodeObjectId = module.exports.decodeObjectId = function(buffer, offset) {
  var result = decodeUnsigned(buffer, offset, 4);
  var objectType = (result.value >> BACNET_INSTANCE_BITS) & BACNET_MAX_OBJECT;
  var instance = result.value & BACNET_MAX_INSTANCE;
  return {
    len: result.len,
    objectType: objectType,
    instance: instance
  };
};

var decodeObjectIdSafe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: 0,
      objectType: 0,
      instance: 0
    };
  } else {
    return decodeObjectId(buffer, offset);
  }
};

var decodeTagNumberAndValue = module.exports.decodeTagNumberAndValue = function(buffer, offset) {
  var value;
  var result = decodeTagNumber(buffer, offset);
  var len = result.len;
  if (isExtendedVALUE(buffer[offset])) {
    if (buffer[offset + len] === 255) {
      len++;
      result = decodeUnsigned(buffer, offset + len, 4);
      len += result.len;
      value = result.value;
    } else if (buffer[offset + len] === 254) {
      len++;
      result = decodeUnsigned(buffer, offset + len, 2);
      len += result.len;
      value = result.value;
    } else {
      value = buffer[offset + len];
      len++;
    }
  } else if (isOpeningTag(buffer[offset])) {
    value = 0;
  } else if (isClosingTag(buffer[offset])) {
    value = 0;
  } else {
    value = buffer[offset] & 0x07;
  }
  return {
    len: len,
    tagNumber: result.tagNumber,
    value: value
  };
};

var bacappDecodeApplicationData = module.exports.bacappDecodeApplicationData = function(buffer, offset, maxOffset, objectType, propertyId) {
  if (!isContextSpecific(buffer[offset])) {
    var result = decodeTagNumberAndValue(buffer, offset);
    if (result) {
      var len = result.len;
      result = bacappDecodeData(buffer, offset + len, maxOffset, result.tagNumber, result.value);
      if (!result) return;
      var resObj = {
        len: len + result.len,
        type: result.type,
        value: result.value
      };
      if (result.encoding !== undefined) {
        resObj.encoding = result.encoding;
      }
      return resObj;
    }
  } else {
    return bacappDecodeContextApplicationData(buffer, offset, maxOffset, objectType, propertyId);
  }
};

var encodeReadAccessResult = module.exports.encodeReadAccessResult = function(buffer, value) {
  encodeContextObjectId(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encodeOpeningTag(buffer, 1);
  value.values.forEach(function(item) {
    encodeContextEnumerated(buffer, 2, item.property.propertyIdentifier);
    if (item.property.propertyArrayIndex !== BACNET_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 3, item.property.propertyArrayIndex);
    }
    if (item.value && item.value[0].value.type === 'BacnetError') {
      encodeOpeningTag(buffer, 5);
      encodeApplicationEnumerated(buffer, item.value[0].value.errorClass);
      encodeApplicationEnumerated(buffer, item.value[0].value.errorCode);
      encodeClosingTag(buffer, 5);
    } else {
      encodeOpeningTag(buffer, 4);
      item.value.forEach(function(subItem) {
        bacappEncodeApplicationData(buffer, subItem);
      });
      encodeClosingTag(buffer, 4);
    }
  });
  encodeClosingTag(buffer, 1);
};

var decodeReadAccessResult = module.exports.decodeReadAccessResult = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  if (!decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  var result = decodeObjectId(buffer, offset + len);
  value.objectIdentifier = {
    type: result.objectType,
    instance: result.instance
  };
  len += result.len;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return -1;
  len++;

  var valueList = [];
  while ((apduLen - len) > 0) {
    var newEntry = {};
    if (decodeIsClosingTagNumber(buffer, offset + len, 1)) {
      len++;
      break;
    }
    result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 2) return;
    result = decodeEnumerated(buffer, offset + len, result.value);
    newEntry.propertyIdentifier = result.value;
    len += result.len;

    result = decodeTagNumberAndValue(buffer, offset + len);
    if (result.tagNumber === 3) {
      len += result.len;
      result = decodeUnsigned(buffer, offset + len, result.value);
      newEntry.propertyArrayIndex = result.value;
      len += result.len;
    } else {
      newEntry.propertyArrayIndex = BACNET_ARRAY_ALL;
    }
    result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 4) {
      var localValues = [];
      while ((len + offset) <= buffer.length && !decodeIsClosingTagNumber(buffer, offset + len, 4)) {
        var localResult = bacappDecodeApplicationData(buffer, offset + len, apduLen + offset - 1, value.objectIdentifier.type, newEntry.propertyIdentifier);
        if (!localResult) return;
        len += localResult.len;
        var resObj = {
          value: localResult.value,
          type: localResult.type
        };
        if (localResult.encoding !== undefined) {
          resObj.encoding = localResult.encoding;
        }
        localValues.push(resObj);
      }
      if (!decodeIsClosingTagNumber(buffer, offset + len, 4)) return;
      if ((localValues.count === 2) && (localValues[0].tag === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE) && (localValues[1].tag === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME)) {
        var date = localValues[0].value;
        var time = localValues[1].value;
        var bdatetime = new Date(date.year, date.month, date.day, time.hour, time.minute, time.second, time.millisecond);
        newEntry.value = [
          {type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATETIME, value: bdatetime}
        ];
      } else {
        newEntry.value = localValues;
      }
      len++;
    } else if (result.tagNumber === 5) {
      var err = {};
      result = decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      result = decodeEnumerated(buffer, offset + len, result.value);
      len += result.len;
      err.errorClass = result.value;
      result = decodeTagNumberAndValue(buffer, offset + len);
      len += result.len;
      result = decodeEnumerated(buffer, offset + len, result.value);
      len += result.len;
      err.errorCode = result.value;
      if (!decodeIsClosingTagNumber(buffer, offset + len, 5)) return;
      len++;
      newEntry.value = {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ERROR,
        value: err
      };
    }
    valueList.push(newEntry);
  }
  value.values = valueList;
  return {
    len: len,
    value: value
  };
};

var decodeSigned = module.exports.decodeSigned = function(buffer, offset, length) {
  return {
    len: length,
    value: buffer.readIntBE(offset, length, true)
  };
};

var decodeReal = module.exports.decodeReal = function(buffer, offset) {
  return {
    len: 4,
    value: buffer.readFloatBE(offset, true)
  };
};

var decodeRealSafe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: 0
    };
  } else {
    return decodeReal(buffer, offset);
  }
};

var decodeDouble = function(buffer, offset) {
  return {
    len: 8,
    value: buffer.readDoubleBE(offset, true)
  };
};

var decodeDoubleSafe = function(buffer, offset, lenValue) {
  if (lenValue !== 8) {
    return {
      len: lenValue,
      value: 0
    };
  } else {
    return decodeDouble(buffer, offset);
  }
};

var decodeOctetString = function(buffer, offset, maxLength, octetStringOffset, octetStringLength) {
  var octetString = [];
  for (var i = octetStringOffset; i < (octetStringOffset + octetStringLength); i++) {
    octetString.push(buffer[offset + i]);
  }
  return {
    len: octetStringLength,
    value: octetString
  };
};

var decodeContextOctetString = function(buffer, offset, maxLength, tagNumber, octetString, octetStringOffset) {
  if (decodeIsContextTag(buffer, offset, tagNumber)) {
    var result = decodeTagNumberAndValue(buffer, offset);
    return {
      len: result.lenValue + result.len,
      value: Buffer.from(buffer.slice(offset, result.lenValue))
    };
  } else {
    return;
  }
};

var multiCharsetCharacterstringDecode = function(buffer, offset, maxLength, encoding, length) {
  return {
    value: buffer.toString(get_node_encoding(encoding, buffer, offset), offset, offset + length),
    len: length + 1,
    encoding: encoding
  };
};

var decodeCharacterString = module.exports.decodeCharacterString = function(buffer, offset, maxLength, lenValue) {
  return multiCharsetCharacterstringDecode(buffer, offset + 1, maxLength, buffer[offset], lenValue - 1);
};

var bitstringSetOctet = function(bitString, index, octet) {
  var status = false;
  if (index < MAX_BITSTRING_BYTES) {
    bitString.value[index] = octet;
    status = true;
  }
  return status;
};

var bitstringSetBitsUsed = function(bitString, bytesUsed, unusedBits) {
  bitString.bitsUsed = bytesUsed * 8;
  bitString.bitsUsed -= unusedBits;
};

var decodeBitstring = function(buffer, offset, lenValue) {
  var len = 0;
  var bitString = {};
  bitString.value = [];
  if (lenValue > 0) {
    var bytesUsed = lenValue - 1;
    if (bytesUsed <= MAX_BITSTRING_BYTES) {
      len = 1;
      for (var i = 0; i < bytesUsed; i++) {
        bitString.value.push(byteReverseBits(buffer[offset + len++]));
      }
      var unusedBits = buffer[offset] & 0x07;
      bitstringSetBitsUsed(bitString, bytesUsed, unusedBits);
    }
  }
  return {
    len: len,
    value: bitString
  };
};

var decodeDate = module.exports.decodeDate = function(buffer, offset) {
  var date;
  var year = buffer[offset] + 1900;
  var month = buffer[offset + 1];
  var day = buffer[offset + 2];
  var wday = buffer[offset + 3];
  if (month === 0xFF && day === 0xFF && wday === 0xFF && (year - 1900) === 0xFF) {
    date = new Date(1, 1, 1);
  } else {
    date = new Date(year, month, day);
  }
  return {
    len: 4,
    value: date
  };
};

var decodeDateSafe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: new Date(1, 1, 1)
    };
  } else {
    return decodeDate(buffer, offset);
  }
};

var decodeApplicationDate = module.exports.decodeApplicationDate = function(buffer, offset) {
  var result = decodeTagNumber(buffer, offset);
  if (result.tagNumber === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE) {
    var value = decodeDate(buffer, offset + 1);
    return {
      len: value.len + 1,
      value: value
    };
  } else {
    return;
  }
};

var decodeBacnetTime = module.exports.decodeBacnetTime = function(buffer, offset) {
  var value;
  var hour = buffer[offset + 0];
  var min = buffer[offset + 1];
  var sec = buffer[offset + 2];
  var hundredths = buffer[offset + 3];
  if (hour === 0xFF && min === 0xFF && sec === 0xFF && hundredths === 0xFF) {
    value = new Date(1, 1, 1);
  } else {
    if (hundredths > 100) hundredths = 0;
    value = new Date(1, 1, 1, hour, min, sec, hundredths * 10);
  }
  return {
    len: 4,
    value: value
  };
};

var decodeBacnetTimeSafe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: new Date(1, 1, 1)
    };
  } else {
    return decodeBacnetTime(buffer, offset);
  }
};

var decodeApplicationTime = module.exports.decodeApplicationTime = function(buffer, offset) {
  var result = decodeTagNumber(buffer, offset);
  if (result.tagNumber === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME) {
    var value = decodeBacnetTime(buffer, offset + 1);
    return {
      len: value.len + 1,
      value: value
    };
  } else {
    return;
  }
};

var decodeBacnetDatetime = function(buffer, offset) {
  var len = 0;
  var date = decodeApplicationDate(buffer, offset + len);
  len += date.len;
  var time = decodeApplicationTime(buffer, offset + len);
  len += time.len;
  return {
    len: len,
    value: new Date(date.year, date.month, date.day, time.hour, time.minute, time.second, time.millisecond)
  };
};

var bacappDecodeData = function(buffer, offset, maxLength, tagDataType, lenValueType) {
  var result;
  var value = {
    len: 0,
    type: tagDataType
  };
  switch (tagDataType) {
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_NULL:
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN:
      value.value = lenValueType > 0 ? true : false;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT:
      result = decodeUnsigned(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT:
      result = decodeSigned(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL:
      result = decodeRealSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE:
      result = decodeDoubleSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING:
      result = decodeOctetString(buffer, offset, maxLength, 0, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING:
      result = decodeCharacterString(buffer, offset, maxLength, lenValueType);
      value.len += result.len;
      value.value = result.value;
      value.encoding = result.encoding;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING:
      result = decodeBitstring(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED:
      result = decodeEnumerated(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE:
      result = decodeDateSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME:
      result = decodeBacnetTimeSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID:
      result = decodeObjectIdSafe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = {type: result.objectType, instance: result.instance};
      break;
    default:
      break;
  }
  return value;
};

var bacappContextTagType = function(property, tagNumber) {
  var tag = baEnum.BacnetApplicationTags.MAX_BACNET_APPLICATION_TAG;
  switch (property) {
    case baEnum.BacnetPropertyIds.PROP_ACTUAL_SHED_LEVEL:
    case baEnum.BacnetPropertyIds.PROP_REQUESTED_SHED_LEVEL:
    case baEnum.BacnetPropertyIds.PROP_EXPECTED_SHED_LEVEL:
      switch (tagNumber) {
        case 0:
        case 1:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT;
          break;
        case 2:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_ACTION:
      switch (tagNumber) {
        case 0:
        case 1:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID;
          break;
        case 2:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED;
          break;
        case 3:
        case 5:
        case 6:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT;
          break;
        case 7:
        case 8:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_LIST_OF_GROUP_MEMBERS:
      switch (tagNumber) {
        case 0:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_EXCEPTION_SCHEDULE:
      switch (tagNumber) {
        case 1:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID;
          break;
        case 3:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_LOG_DEVICE_OBJECT_PROPERTY:
      switch (tagNumber) {
        case 0:
        case 3:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID;
          break;
        case 1:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED;
          break;
        case 2:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_SUBORDINATE_LIST:
      switch (tagNumber) {
        case 0:
        case 1:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_RECIPIENT_LIST:
      switch (tagNumber) {
        case 0:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID;
          break;
        default:
          break;
      }
      break;
    case baEnum.BacnetPropertyIds.PROP_ACTIVE_COV_SUBSCRIPTIONS:
      switch (tagNumber) {
        case 0:
        case 1:
          break;
        case 2:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN;
          break;
        case 3:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT;
          break;
        case 4:
          tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL;
          break;
        default:
          break;
      }
      break;
    default:
      break;
  }
  return tag;
};

var decodeDeviceObjPropertyRef = function(buffer, offset) {
  var len = 0;
  var arrayIndex = BACNET_ARRAY_ALL;
  if (!decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  var objectIdentifier = decodeObjectId(buffer, offset + len);
  len += objectIdentifier.len;
  var result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  var propertyIdentifier = decodeEnumerated(buffer, offset + len, result.value);
  len += propertyIdentifier.len;
  result = decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    arrayIndex = decodeUnsigned(buffer, offset + len, result.value);
    len += arrayIndex.len;
  }
  if (decodeIsContextTag(buffer, offset + len, 3)) {
    if (!isClosingTag(buffer[offset + len])) {
      len++;
      objectIdentifier = decodeObjectId(buffer, offset + len);
      len += objectIdentifier.len;
    }
  }
  return {
    len: len,
    value: {
      objectIdentifier: objectIdentifier,
      propertyIdentifier: propertyIdentifier
    }
  };
};

var decodeReadAccessSpecification = module.exports.decodeReadAccessSpecification = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  if (!decodeIsContextTag(buffer, offset + len, 0)) return;
  len++;
  var decodedValue = decodeObjectId(buffer, offset + len);
  value.objectIdentifier = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  len += decodedValue.len;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  var propertyIdAndArrayIndex = [];
  while ((apduLen - len) > 1 && !decodeIsClosingTagNumber(buffer, offset + len, 1)) {
    var propertyRef = {};
    if (!isContextSpecific(buffer[offset + len])) return;
    var result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    if ((len + result.value) >= apduLen) return;
    decodedValue = decodeEnumerated(buffer, offset + len, result.value);
    propertyRef.propertyIdentifier = decodedValue.value;
    len += decodedValue.len;
    propertyRef.propertyArrayIndex = BACNET_ARRAY_ALL;
    if (isContextSpecific(buffer[offset + len]) && !isClosingTag(buffer[offset + len])) {
      var tmp = decodeTagNumberAndValue(buffer, offset + len);
      if (tmp.tagNumber === 1) {
        len += tmp.len;
        if ((len + tmp.value) >= apduLen) return;
        decodedValue = decodeUnsigned(buffer, offset + len, tmp.value);
        propertyRef.propertyArrayIndex = decodedValue.value;
        len += decodedValue.len;
      }
    }
    propertyIdAndArrayIndex.push(propertyRef);
  }
  if (!decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  value.propertyReferences = propertyIdAndArrayIndex;
  return {
    len: len,
    value: value
  };
};

var decodeCovSubscription = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var result;
  var decodedValue;
  value.recipient = {};
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 0)) return;
  len++;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 0)) return;
  len++;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
  decodedValue = decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.recipient.net = decodedValue.value;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING) return;
  decodedValue = decodeOctetString(buffer, offset + len, apduLen,  0, result.value);
  len += decodedValue.len;
  value.recipient.adr = decodedValue.value;
  if (!decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  if (!decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.subscriptionProcessIdentifier = decodedValue.value;
  if (!decodeIsClosingTagNumber(buffer, offset + len, 0)) return;
  len++;
  if (!decodeIsOpeningTagNumber(buffer, offset + len, 1)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  decodedValue = decodeObjectId(buffer, offset + len);
  len += decodedValue.len;
  value.monitoredObjectIdentifier = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = decodeEnumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.monitoredProperty = {};
  value.monitoredProperty.propertyIdentifier = decodedValue.value;
  result = decodeTagNumberAndValue(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = decodeUnsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.monitoredProperty.propertyArrayIndex = decodedValue.value;
  } else {
    value.monitoredProperty.propertyArrayIndex = BACNET_ARRAY_ALL;
  }
  if (!decodeIsClosingTagNumber(buffer, offset + len, 1)) return;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 2) return;
  value.issueConfirmedNotifications = buffer[offset + len] > 0 ? true : false;
  len++;
  result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 3) return;
  decodedValue = decodeUnsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.timeRemaining = decodedValue.value;
  if (len < apduLen && !isClosingTag(buffer[offset + len])) {
    result = decodeTagNumberAndValue(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 4) return;
    decodedValue = decodeReal(buffer, offset + len);
    len += decodedValue.len;
    value.covIncrement = decodedValue.value;
  }
  return {
    len: len,
    value: value
  };
};

var decodeCalendarDate = function(buffer, offset) {
  return {
    len: 4,
    year: buffer[offset],
    month: buffer[offset + 1],
    day: buffer[offset + 2],
    wday: buffer[offset + 3]
  };
};

var decodeCalendarDateRange = function(buffer, offset) {
  var len = 1;
  var startDate = decodeDate(buffer, offset + len);
  len += startDate.len + 1;
  var endDate = decodeDate(buffer, offset + len);
  len += endDate.len + 1;
  return {
    len: len,
    startDate: startDate,
    endDate: endDate
  };
};

var decodeCalendarWeekDay = function(buffer, offset) {
  return {
    len: 3,
    month: buffer[offset],
    week: buffer[offset + 1],
    wday: buffer[offset + 2]
  };
};

var decodeCalendar = function(buffer, offset, apduLen) {
  var len = 0;
  var entries = [];
  var decodedValue;
  while (len < apduLen) {
    var result = decodeTagNumber(buffer, offset + len);
    len += result.len;
    switch (result.tagNumber) {
      case 0:
        decodedValue = decodeCalendarDate(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      case 1:
        decodedValue = decodeCalendarDateRange(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      case 2:
        decodedValue = decodeCalendarWeekDay(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      default:
        return {
          len: len - 1,
          value: entries
        };
    }
  }
};

var bacappDecodeContextApplicationData = function(buffer, offset, maxOffset, objectType, propertyId) {
  var len = 0;
  var result;
  if (isContextSpecific(buffer[offset])) {
    if (propertyId === baEnum.BacnetPropertyIds.PROP_LIST_OF_GROUP_MEMBERS) {
      result = decodeReadAccessSpecification(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_SPECIFICATION,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.BacnetPropertyIds.PROP_ACTIVE_COV_SUBSCRIPTIONS) {
      result = decodeCovSubscription(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_COV_SUBSCRIPTION,
        value: result.value,
        len: result.len
      };
    } else if (objectType === baEnum.BacnetObjectTypes.OBJECT_GROUP && propertyId === baEnum.acnetPropertyIds.PROP_PRESENT_VALUE) {
      result = decodeReadAccessResult(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_RESULT,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.BacnetPropertyIds.PROP_LIST_OF_OBJECT_PROPERTY_REFERENCES || propertyId === baEnum.BacnetPropertyIds.PROP_LOG_DEVICE_OBJECT_PROPERTY  || propertyId === baEnum.BacnetPropertyIds.PROP_OBJECT_PROPERTY_REFERENCE) {
      result = decodeDeviceObjPropertyRef(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_PROPERTY_REFERENCE,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.BacnetPropertyIds.PROP_DATE_LIST) {
      result = decodeCalendar(buffer, offset, maxOffset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTEXT_SPECIFIC_DECODED,
        value: result.value,
        len: result.len
      };
    } else if (propertyId === baEnum.BacnetPropertyIds.PROP_EVENT_TIME_STAMPS) {
      var subEvtResult;
      var evtResult = decodeTagNumberAndValue(buffer, offset + len);
      len += 1;
      if (evtResult.tagNumber === 0) {
        subEvtResult = decodeBacnetTime(buffer, offset + 1);
        return {
          type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP,
          value: subEvtResult.value,
          len: subEvtResult.len + 1
        };
      } else if (evtResult.tagNumber === 1) {
        subEvtResult = decodeUnsigned(buffer, offset + len, evtResult.value);
        return {
          type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT,
          value: subEvtResult.value,
          len: subEvtResult.len + 1
        };
      } else if (evtResult.tagNumber === 2) {
        subEvtResult = decodeBacnetDatetime(buffer, offset + len);
        return {
          type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP,
          value: subEvtResult.value,
          len: subEvtResult.len + 2
        };
      } else {
        return;
      }
    }
    var list = [];
    var tagResult = decodeTagNumberAndValue(buffer, offset + len);
    var multipleValues = isOpeningTag(buffer[offset + len]);
    while (((len + offset) <= maxOffset) && !isClosingTag(buffer[offset + len])) {
      var subResult = decodeTagNumberAndValue(buffer, offset + len);
      if (!subResult) return;
      if (subResult.value === 0) {
        len += subResult.len;
        result = bacappDecodeApplicationData(buffer, offset + len, maxOffset, baEnum.BacnetObjectTypes.MAX_BACNET_OBJECT_TYPE, baEnum.BacnetPropertyIds.MAX_BACNET_PROPERTY_ID);
        if (!result) return;
        list.push(result);
        len += result.len;
      } else {
        var overrideTagNumber = bacappContextTagType(propertyId, subResult.tagNumber);
        if (overrideTagNumber !== baEnum.BacnetApplicationTags.MAX_BACNET_APPLICATION_TAG) {
          subResult.tagNumber = overrideTagNumber;
        }
        var bacappResult = bacappDecodeData(buffer, offset + len + subResult.len, maxOffset, subResult.tagNumber, subResult.value);
        if (!bacappResult) return;
        if (bacappResult.len === subResult.value) {
          var resObj = {
            value: bacappResult.value,
            type: bacappResult.type
          };
          if (bacappResult.encoding !== undefined) {
            resObj.encoding = bacappResult.encoding;
          }
          list.push(resObj);
          len += subResult.len + subResult.value;
        } else {
          list.push({
            value: buffer.slice(offset + len + subResult.len, offset + len + subResult.len + subResult.value),
            type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTEXT_SPECIFIC_ENCODED
          });
          len += subResult.len + subResult.value;
        }
      }
      if (multipleValues === false) {
        return {
          len: len,
          value: list[0],
          type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTEXT_SPECIFIC_DECODED
        };
      }
    }
    if ((len + offset) > maxOffset) return;
    if (decodeIsClosingTagNumber(buffer, offset + len, tagResult.tagNumber)) {
      len++;
    }
    return {
      len: len,
      value: list,
      type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTEXT_SPECIFIC_DECODED
    };
  } else {
    return;
  }
};

var bacappEncodeTimestamp = function(buffer, value) {
  switch (value.tag) {
    case baEnum.BacnetTimestampTags.TIME_STAMP_TIME:
      encodeContextTime(buffer, 0, value.value);
      break;
    case baEnum.BacnetTimestampTags.TIME_STAMP_SEQUENCE:
      encodeContextUnsigned(buffer, 1, value.value);
      break;
    case baEnum.BacnetTimestampTags.TIME_STAMP_DATETIME:
      bacappEncodeContextDatetime(buffer, 2, value.value);
      break;
    case baEnum.BacnetTimestampTags.TIME_STAMP_NONE:
      break;
    default:
      throw new Error('NOT_IMPLEMENTED');
  }
};

var bacappEncodeContextTimestamp = module.exports.bacappEncodeContextTimestamp = function(buffer, tagNumber, value) {
  if (value.tag !== baEnum.BacnetTimestampTags.TIME_STAMP_NONE) {
    encodeOpeningTag(buffer, tagNumber);
    bacappEncodeTimestamp(buffer, value);
    encodeClosingTag(buffer, tagNumber);
  }
};

var decodeContextCharacterString = module.exports.decodeContextCharacterString = function(buffer, offset, maxLength, tagNumber) {
  var len = 0;
  if (!decodeIsContextTag(buffer, offset + len, tagNumber)) return;
  var result = decodeTagNumberAndValue(buffer, offset + len);
  len += result.len;
  var decodedValue = multiCharsetCharacterstringDecode(buffer, offset + 1 + len, maxLength, buffer[offset + len], result.value - 1);
  if (!decodedValue) return;
  len += result.value;
  return {
    len: len,
    value: decodedValue.value,
    encoding: decodedValue.encoding
  };
};

var decodeIsContextTagWithLength = function(buffer, offset, tagNumber) {
  var result = decodeTagNumber(buffer, offset);
  return {
    len: result.len,
    value: isContextSpecific(buffer[offset]) && (result.tagNumber === tagNumber)
  };
};

var decodeContextBacnetTime = function(buffer, offset, tagNumber) {
  var result = decodeIsContextTagWithLength(buffer, offset, tagNumber);
  if (!result.value) return;
  var decodedValue = decodeBacnetTime(buffer, offset + result.len);
  return {
    len: result.len + decodedValue.len,
    value: decodedValue.value
  };
};

var decodeContextDate = function(buffer, offset, tagNumber) {
  var result = decodeIsContextTagWithLength(buffer, offset, tagNumber);
  if (!result.value) return;
  var decodedValue = decodeDate(buffer, offset + result.len);
  return {
    len: result.len + decodedValue.len,
    value: decodedValue.value
  };
};

var decodeContextObjectId = function(buffer, offset, tagNumber) {
  var result = decodeIsContextTagWithLength(buffer, offset, tagNumber);
  if (!result.value) return;
  var decodedValue = decodeObjectId(buffer, offset + result.len);
  return {
    len: result.len + decodedValue.len,
    value: decodedValue.value
  };
};

var bacappDecodeContextData = function(buffer, offset, maxApduLen, propertyTag) {
  var len = 0;
  var decodedValue;
  if (isContextSpecific(buffer[offset])) {
    var result = decodeTagNumberAndValue(buffer, offset);
    len = result.len;
    if (len > 0 && (len <= maxApduLen) && !decodeIsClosingTagNumber(buffer, offset + len, result.tagNumber)) {
      if (propertyTag < baEnum.BacnetApplicationTags.MAX_BACNET_APPLICATION_TAG) {
        decodedValue = bacappDecodeData(buffer, offset + len, maxApduLen, propertyTag, result.value);
        len += decodedValue.len;
      } else if (result.value > 0) {
        len += result.value;
      } else {
        return;
      }
    } else if (len === 1) {
      len = 0;
    }
  }
  return {
    len: len,
    value: decodedValue ? decodedValue.value : decodedValue
  };
};

var encodeBacnetCharacterString = function(buffer, value, encoding) {
  encoding = encoding || baEnum.BacnetCharacterStringEncodings.CHARACTER_UTF8;
  buffer.buffer[buffer.offset++] = encoding;
  if (encoding === baEnum.BacnetCharacterStringEncodings.CHARACTER_UTF8) {
    buffer.offset += buffer.buffer.write(value, buffer.offset, undefined, 'utf8');
  } else {
    // Transcode JS string to the target encoding using iconv-lite
    // Remark: NodeJS v7.0.1 adds: buffer.transcode(source, fromEnc, toEnc)
    var bufEncoded = iconv.encode(value, get_node_encoding(encoding));
    buffer.offset += bufEncoded.copy(buffer.buffer, buffer.offset);
  }
};

var encodeApplicationCharacterString = function(buffer, value, encoding) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetCharacterString(tmp, value, encoding);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encodeContextCharacterString = module.exports.encodeContextCharacterString = function(buffer, tagNumber, value, encoding) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetCharacterString(tmp, value, encoding);
  encodeTag(buffer, tagNumber, true, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var get_node_encoding = function(encoding, decodingBuffer, decodingOffset) {
  switch (encoding) {
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_UTF8:
      return 'utf8';
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_UCS2:
      if ((decodingBuffer[decodingOffset] === 0xFF) && (decodingBuffer[decodingOffset + 1] === 0xFE)) {
        return 'ucs2';
      }
      return; //UCS-2BE
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_ISO8859_1:
      return 'latin1';
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_UCS4:
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_MS_DBCS:
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_JISX_0208:
      return;
    default:
      return 'utf8';
  }
};
