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

var encode_bacnet_signed = function(buffer, value) {
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

var decode_unsigned = module.exports.decode_unsigned = function(buffer, offset, length) {
  return {
    len: length,
    value: buffer.readUIntBE(offset, length, true)
  };
};

var decode_enumerated = module.exports.decode_enumerated = function(buffer, offset, lenValue) {
  return decode_unsigned(buffer, offset, lenValue);
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

var IS_EXTENDED_tagNumber = function(x) {
  return (x & 0xF0) === 0xF0;
};

var IS_EXTENDED_VALUE = function(x) {
  return (x & 0x07) === 5;
};

var IS_contextSpecific = function(x) {
  return (x & 0x8) === 0x8;
};

var IS_OPENING_TAG = function(x) {
  return (x & 0x07) === 6;
};

var IS_CLOSING_TAG = function(x) {
  return (x & 0x07) === 7;
};

var encodeContextReal = function(buffer, tagNumber, value) {
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

var encode_octetString = function(buffer, octetString, octetOffset, octetCount) {
  if (octetString) {
    for (var i = octetOffset; i < (octetOffset + octetCount); i++) {
      buffer.buffer[buffer.offset++] = octetString[i];
    }
  }
};

var encode_application_octetString = function(buffer, octetString, octetOffset, octetCount) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING, false, octetCount);
  encode_octetString(buffer, octetString, octetOffset, octetCount);
};

var encode_application_boolean = function(buffer, booleanValue) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, false, booleanValue ? 1 : 0);
};

var encode_application_real = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL, false, 4);
  encodeBacnetReal(buffer, value);
};

var encode_application_double = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE, false, 8);
  encodeBacnetDouble(buffer, value);
};

var bitstring_bytes_used = function(bitString) {
  var len = 0;
  if (bitString.bits_used > 0) {
    var lastBit = bitString.bits_used - 1;
    var usedBytes = (lastBit / 8) + 1;
    len = Math.floor(usedBytes);
  }
  return len;
};

var encode_application_object_id = module.exports.encode_application_object_id = function(buffer, object_type, instance) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetObjectId(tmp, object_type, instance);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encode_application_unsigned = module.exports.encode_application_unsigned = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetUnsigned(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encode_application_enumerated = module.exports.encode_application_enumerated = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encodeBacnetEnumerated(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encode_application_signed = module.exports.encode_application_signed = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encode_bacnet_signed(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var byte_reverse_bits = function(inByte) {
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

var bitstring_octet = function(bitString, octetIndex) {
  var octet = 0;
  if (bitString.value) {
    if (octetIndex < MAX_BITSTRING_BYTES) {
      octet = bitString.value[octetIndex];
    }
  }
  return octet;
};

var encode_bitstring = function(buffer, bitString) {
  if (bitString.bits_used === 0) {
    buffer.buffer[buffer.offset++] = 0;
  } else {
    var usedBytes = bitstring_bytes_used(bitString);
    var remainingUsedBits = bitString.bits_used - ((usedBytes - 1) * 8);
    buffer.buffer[buffer.offset++] = 8 - remainingUsedBits;
    for (var i = 0; i < usedBytes; i++) {
      buffer.buffer[buffer.offset++] = byte_reverse_bits(bitstring_octet(bitString, i));
    }
  }
};

var encode_application_bitstring = function(buffer, bitString) {
  var bitStringEncodedLength = 1;
  bitStringEncodedLength += bitstring_bytes_used(bitString);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING, false, bitStringEncodedLength);
  encode_bitstring(buffer, bitString);
};

var encode_bacnet_date = function(buffer, value) {
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
  buffer.buffer[buffer.offset++] = value.getDay();
};

var encode_application_date = module.exports.encode_application_date = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE, false, 4);
  encode_bacnet_date(buffer, value);
};

var encode_bacnet_time = function(buffer, value) {
  buffer.buffer[buffer.offset++] = value.getHours();
  buffer.buffer[buffer.offset++] = value.getMinutes();
  buffer.buffer[buffer.offset++] = value.getSeconds();
  buffer.buffer[buffer.offset++] = value.getMilliseconds() / 10;
};

var encode_application_time = module.exports.encode_application_time = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME, false, 4);
  encode_bacnet_time(buffer, value);
};

var bacapp_encode_datetime = function(buffer, value) {
  if (value !== new Date(1, 1, 1)) {
    encode_application_date(buffer, value);
    encode_application_time(buffer, value);
  }
};

var encode_context_object_id = module.exports.encode_context_object_id = function(buffer, tagNumber, objectType, instance) {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetObjectId(buffer, objectType, instance);
};

var encode_opening_tag = module.exports.encode_opening_tag = function(buffer, tagNumber) {
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

var encode_closing_tag = module.exports.encode_closing_tag = function(buffer, tagNumber) {
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

var encode_read_access_specification = module.exports.encode_read_access_specification = function(buffer, value) {
  encode_context_object_id(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encode_opening_tag(buffer, 1);
  value.propertyReferences.forEach(function(p) {
    encodeContextEnumerated(buffer, 0, p.propertyIdentifier);
    if (p.propertyArrayIndex && p.propertyArrayIndex !== BACNET_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 1, p.propertyArrayIndex);
    }
  });
  encode_closing_tag(buffer, 1);
};

var encodeContextBoolean = function(buffer, tagNumber, booleanValue) {
  encodeTag(buffer, tagNumber, true, 1);
  buffer.buffer.writeUInt8(booleanValue ? 1 : 0, buffer.offset, true);
  buffer.offset += 1;
};

var encode_cov_subscription = function(buffer, value) {
  encode_opening_tag(buffer, 0);
  encode_opening_tag(buffer, 0);
  encode_opening_tag(buffer, 1);
  encode_application_unsigned(buffer, value.Recipient.net);
  if (value.Recipient.net === 0xFFFF) {
    encode_application_octetString(buffer, 0, 0, 0);
  } else {
    encode_application_octetString(buffer, value.Recipient.adr, 0, value.Recipient.adr.length);
  }
  encode_closing_tag(buffer, 1);
  encode_closing_tag(buffer, 0);
  encodeContextUnsigned(buffer, 1, value.subscriptionProcessIdentifier);
  encode_closing_tag(buffer, 0);
  encode_opening_tag(buffer, 1);
  encode_context_object_id(buffer, 0, value.monitoredObjectIdentifier.type, value.monitoredObjectIdentifier.instance);
  encodeContextEnumerated(buffer, 1, value.monitoredProperty.propertyIdentifier);
  if (value.monitoredProperty.propertyArrayIndex !== BACNET_ARRAY_ALL) {
    encodeContextUnsigned(buffer, 2, value.monitoredProperty.propertyArrayIndex);
  }
  encode_closing_tag(buffer, 1);
  encodeContextBoolean(buffer, 2, value.IssueConfirmedNotifications);
  encodeContextUnsigned(buffer, 3, value.TimeRemaining);
  if (value.COVIncrement > 0) {
    encodeContextReal(buffer, 4, value.COVIncrement);
  }
};

var bacapp_encode_application_data = module.exports.bacapp_encode_application_data = function(buffer, value) {
  if (value.value === null) {
    buffer.Add(baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_NULL);
    return;
  }
  switch (value.Tag) {
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_NULL:
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN:
      encode_application_boolean(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT:
      encode_application_unsigned(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT:
      encode_application_signed(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL:
      encode_application_real(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE:
      encode_application_double(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING:
      encode_application_octetString(buffer, value.Value, 0, value.Value.length);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING:
      encode_application_character_string(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING:
      encode_application_bitstring(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED:
      encode_application_enumerated(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE:
      encode_application_date(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME:
      encode_application_time(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP:
      bacapp_encode_timestamp(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATETIME:
      bacapp_encode_datetime(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID:
      encode_application_object_id(buffer, (value.Value).type, (value.Value).instance);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_COV_SUBSCRIPTION:
      encode_cov_subscription(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_RESULT:
      encode_read_access_result(buffer, value.Value);
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_SPECIFICATION:
      encode_read_access_specification(buffer, value.Value);
      break;
    default:
      throw 'Unknown type';
  }
};

var bacapp_encode_device_obj_property_ref = function(buffer, value) {
  encode_context_object_id(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encodeContextEnumerated(buffer, 1, value.propertyIdentifier);
  if (value.arrayIndex !== BACNET_ARRAY_ALL) {
    encodeContextUnsigned(buffer, 2, value.arrayIndex);
  }
  if (value.deviceIndentifier.type === baEnum.BacnetObjectTypes.OBJECT_DEVICE) {
    encode_context_object_id(buffer, 3, value.deviceIndentifier.type, value.deviceIndentifier.instance);
  }
};

var bacapp_encode_context_device_obj_property_ref = function(buffer, tagNumber, value) {
  encode_opening_tag(buffer, tagNumber);
  bacapp_encode_device_obj_property_ref(buffer, value);
  encode_closing_tag(buffer, tagNumber);
};

var bacapp_encode_property_state = function(buffer, value) {
  switch (value.Tag) {
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.BOOLEAN_VALUE:
      encodeContextBoolean(buffer, 0, value.state === 1 ? true : false);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.BINARY_VALUE:
      encodeContextEnumerated(buffer, 1, value.state);
      break;
    case baEnum.baEnum.BacnetPropetyState.BacnetPropertyStateTypes.EVENT_TYPE:
      encodeContextEnumerated(buffer, 2, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.POLARITY:
      encodeContextEnumerated(buffer, 3, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.PROGRAM_CHANGE:
      encodeContextEnumerated(buffer, 4, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.PROGRAM_STATE:
      encodeContextEnumerated(buffer, 5, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.REASON_FOR_HALT:
      encodeContextEnumerated(buffer, 6, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.RELIABILITY:
      encodeContextEnumerated(buffer, 7, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.STATE:
      encodeContextEnumerated(buffer, 8, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.SYSTEM_STATUS:
      encodeContextEnumerated(buffer, 9, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.UNITS:
      encodeContextEnumerated(buffer, 10, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.UNSIGNED_VALUE:
      encodeContextUnsigned(buffer, 11, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.LIFE_SAFETY_MODE:
      encodeContextEnumerated(buffer, 12, value.state);
      break;
    case baEnum.BacnetPropetyState.BacnetPropertyStateTypes.LIFE_SAFETY_STATE:
      encodeContextEnumerated(buffer, 13, value.state);
      break;
    default:
      break;
  }
};

var encode_context_bitstring = function(buffer, tagNumber, bitString) {
  var bitStringEncodedLength = 1;
  bitStringEncodedLength += bitstring_bytes_used(bitString);
  encodeTag(buffer, tagNumber, true, bitStringEncodedLength);
  encode_bitstring(buffer, bitString);
};

var encode_context_signed = function(buffer, tagNumber, value) {
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
  encode_bacnet_signed(buffer, value);
};

var encode_context_time = function(buffer, tagNumber, value) {
  encodeTag(buffer, tagNumber, true, 4);
  encode_bacnet_time(buffer, value);
};

var bacapp_encode_context_datetime = function(buffer, tagNumber, value) {
  if (value !== new Date(1, 1, 1)) {
    encode_opening_tag(buffer, tagNumber);
    bacapp_encode_datetime(buffer, value);
    encode_closing_tag(buffer, tagNumber);
  }
};

var decode_tagNumber = function(buffer, offset) {
  var len = 1;
  var tagNumber;
  if (IS_EXTENDED_tagNumber(buffer[offset])) {
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

var decode_is_context_tag = module.exports.decode_is_context_tag = function(buffer, offset, tagNumber) {
  var result = decode_tagNumber(buffer, offset);
  return IS_contextSpecific(buffer[offset]) && result.tagNumber === tagNumber;
};

var decode_is_opening_tag_number = module.exports.decode_is_opening_tag_number = function(buffer, offset, tagNumber) {
  var result = decode_tagNumber(buffer, offset);
  return IS_OPENING_TAG(buffer[offset]) && result.tagNumber === tagNumber;
};

var decode_is_closing_tag_number = module.exports.decode_is_closing_tag_number = function(buffer, offset, tagNumber) {
  var result = decode_tagNumber(buffer, offset);
  return IS_CLOSING_TAG(buffer[offset]) && result.tagNumber === tagNumber;
};

var decode_is_closing_tag = function(buffer, offset) {
  return (buffer[offset] & 0x07) === 7;
};

var decode_is_opening_tag = function(buffer, offset) {
  return (buffer[offset] & 0x07) === 6;
};

var decode_object_id = module.exports.decode_object_id = function(buffer, offset) {
  var result = decode_unsigned(buffer, offset, 4);
  var objectType = (result.value >> BACNET_INSTANCE_BITS) & BACNET_MAX_OBJECT;
  var instance = result.value & BACNET_MAX_INSTANCE;
  return {
    len: result.len,
    objectType: objectType,
    instance: instance
  };
};

var decode_object_id_safe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: 0,
      objectType: 0,
      instance: 0
    };
  } else {
    return decode_object_id(buffer, offset);
  }
};

var decode_tag_number_and_value = module.exports.decode_tag_number_and_value = function(buffer, offset) {
  var value;
  var result = decode_tagNumber(buffer, offset);
  var len = result.len;
  if (IS_EXTENDED_VALUE(buffer[offset])) {
    if (buffer[offset + len] === 255) {
      len++;
      result = decode_unsigned(buffer, offset + len, 4);
      len += result.len;
      value = result.value;
    } else if (buffer[offset + len] === 254) {
      len++;
      result = decode_unsigned(buffer, offset + len, 2);
      len += result.len;
      value = result.value;
    } else {
      value = buffer[offset + len];
      len++;
    }
  } else if (IS_OPENING_TAG(buffer[offset])) {
    value = 0;
  } else if (IS_CLOSING_TAG(buffer[offset])) {
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

var bacapp_decode_application_data = module.exports.bacapp_decode_application_data = function(buffer, offset, maxOffset, objectType, propertyId) {
  if (!IS_contextSpecific(buffer[offset])) {
    var result = decode_tag_number_and_value(buffer, offset);
    if (result) {
      var len = result.len;
      result = bacapp_decode_data(buffer, offset + len, maxOffset, result.tagNumber, result.value);
      if (!result) return;
      return {
        len: len + result.len,
        type: result.type,
        value: result.value
      };
    }
  } else {
    return bacapp_decode_context_application_data(buffer, offset, maxOffset, objectType, propertyId);
  }
};

var encode_read_access_result = module.exports.encode_read_access_result = function(buffer, value) {
  encode_context_object_id(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encode_opening_tag(buffer, 1);
  value.values.forEach(function(item) {
    encodeContextEnumerated(buffer, 2, item.property.propertyIdentifier);
    if (item.property.propertyArrayIndex !== BACNET_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 3, item.property.propertyArrayIndex);
    }
    if (item.value && item.value[0].Value.type === 'BacnetError') {
      encode_opening_tag(buffer, 5);
      encode_application_enumerated(buffer, item.value[0].Value.error_class);
      encode_application_enumerated(buffer, item.value[0].Value.error_code);
      encode_closing_tag(buffer, 5);
    } else {
      encode_opening_tag(buffer, 4);
      item.value.forEach(function(subItem) {
        bacapp_encode_application_data(buffer, subItem);
      });
      encode_closing_tag(buffer, 4);
    }
  });
  encode_closing_tag(buffer, 1);
};

var decode_read_access_result = module.exports.decode_read_access_result = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  if (!decode_is_context_tag(buffer, offset + len, 0)) return;
  len++;
  var result = decode_object_id(buffer, offset + len);
  value.objectIdentifier = {
    type: result.objectType,
    instance: result.instance
  };
  len += result.len;
  if (!decode_is_opening_tag_number(buffer, offset + len, 1)) return -1;
  len++;

  var _value_list = [];
  while ((apduLen - len) > 0) {
    var new_entry = {};
    if (decode_is_closing_tag_number(buffer, offset + len, 1)) {
      len++;
      break;
    }
    result = decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 2) return;
    result = decode_enumerated(buffer, offset + len, result.value);
    new_entry.propertyIdentifier = result.value;
    len += result.len;

    result = decode_tag_number_and_value(buffer, offset + len);
    if (result.tagNumber === 3) {
      len += result.len;
      result = decode_unsigned(buffer, offset + len, result.value);
      new_entry.propertyArrayIndex = result.value;
      len += result.len;
    } else {
      new_entry.propertyArrayIndex = BACNET_ARRAY_ALL;
    }
    result = decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    if (result.tagNumber === 4) {
      var localValues = [];
      while (!decode_is_closing_tag_number(buffer, offset + len, 4)) {
        var localResult = bacapp_decode_application_data(buffer, offset + len, apduLen + offset - 1, value.objectIdentifier.type, new_entry.propertyIdentifier);
        if (!localResult) return;
        len += localResult.len;
        localValues.push({value: localResult.value, type: localResult.type});
      }
      if ((localValues.count === 2) && (localValues[0].Tag === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE) && (localValues[1].Tag === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME)) {
        var date = localValues[0].value;
        var time = localValues[1].value;
        var bdatetime = new Date(date.year, date.month, date.day, time.hour, time.minute, time.second, time.millisecond);
        new_entry.value = [
          {type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATETIME, value: bdatetime}
        ];
      } else {
        new_entry.value = localValues;
      }
      len++;
    } else if (result.tagNumber === 5) {
      var err = {};
      result = decode_tag_number_and_value(buffer, offset + len);
      len += result.len;
      result = decode_enumerated(buffer, offset + len, result.value);
      len += result.len;
      err.errorClass = result.value;
      result = decode_tag_number_and_value(buffer, offset + len);
      len += result.len;
      result = decode_enumerated(buffer, offset + len, result.value);
      len += result.len;
      err.error_code = result.value;
      if (!decode_is_closing_tag_number(buffer, offset + len, 5)) return;
      len++;
      new_entry.value = {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ERROR,
        value: err
      };
    }
    _value_list.push(new_entry);
  }
  value.values = _value_list;
  return {
    len: len,
    value: value
  };
};

var decode_signed = function(buffer, offset, length) {
  return {
    len: length,
    value: buffer.readIntBE(offset, length, true)
  };
};

var decode_real = function(buffer, offset) {
  return {
    len: 4,
    value: buffer.readFloatBE(offset, true)
  };
};

var decode_real_safe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: 0
    };
  } else {
    return decode_real(buffer, offset);
  }
};

var decode_double = function(buffer, offset) {
  return {
    len: 8,
    value: buffer.readDoubleBE(offset, true)
  };
};

var decode_double_safe = function(buffer, offset, lenValue) {
  if (lenValue !== 8) {
    return {
      len: lenValue,
      value: 0
    };
  } else {
    return decode_double(buffer, offset);
  }
};

var decode_octetString = function(buffer, offset, maxLength, octetStringOffset, octetStringLength) {
  var octetString = [];
  for (var i = octetStringOffset; i < (octetStringOffset + octetStringLength); i++) {
    octetString.push(buffer[offset + i]);
  }
  return {
    len: octetStringLength,
    value: octetString
  };
};

var decode_context_octetString = function(buffer, offset, maxLength, tagNumber, octetString, octetStringOffset) {
  if (decode_is_context_tag(buffer, offset, tagNumber)) {
    var result = decode_tag_number_and_value(buffer, offset);
    return {
      len: result.lenValue + result.len,
      value: Buffer.from(buffer.slice(offset, result.lenValue))
    };
  } else {
    return;
  }
};

var multi_charset_characterstring_decode = function(buffer, offset, maxLength, encoding, length) {
  var nodeEncoding;
  switch (encoding) {
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_UTF8:
      nodeEncoding = 'utf8';
      break;
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_UCS2:
      if ((buffer[offset] === 0xFF) && (buffer[offset + 1] === 0xFE)) {
        nodeEncoding = 'ucs2';
      } else {
        return;
      }
      break;
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_UCS4:
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_ISO8859:
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_MS_DBCS:
    case baEnum.BacnetCharacterStringEncodings.CHARACTER_JISX_0208:
      return;
    default:
      nodeEncoding = 'latin1';
      break;
  }
  return {
    value: buffer.toString(nodeEncoding, offset, offset + length),
    len: length + 1
  };
};

var decode_character_string = module.exports.decode_character_string = function(buffer, offset, maxLength, lenValue) {
  return multi_charset_characterstring_decode(buffer, offset + 1, maxLength, buffer[offset], lenValue - 1);
};

var bitstring_set_octet = function(bitString, index, octet) {
  var status = false;
  if (index < MAX_BITSTRING_BYTES) {
    bitString.value[index] = octet;
    status = true;
  }
  return status;
};

var bitstring_set_bits_used = function(bitString, bytesUsed, unusedBits) {
  bitString.bits_used = bytesUsed * 8;
  bitString.bits_used -= unusedBits;
};

var decode_bitstring = function(buffer, offset, lenValue) {
  var len = 0;
  var bitString = {};
  bitString.value = [];
  if (lenValue > 0) {
    var bytesUsed = lenValue - 1;
    if (bytesUsed <= MAX_BITSTRING_BYTES) {
      len = 1;
      for (var i = 0; i < bytesUsed; i++) {
        bitString.value.push(byte_reverse_bits(buffer[offset + len++]));
      }
      var unusedBits = buffer[offset] & 0x07;
      bitstring_set_bits_used(bitString, bytesUsed, unusedBits);
    }
  }
  return {
    len: len,
    value: bitString
  };
};

var decode_date = module.exports.decode_date = function(buffer, offset) {
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

var decode_date_safe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: new Date(1, 1, 1)
    };
  } else {
    return decode_date(buffer, offset);
  }
};

var decode_application_date = function(buffer, offset) {
  var result = decode_tagNumber(buffer, offset);
  if (result.tagNumber === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE) {
    var value = decode_date(buffer, offset + 1);
    return {
      len: value.len + 1,
      value: value
    };
  } else {
    return;
  }
};

var decode_bacnet_time = module.exports.decode_bacnet_time = function(buffer, offset) {
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

var decode_bacnet_time_safe = function(buffer, offset, lenValue) {
  if (lenValue !== 4) {
    return {
      len: lenValue,
      value: new Date(1, 1, 1)
    };
  } else {
    return decode_bacnet_time(buffer, offset);
  }
};

var decode_application_time = function(buffer, offset) {
  var result = decode_tagNumber(buffer, offset);
  if (result.tagNumber === baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME) {
    var value = decode_bacnet_time(buffer, offset + 1);
    return {
      len: value.len + 1,
      value: value
    };
  } else {
    return;
  }
};

var decode_bacnet_datetime = function(buffer, offset) {
  var len = 0;
  var date = decode_application_date(buffer, offset + len);
  len += date.len;
  var time = decode_application_time(buffer, offset + len);
  len += time.len;
  return {
    len: len,
    value: new Date(date.year, date.month, date.day, time.hour, time.minute, time.second, time.millisecond)
  };
};

var bacapp_decode_data = function(buffer, offset, maxLength, tagDataType, lenValueType) {
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
      result = decode_unsigned(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT:
      result = decode_signed(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL:
      result = decode_real_safe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE:
      result = decode_double_safe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING:
      result = decode_octetString(buffer, offset, maxLength, 0, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING:
      result = decode_character_string(buffer, offset, maxLength, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING:
      result = decode_bitstring(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED:
      result = decode_enumerated(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE:
      result = decode_date_safe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME:
      result = decode_bacnet_time_safe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID:
      result = decode_object_id_safe(buffer, offset, lenValueType);
      value.len += result.len;
      value.value = {type: result.objectType, instance: result.instance};
      break;
    default:
      break;
  }
  return value;
};

var bacapp_context_tag_type = function(property, tagNumber) {
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

var decode_device_obj_property_ref = function(buffer, offset) {
  var len = 0;
  var arrayIndex = BACNET_ARRAY_ALL;
  if (!decode_is_context_tag(buffer, offset + len, 0)) return;
  len++;
  var objectIdentifier = decode_object_id(buffer, offset + len);
  len += objectIdentifier.len;
  var result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  var propertyIdentifier = decode_enumerated(buffer, offset + len, result.value);
  len += propertyIdentifier.len;
  result = decode_tag_number_and_value(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    arrayIndex = decode_unsigned(buffer, offset + len, result.value);
    len += arrayIndex.len;
  }
  if (decode_is_context_tag(buffer, offset + len, 3)) {
    if (!IS_CLOSING_TAG(buffer[offset + len])) {
      len++;
      objectIdentifier = decode_object_id(buffer, offset + len);
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

var decode_read_access_specification = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  if (!decode_is_context_tag(buffer, offset + len, 0)) return;
  len++;
  var decodedValue = decode_object_id(buffer, offset + len);
  value.objectIdentifier = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  len += decodedValue.len;
  if (!decode_is_opening_tag_number(buffer, offset + len, 1)) return;
  len++;
  var property_id_and_array_index = [];
  while ((apduLen - len) > 1 && !decode_is_closing_tag_number(buffer, offset + len, 1)) {
    var p_ref = {};
    if (!IS_contextSpecific(buffer[offset + len])) return;
    var result = decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 0) return;
    if ((len + result.value) >= apduLen) return;
    decodedValue = decode_enumerated(buffer, offset + len, result.value);
    p_ref.propertyIdentifier = decodedValue.value;
    len += decodedValue.len;
    p_ref.propertyArrayIndex = BACNET_ARRAY_ALL;
    if (IS_contextSpecific(buffer[offset + len]) && !IS_CLOSING_TAG(buffer[offset + len])) {
      var tmp = decode_tag_number_and_value(buffer, offset + len);
      if (tmp.tagNumber === 1) {
        len += tmp.len;
        if ((len + tmp.value) >= apduLen) return;
        decodedValue = decode_unsigned(buffer, offset + len, tmp.value);
        p_ref.propertyArrayIndex = decodedValue.value;
        len += decodedValue.len;
      }
    }
    property_id_and_array_index.push(p_ref);
  }
  if (!decode_is_closing_tag_number(buffer, offset + len, 1)) return;
  len++;
  value.propertyReferences = property_id_and_array_index;
  return {
    len: len,
    value: value
  };
};

var decode_cov_subscription = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var result;
  var decodedValue;
  value.recipient = {};
  if (!decode_is_opening_tag_number(buffer, offset + len, 0)) return;
  len++;
  if (!decode_is_opening_tag_number(buffer, offset + len, 0)) return;
  len++;
  if (!decode_is_opening_tag_number(buffer, offset + len, 1)) return;
  len++;
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) return;
  decodedValue = decode_unsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.recipient.net = decodedValue.value;
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING) return;
  decodedValue = decode_octetString(buffer, offset + len, apduLen,  0, result.value);
  len += decodedValue.len;
  value.recipient.adr = decodedValue.value;
  if (!decode_is_closing_tag_number(buffer, offset + len, 1)) return;
  len++;
  if (!decode_is_closing_tag_number(buffer, offset + len, 0)) return;
  len++;
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = decode_unsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.subscriptionProcessIdentifier = decodedValue.value;
  if (!decode_is_closing_tag_number(buffer, offset + len, 0)) return;
  len++;
  if (!decode_is_opening_tag_number(buffer, offset + len, 1)) return;
  len++;
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  decodedValue = decode_object_id(buffer, offset + len);
  len += decodedValue.len;
  value.monitoredObjectIdentifier = {
    type: decodedValue.objectType,
    instance: decodedValue.instance
  };
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  decodedValue = decode_enumerated(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.monitoredProperty = {};
  value.monitoredProperty.propertyIdentifier = decodedValue.value;
  result = decode_tag_number_and_value(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    decodedValue = decode_unsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    value.monitoredProperty.propertyArrayIndex = decodedValue.value;
  } else {
    value.monitoredProperty.propertyArrayIndex = BACNET_ARRAY_ALL;
  }
  if (!decode_is_closing_tag_number(buffer, offset + len, 1)) return;
  len++;
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 2) return;
  value.issueConfirmedNotifications = buffer[offset + len] > 0 ? true : false;
  len++;
  result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 3) return;
  decodedValue = decode_unsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  value.timeRemaining = decodedValue.value;
  if (len < apduLen && !IS_CLOSING_TAG(buffer[offset + len])) {
    result = decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    if (result.tagNumber !== 4) return;
    decodedValue = decode_real(buffer, offset + len);
    len += decodedValue.len;
    value.covIncrement = decodedValue.value;
  }
  return {
    len: len,
    value: value
  };
};

var decode_calendar_date = function(buffer, offset) {
  return {
    len: 4,
    year: buffer[offset],
    month: buffer[offset + 1],
    day: buffer[offset + 2],
    wday: buffer[offset + 3]
  };
};

var decode_calendar_date_range = function(buffer, offset) {
  var len = 1;
  var startDate = decode_date(buffer, offset + len);
  len += startDate.len + 1;
  var endDate = decode_date(buffer, offset + len);
  len += endDate.len + 1;
  return {
    len: len,
    startDate: startDate,
    endDate: endDate
  };
};

var decode_calendar_week_day = function(buffer, offset) {
  return {
    len: 3,
    month: buffer[offset],
    week: buffer[offset + 1],
    wday: buffer[offset + 2]
  };
};

var decode_calendar = function(buffer, offset, apduLen) {
  var len = 0;
  var entries = [];
  var decodedValue;
  while (len < apduLen) {
    var result = decode_tag_number(buffer, offset + len);
    len += result.len;
    switch (result.tagNumber) {
      case 0:
        decodedValue = decode_calendar_date(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      case 1:
        decodedValue = decode_calendar_date_range(buffer, offset + len);
        len += decodedValue.len;
        entries.push(decodedValue);
        break;
      case 2:
        decodedValue = decode_calendar_week_day(buffer, offset + len);
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

var bacapp_decode_context_application_data = function(buffer, offset, max_offset, objectType, property_id) {
  var len = 0;
  var result;
  if (IS_contextSpecific(buffer[offset])) {
    if (property_id === baEnum.BacnetPropertyIds.PROP_LIST_OF_GROUP_MEMBERS) {
      result = decode_read_access_specification(buffer, offset, max_offset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_SPECIFICATION,
        value: result.value,
        len: result.len
      };
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_ACTIVE_COV_SUBSCRIPTIONS) {
      result = decode_cov_subscription(buffer, offset, max_offset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_COV_SUBSCRIPTION,
        value: result.value,
        len: result.len
      };
    } else if (objectType === baEnum.BacnetObjectTypes.OBJECT_GROUP && property_id === baEnum.acnetPropertyIds.PROP_PRESENT_VALUE) {
      result = decode_read_access_result(buffer, offset, max_offset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_RESULT,
        value: result.value,
        len: result.len
      };
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_LIST_OF_OBJECT_PROPERTY_REFERENCES || property_id === baEnum.BacnetPropertyIds.PROP_LOG_DEVICE_OBJECT_PROPERTY  || property_id === baEnum.BacnetPropertyIds.PROP_OBJECT_PROPERTY_REFERENCE) {
      result = decode_device_obj_property_ref(buffer, offset, max_offset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_PROPERTY_REFERENCE,
        value: result.value,
        len: result.len
      };
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_DATE_LIST) {
      result = decode_calendar(buffer, offset, max_offset);
      if (!result) return;
      return {
        type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTEXT_SPECIFIC_DECODED,
        value: result.value,
        len: result.len
      };
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_EVENT_TIME_STAMPS) {
      var subEvtResult;
      var evtResult = decode_tag_number_and_value(buffer, offset + len);
      len += 1;
      if (evtResult.tagNumber === 0) {
        subEvtResult = decode_bacnet_time(buffer, offset + 1);
        return {
          type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP,
          value: subEvtResult.value,
          len: subEvtResult.len + 1
        };
      } else if (evtResult.tagNumber === 1) {
        subEvtResult = decode_unsigned(buffer, offset + len, evtResult.value);
        return {
          type: baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT,
          value: subEvtResult.value,
          len: subEvtResult.len + 1
        };
      } else if (evtResult.tagNumber === 2) {
        subEvtResult = decode_bacnet_datetime(buffer, offset + len);
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
    var tagResult = decode_tag_number_and_value(buffer, offset + len);
    var multipleValues = IS_OPENING_TAG(buffer[offset + len]);
    while (((len + offset) <= max_offset) && !IS_CLOSING_TAG(buffer[offset + len])) {
      var subResult = decode_tag_number_and_value(buffer, offset + len);
      if (!subResult) return;
      if (subResult.value === 0) {
        len += subResult.len;
        result = bacapp_decode_application_data(buffer, offset + len, max_offset, baEnum.BacnetObjectTypes.MAX_BACNET_OBJECT_TYPE, baEnum.BacnetPropertyIds.MAX_BACNET_PROPERTY_ID);
        if (!result) return;
        list.push(result);
        len += result.len;
      } else {
        var override_tag_number = bacapp_context_tag_type(property_id, subResult.tagNumber);
        if (override_tag_number !== baEnum.BacnetApplicationTags.MAX_BACNET_APPLICATION_TAG) {
          subResult.tagNumber = override_tag_number;
        }
        var bacappResult = bacapp_decode_data(buffer, offset + len + subResult.len, max_offset, subResult.tagNumber, subResult.value);
        if (!bacappResult) return;
        if (bacappResult.len === subResult.value) {
          list.push({
            value: bacappResult.value,
            type: bacappResult.type
          });
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
    if ((len + offset) > max_offset) return;
    if (decode_is_closing_tag_number(buffer, offset + len, tagResult.tagNumber)) {
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

var bacapp_encode_timestamp = function(buffer, value) {
  switch (value.tag) {
    case baEnum.BacnetTimestampTags.TIME_STAMP_TIME:
      encode_context_time(buffer, 0, value);
      break;
    case baEnum.BacnetTimestampTags.TIME_STAMP_SEQUENCE:
      encodeContextUnsigned(buffer, 1, value);
      break;
    case baEnum.BacnetTimestampTags.TIME_STAMP_DATETIME:
      bacapp_encode_context_datetime(buffer, 2, value);
      break;
    case baEnum.BacnetTimestampTags.TIME_STAMP_NONE:
      break;
    default:
      throw new Error('NOT_IMPLEMENTED');
  }
};

var bacapp_encode_context_timestamp = function(buffer, tagNumber, value) {
  if (value.tag !== baEnum.BacnetTimestampTags.TIME_STAMP_NONE) {
    encode_opening_tag(buffer, tagNumber);
    bacapp_encode_timestamp(buffer, value);
    encode_closing_tag(buffer, tagNumber);
  }
};

var decode_context_character_string = function(buffer, offset, maxLength, tagNumber) {
  var len = 0;
  if (!decode_is_context_tag(buffer, offset + len, tagNumber)) return;
  var result = decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  var decodedValue = multi_charset_characterstring_decode(buffer, offset + 1 + len, maxLength, buffer[offset + len], result.value - 1);
  if (!decodedValue) return;
  len += result.value;
  return {
    len: len,
    value: decodedValue.value
  };
};

var decode_tag_number = function(buffer, offset) {
  var len = 1;
  var tagNumber;
  if (IS_EXTENDED_tagNumber(buffer[offset])) {
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

var decode_is_context_tag_with_length = function(buffer, offset, tagNumber) {
  var result = decode_tag_number(buffer, offset);
  return {
    len: result.len,
    value: IS_contextSpecific(buffer[offset]) && (result.tagNumber === tagNumber)
  };
};

var decode_context_bacnet_time = function(buffer, offset, tagNumber) {
  var result = decode_is_context_tag_with_length(buffer, offset, tagNumber);
  if (!result.value) return;
  var decodedValue = decode_bacnet_time(buffer, offset + result.len);
  return {
    len: result.len + decodedValue.len,
    value: decodedValue.value
  };
};

var decode_context_date = function(buffer, offset, tagNumber) {
  var result = decode_is_context_tag_with_length(buffer, offset, tagNumber);
  if (!result.value) return;
  var decodedValue = decode_date(buffer, offset + result.len);
  return {
    len: result.len + decodedValue.len,
    value: decodedValue.value
  };
};

var decode_context_object_id = function(buffer, offset, tagNumber) {
  var result = decode_is_context_tag_with_length(buffer, offset, tagNumber);
  if (!result.value) return;
  var decodedValue = decode_object_id(buffer, offset + result.len);
  return {
    len: result.len + decodedValue.len,
    value: decodedValue.value
  };
};

var bacapp_decode_context_data = function(buffer, offset, maxApduLen, propertyTag) {
  var len = 0;
  var decodedValue;
  if (IS_contextSpecific(buffer[offset])) {
    var result = decode_tag_number_and_value(buffer, offset);
    len = result.len;
    if (len > 0 && (len <= maxApduLen) && !decode_is_closing_tag_number(buffer, offset + len, result.tagNumber)) {
      if (propertyTag < baEnum.BacnetApplicationTags.MAX_BACNET_APPLICATION_TAG) {
        decodedValue = bacapp_decode_data(buffer, offset + len, maxApduLen, propertyTag, result.value);
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

var encode_bacnet_character_string = function(buffer, value) {
  buffer.buffer[buffer.offset++] = baEnum.BacnetCharacterStringEncodings.CHARACTER_UTF8;
  buffer.offset += buffer.buffer.write(value, buffer.offset, undefined, 'utf8');
};

var encode_application_character_string = function(buffer, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encode_bacnet_character_string(tmp, value);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING, false, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};

var encode_context_character_string = module.exports.encode_context_character_string = function(buffer, tagNumber, value) {
  var tmp = {
    buffer: Buffer.alloc(1472),
    offset: 0
  };
  encode_bacnet_character_string(tmp, value);
  encodeTag(buffer, tagNumber, true, tmp.offset);
  tmp.buffer.copy(buffer.buffer, buffer.offset, 0, tmp.offset);
  buffer.offset += tmp.offset;
};
