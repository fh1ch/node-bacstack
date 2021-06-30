# Contributing

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
yarn changelog
```

### Code Style

This module uses the [Google JavaScript Code-Style](https://google.github.io/styleguide/javascriptguide.xml)
and enforces it using [ESlint](https://eslint.org/) as primary. You can test if
your changes comply with the code style by executing:

``` sh
yarn lint
```

### Testing and Coverage

Testing is done using [Jest](https://jestjs.io/) and is separated into two
sets, `unit` and `integration`. While unit tries to test on function level,
including synthetic decoding and encoding, the integration tests are using real
recorded data and are only mocking the transport layer.

For both sets, the test-coverage is calculated using [Istanbul](https://istanbul.js.org/).
Running the tests and calculating the coverage can be done locally by executing:

``` sh
yarn test
yarn integration
```

It is expected that new features or fixes do not negatively impact the test
results or the coverage.

### Compliance Testing

Besides the `unit` and `integration` test-sets, which are ensuring functionality
using synthetical data, the  `compliance` test-set is using a well established
3rd BACNET device emulator to test against. It uses the same test setup with
[Jest](https://jestjs.io/) and [Istanbul](https://istanbul.js.org/), but runs
inside a Docker container, while using the [BACStack Compliance Docker](https://github.com/fh1ch/bacstack-compliance-docker)
image to test against.

The compliance tests can be executed locally and require Docker and
Docker-Compose. To do so, simply run:

``` sh
docker-compose build
docker-compose up --abort-on-container-exit --exit-code-from bacnet-client
```

### Documentation

The API documentation is generated using [JSDoc](http://usejsdoc.org/) and
relies on in-line JSDoc3 syntax. The documentation can also be built locally by
executing:

``` sh
yarn docs
```

It is expected that new features or changes are reflected in the documentation
as well.
