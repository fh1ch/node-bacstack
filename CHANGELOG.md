<a name="0.0.1-beta.5"></a>
# [0.0.1-beta.5](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.4...v0.0.1-beta.5) (2017-05-08)

### Features

* **bacnet-asn1:** add decode support for context encoded properties ([a82fb58](https://github.com/fh1ch/node-bacstack/commit/a82fb582938da9a7921b35e9ec4c06be13a2f403))
* **bacnet-client:** add support for custom transports ([8a6a64e](https://github.com/fh1ch/node-bacstack/commit/8a6a64e45a5950469279185c77de5d372cc34122))
* **bacnet-transport:** use actual max payload size to prevent segmentation issues ([2a1a887](https://github.com/fh1ch/node-bacstack/commit/2a1a887c0b923077a59e6fb301e29bf51889e2ff))

### Bug Fixes

* **bacnet-asn1:** drop redundant boolean length accumulation ([c9622d6](https://github.com/fh1ch/node-bacstack/commit/c9622d684765f5f8c30eb8b7f0047eaa99de0b74))
* **bacnet-asn1:** properly handle boolean decoding with length 0 ([31b7a28](https://github.com/fh1ch/node-bacstack/commit/31b7a28b891ea01c36c8e9578619d5dec417fe2e))
* **bacnet-client:** start segmentation with correct sequence number 0 ([cbc3076](https://github.com/fh1ch/node-bacstack/commit/cbc307682f041f200a7692462e411a59a8607e1b))


<a name="0.0.1-beta.4"></a>
# [0.0.1-beta.4](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.3...v0.0.1-beta.4) (2017-05-04)

### Features

* **bacnet-asn1:** expose property value type ([b6ca82b](https://github.com/fh1ch/node-bacstack/commit/b6ca82b9a9f6dd96191853d9ddbb3275b07b159b))

### Bug Fixes

* **bacnet-client:** re-enable who-is handler ([ae1d710](https://github.com/fh1ch/node-bacstack/commit/ae1d710494cf75a1557235e28af2a3c6506aea77))

### BREAKING CHANGES

* bacnet-asn1: property values changed from single value array (`[12]`) to array of object `[{value: 12, type: 3}]`


<a name="0.0.1-beta.3"></a>
# [0.0.1-beta.3](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.2...v0.0.1-beta.3) (2017-04-14)

### Bug Fixes

* **bacnet-asn1:** implement missing stubbed functions ([a49b103](https://github.com/fh1ch/node-bacstack/commit/a49b103803bd3f7802fc84c3360a1ae30398a874)), closes [#3](https://github.com/fh1ch/node-bacstack/issues/3)  
* **bacnet-client:** prevent redundant increment of invoke counter ([a59b023](https://github.com/fh1ch/node-bacstack/commit/a59b023c8aa75f4f7b12582d5df63566367d369f)), closes [#2](https://github.com/fh1ch/node-bacstack/issues/2)  
* correct various JSHint linter findings ([ee1b2a5](https://github.com/fh1ch/node-bacstack/commit/ee1b2a5e1d2a28b43f630ed8976baedf52ca3968))


<a name="0.0.1-beta.2"></a>
# [0.0.1-beta.2](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.1...v0.0.1-beta.2) (2017-04-02)

### Bug Fixes

* **bacnet-client:** add missing callback definition to readProperty function ([ba16839](https://github.com/fh1ch/node-bacstack/commit/ba16839b3f73395ddeefcae891830d49f9a3431b))
* **bacnet-client:** add missing callback `next` to writeProperty function ([a0cfa37](https://github.com/fh1ch/node-bacstack/commit/a0cfa373ea06791ac4890e80240bd99d9c65e9f8))
* **bacnet-transport:** enable broadcast support in UDP socket ([b6c49c7](https://github.com/fh1ch/node-bacstack/commit/b6c49c715f487b25cfe2f729d6f2569ca2379aff))


<a name="0.0.1-beta.1"></a>
# [0.0.1-beta.1](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.0...v0.0.1-beta.1) (2017-02-26)

### Features

* **asn1:** implement octet-string decoding ([87348de](https://github.com/fh1ch/node-bacstack/commit/87348de3abedaec5520236b9bab22dbb64774c9f))
* **client:** implement default segmentation handling ([58a53e3](https://github.com/fh1ch/node-bacstack/commit/58a53e3d71568e2d8b3952ab564fb3fd55f3aec1))
* add configuration possibility to bacstack ([6d3c15b](https://github.com/fh1ch/node-bacstack/commit/6d3c15be1cb24b9f554c02b40c7e9b058f9186a2))


<a name="0.0.1-beta.0"></a>
# 0.0.1-beta.0 (2017-02-23)

### Features

* create initial implementation ([1c4f139](https://github.com/fh1ch/node-bacstack/commit/1c4f1398d4c211f7991fcab40a901d08701796bd))
* create initial project structure ([4b2c8c0](https://github.com/fh1ch/node-bacstack/commit/4b2c8c063ae119590eeefc81da1dfc4633d1b13e))

### Bug Fixes

* fix various syntax issues ([3259856](https://github.com/fh1ch/node-bacstack/commit/325985624e95caaa622efad486ac456554dacd96))


