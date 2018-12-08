# Node BACstack

A BACnet protocol stack written in pure JavaScript. BACnet is a protocol to
interact with building automation devices defined by ASHRAE.

[![](https://badge.fury.io/js/bacstack.svg)](http://badge.fury.io/js/bacstack)
[![](https://travis-ci.org/fh1ch/node-bacstack.svg?branch=master)](https://travis-ci.org/fh1ch/node-bacstack)
[![](https://coveralls.io/repos/fh1ch/node-bacstack/badge.svg?branch=master)](https://coveralls.io/r/fh1ch/node-bacstack?branch=master)
[![](https://codeclimate.com/github/fh1ch/node-bacstack/badges/gpa.svg)](https://codeclimate.com/github/fh1ch/node-bacstack)
[![](https://david-dm.org/fh1ch/node-bacstack/status.svg)](https://david-dm.org/fh1ch/node-bacstack)

## Usage

Add Node BACstack to your project by using:

``` sh
npm install --save bacstack
```

The API documentation is available under **[fh1ch.github.io/node-bacstack](https://fh1ch.github.io/node-bacstack)**.

### Features

The BACNET standard defines a wide variety of services as part of it's
specification. While Node BACstack tries to be as complete as possible,
following services are already supported at this point in time:

| Service                        | Execute                                                                                | Handle                                                                        |
|--------------------------------|:--------------------------------------------------------------------------------------:|:-----------------------------------------------------------------------------:|
| Who Is                         | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.whoIs)                      | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.event:whoIs)       |
| I Am                           | yes¹                                                                                   | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.event:iAm)         |
| Who Has                        | yes¹                                                                                   | yes¹                                                                          |
| I Have                         | yes¹                                                                                   | yes¹                                                                          |
| Time Sync                      | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.timeSync)                   | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.event:timeSync)    |
| UTC Time Sync                  | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.timeSyncUTC)                | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.event:timeSyncUTC) |
| Read Property                  | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.readProperty)               | yes¹                                                                          |
| Read Property Multiple         | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.readPropertyMultiple)       | yes¹                                                                          |
| Read Range                     | yes¹                                                                                   | yes¹                                                                          |
| Write Property                 | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.writeProperty)              | yes¹                                                                          |
| Write Property Multiple        | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.writePropertyMultiple)      | yes¹                                                                          |
| Add List Element               | yes¹                                                                                   | yes¹                                                                          |
| Remove List Element            | yes¹                                                                                   | yes¹                                                                          |
| Create Object                  | yes¹                                                                                   | yes¹                                                                          |
| Delete Object                  | yes¹                                                                                   | yes¹                                                                          |
| Subscribe COV                  | yes¹                                                                                   | yes¹                                                                          |
| Subscribe Property             | yes¹                                                                                   | yes¹                                                                          |
| Atomic Read File               | yes¹                                                                                   | yes¹                                                                          |
| Atomic Write File              | yes¹                                                                                   | yes¹                                                                          |
| Reinitialize Device            | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.reinitializeDevice)         | yes¹                                                                          |
| Device Communication Control   | [yes](https://fh1ch.github.io/node-bacstack/bacstack.html#.deviceCommunicationControl) | yes¹                                                                          |
| Get Alarm Summary              | yes¹                                                                                   | yes¹                                                                          |
| Get Event Information          | yes¹                                                                                   | yes¹                                                                          |
| Get Enrollment Summary         | yes¹                                                                                   | yes¹                                                                          |
| Acknowledge Alarm              | yes¹                                                                                   | yes¹                                                                          |
| Confirmed Event Notification   | yes¹                                                                                   | yes¹                                                                          |
| Unconfirmed Event Notification | yes¹                                                                                   | yes¹                                                                          |
| Unconfirmed Private Transfer   | yes¹                                                                                   | yes¹                                                                          |
| Confirmed Private Transfer     | yes¹                                                                                   | yes¹                                                                          |

¹ Support implemented as Beta (untested, undocumented, breaking interface)

### Example

``` js
const bacnet = require('bacstack');

// Initialize BACStack
const client = new bacnet({apduTimeout: 6000});

// Discover Devices
client.on('iAm', (device) => {
  console.log('address: ', device.address);
  console.log('deviceId: ', device.deviceId);
  console.log('maxApdu: ', device.maxApdu);
  console.log('segmentation: ', device.segmentation);
  console.log('vendorId: ', device.vendorId);
});
client.whoIs();

// Read Device Object
const requestArray = [{
  objectId: {type: 8, instance: 4194303},
  properties: [{id: 8}]
}];
client.readPropertyMultiple('192.168.1.43', requestArray, (err, value) => {
  console.log('value: ', value);
});
```

## Contributing

Implementing and maintaining a protocol stack is a lot of work, therefore any
help is appreciated, from creating issues, to contributing documentation, fixing
issues and adding new features.

Please follow the [Contribution Guide](CONTRIBUTING.md) when submitting any
changes.

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2017-2018 Fabio Huser <fabio@fh1.ch>

**Note:** This is not an official product of the BACnet Advocacy Group. BACnet®
is a registered trademark of American Society of Heating, Refrigerating and
Air-Conditioning Engineers (ASHRAE).
