var ENUM = require('./bacnet-enum');

var BACNET_PROTOCOL_VERSION = 1;

var BacnetAddressTypes = {
  NONE: 0,
  IP: 1
};

module.exports.DecodeFunction = function(buffer, offset) {
  if (buffer[offset + 0] !== BACNET_PROTOCOL_VERSION) {
    return 0;
  }
  return buffer[offset + 1];
};

module.exports.Decode = function(buffer, offset) {
  var i;
  var adrLen;
  var orgOffset = offset;
  offset++;
  var funct = buffer[offset++];
  var destination;
  if ((funct & ENUM.BacnetNpduControls.DestinationSpecified) === ENUM.BacnetNpduControls.DestinationSpecified) {
    destination = {type: BacnetAddressTypes.None, net: (buffer[offset++] << 8) | (buffer[offset++] << 0)};
    adrLen = buffer[offset++];
    if (adrLen > 0) {
      destination.adr = new Array(adrLen);
      for (i = 0; i < destination.adr.length; i++) {
        destination.adr[i] = buffer[offset++];
      }
    }
  }
  var source;
  if ((funct & ENUM.BacnetNpduControls.SourceSpecified) === ENUM.BacnetNpduControls.SourceSpecified) {
    source = {type: BacnetAddressTypes.None, net: (buffer[offset++] << 8) | (buffer[offset++] << 0)};
    adrLen = buffer[offset++];
    if (adrLen > 0) {
      source.adr = new Array(adrLen);
      for (i = 0; i < source.adr.Length; i++) {
        source.adr[i] = buffer[offset++];
      }
    }
  }
  var hopCount = 0;
  if ((funct & ENUM.BacnetNpduControls.DestinationSpecified) === ENUM.BacnetNpduControls.DestinationSpecified) {
    hopCount = buffer[offset++];
  }
  var networkMsgType = ENUM.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK;
  var vendorId = 0;
  if ((funct & ENUM.BacnetNpduControls.NetworkLayerMessage) === ENUM.BacnetNpduControls.NetworkLayerMessage) {
    networkMsgType = buffer[offset++];
    if (networkMsgType >= 0x80) {
      vendorId = (buffer[offset++] << 8) | (buffer[offset++] << 0);
    } else if (networkMsgType === ENUM.BacnetNetworkMessageTypes.NETWORK_MESSAGE_WHO_IS_ROUTER_TO_NETWORK) {
      offset += 2;
    }
  }
  if (buffer[orgOffset + 0] !== BACNET_PROTOCOL_VERSION) {
    return;
  }
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

module.exports.Encode = function(buffer, funct, destination, source, hopCount, networkMsgType, vendorId) {
  var i;
  var hasDestination = destination !== null && destination.net > 0;
  var hasSource = source !== null && source.net > 0 && source.net !== 0xFFFF;

  buffer.buffer[buffer.offset++] = BACNET_PROTOCOL_VERSION;
  buffer.buffer[buffer.offset++] = funct | (hasDestination ? ENUM.BacnetNpduControls.DestinationSpecified : 0) | (hasSource ? ENUM.BacnetNpduControls.SourceSpecified : 0);

  if (hasDestination) {
    buffer.buffer[buffer.offset++] = (destination.net & 0xFF00) >> 8;
    buffer.buffer[buffer.offset++] = (destination.net & 0x00FF) >> 0;

    if (destination.net === 0xFFFF) {
      buffer.buffer[buffer.offset++] = 0;
    } else {
      buffer.buffer[buffer.offset++] = destination.adr.Length;
      if (destination.adr.Length > 0) {
        for (i = 0; i < destination.adr.Length; i++) {
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
      buffer.buffer[buffer.offset++] = destination.adr.Length;
      if (destination.adr.Length > 0) {
        for (i = 0; i < destination.adr.Length; i++) {
          buffer.buffer[buffer.offset++] = destination.adr[i];
        }
      }
    }
  }

  if (hasDestination) {
    buffer.buffer[buffer.offset++] = hopCount;
  }

  if ((funct & ENUM.BacnetNpduControls.NetworkLayerMessage) > 0) {
    buffer.buffer[buffer.offset++] = networkMsgType;
    if (networkMsgType >= 0x80) {
      buffer.buffer[buffer.offset++] = (vendorId & 0xFF00) >> 8;
      buffer.buffer[buffer.offset++] = (vendorId & 0x00FF) >> 0;
    }
  }
};
