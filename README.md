# Node BACstack

A BACnet protocol stack written in pure JavaScript. BACnet is a protocol to
interact with building automation devices defined by ASHRAE.

[![](https://travis-ci.org/fh1ch/node-bacstack.svg?branch=master)](https://travis-ci.org/fh1ch/node-bacstack)
[![](https://david-dm.org/fh1ch/node-bacstack/status.svg)](https://david-dm.org/fh1ch/node-bacstack)

> **Note:** This is an early prototype and shall not be considerate as stable.
> Use it with caution and at your own risk!

## Usage

Add Node BACstack to your project by using:

``` sh
$ npm install --save node-bacstack
```

**Who Is**

The `whoIs` command discovers all BACNET devices in the network.

``` js
var bacnet = require('node-bacstack');
var client = bacnet();

client.on('iAm', function(address, deviceId, maxAdpu, segmentation, vendorId) {
  console.log('address: ', address, ' - deviceId: ', deviceId, ' - maxAdpu: ', maxAdpu, ' - segmentation: ', segmentation, ' - vendorId: ', vendorId);
});

client.whoIs();
```

**Read Property**

The `readProperty` command reads a single property of an object from a device.

``` js
var bacnet = require('node-bacstack');
var client = bacnet();

client.readProperty('192.168.1.43', 8, 44301, 28, null, function(err, value) {
  console.log('value: ', value);
});
```

**Write Property**

The `writeProperty` command writes a single property of an object to a device.

``` js
var bacnet = require('node-bacstack');
var client = bacnet();

client.writeProperty('192.168.1.43', 8, 44301, 28, null, 1, function(err, value) {
  console.log('value: ', value);
});
```

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2017 Fabio Huser <fabio@fh1.ch>
