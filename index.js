// Dependency modules
var events        = require('events');

// Local modules
var baClient      = require('./lib/bacnet-client');
var baEnum        = require('./lib/bacnet-enum');

/**
 * To be able to communicate to BACNET devices, you have to initialize a new bacstack instance.
 * @class bacstack
 * @param {object=} settings - The options object used for parameterizing the bacstack.
 * @param {number=} [settings.port=47808] - BACNET communication port for listening and sending.
 * @param {string=} settings.interface - Specific BACNET communication interface if different from primary one.
 * @param {string=} [settings.broadcastAddress=255.255.255.255] - The address used for broadcast messages.
 * @param {number=} [settings.adpuTimeout=3000] - The timeout in milliseconds until a transaction should be interpreted as error.
 * @example
 * var bacnet = require('bacstack');
 *
 * var client = new bacnet({
 *   port: 47809,                          // Use BAC1 as communication port
 *   interface: '192.168.251.10',          // Listen on a specific interface
 *   broadcastAddress: '192.168.251.255',  // Use the subnet broadcast address
 *   adpuTimeout: 6000                     // Wait twice as long for response
 * });
 */
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

  var client = new baClient(options);

  client.events.on('iAm', function(address, deviceId, maxAdpu, segmentation, vendorId) {

    /**
     * @event bacstack.iAm
     * @param {string} address - The IP address of the detected device.
     * @param {number} deviceId - The BACNET device-id of the detected device.
     * @param {number} maxAdpu - The max ADPU size the detected device is supporting.
     * @param {number} segmentation - The type of segmentation the detected device is supporting.
     * @param {number} vendorId - The BACNET vendor-id of the detected device.
     * @example
     * var bacnet = require('bacstack');
     * var client = new bacnet();
     *
     * client.on('iAm', function(address, deviceId, maxAdpu, segmentation, vendorId) {
     *   console.log('address: ', address, ' - deviceId: ', deviceId, ' - maxAdpu: ', maxAdpu, ' - segmentation: ', segmentation, ' - vendorId: ', vendorId);
     * });
     */
    self.emit('iAm', address, deviceId, maxAdpu, segmentation, vendorId);
  });

  client.events.on('error', function(err) {

    /**
     * @event bacstack.error
     * @param {error} err - The IP address of the detected device.
     * @example
     * var bacnet = require('bacstack');
     * var client = new bacnet();
     *
     * client.on('error', function(err) {
     *   console.log('Error occurred: ', err);
     *   client.close();
     * });
     */
    self.emit('error', err);
  });

  /**
   * The whoIs command discovers all BACNET devices in a network.
   * @function bacstack.whoIs
   * @param {number=} lowLimit - Minimal device instance number to search for.
   * @param {number=} highLimit - Maximal device instance number to search for.
   * @param {string=} address - Unicast address if command should device directly.
   * @fires bacstack.iAm
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.whoIs();
   */
  self.whoIs = function(lowLimit, highLimit, address) {
    client.whoIs(lowLimit, highLimit, address);
  };

  /**
   * The timeSync command sets the time of a target device.
   * @function bacstack.timeSync
   * @param {string} address - IP address of the target device.
   * @param {date} dateTime - The date and time to set on the target device.
   * @param {boolean} [isUtc=false] - Identifier if UTC time sync service shall be used.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.timeSync('192.168.1.43', new Date(), true);
   */
  self.timeSync = function(address, dateTime, isUtc) {
    client.timeSync(address, dateTime, isUtc);
  };

  /**
   * The readProperty command reads a single property of an object from a device.
   * @function bacstack.readProperty
   * @param {string} address - IP address of the target device.
   * @param {number} objectType - The BACNET object type to read.
   * @param {number} objectInstance - The BACNET object instance to read.
   * @param {number} propertyId - The BACNET property id in the specified object to read.
   * @param {number=} arrayIndex - The array index of the property to be read.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.readProperty('192.168.1.43', 8, 44301, 28, null, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.readProperty = function(address, objectType, objectInstance, propertyId, arrayIndex, next) {
    client.readProperty(address, objectType, objectInstance, propertyId, arrayIndex, next);
  };

  /**
   * The writeProperty command writes a single property of an object to a device.
   * @function bacstack.writeProperty
   * @param {string} address - IP address of the target device.
   * @param {number} objectType - The BACNET object type to write.
   * @param {number} objectInstance - The BACNET object instance to write.
   * @param {number} propertyId - The BACNET property id in the specified object to write.
   * @param {number} priority - The priority to be used for writing to the property.
   * @param {object[]} valueList - A list of values to be written to the specified property.
   * @param {BacnetApplicationTags} valueList.tag - The data-type of the value to be written.
   * @param {number} valueList.value - The actual value to be written.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.writeProperty('192.168.1.43', 8, 44301, 28, 12, [
   *   {tag: bacnet.enum.BacnetApplicationTags.BACNET_APPLICATION_TAG_REAL, value: 100}
   * ], function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.writeProperty = function(address, objectType, objectInstance, propertyId, priority, valueList, next) {
    client.writeProperty(address, objectType, objectInstance, propertyId, priority, valueList, next);
  };

  /**
   * The readPropertyMultiple command reads multiple properties in multiple objects from a device.
   * @function bacstack.readPropertyMultiple
   * @param {string} address - IP address of the target device.
   * @param {object[]} propertyIdAndArrayIndex - List of object and property specifications to be read.
   * @param {object} propertyIdAndArrayIndex.objectIdentifier - Specifies which object to read.
   * @param {number} propertyIdAndArrayIndex.objectIdentifier.type - The BACNET object type to read.
   * @param {number} propertyIdAndArrayIndex.objectIdentifier.instance - The BACNET object instance to read.
   * @param {object[]} propertyIdAndArrayIndex.propertyReferences - List of properties to be read.
   * @param {number} propertyIdAndArrayIndex.propertyReferences.propertyIdentifier - The BACNET property id in the specified object to read. Also supports 8 for all properties.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * var requestArray = [
   *   {objectIdentifier: {type: 8, instance: 4194303}, propertyReferences: [{propertyIdentifier: 8}]}
   * ];
   * client.readPropertyMultiple('192.168.1.43', requestArray, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.readPropertyMultiple = function(address, propertyIdAndArrayIndex, next) {
    client.readPropertyMultiple(address, propertyIdAndArrayIndex, next);
  };

  /**
   * The writePropertyMultiple command writes multiple properties in multiple objects to a device.
   * @function bacstack.writePropertyMultiple
   * @param {string} address - IP address of the target device.
   * @param {object[]} valueList - List of object and property specifications to be written.
   * @param {object} valueList.objectIdentifier - Specifies which object to read.
   * @param {number} valueList.objectIdentifier.type - The BACNET object type to read.
   * @param {number} valueList.objectIdentifier.instance - The BACNET object instance to read.
   * @param {object[]} valueList.values - List of properties to be written.
   * @param {object} valueList.values.property - Property specifications to be written.
   * @param {number} valueList.values.property.propertyIdentifier - The BACNET property id in the specified object to write.
   * @param {number} valueList.values.property.propertyArrayIndex - The array index of the property to be written.
   * @param {object[]} valueList.values.value - A list of values to be written to the specified property.
   * @param {BacnetApplicationTags} valueList.values.value.tag - The data-type of the value to be written.
   * @param {object} valueList.values.value.value - The actual value to be written.
   * @param {number} valueList.values.priority - The priority to be used for writing to the property.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * var valueList = [
   *   {objectIdentifier: {type: 8, instance: 44301}, values: [
   *     {property: {propertyIdentifier: 28, propertyArrayIndex: 12}, value: [{tag: bacnet.enum.BacnetApplicationTags.BACNET_APPLICATION_TAG_BOOLEAN, value: true}], priority: 8}
   *   ]}
   * ];
   * client.writePropertyMultiple('192.168.1.43', valueList, function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.writePropertyMultiple = function(address, valueList, next) {
    client.writePropertyMultiple(address, valueList, next);
  };

  /**
   * The deviceCommunicationControl command enables or disables network communication of the target device.
   * @function bacstack.deviceCommunicationControl
   * @param {string} address - IP address of the target device.
   * @param {number} timeDuration - The time to hold the network communication state in seconds. 0 for infinite.
   * @param {BacnetEnableDisable} enableDisable - The network communication state to set.
   * @param {string=} password - The optional password used to set the network communication state.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.deviceCommunicationControl('192.168.1.43', 0, bacnet.enum.BacnetEnableDisable.DISABLE, 'Test1234$', function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.deviceCommunicationControl = function(address, timeDuration, enableDisable, password, next) {
    client.deviceCommunicationControl(address, timeDuration, enableDisable, password, next);
  };

  /**
   * The reinitializeDevice command initiates a restart of the target device.
   * @function bacstack.reinitializeDevice
   * @param {string} address - IP address of the target device.
   * @param {BacnetReinitializedStates} state - The type of restart to be initiated.
   * @param {string=} password - The optional password used to restart the device.
   * @param {function} next - The callback containing an error, in case of a failure and value object in case of success.
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.reinitializeDevice('192.168.1.43', bacnet.enum.BacnetReinitializedStates.BACNET_REINIT_COLDSTART, 'Test1234$', function(err, value) {
   *   console.log('value: ', value);
   * });
   */
  self.reinitializeDevice = function(address, state, password, next) {
    client.reinitializeDevice(address, state, password, next);
  };

  /**
   * Unloads the current BACstack instance and closes the underlying UDP socket.
   * @function bacstack.close
   * @example
   * var bacnet = require('bacstack');
   * var client = new bacnet();
   *
   * client.close();
   */
  self.close = function() {
    client.close();
  };

  return self;
};

// Public enums
module.exports.enum = baEnum;
