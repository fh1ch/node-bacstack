var baAsn1        = require('./bacnet-asn1');
var baEnum        = require('./bacnet-enum');

module.exports.encodeIamBroadcast = function(buffer, deviceId, maxApdu, segmentation, vendorId) {
  baAsn1.encode_application_object_id(buffer, baEnum.BacnetObjectTypes.OBJECT_DEVICE, deviceId);
  baAsn1.encode_application_unsigned(buffer, maxApdu);
  baAsn1.encode_application_enumerated(buffer, segmentation);
  baAsn1.encode_application_unsigned(buffer, vendorId);
};

module.exports.decodeIamBroadcast = function(buffer, offset) {
  var result;
  var apduLen = 0;
  var orgOffset = offset;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_OBJECT_ID) {
    return;
  }
  result = baAsn1.decode_object_id(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.objectType !== baEnum.BacnetObjectTypes.OBJECT_DEVICE) {
    return;
  }
  var deviceId = result.instance;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) {
    return;
  }
  result = baAsn1.decode_unsigned(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  var maxApdu = result.value;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_ENUMERATED) {
    return;
  }
  result = baAsn1.decode_enumerated(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  if (result.value > baEnum.BacnetSegmentations.SEGMENTATION_NONE) {
    return;
  }
  var segmentation = result.value;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + apduLen);
  apduLen += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_UNSIGNED_INT) {
    return;
  }
  result = baAsn1.decode_unsigned(buffer, offset + apduLen, result.value);
  apduLen += result.len;
  if (result.value > 0xFFFF) {
    return;
  }
  var vendorId = result.value;
  return {
    len: offset - orgOffset,
    deviceId: deviceId,
    maxApdu: maxApdu,
    segmentation: segmentation,
    vendorId: vendorId
  };
};

module.exports.EncodeWhoHasBroadcast = function(buffer, lowLimit, highLimit, objectId, objectName) {
  if ((lowLimit >= 0) && (lowLimit <= baAsn1.BACNET_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baAsn1.BACNET_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
  if (objectName && objectName === '') {
    baAsn1.encode_context_character_string(buffer, 3, objectName);
  } else {
    baAsn1.encode_context_object_id(buffer, 2, objectId.type, objectId.instance);
  }
};

module.exports.DecodeWhoHasBroadcast = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var decodedValue;
  var result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber === 0) {
    decodedValue = baAsn1.decode_unsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
      value.lowLimit = decodedValue.value;
    }
    result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 1) {
    decodedValue = baAsn1.decode_unsigned(buffer, offset + len, result.value);
    len += decodedValue.len;
    if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
      value.highLimit = decodedValue.value;
    }
    result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
  }
  if (result.tagNumber === 2) {
    decodedValue = baAsn1.decode_object_id(buffer, offset + len);
    len += decodedValue.len;
    value.objId = {type: decodedValue.objectType, instance: decodedValue.instance};
  }
  if (result.tagNumber === 3) {
    decodedValue = baAsn1.decode_character_string(buffer, offset + len, apduLen - (offset + len), result.value);
    len += decodedValue.len;
    value.objName = decodedValue.value;
  }
  value.len = len;
  return value;
};

module.exports.EncodeWhoIsBroadcast = function(buffer, lowLimit, highLimit) {
  if ((lowLimit >= 0) && (lowLimit <= baAsn1.BACNET_MAX_INSTANCE) && (highLimit >= 0) && (highLimit <= baAsn1.BACNET_MAX_INSTANCE)) {
    baAsn1.encodeContextUnsigned(buffer, 0, lowLimit);
    baAsn1.encodeContextUnsigned(buffer, 1, highLimit);
  }
};

module.exports.DecodeWhoIsBroadcast = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  if (apduLen <= 0) return;
  var result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 0) return;
  if (apduLen <= len) return;
  var decodedValue = baAsn1.decode_unsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
    value.lowLimit = decodedValue.value;
  }
  if (apduLen <= len) return;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) return;
  if (apduLen <= len) return;
  decodedValue = baAsn1.decode_unsigned(buffer, offset + len, result.value);
  len += decodedValue.len;
  if (decodedValue.value <= baAsn1.BACNET_MAX_INSTANCE) {
    value.highLimit = decodedValue.value;
  }
  value.len = len;
  return value;
};

module.exports.EncodeIhaveBroadcast = function(buffer, deviceId, objectId, objectName) {
  baAsn1.encode_application_object_id(buffer, deviceId.type, deviceId.instance);
  baAsn1.encode_application_object_id(buffer, objectId.type, objectId.instance);
  baAsn1.encode_application_character_string(buffer, objectName);
};

module.exports.EncodeAlarmAcknowledge = function(buffer, ackProcessIdentifier, eventObjectIdentifier, eventStateAcked, ackSource, eventTimeStamp, ackTimeStamp) {
  baAsn1.encodeContextUnsigned(buffer, 0, ackProcessIdentifier);
  baAsn1.encode_context_objectId(buffer, 1, eventObjectIdentifier.type, eventObjectIdentifier.instance);
  baAsn1.encodeContextEnumerated(buffer, 2, eventStateAcked);
  baAsn1.bacapp_encode_context_timestamp(buffer, 3, eventTimeStamp);
  baAsn1.encode_context_character_string(buffer, 4, ackSource);
  baAsn1.bacapp_encode_context_timestamp(buffer, 5, ackTimeStamp);
};

module.exports.EncodeAtomicReadFile = function(buffer, isStream, objectId, position, count) {
  baAsn1.encode_application_object_id(buffer, objectId.type, objectId.instance);
  if (isStream) {
    baAsn1.encode_opening_tag(buffer, 0);
    baAsn1.encode_application_signed(buffer, position);
    baAsn1.encode_application_unsigned(buffer, count);
    baAsn1.encode_closing_tag(buffer, 0);
  } else {
    baAsn1.encode_opening_tag(buffer, 1);
    baAsn1.encode_application_signed(buffer, position);
    baAsn1.encode_application_unsigned(buffer, count);
    baAsn1.encode_closing_tag(buffer, 1);
  }
};

module.exports.EncodeAtomicReadFileAcknowledge = function(buffer, isStream, endOfFile, position, blockCount, blocks, counts) {
  baAsn1.encode_application_boolean(buffer, endOfFile);
  if (isStream) {
    baAsn1.encode_opening_tag(buffer, 0);
    baAsn1.encode_application_signed(buffer, position);
    baAsn1.encode_application_octet_string(buffer, blocks[0], 0, counts[0]);
    baAsn1.encode_closing_tag(buffer, 0);
  } else {
    baAsn1.encode_opening_tag(buffer, 1);
    baAsn1.encode_application_signed(buffer, position);
    baAsn1.encode_application_unsigned(buffer, blockCount);
    for (var i = 0; i < blockCount; i++) {
      baAsn1.encode_application_octet_string(buffer, blocks[i], 0, counts[i]);
    }
    baAsn1.encode_closing_tag(buffer, 1);
  }
};

module.exports.EncodeAtomicWriteFile = function(buffer, isStream, objectId, position, blockCount, blocks, counts) {
  baAsn1.encode_application_object_id(buffer, objectId.type, objectId.instance);
  if (isStream) {
    baAsn1.encode_opening_tag(buffer, 0);
    baAsn1.encode_application_signed(buffer, position);
    baAsn1.encode_application_octet_string(buffer, blocks[0], 0, counts[0]);
    baAsn1.encode_closing_tag(buffer, 0);
  } else {
    baAsn1.encode_opening_tag(buffer, 1);
    baAsn1.encode_application_signed(buffer, position);
    baAsn1.encode_application_unsigned(buffer, blockCount);
    for (var i = 0; i < blockCount; i++) {
      baAsn1.encode_application_octet_string(buffer, blocks[i], 0, counts[i]);
    }
    baAsn1.encode_closing_tag(buffer, 1);
  }
};

module.exports.EncodeCreateProperty = function(buffer, objectId, valueList) {
  baAsn1.encode_opening_tag(buffer, 0);
  baAsn1.encode_context_object_id(buffer, 1, objectId.type, objectId.instance);
  baAsn1.encode_closing_tag(buffer, 0);
  baAsn1.encode_opening_tag(buffer, 1);
  valueList.forEach(function(propertyValue) {
    baAsn1.encode_context_enumerated(buffer, 0, propertyValue.property.propertyIdentifier);
    if (propertyValue.property.propertyArrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
      baAsn1.encode_context_unsigned(buffer, 1, propertyValue.property.propertyArrayIndex);
    }
    baAsn1.encode_opening_tag(buffer, 2);
    propertyValue.value.forEach(function(value) {
      baAsn1.bacapp_encode_application_data(buffer, value);
    });
    baAsn1.encode_closing_tag(buffer, 2);
    if (propertyValue.priority !== baAsn1.BACNET_NO_PRIORITY) {
      baAsn1.encode_context_unsigned(buffer, 3, propertyValue.priority);
    }
  });
  baAsn1.encode_closing_tag(buffer, 1);
};

module.exports.EncodeAddListElement = function(buffer, objectId, propertyId, arrayIndex, valueList) {
  baAsn1.encode_context_object_id(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encode_context_enumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encode_context_unsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encode_opening_tag(buffer, 3);
  valueList.forEach(function(value) {
    baAsn1.bacapp_encode_application_data(buffer, value);
  });
  baAsn1.encode_closing_tag(buffer, 3);
};

module.exports.EncodeAtomicWriteFileAcknowledge = function(buffer, isStream, position) {
  if (isStream) {
    baAsn1.encode_context_signed(buffer, 0, position);
  } else {
    baAsn1.encode_context_signed(buffer, 1, position);
  }
};

module.exports.EncodeSubscribeProperty = function(buffer, subscriberProcessIdentifier, monitoredObjectIdentifier, cancellationRequest, issueConfirmedNotifications, lifetime, monitoredProperty, covIncrementPresent, covIncrement) {
  baAsn1.encode_context_unsigned(buffer, 0, subscriberProcessIdentifier);
  baAsn1.encode_context_object_id(buffer, 1, monitoredObjectIdentifier.type, monitoredObjectIdentifier.instance);
  if (!cancellationRequest) {
    baAsn1.encode_context_boolean(buffer, 2, issueConfirmedNotifications);
    baAsn1.encode_context_unsigned(buffer, 3, lifetime);
  }
  baAsn1.encode_opening_tag(buffer, 4);
  baAsn1.encode_context_enumerated(buffer, 0, monitoredProperty.propertyIdentifier);
  if (monitoredProperty.propertyArrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encode_context_unsigned(buffer, 1, monitoredProperty.propertyArrayIndex);
  }
  baAsn1.encode_closing_tag(buffer, 4);
  if (covIncrementPresent) {
    baAsn1.encode_context_real(buffer, 5, covIncrement);
  }
};

module.exports.EncodeAlarmSummary = function(buffer, objectIdentifier, alarmState, acknowledgedTransitions) {
  baAsn1.encode_application_object_id(buffer, objectIdentifier.type, objectIdentifier.instance);
  baAsn1.encode_application_enumerated(buffer, alarmState);
  baAsn1.encode_application_bitstring(buffer, acknowledgedTransitions);
};

module.exports.EncodeGetEventInformation = function(buffer, sendLast, lastReceivedObjectIdentifier) {
  if (sendLast) {
    baAsn1.encode_context_objectId(buffer, 0, lastReceivedObjectIdentifier.type, lastReceivedObjectIdentifier.instance);
  }
};

module.exports.EncodeGetEventInformationAcknowledge = function(buffer, events, moreEvents) {
  var i;
  baAsn1.encode_opening_tag(buffer, 0);
  events.forEach(function(eventData) {
    baAsn1.encode_context_object_id(buffer, 0, eventData.objectIdentifier.type, eventData.objectIdentifier.instance);
    baAsn1.encode_context_enumerated(buffer, 1, eventData.eventState);
    baAsn1.encode_context_bitstring(buffer, 2, eventData.acknowledgedTransitions);
    baAsn1.encode_opening_tag(buffer, 3);
    for (i = 0; i < 3; i++) {
      baAsn1.bacapp_encode_timestamp(buffer, eventData.eventTimeStamps[i]);
    }
    baAsn1.encode_closing_tag(buffer, 3);
    baAsn1.encode_context_enumerated(buffer, 4, eventData.notifyType);
    baAsn1.encode_context_bitstring(buffer, 5, eventData.eventEnable);
    baAsn1.encode_opening_tag(buffer, 6);
    for (i = 0; i < 3; i++) {
      baAsn1.encode_application_unsigned(buffer, eventData.eventPriorities[i]);
    }
    baAsn1.encode_closing_tag(buffer, 6);
  });
  baAsn1.encode_closing_tag(buffer, 0);
  baAsn1.encode_context_boolean(buffer, 1, moreEvents);
};

module.exports.EncodeLifeSafetyOperation = function(buffer, processId, requestingSrc, operation, targetObject) {
  baAsn1.encodeContextUnsigned(buffer, 0, processId);
  baAsn1.encode_context_character_string(buffer, 1, requestingSrc);
  baAsn1.encodeContextEnumerated(buffer, 2, operation);
  baAsn1.encode_context_objectId(buffer, 3, targetObject.type, targetObject.instance);
};

module.exports.EncodePrivateTransferConfirmed = function(buffer, vendorID, serviceNumber, data) {
  baAsn1.encodeContextUnsigned(buffer, 0, vendorID);
  baAsn1.encodeContextUnsigned(buffer, 1, serviceNumber);
  baAsn1.encode_opening_tag(buffer, 2);
  buffer.Add(data, data.Length);
  baAsn1.encode_closing_tag(buffer, 2);
};

module.exports.EncodePrivateTransferUnconfirmed = function(buffer, vendorID, serviceNumber, data) {
  baAsn1.encodeContextUnsigned(buffer, 0, vendorID);
  baAsn1.encodeContextUnsigned(buffer, 1, serviceNumber);
  baAsn1.encode_opening_tag(buffer, 2);
  buffer.Add(data, data.Length);
  baAsn1.encode_closing_tag(buffer, 2);
};

module.exports.EncodePrivateTransferAcknowledge = function(buffer, vendorID, serviceNumber, data) {
  baAsn1.encodeContextUnsigned(buffer, 0, vendorID);
  baAsn1.encodeContextUnsigned(buffer, 1, serviceNumber);
  baAsn1.encode_opening_tag(buffer, 2);
  buffer.Add(data, data.Length);
  baAsn1.encode_closing_tag(buffer, 2);
};

module.exports.EncodeDeviceCommunicationControl = function(buffer, timeDuration, enableDisable, password) {
  if (timeDuration > 0) {
    baAsn1.encodeContextUnsigned(buffer, 0, timeDuration);
  }
  baAsn1.encodeContextEnumerated(buffer, 1, enableDisable);
  if (password && password !== '') {
    baAsn1.encode_context_character_string(buffer, 2, password);
  }
};

module.exports.DecodeDeviceCommunicationControl = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var decodedValue;
  var result;
  if (baAsn1.decode_is_context_tag(buffer, offset + len, 0)) {
    result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decode_unsigned(buffer, offset + len, result.value);
    value.timeDuration = decodedValue.value;
    len += decodedValue.len;
  }
  if (!baAsn1.decode_is_context_tag(buffer, offset + len, 1)) return;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  decodedValue = baAsn1.decode_enumerated(buffer, offset + len, result.value);
  value.enableDisable = decodedValue.value;
  len += decodedValue.len;
  if (len < apduLen) {
    if (!baAsn1.decode_is_context_tag(buffer, offset + len, 2)) return;
    result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decode_character_string(buffer, offset + len, apduLen - (offset + len), result.value);
    value.password = decodedValue.value;
    len += decodedValue.len;
  }
  value.len = len;
  return value;
};

module.exports.EncodeReinitializeDevice = function(buffer, state, password) {
  baAsn1.encodeContextEnumerated(buffer, 0, state);
  if (password && password !== '') {
    baAsn1.encode_context_character_string(buffer, 1, password);
  }
};

module.exports.DecodeReinitializeDevice = function(buffer, offset, apduLen) {
  var len = 0;
  var value = {};
  var result;
  if (!baAsn1.decode_is_context_tag(buffer, offset + len, 0)) return;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  var decodedValue = baAsn1.decode_enumerated(buffer, offset + len, result.value);
  value.state = decodedValue.value;
  len += decodedValue.len;
  if (len < apduLen) {
    if (!baAsn1.decode_is_context_tag(buffer, offset + len, 1)) return;
    result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
    len += result.len;
    decodedValue = baAsn1.decode_character_string(buffer, offset + len, apduLen - (offset + len), result.value);
    value.password = decodedValue.value;
    len += decodedValue.len;
  }
  value.len = len;
  return value;
};

module.exports.EncodeReadRange = function(buffer, objectId, propertyId, arrayIndex, requestType, position, time, count) {
  baAsn1.encode_context_objectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  switch (requestType) {
    case baEnum.BacnetReadRangeRequestTypes.RR_BY_POSITION:
      baAsn1.encode_opening_tag(buffer, 3);
      baAsn1.encode_application_unsigned(buffer, position);
      baAsn1.encode_application_signed(buffer, count);
      baAsn1.encode_closing_tag(buffer, 3);
      break;
    case baEnum.BacnetReadRangeRequestTypes.RR_BY_SEQUENCE:
      baAsn1.encode_opening_tag(buffer, 6);
      baAsn1.encode_application_unsigned(buffer, position);
      baAsn1.encode_application_signed(buffer, count);
      baAsn1.encode_closing_tag(buffer, 6);
      break;
    case baEnum.BacnetReadRangeRequestTypes.RR_BY_TIME:
      baAsn1.encode_opening_tag(buffer, 7);
      baAsn1.encode_application_date(buffer, time);
      baAsn1.encode_application_time(buffer, time);
      baAsn1.encode_application_signed(buffer, count);
      baAsn1.encode_closing_tag(buffer, 7);
      break;
    case baEnum.BacnetReadRangeRequestTypes.RR_READ_ALL:
      break;
    default:
      break;
  }
};

module.exports.EncodeReadProperty = function(buffer, objectType, objectInstance, propertyId, arrayIndex) {
  if (objectType <= baAsn1.BACNET_MAX_OBJECT) {
    baAsn1.encode_context_object_id(buffer, 0, objectType, objectInstance);
  }
  if (propertyId <= baEnum.BacnetPropertyIds.MAX_BACNET_PROPERTY_ID) {
    baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  }
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex || baAsn1.BACNET_ARRAY_ALL);
  }
};

module.exports.EncodeReadPropertyAcknowledge = function(buffer, objectId, propertyId, arrayIndex, valueList) {
  baAsn1.encode_context_object_id(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encode_context_enumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encode_context_unsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encode_opening_tag(buffer, 3);
  valueList.forEach(function(value) {
    baAsn1.bacapp_encode_application_data(buffer, value);
  });
  baAsn1.encode_closing_tag(buffer, 3);
};

module.exports.DecodeReadPropertyAcknowledge = function(buffer, offset, apduLen) {
  var objectId = {};
  var property = {};
  if (!baAsn1.decode_is_context_tag(buffer, offset, 0)) {
    return;
  }
  var len = 1;
  var result = baAsn1.decode_object_id(buffer, offset + len);
  len += result.len;
  objectId.type = result.type;
  objectId.instance = result.instance;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== 1) {
    return;
  }
  result = baAsn1.decode_enumerated(buffer, offset + len, result.value);
  len += result.len;
  property.propertyIdentifier = result.propertyIdentifier;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  if (result.tagNumber === 2) {
    len += result.len;
    len += baAsn1.decode_unsigned(buffer, offset + len, result.value);
    property.propertyArrayIndex = result.propertyArrayIndex;
  } else {
    property.propertyArrayIndex = baAsn1.BACNET_ARRAY_ALL;
  }
  var valueList = [];
  if (baAsn1.decode_is_opening_tag_number(buffer, offset + len, 3)) {
    len++;
    while ((apduLen - len) > 1) {
      result = baAsn1.bacapp_decode_application_data(buffer, offset + len, apduLen + offset, objectId.type, property.propertyIdentifier);
      if (!result.len) {
        return;
      }
      len += result.len + 1;
      valueList.push(result);
    }
  } else {
    return;
  }
  if (!baAsn1.decode_is_closing_tag_number(buffer, offset + len, 3)) {
    return;
  }
  len++;
  return {
    len: len,
    objectId: objectId,
    property: property,
    valueList: valueList
  };
};

module.exports.EncodeReadPropertyMultiple = function(buffer, properties) {
  properties.forEach(function(value) {
    baAsn1.encode_read_access_specification(buffer, value);
  });
};

module.exports.EncodeReadPropertyMultipleAcknowledge = function(buffer, values) {
  values.forEach(function(value) {
    baAsn1.encode_read_access_result(buffer, value);
  });
};

module.exports.DecodeReadPropertyMultipleAcknowledge = function(buffer, offset, apduLen) {
  var len = 0;
  var values = [];
  while ((apduLen - len) > 0) {
    var result = baAsn1.decode_read_access_result(buffer, offset + len, apduLen - len);
    if (!result) {
      return;
    }
    len += result.len;
    values.push(result.value);
  }
  return {
    len: len,
    values: values
  };
};

module.exports.EncodeWriteProperty = function(buffer, objectType, objectInstance, propertyId, arrayIndex, priority, valueList) {
  baAsn1.encode_context_object_id(buffer, 0, objectType, objectInstance);
  baAsn1.encodeContextEnumerated(buffer, 1, propertyId);
  if (arrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
    baAsn1.encodeContextUnsigned(buffer, 2, arrayIndex);
  }
  baAsn1.encode_opening_tag(buffer, 3);
  valueList.forEach(function(value) {
    baAsn1.bacapp_encode_application_data(buffer, value);
  });
  baAsn1.encode_closing_tag(buffer, 3);
  if (priority !== baAsn1.BACNET_NO_PRIORITY) {
    baAsn1.encodeContextUnsigned(buffer, 4, priority);
  }
};

var EncodeWritePropertyMultiple = module.exports.EncodeWritePropertyMultiple = function(buffer, objectId, valueList) {
  baAsn1.encode_context_objectId(buffer, 0, objectId.type, objectId.instance);
  baAsn1.encode_opening_tag(buffer, 1);
  valueList.forEach(function(pValue) {
    baAsn1.encodeContextEnumerated(buffer, 0, pValue.property.propertyIdentifier);
    if (pValue.property.propertyArrayIndex !== baAsn1.BACNET_ARRAY_ALL) {
      baAsn1.encodeContextUnsigned(buffer, 1, pValue.property.propertyArrayIndex);
    }
    baAsn1.encode_opening_tag(buffer, 2);
    pValue.value.forEach(function(value) {
      baAsn1.bacapp_encode_application_data(buffer, value);
    });
    baAsn1.encode_closing_tag(buffer, 2);
    if (pValue.priority !== baAsn1.BACNET_NO_PRIORITY) {
      baAsn1.encodeContextUnsigned(buffer, 3, pValue.priority);
    }
  });
  baAsn1.encode_closing_tag(buffer, 1);
};

module.exports.EncodeWriteObjectMultiple = function(buffer, valueList) {
  valueList.forEach(function(rValue) {
    EncodeWritePropertyMultiple(buffer, rValue.objectIdentifier, rValue.values);
  });
};

module.exports.DecodeDeleteObject = function(buffer, offset, apduLen) {
  var result = baAsn1.decode_tag_number_and_value(buffer, offset);
  if (result.tagNumber === 12) return;
  var len = 1;
  var value = baAsn1.decode_object_id(buffer, offset + len);
  len += value.len;
  if (len !== apduLen) return;
  value.len = len;
  return value;
};

module.exports.EncodeCreateObjectAcknowledge = function(buffer, objectId) {
  baAsn1.encode_application_object_id(buffer, objectId.type, objectId.instance);
};

module.exports.EncodeTimeSync = function(buffer, time) {
  baAsn1.encode_application_date(buffer, time);
  baAsn1.encode_application_time(buffer, time);
};

module.exports.DecodeTimeSync = function(buffer, offset, length) {
  var len = 0;
  var result;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_DATE) return;
  var date = baAsn1.decode_date(buffer, offset + len);
  len += date.len;
  result = baAsn1.decode_tag_number_and_value(buffer, offset + len);
  len += result.len;
  if (result.tagNumber !== baEnum.BacnetApplicationTags.BACNET_APPLICATION_TAG_TIME) return;
  var time = baAsn1.decode_bacnet_time(buffer, offset + len);
  len += time.len;
  return {
    len: len,
    value: new Date(date.value.getFullYear(), date.value.getMonth(), date.value.getDate(), time.value.getHours(), time.value.getMinutes(), time.value.getSeconds(), time.value.getMilliseconds())
  };
};

module.exports.EncodeError = function(buffer, errorClass, errorCode) {
  baAsn1.encode_application_enumerated(buffer, errorClass);
  baAsn1.encode_application_enumerated(buffer, errorCode);
};

module.exports.DecodeError = function(buffer, offset) {
  var orgOffset = offset;
  var result;
  result = baAsn1.decode_tag_number_and_value(buffer, offset);
  offset += result.len;
  var errorClass = baAsn1.decode_enumerated(buffer, offset, result.value);
  offset += errorClass.len;
  result = baAsn1.decode_tag_number_and_value(buffer, offset);
  offset += result.len;
  var errorCode = baAsn1.decode_enumerated(buffer, offset, result.value);
  offset += errorClass.len;
  return {
    len: offset - orgOffset,
    class: errorClass.value,
    code: errorCode.value
  };
};
