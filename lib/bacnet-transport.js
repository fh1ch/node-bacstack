var dgram = require('dgram');

module.exports = function(settings) {
  var self = this;

  var globalHandler;
  var server = dgram.createSocket('udp4');

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
    return settings.broadcastAddress;
  };

  self.getMaxPayload = function() {
    return 1472;
  };

  self.send = function(buffer, offset, receiver) {
    server.send(buffer, 0, offset, settings.port, receiver);
  };

  // Initialisation
  server.bind(settings.port, settings.interface, function() {
    server.setBroadcast(true);
  });

  return self;
};
