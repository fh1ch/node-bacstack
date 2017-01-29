var dgram = require('dgram');

module.exports = function(port, maxPayload) {
  var self = this;

  var globalHandler;
  var server = dgram.createSocket('udp4');

  // Definitions
  port = port || 47808;
  maxPayload = maxPayload|| 1472;

  // Events
  server.on('message', function(msg, rinfo) {
    if (globalHandler) {
      globalHandler(msg, rinfo.address);
    }
  });

  // Public functions
  self.setHandler = function(handler) {
    globalHandler = handler;
  };

  self.getBroadcastAddress = function() {
    return '255.255.255.255';
  };

  self.getMaxPayload = function() {
    return maxPayload;
  };

  self.send = function(buffer, offset, receiver) {
    server.send(buffer, 0, offset, port, receiver);
  };

  // Initialisation
  server.bind(port);

  return self;
};
