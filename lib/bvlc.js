var baEnum        = require('./enum');

var BVLL_TYPE_BACNET_IP = 0x81;
var BVLC_HEADER_LENGTH = 4;

module.exports.encode = function(buffer, func, msgLength) {
  buffer[0] = BVLL_TYPE_BACNET_IP;
  buffer[1] = func;
  buffer[2] = (msgLength & 0xFF00) >> 8;
  buffer[3] = (msgLength & 0x00FF) >> 0;
  return BVLC_HEADER_LENGTH;
};

module.exports.decode = function(buffer, offset) {
  var len;
  var func = buffer[1];
  var msgLength = (buffer[2] << 8) | (buffer[3] << 0);
  if (buffer[0] !== BVLL_TYPE_BACNET_IP || buffer.length !== msgLength) return;
  switch (func) {
    case baEnum.BvlcFunctions.BVLC_RESULT:
    case baEnum.BvlcFunctions.BVLC_ORIGINAL_UNICAST_NPDU:
    case baEnum.BvlcFunctions.BVLC_ORIGINAL_BROADCAST_NPDU:
    case baEnum.BvlcFunctions.BVLC_DISTRIBUTE_BROADCAST_TO_NETWORK:
      len =  4;
      break;
    case baEnum.BvlcFunctions.BVLC_FORWARDED_NPDU:
      len = 10;
      break;
    case baEnum.BvlcFunctions.BVLC_REGISTER_FOREIGN_DEVICE:
    case baEnum.BvlcFunctions.BVLC_READ_FOREIGN_DEVICE_TABLE:
    case baEnum.BvlcFunctions.BVLC_DELETE_FOREIGN_DEVICE_TABLE_ENTRY:
    case baEnum.BvlcFunctions.BVLC_READ_BROADCAST_DIST_TABLE:
    case baEnum.BvlcFunctions.BVLC_WRITE_BROADCAST_DISTRIBUTION_TABLE:
      return;
    default:
      return;
  }
  return {
    len: len,
    func: func,
    msgLength: msgLength
  };
};
