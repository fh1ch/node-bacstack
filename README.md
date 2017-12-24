# Node BACstack

A BACnet protocol stack written in pure JavaScript. BACnet is a protocol to
interact with building automation devices defined by ASHRAE.

[![](https://badge.fury.io/js/bacstack.svg)](http://badge.fury.io/js/bacstack)
[![](https://travis-ci.org/fh1ch/node-bacstack.svg?branch=master)](https://travis-ci.org/fh1ch/node-bacstack)
[![](https://coveralls.io/repos/fh1ch/node-bacstack/badge.svg?branch=master)](https://coveralls.io/r/fh1ch/node-bacstack?branch=master)
[![](https://codeclimate.com/github/fh1ch/node-bacstack/badges/gpa.svg)](https://codeclimate.com/github/fh1ch/node-bacstack)
[![](https://david-dm.org/fh1ch/node-bacstack/status.svg)](https://david-dm.org/fh1ch/node-bacstack)

> **Note:** This is an early prototype and shall not be considered as stable.
> Use it with caution and at your own risk!

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

| Service                        | Execute | Handle |
|--------------------------------|:-------:|:------:|
| Who Is / I Am                  | yes     | yes¹   |
| Who Has / I Have               | yes¹    | yes¹   |
| Time Sync                      | yes     | yes¹   |
| UTC Time Sync                  | yes     | yes¹   |
| Read Property                  | yes     | yes¹   |
| Read Property Multiple         | yes     | yes¹   |
| Read Range                     | yes¹    | yes¹   |
| Write Property                 | yes     | yes¹   |
| Write Property Multiple        | yes     | yes¹   |
| Add List Element               | yes¹    |        |
| Remove List Element            | yes¹    |        |
| Create Object                  | yes¹    | yes¹   |
| Delete Object                  | yes¹    | yes¹   |
| Subscribe COV                  | yes¹    | yes¹   |
| Subscribe Property             | yes¹    | yes¹   |
| Atomic Read File               | yes¹    | yes¹   |
| Atomic Write File              | yes¹    | yes¹   |
| Reinitialize Device            | yes     | yes¹   |
| Device Communication Control   | yes     | yes¹   |
| Get Alarm Summary              | yes¹    |        |
| Get Event Information          | yes¹    |        |
| Get Enrollment Summary         |         |        |
| Acknowledge Alarm              | yes¹    |        |
| Confirmed Event Notification   |         | yes¹   |
| Unconfirmed Event Notification |         | yes¹   |
| Unconfirmed Private Transfer   |         |        |
| Confirmed Private Transfer     |         |        |

¹ Support implemented as Beta (untested, undocumented, breaking interface)

### Example

``` js
var bacnet = require('bacstack');

// Initialize BACStack
var client = new bacnet({adpuTimeout: 6000});

// Discover Devices
client.on('iAm', function(device) {
  console.log('address: ', device.address);
  console.log('deviceId: ', device.deviceId);
  console.log('maxAdpu: ', device.maxAdpu);
  console.log('segmentation: ', device.segmentation);
  console.log('vendorId: ', device.vendorId);
});
client.whoIs();

// Read Device Object
var requestArray = [{
  objectId: {type: 8, instance: 4194303},
  properties: [{id: 8}]
}];
client.readPropertyMultiple('192.168.1.43', requestArray, function(err, value) {
  console.log('value: ', value);
});
```

## Contributing

Implementing and maintaining a protocol stack is a lot of work, therefore any
help is appreciated, from creating issues, to contributing documentation, fixing
issues and adding new features.

Please follow the best-practice contribution guidelines as mentioned below when
submitting any changes.

### Conventional Changelog

This module has a changelog which is automatically generated based on Git commit
messages. This mechanism requires that all commit messages comply with the
[Conventional Changelog](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md).
You can check if your commit messages complies with those guidelines by using:

``` sh
npm run changelog
```

### Code Style

This module uses the [Google JavaScript Code-Style](https://google.github.io/styleguide/javascriptguide.xml)
and enforces it using [JSCS](http://jscs.info/) as additional linter beneath
[JSHint](http://jshint.com/). You can test if your changes comply with the code
style by executing:

``` sh
npm run lint
```

### Testing and Coverage

Testing is done using [Mocha](https://mochajs.org/) and is separated into two
sets, `unit` and `integration`. While unit tries to test on function level,
including synthetic decoding and encoding, the integration tests are using real
recorded data and are only mocking the transport layer.

For both sets, the test-coverage is calculated using [Istanbul](https://istanbul.js.org/).
Running the tests and calculating the coverage can be done locally by executing:

``` sh
npm run test
npm run integration
```

It is expected that new features or fixes do not negatively impact the test
results or the coverage.

### Documentation

The API documentation is generated using [JSDoc](http://usejsdoc.org/) and
relies on in-line JSDoc3 syntax. The documentation can also be built locally by
executing:

``` sh
npm run docs
```

It is expected that new features or changes are reflected in the documentation
as well.

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2017 Fabio Huser <fabio@fh1.ch>
