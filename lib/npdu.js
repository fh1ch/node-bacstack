var baEnum = require('./enum');

var BACNET_PROTOCOL_VERSION = 1;

var BacnetAddressTypes = {
  NONE: 0,
  IP: 1
};

module.exports.decodeFunction = function(buffer, offset) {
  if (buffer[offset + 0] !== BACNET_PROTOCOL_VERSION) return;
  return buffer[offset + 1];
};

module.exports.decode = function(buffer, offset) {
  var i;
  var adrLen;
  var orgOffset = offset;
  offset++;
  var funct = buffer[offset++];
  var destination;
  if ((funct & baEnum.NpduControls.DESTINATION_SPECIFIED) === baEnum.NpduControls.DESTINATION_SPECIFIED) {
    destination = {type: BacnetAddressTypes.NONE, net: (buffer[offset++] << 8) | (buffer[offset++] << 0)};
    adrLen = buffer[offset++];
    if (adrLen > 0) {
      destination.adr = new Array(adrLen);
      for (i = 0; i < destination.adr.length; i++) {
        destination.adr[i] = buffer[offset++];
      }
    }
  }
  var source;
  if ((funct & baEnum.NpduControls.SOURCE_SPECIFIED) === baEnum.NpduControls.SOURCE_SPECIFIED) {
    source = {type: BacnetAddressTypes.NONE, net: (buffer[offset++] << 8) | (buffer[offset++] << 0)};
    adrLen = buffer[offset++];
    if (adrLen > 0) {
      source.adr = new Array(adrLen);
      for (i = 0; i < source.adr.length; i++) {
        source.adr[i] = buffer[offset++];
      }
    }
  }
  var hopCount = 0;
  if ((funct & baEnum.NpduControls.DESTINATION_SPECIFIED) === baEnum.NpduControls.DESTINATION_SPECIFIED) {
    hopCount = buffer[offset++];
  }
  var networkMsgType = baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK;
  var vendorId = 0;
  if ((funct & baEnum.NpduControls.NETWORK_LAYER_MESSAGE) === baEnum.NpduControls.NETWORK_LAYER_MESSAGE) {
    networkMsgType = buffer[offset++];
    if (networkMsgType >= 0x80) {
      vendorId = (buffer[offset++] << 8) | (buffer[offset++] << 0);
    } else if (networkMsgType === baEnum.NetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK) {
      offset += 2;
    }
  }
  if (buffer[orgOffset + 0] !== BACNET_PROTOCOL_VERSION) return;
  return {
    len: offset - orgOffset,
    funct: funct,
    destination: destination,
    source: source,
    hopCount: hopCount,
    networkMsgType: networkMsgType,
    vendorId: vendorId
  };
};

module.exports.encode = function(buffer, funct, destination, source, hopCount, networkMsgType, vendorId) {
  var i;
  var hasDestination = destination && destination.net > 0;
  var hasSource = source && source.net > 0 && source.net !== 0xFFFF;

  buffer.buffer[buffer.offset++] = BACNET_PROTOCOL_VERSION;
  buffer.buffer[buffer.offset++] = funct | (hasDestination ? baEnum.NpduControls.DESTINATION_SPECIFIED : 0) | (hasSource ? baEnum.NpduControls.SOURCE_SPECIFIED : 0);

  if (hasDestination) {
    buffer.buffer[buffer.offset++] = (destination.net & 0xFF00) >> 8;
    buffer.buffer[buffer.offset++] = (destination.net & 0x00FF) >> 0;

    if (destination.net === 0xFFFF) {
      buffer.buffer[buffer.offset++] = 0;
    } else {
      buffer.buffer[buffer.offset++] = destination.adr.length;
      if (destination.adr.length > 0) {
        for (i = 0; i < destination.adr.length; i++) {
          buffer.buffer[buffer.offset++] = destination.adr[i];
        }
      }
    }
  }

  if (hasSource) {
    buffer.buffer[buffer.offset++] = (source.net & 0xFF00) >> 8;
    buffer.buffer[buffer.offset++] = (source.net & 0x00FF) >> 0;
    if (destination.net === 0xFFFF) {
      buffer.buffer[buffer.offset++] = 0;
    } else {
      buffer.buffer[buffer.offset++] = destination.adr.length;
      if (destination.adr.length > 0) {
        for (i = 0; i < destination.adr.length; i++) {
          buffer.buffer[buffer.offset++] = destination.adr[i];
        }
      }
    }
  }

  if (hasDestination) {
    buffer.buffer[buffer.offset++] = hopCount;
  }

  if ((funct & baEnum.NpduControls.NETWORK_LAYER_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = networkMsgType;
    if (networkMsgType >= 0x80) {
      buffer.buffer[buffer.offset++] = (vendorId & 0xFF00) >> 8;
      buffer.buffer[buffer.offset++] = (vendorId & 0x00FF) >> 0;
    }
  }
};
