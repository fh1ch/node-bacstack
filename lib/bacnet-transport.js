var dgram = require('dgram');

module.exports = function(settings) {
  var self = this;

  var messageHandler;
  var errorHandler;

  var server = dgram.createSocket({type: 'udp4', reuseAddr: true});

  // Events
  server.on('message', function(msg, rinfo) {
    if (messageHandler) messageHandler(msg, rinfo.address);
  });

  server.on('error', function(err) {
    if (errorHandler) errorHandler(err);
  });

  // Public functions
  self.setMessageHandler = function(handler) {
    messageHandler = handler;
  };

  self.setErrorHandler = function(handler) {
    errorHandler = handler;
  };

  self.getBroadcastAddress = function() {
    return settings.broadcastAddress;
  };

  self.getMaxPayload = function() {
    return 1482;
  };

  self.send = function(buffer, offset, receiver) {
    server.send(buffer, 0, offset, settings.port, receiver);
  };

  self.open = function() {
    server.bind(settings.port, settings.interface, function() {
      server.setBroadcast(true);
    });
  };

  self.close = function() {
    server.close();
  };

  return self;
};
