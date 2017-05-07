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
    transport: settings.transport,
    broadcastAddress: settings.broadcastAddress || '255.255.255.255',
    adpuTimeout: settings.adpuTimeout || 3000
  };

  var client = baClient(options);

  // Public enums
  self.enum = baEnum;

  // Public functions
  self.whoIs = function(lowLimit, highLimit, address) {
    client.whoIs(lowLimit, highLimit, address, function(address, deviceId, maxAdpu, segmentation, vendorId) {
      self.emit('iAm', address, deviceId, maxAdpu, segmentation, vendorId);
    });
  };

  self.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex, next) {
    client.readProperty(address, objectType, objectInstance, propertyId, arrayIndex, next);
  };

  self.writeProperty = function(address, objectType, objectInstance, propertyId, priority, valueList, next) {
    client.writeProperty(address, objectType, objectInstance, propertyId, priority, valueList, next);
  };

  self.readPropertyMultiple = function(address, propertyIdAndArrayIndex, next) {
    client.readPropertyMultiple(address, propertyIdAndArrayIndex, next);
  };

  return self;
};
