// Dependency modules
var events = require('events');

// Local modules
var client = require('./lib/bacnet-client');

module.exports = function() {
  var self = new events.EventEmitter();

  // Public functions
  self.whoIs = function(lowLimit, highLimit, receiver) {
    client.whoIs(lowLimit, highLimit, null, function(address, deviceId, maxAdpu, segmentation, vendorId) {
      self.emit('iAm', address, deviceId, maxAdpu, segmentation, vendorId);
    });
  };

  self.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex, cb) {
    client.readProperty(address, objectType, objectInstance, propertyId, arrayIndex, cb);
  };

  self.writeProperty = function() {

  };

  self.readPropertyMultiple = function(address, objectType, objectInstance, propertyIdAndArrayIndex, cb) {
    client.readPropertyMultiple(address, objectType, objectInstance, propertyIdAndArrayIndex, cb);
  };

  self.writePropertyMultiple = function() {

  };

  // Initialisation

  return self;
};
