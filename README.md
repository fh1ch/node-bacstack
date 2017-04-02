# Node BACstack

A BACnet protocol stack written in pure JavaScript. BACnet is a protocol to
interact with building automation devices defined by ASHRAE.

[![](https://badge.fury.io/js/bacstack.svg)](http://badge.fury.io/js/bacstack)
[![](https://travis-ci.org/fh1ch/node-bacstack.svg?branch=master)](https://travis-ci.org/fh1ch/node-bacstack)
[![](https://coveralls.io/repos/fh1ch/node-bacstack/badge.svg?branch=master)](https://coveralls.io/r/fh1ch/node-bacstack?branch=master)
[![](https://codeclimate.com/github/fh1ch/node-bacstack/badges/gpa.svg)](https://codeclimate.com/github/fh1ch/node-bacstack)
[![](https://david-dm.org/fh1ch/node-bacstack/status.svg)](https://david-dm.org/fh1ch/node-bacstack)

> **Note:** This is an early prototype and shall not be considerate as stable.
> Use it with caution and at your own risk!

## Usage

Add Node BACstack to your project by using:

``` sh
$ npm install --save bacstack
```

#### Client

To be able to communicate to BACNET devices, you have to initialize a new
bacstack instance. Hereby, following options are avilable:

- `option` *[object]* - The options object used for parameterising the bacstack.
  - `port` *[number]* - BACNET communication port for listening and sending. Default is `47808`. *Optional*.
  - `interface` *[string]* - Specific BACNET communication interface if different from primary one. *Optional*.
  - `broadcastAddress` *[string]* - The address used for broadcast messages. Default is `255.255.255.255`. *Optional*.
  - `adpuTimeout` *[number]* - The timeout in milliseconds until a transaction should be interpreted as error. Default is `3000`. *Optional*.

``` js
var bacnet = require('bacstack');
var client = bacnet({
  port: 47809,                          // Use BAC1 as communication port
  interface: '192.168.251.10',          // Listen on a specific interface
  broadcastAddress: '192.168.251.255',  // Use the subnet broadcast address
  adpuTimeout: 6000                     // Wait twice as long for response
});
```

#### Who Is

The `whoIs` command discovers all BACNET devices in the network.

- `lowLimit` *[number]* - Minimal device instance number to search for. *Optional*.
- `highLimit` *[number]* - Maximal device instance number to search for. *Optional*.
- `address` *[string]* - Unicast address if command should device directly. *Optional*.

``` js
var bacnet = require('bacstack');
var client = bacnet();

client.on('iAm', function(address, deviceId, maxAdpu, segmentation, vendorId) {
  console.log('address: ', address, ' - deviceId: ', deviceId, ' - maxAdpu: ', maxAdpu, ' - segmentation: ', segmentation, ' - vendorId: ', vendorId);
});

client.whoIs();
```

#### Read Property

The `readProperty` command reads a single property of an object from a device.

- `address` *[string]* - IP address of the target device.
- `objectType` *[number]* - The BACNET object type to read.
- `objectInstance` *[number]* - The BACNET object instance to read.
- `propertyId` *[number]* - The BACNET property id in the specified object to read.
- `arrayIndex` *[number]* - The array index of the property to be read.
- `next` *[function]* - The callback containing an error, in case of a failure and value object in case of success.

``` js
var bacnet = require('bacstack');
var client = bacnet();

client.readProperty('192.168.1.43', 8, 44301, 28, null, function(err, value) {
  console.log('value: ', value);
});
```

#### Write Property

The `writeProperty` command writes a single property of an object to a device.

- `address` *[string]* - IP address of the target device.
- `objectType` *[number]* - The BACNET object type to write.
- `objectInstance` *[number]* - IP address of the target device.
- `propertyId` *[number]* - The BACNET property id in the specified object to write.
- `priority` *[number]* - The priority to be used for writing to the property.
- `valueList` *[array]* - A list of values to be written to the speicifed property. The `Tag` value has to be a `BacnetApplicationTags` declaration as specified in `lib/bacnet-enum.js`.
- `next` *[function]* - The callback containing an error, in case of a failure and value object in case of success.

propertyId, ,

``` js
var bacnet = require('bacstack');
var client = bacnet();

client.writeProperty('192.168.1.43', 8, 44301, 28, 12, [{Tag: 4, Value: 100}], function(err, value) {
  console.log('value: ', value);
});
```

#### Read Property Multiple

The `readPropertyMultiple` command reads multiple properties in multiple objects
from a device.

- `address` *[string]* - IP address of the target device.
- `propertyIdAndArrayIndex` *[array]* - List of object and property specifications to be read.
  - `objectIdentifier` *[object]* - Specifies which object to read.
    - `type` *[number]* - The BACNET object type to read.
    - `instance` *[number]* - The BACNET object instance to read.
  - `propertyReferences` *[array]* - List of properties to be read.
    - `propertyIdentifier` *[number]* - The BACNET property id in the specified object to read. Also supports `8` for *all* properties.
- `next` *[function]* - The callback containing an error, in case of a failure and value object in case of success.

``` js
var bacnet = require('bacstack');
var client = bacnet();

var requestArray = [
  {objectIdentifier: {type: 8, instance: 4194303}, propertyReferences: [{propertyIdentifier: 8}]}
];
client.readPropertyMultiple('192.168.1.43', requestArray, function(err, value) {
  console.log('value: ', value);
});
```

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2017 Fabio Huser <fabio@fh1.ch>
