var baEnum = require('./bacnet-enum');

var BACNET_MAX_OBJECT = module.exports.BACNET_MAX_OBJECT = 0x3FF;
var BACNET_INSTANCE_BITS = module.exports.BACNET_INSTANCE_BITS = 22;
var BACNET_MAX_INSTANCE = module.exports.BACNET_MAX_INSTANCE = 0x3FFFFF;
var MAX_BITSTRING_BYTES = module.exports.MAX_BITSTRING_BYTES = 15;
var BACNET_ARRAY_ALL = module.exports.BACNET_ARRAY_ALL = 0xFFFFFFFF;
var BACNET_NO_PRIORITY = module.exports.BACNET_NO_PRIORITY = 0;
var BACNET_MIN_PRIORITY = module.exports.BACNET_MIN_PRIORITY = 1;
var BACNET_MAX_PRIORITY = module.exports.BACNET_MAX_PRIORITY = 16;

var encodeUnsigned16 = function(buffer, value) {
  buffer.buffer.writeUIntBE(value, buffer.offset, 2);
  buffer.offset += 2;
};

var encodeUnsigned24 = function(buffer, value) {
  buffer.buffer.writeUIntBE(value, buffer.offset, 3);
  buffer.offset += 3;
};

var encodeUnsigned32 = function(buffer, value) {
  buffer.buffer.writeUIntBE(value, buffer.offset, 4);
  buffer.offset += 4;
};

var encodeSigned16 = function(buffer, value) {
  buffer.buffer.writeIntBE(value, buffer.offset, 2);
  buffer.offset += 2;
};

var encodeSigned24 = function(buffer, value) {
  buffer.buffer.writeIntBE(value, buffer.offset, 3);
  buffer.offset += 3;
};

var encodeSigned32 = function(buffer, value) {
  buffer.buffer.writeIntBE(value, buffer.offset, 4);
  buffer.offset += 4;
};

var encode_bacnet_real = function(buffer, value) {
  buffer.buffer.writeFloatBE(value, buffer.offset);
  buffer.offset += 4;
};

var encode_bacnet_double = function(buffer, value) {
  buffer.buffer.writeDoubleBE(value, buffer.offset);
  buffer.offset += 8;
};

var encodeBacnetObjectId = module.exports.encodeBacnetObjectId = function(buffer, objectType, instance) {
  var value = ((objectType & BACNET_MAX_OBJECT) << BACNET_INSTANCE_BITS) | (instance & BACNET_MAX_INSTANCE);
  encodeUnsigned32(buffer, value);
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
      encodeUnsigned16(buffer, lenValueType);
    } else {
      tmp[len++] = 255;
      Buffer.from(tmp).copy(buffer.buffer, buffer.offset, 0, len);
      buffer.offset += len;
      encodeUnsigned32(buffer, lenValueType);
    }
  }
};

var encodeBacnetEnumerated = function(buffer, value) {
  encodeBacnetUnsigned(buffer, value);
};

var encodeBacnetUnsigned = function(buffer, value) {
  if (value < 0x100) {
    buffer.buffer.writeUInt8(value, buffer.offset);
    buffer.offset += 1;
  } else if (value < 0x10000) {
    encodeUnsigned16(buffer, value);
  } else if (value < 0x1000000) {
    encodeUnsigned24(buffer, value);
  } else {
    encodeUnsigned32(buffer, value);
  }
}

var encodeContextBoolean = function(buffer, tagNumber, booleanValue) {
  encodeTag(buffer, tagNumber, true, 1);
  buffer.Add(booleanValue ? 1 : 0);
}

var encodeContextReal = function(buffer, tagNumber, value) {
  encodeTag(buffer, tagNumber, true, 4);
  encode_bacnet_real(buffer, value);
}

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

var encode_application_octetString = function(buffer, octetString, octetOffset, octetCount) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_octetString, false, octetCount);
  encode_octetString(buffer, octetString, octetOffset, octetCount);
};

var encode_application_boolean = function(buffer, booleanValue) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, false, booleanValue ? 1 : 0);
};

var encode_application_real = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL, false, 4);
  encode_bacnet_real(buffer, value);
};

var encode_application_double = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE, false, 8);
  encode_bacnet_double(buffer, value);
};

var bitstring_bytes_used = function(bitString) {
  var len = 0;
  if (bitString.bits_used > 0) {
    var lastBit = (bitString.bits_used - 1);
    var usedBytes = (lastBit / 8);
    usedBytes++;
    len = usedBytes;
  }
  return len;
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
  if (bitString.value != null) {
    if (octetIndex < MAX_BITSTRING_BYTES) {
      octet = bitString.value[octetIndex];
    }
  }
  return octet;
};

var encode_bitstring = function(buffer, bitString) {
  if (bitString.bits_used === 0) {
    buffer.Add(0);
  } else {
    var usedBytes = bitstring_bytes_used(bitString);
    var remainingUsedBits = bitString.bits_used - ((usedBytes - 1) * 8);
    buffer.Add((8 - remainingUsedBits));
    for (var i = 0; i < usedBytes; i++) {
      buffer.Add(byte_reverse_bits(bitstring_octet(bitString, i)));
    }
  }
};

var encode_application_bitstring = function(buffer, bitString) {
  var bitStringEncodedLength = 1;
  bitStringEncodedLength += bitstring_bytes_used(bitString);
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_bitString, false, bitStringEncodedLength);
  encode_bitstring(buffer, bitString);
};

var bacapp_encode_application_data = function(buffer, value) {
  if (value.value === null) {
    buffer.Add(BacnetApplicationTags.BACNET_APPLICATION_TAG_NULL);
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
      encode_application_octetString(buffer, value.Value, 0, (value.Value).Length);
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
    // Added for EventTimeStamp
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
      break;
  }
};

var bacapp_encode_device_obj_property_ref = function(buffer, value) {
  encode_context_object_id(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encodeContextEnumerated(buffer, 1, value.propertyIdentifier);
  if (value.arrayIndex != ASN1.BACNET_ARRAY_ALL) {
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
    case BacnetPropetyState.BacnetPropertyStateTypes.BOOLEAN_VALUE:
      encodeContextBoolean(buffer, 0, value.state === 1 ? true : false);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.BINARY_VALUE:
      encodeContextEnumerated(buffer, 1, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.EVENT_TYPE:
      encodeContextEnumerated(buffer, 2, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.POLARITY:
      encodeContextEnumerated(buffer, 3, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.PROGRAM_CHANGE:
      encodeContextEnumerated(buffer, 4, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.PROGRAM_STATE:
      encodeContextEnumerated(buffer, 5, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.REASON_FOR_HALT:
      encodeContextEnumerated(buffer, 6, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.RELIABILITY:
      encodeContextEnumerated(buffer, 7, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.STATE:
      encodeContextEnumerated(buffer, 8, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.SYSTEM_STATUS:
      encodeContextEnumerated(buffer, 9, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.UNITS:
      encodeContextEnumerated(buffer, 10, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.UNSIGNED_VALUE:
      encodeContextUnsigned(buffer, 11, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.LIFE_SAFETY_MODE:
      encodeContextEnumerated(buffer, 12, value.state);
      break;
    case BacnetPropetyState.BacnetPropertyStateTypes.LIFE_SAFETY_STATE:
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

var encode_opening_tag = function(buffer, tagNumber) {
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

var encode_context_object_id = module.exports.encode_context_object_id = function(buffer, tagNumber, objectType, instance) {
  encodeTag(buffer, tagNumber, true, 4);
  encodeBacnetObjectId(buffer, objectType, instance);
};

var encode_closing_tag = function(buffer, tagNumber) {
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

var encode_bacnet_time = function(buffer, value) {
  buffer.Add(value.Hour);
  buffer.Add(value.Minute);
  buffer.Add(value.Second);
  buffer.Add(value.Millisecond / 10);
};

var encode_context_time = function(buffer, tagNumber, value) {
  encodeTag(buffer, tagNumber, true, 4);
  encode_bacnet_time(buffer, value);
};

var encode_application_date = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE, false, 4);
  encode_bacnet_date(buffer, value);
};

var encode_application_time = function(buffer, value) {
  encodeTag(buffer, baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME, false, 4);
  encode_bacnet_time(buffer, value);
};

var encode_read_access_specification = module.exports.encode_read_access_specification = function(buffer, value) {
  encode_context_object_id(buffer, 0, value.objectIdentifier.type, value.objectIdentifier.instance);
  encode_opening_tag(buffer, 1);
  value.propertyReferences.forEach(function(p) {
    encodeContextEnumerated(buffer, 0, p.propertyIdentifier);
    if (p.propertyArrayIndex !== undefined && p.propertyArrayIndex !== BACNET_ARRAY_ALL) {
      encodeContextUnsigned(buffer, 1, p.propertyArrayIndex);
    }
  });
  encode_closing_tag(buffer, 1);
}

var decode_unsigned = module.exports.decode_unsigned = function(buffer, offset, lenValue) {
  switch (lenValue) {
    case 1:
      return decode_unsigned8(buffer, offset);
    case 2:
      return decode_unsigned16(buffer, offset);
    case 3:
      return decode_unsigned24(buffer, offset);
    case 4:
      return decode_unsigned32(buffer, offset);
    default:
      return;
  }
};

var decode_unsigned32 = function(buffer, offset) {
  var value = (buffer[offset + 0] << 24) & 0xff000000;
  value |= (buffer[offset + 1] << 16) & 0x00ff0000;
  value |= (buffer[offset + 2] << 8) & 0x0000ff00;
  value |= buffer[offset + 3] & 0x000000ff;
  return {
    len: 4,
    value: value
  };
};

var decode_unsigned24 = function(buffer, offset) {
  var value = (buffer[offset + 0] << 16) & 0x00ff0000;
  value |= (buffer[offset + 1] << 8) & 0x0000ff00;
  value |= buffer[offset + 2] & 0x000000ff;
  return {
    len: 3,
    value: value
  };
};

var decode_unsigned16 = function(buffer, offset) {
  var value = (buffer[offset + 0] << 8) & 0x0000ff00;
  value |= buffer[offset + 1] & 0x000000ff;
  return {
    len: 2,
    value: value
  };
};

var decode_unsigned8 = function(buffer, offset) {
  var value = buffer[offset + 0];
  return {
    len: 1,
    value: value
  };
};

var decode_signed32 = function(buffer, offset) {
  var value = (buffer[offset + 0] << 24) & 0xff000000;
  value |= (buffer[offset + 1] << 16) & 0x00ff0000;
  value |= (buffer[offset + 2] << 8) & 0x0000ff00;
  value |= buffer[offset + 3] & 0x000000ff;
  return {
    len: 4,
    value: value
  };
};

var decode_signed24 = function(buffer, offset) {
  var value = (buffer[offset + 0] << 16) & 0x00ff0000;
  value |= (buffer[offset + 1] << 8) & 0x0000ff00;
  value |= buffer[offset + 2] & 0x000000ff;
  return {
    len: 3,
    value: value
  };
};

var decode_signed16 = function(buffer, offset) {
  var value = (buffer[offset + 0] << 8) & 0x0000ff00;
  value |= buffer[offset + 1] & 0x000000ff;
  return {
    len: 2,
    value: value
  };
};

var decode_signed8 = function(buffer, offset) {
  var value = buffer[offset + 0];
  return {
    len: 1,
    value: value
  };
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

var decode_tagNumber = function(buffer, offset) {
  var len = 1;
  var tagNumber;
  if (IS_EXTENDED_tagNumber(buffer[offset])) {
    tagNumber = buffer[offset+1];
    len++;
  } else {
    tagNumber = buffer[offset] >> 4;
  }
  return {
    len: len,
    tagNumber: tagNumber
  };
};

var decode_signed = function(buffer, offset, lenValue) {
  var value;
  switch (len_value) {
    case 1:
      value = decode_signed8(buffer, offset).value;
      break;
    case 2:
      value = decode_signed16(buffer, offset).value;
      break;
    case 3:
      value = decode_signed24(buffer, offset).value;
      break;
    case 4:
      value = decode_signed32(buffer, offset).value;
      break;
    default:
      value = 0;
      break;
  }
  return {
    len: lenValue,
    value: value
  };
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
      break;
    default:
      nodeEncoding = 'latin1';
      break;
  }
  return {
    value: buffer.toString(nodeEncoding, offset, offset + length),
    len: length
  }
};

var decode_character_string = function(buffer, offset, maxLength, lenValue) {
  return multi_charset_characterstring_decode(buffer, offset + 1, maxLength, buffer[offset], lenValue - 1);
};

var decode_object_id = module.exports.decode_object_id = function(buffer, offset) {
  var result = decode_unsigned32(buffer, offset);
  var objectType = (result.value >> BACNET_INSTANCE_BITS) & BACNET_MAX_OBJECT;
  var instance = result.value & BACNET_MAX_INSTANCE;
  return {
    len: result.len,
    objectType: objectType,
    instance: instance
  };
};

var decode_object_id_safe = function(buffer, offset, uint len_value) {
  if (len_value != 4) {
    return {
      len: 0,
      objectType: 0,
      instance: 0
    };
  } else {
    return decode_object_id(buffer, offset, out objectType, out instance);
  }
};

var bacapp_decode_data = function(buffer, offset, maxLength, tagDataType, lenValueType) {
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
      value.value = result.uintValue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_SIGNED_INT:
      result = decode_signed(buffer, offset, lenValueType);
      value.value = result.intValue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL:
      // FIXME
      //result = decode_real_safe(buffer, offset, lenValueType);
      value.value = result.floatValue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DOUBLE:
      result = decode_double_safe(buffer, offset, lenValueType);
      value.value = result.double_value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OCTET_STRING:
      result = decode_octetString(buffer, offset, maxLength, octetString, 0, lenValueType);
      value.value = result.octetString;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CHARACTER_STRING:
      result = decode_character_string(buffer, offset, maxLength, lenValueType);
      value.len = result.len;
      value.value = result.value;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BIT_STRING:
      result = decode_bitstring(buffer, offset, lenValueType);
      value.value = result.bitValue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED:
      result = decode_enumerated(buffer, offset, lenValueType);
      value.value = result.uintValue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE:
      result = decode_date_safe(buffer, offset, lenValueType);
      value.value = result.dateValue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME:
      result = decode_bacnet_time_safe(buffer, offset, lenValueType);
      value.value = result.timeTalue;
      break;
    case baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID:
      result = decode_object_id_safe(buffer, offset, lenValueType);
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
        case 4:
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
        case 0:
        case 2:
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

var bacapp_decode_application_data = module.exports.bacapp_decode_application_data = function(buffer, offset, maxOffset, objectType, propertyId) {
  var value = {
    len: 0
  };
  if (!IS_contextSpecific(buffer[offset])) {
    var result = decode_tag_number_and_value(buffer, offset);
    if (result.len > 0) {
      value.len += result.len;
      result = bacapp_decode_data(buffer, offset + value.len, maxOffset, result.tagNumber, result.value);
      if (result.len < 0) {
        return;
      }
      value.len += result.len;
      value.type = result.type;
      value.value = result.value;
    }
  } else {
    return bacapp_decode_context_application_data(buffer, offset, maxOffset, objectType, propertyId);
  }
  return value;
}

var bacapp_decode_context_application_data = function(buffer, offset, max_offset, objectType, property_id) {
  var value = {
    len: 0
  };
  if (IS_contextSpecific(buffer[offset])) {
    if (property_id === baEnum.BacnetPropertyIds.PROP_LIST_OF_GROUP_MEMBERS) {
      var result = ASN1.decode_read_access_specification(buffer, offset, max_offset);
      if (result.tagLen < 0) {
        return;
      }
      value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_SPECIFICATION;
      value.value = result.value;
      return value;
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_ACTIVE_COV_SUBSCRIPTIONS) {
      var result = ASN1.decode_cov_subscription(buffer, offset, max_offset);
      if (result.tagLen < 0) {
        return;
      }
      value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_COV_SUBSCRIPTION;
      value.value = result.value;
      return value;
    } else if (objectType === baEnum.BacnetObjectTypes.OBJECT_GROUP && property_id === baEnum.BacnetPropertyIds.PROP_PRESENT_VALUE) {
      var result = ASN1.decode_read_access_result(buffer, offset, max_offset);
      if (result.tagLen < 0) {
        return;
      }
      value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_READ_ACCESS_RESULT;
      value.value = result.value;
      return value;
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_LIST_OF_OBJECT_PROPERTY_REFERENCES || property_id === baEnum.BacnetPropertyIds.PROP_LOG_DEVICE_OBJECT_PROPERTY) {
      var result = ASN1.decode_device_obj_property_ref(buffer, offset, max_offset);
      if (result.tagLen < 0) {
        return;
      }
      value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_PROPERTY_REFERENCE;
      value.value = result.value;
      return value;
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_DATE_LIST) {
      // TODO: WTF?
      var result = v.ASN1decode(buffer, offset, max_offset);
      if (result.tagLen < 0) {
        return;
      }
      value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTENT_SPECIFIC_DECODED;
      value.value = result.value;
      return value;
    } else if (property_id === baEnum.BacnetPropertyIds.PROP_EVENT_TIME_STAMPS) {
      var result = ASN1.decode_tagNumber_and_value(buffer, offset + value.len);
      value.len++;
      if (tagNumber === 0) {
        var result = decode_bacnet_time(buffer, offset + value.len);
        value.len += result.len;
        value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP;
        value.value = result.value;
      } else if (tagNumber === 1) {
        var result = decode_unsigned(buffer, offset + value.len, lenValueType);
        value.len += result.len;
        value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT;
        value.value = result.value;
      } else if (tagNumber === 2) {
        var result = decode_bacnet_datetime(buffer, offset + value.len);
        value.len += result.len;
        value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIMESTAMP;
        value.len++;
        value.value = result.value;
      } else {
        return;
      }
      return value;
    }

    value.tag = baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_CONTENT_SPECIFIC_DECODED;
    var list = [];
    var result = decode_tag_number_and_value(buffer, offset + value.len);
    var multiplValue = IS_OPENING_TAG(buffer[offset + value.len]);
    while ((value.len + offset) <= max_offset && !IS_CLOSING_TAG(buffer[offset + value.len])) {
      var result = decode_tag_number_and_value(buffer, offset + value.len);
      // tagLen,  out sub_tagNumber, out lenValueType
      if (result.tagLen < 0) {
        return;
      }
      if (result.lenValueType === 0) {
        value.len += result.tagLen;
        var result = bacapp_decode_application_data(buffer, offset + value.len, max_offset, baEnum.BacnetObjectTypes.MAX_BACNET_OBJECT_TYPE, baEnum.BacnetPropertyIds.MAX_BACNET_PROPERTY_ID);
        if (tagLen < 0) {
          return;
        }
        list.push(result.value);
        value.len += result.len;
      }
      if (multiplValue === false) {
        value = list[0];
        return value;
      }
    }
    if ((value.len + offset) > max_offset) {
      return;
    }
    if (decode_is_closing_tag_number(buffer, offset + value.len, result.tagNumber)) {
      value.len++;
    }
    value.value = list;
  } else {
    return;
  }
  return value;
}

var decode_object_id = function(buffer, offset) {
  var result = decode_unsigned32(buffer, offset);
  var objectType = (result.value >> BACNET_INSTANCE_BITS) & BACNET_MAX_OBJECT;
  var instance = result.value & BACNET_MAX_INSTANCE;
  return {
    len: result.len,
    objectType: objectType,
    instance: instance
  };
};

var decode_enumerated = module.exports.decode_enumerated = function(buffer, offset, lenValue) {
  return decode_unsigned(buffer, offset, lenValue);
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

var decode_tag_number_and_value = module.exports.decode_tag_number_and_value = function(buffer, offset) {
  var value;
  var result = decode_tagNumber(buffer, offset);
  var len = result.len;
  if (IS_EXTENDED_VALUE(buffer[offset])) {
    if (buffer[offset + len] === 255) {
      len++;
      result = decode_unsigned32(buffer, offset + len);
      len += result.len;
      value = result.value;
    } else if (buffer[offset + len] === 254) {
      len++;
      result = decode_unsigned16(buffer, offset + len);
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

var encode_cov_subscription = function(buffer, value) {
  ASN1.encode_opening_tag(buffer, 0);
  ASN1.encode_opening_tag(buffer, 0);
  ASN1.encode_opening_tag(buffer, 1);
  ASN1.encode_application_unsigned(buffer, value.Recipient.net);
  if (value.Recipient.net === 0xFFFF) {
    ASN1.encode_application_octetString(buffer, new byte[0], 0, 0);
  } else {
    ASN1.encode_application_octetString(buffer, value.Recipient.adr, 0, value.Recipient.adr.Length);
  }
  ASN1.encode_closing_tag(buffer, 1);
  ASN1.encode_closing_tag(buffer, 0);
  ASN1.encodeContextUnsigned(buffer, 1, value.subscriptionProcessIdentifier);
  ASN1.encode_closing_tag(buffer, 0);
  ASN1.encode_opening_tag(buffer, 1);
  ASN1.encode_context_object_id(buffer, 0, value.monitoredObjectIdentifier.type, value.monitoredObjectIdentifier.instance);
  ASN1.encodeContextEnumerated(buffer, 1, value.monitoredProperty.propertyIdentifier);
  if (value.monitoredProperty.propertyArrayIndex != ASN1.BACNET_ARRAY_ALL) {
    ASN1.encodeContextUnsigned(buffer, 2, value.monitoredProperty.propertyArrayIndex);
  }
  ASN1.encode_closing_tag(buffer, 1);
  ASN1.encodeContextBoolean(buffer, 2, value.IssueConfirmedNotifications);
  ASN1.encodeContextUnsigned(buffer, 3, value.TimeRemaining);
  if (value.COVIncrement > 0) {
    ASN1.encodeContextReal(buffer, 4, value.COVIncrement);
  }
};
