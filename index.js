// Dependency modules
var events        = require('events');

// Local modules
var baClient      = require('./lib/bacnet-client');
var baEnum        = require('./lib/bacnet-enum');

module.exports = function(settings) {
  var self = new events.EventEmitter();

  settings = settings || {};
  var options = {
    port: settings.port || 47808,
    interface: settings.interface,
    broadcastAddress: settings.broadcastAddress || '255.255.255.255',
    adpuTimeout: settings.adpuTimeout || 3000
  };

  var client = baClient(options);

  // Public enums
  self.enum = baEnum;

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
