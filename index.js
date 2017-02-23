// Dependency modules
var events = require('events');

// Local modules
var client        = require('./lib/bacnet-client');
var enumerations  = require('./lib/bacnet-enum');

module.exports = function() {
  var self = new events.EventEmitter();

  // Public enums
  self.enum = enumerations;

  // Public functions
  self.whoIs = function(lowLimit, highLimit, receiver) {
    client.whoIs(lowLimit, highLimit, null, function(address, deviceId, maxAdpu, segmentation, vendorId) {
      self.emit('iAm', address, deviceId, maxAdpu, segmentation, vendorId);
    });
  };

  self.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex, next) {
    client.readProperty(address, objectType, objectInstance, propertyId, arrayIndex, next);
  };

  self.writeProperty = function(address, objectType, objectInstance, propertyId, priority, valueList) {
    client.writeProperty(address, objectType, objectInstance, propertyId, priority, valueList);
  };

  self.readPropertyMultiple = function(address, objectType, objectInstance, propertyIdAndArrayIndex, next) {
    client.readPropertyMultiple(address, objectType, objectInstance, propertyIdAndArrayIndex, next);
  };

  self.writePropertyMultiple = function() {

  };

  return self;
};
