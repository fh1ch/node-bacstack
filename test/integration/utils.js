var bacnet = require('../../');

module.exports.bacnetClient = bacnet;

module.exports.transportStub = function() {
  var self = this;
  self.handler = function() {};
  self.setHandler = function(handler) {
    self.handler = handler;
  };
  self.getBroadcastAddress = function() {
    return '255.255.255.255';
  };
  self.getMaxPayload = function() {
    return 1482;
  };
  self.send = function() {};
  self.close = function() {};
  return self;
};

module.exports.propertyFormater = function(object) {
  var converted = {};
  object.forEach((property) => {
    converted[property.propertyIdentifier] = property.value;
  });
  return converted;
};
