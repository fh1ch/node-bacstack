var bacnet = require('../../');

module.exports.bacnetClient = bacnet;

module.exports.transportStub = function() {
  var self = this;
  self.handler = function() {};
  self.setMessageHandler = function(handler) {
    self.handler = handler;
  };
  self.setErrorHandler = function(handler) {};
  self.getBroadcastAddress = function() {
    return '255.255.255.255';
  };
  self.getMaxPayload = function() {
    return 1482;
  };
  self.send = function() {};
  self.open = function() {};
  self.close = function() {};
  return self;
};

module.exports.propertyFormater = function(object) {
  var converted = {};
  object.forEach(function(property) {
    converted[property.id] = property.value;
  });
  return converted;
};
