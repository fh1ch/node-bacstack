<a name="0.0.1-beta.14"></a>
# [0.0.1-beta.14](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.13...v0.0.1-beta.14) (2021-06-30)

### Features

* **client:** implement missing un/confirmed event handler ([070d407](https://github.com/fh1ch/node-bacstack/commit/070d4076fcc3bd4cfb7621f56f8ea69672134056))
* **services:** implement EventEnrollmentSummary service ([fc40313](https://github.com/fh1ch/node-bacstack/commit/fc403137b395cbaac53ad1afb93b7aaf7a776006))

### Bug Fixes

* **apdu:** rename wrongly named `adpu` modules and files to `apdu` ([f4ab0e3](https://github.com/fh1ch/node-bacstack/commit/f4ab0e39608f92273f123278999ffa73ef8c0e35))
* **asn1:** correct encoding of object-types > 512 ([3103ad5](https://github.com/fh1ch/node-bacstack/commit/3103ad51fab5eb56b0ed68d702787c4223990d7a)), closes [#122](https://github.com/fh1ch/node-bacstack/issues/122)  
* **asn1:** correct error object structure ([e3647da](https://github.com/fh1ch/node-bacstack/commit/e3647da3289c7fbfaceb58d225525d21207ec930))
* **client:** correct deviceCommunicationControl example ([955211b](https://github.com/fh1ch/node-bacstack/commit/955211bfa48e7626559e16b35bfad5d0042f836b))
* **service:** correct atomicWriteFile service functionality ([8a28088](https://github.com/fh1ch/node-bacstack/commit/8a28088f12f21041dcd09f2d4c6123fe1d747fe4))
* **services:** correct readRangeAcknowledge implementation ([52c6d02](https://github.com/fh1ch/node-bacstack/commit/52c6d02fe82ea226152e6caa689a8321500cfdfa))

### BREAKING CHANGES

* **apdu:** The `adpuTimeout` constructor parameter has been renamed to `apduTimeout`. See docs.

* **apdu:** The `maxAdpu` callback parameter inside the `iAm` event has been renamed to `maxApdu`. See docs.

* **enum:** The optional input parameter type `MaxSegments` has been renamed to `MaxSegmentsAccepted` and has renamed values. See documentation.

* **enum:** The optional input parameter type `MaxApdu` has been renamed to `MaxApduLengthAccepted` and has renamed values. See documentation.

* **enum:** The values of the input parameter type `ApplicationTags` has changed by dropping it's `BACNET_APPLICATION_TAG_*` prefix. See documentation.

* **enum:** The values of the input parameter type `ReinitializedStates` has changed by dropping it's `BACNET_REINIT_*` prefix. See documentation.

* 


<a name="0.0.1-beta.13"></a>
# [0.0.1-beta.13](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.12...v0.0.1-beta.13) (2017-12-24)

### Features

* **bacnet-client:** implement alarming and eventing ([fbf120c](https://github.com/fh1ch/node-bacstack/commit/fbf120c0cc11861b994f51a7fa06e2160d58b1c5))

### Bug Fixes

* **bacnet-client:** use decodeCOVNotify for COV handling ([967f154](https://github.com/fh1ch/node-bacstack/commit/967f1544d4e88b185961571624e70d6d616ffed2)), closes [#69](https://github.com/fh1ch/node-bacstack/issues/69)  
* **bacnet-node-type:** correct enum according to BACnet spec ([3c271fc](https://github.com/fh1ch/node-bacstack/commit/3c271fc49764962d54150109117986ee2c7d824a))

### BREAKING CHANGES

* bacnet-client: various function parameters changed. Adapt according latest documentation.

* bacnet-client: `isUTC` parameter has been omitted and was replaced by the `timeSyncUTC` function

* bacnet-enum: `Bacnet` prefix for all enumerators has been dropped

* client: `objectType` and `objectInstance` parameters for all functions have been replaced by a single `obejctId` parameter, expecting an object with `type` and `instance` attribute.

* `objId` renamed to `objectId`

* `objName` renamed to `objectName`

* `propertyIdentifier` renamed to `propertyId`

* `propertyArrayIndex` renamed to `index`

* `valueList` renamed to `values`

* `objectIdentifier` renamed to `objectId`

* `propertyReferences` renamed to `properties`

* `Recipient.net` renamed to `recipient.network`

* `Recipient.adr` renamed to `recipient.address`

* `subscriptionProcessId` renamed to `subscriptionProcessIdentifier`

* `objectIdentifier` renamed to `objectId`

* drop of `len` parameter for properties


<a name="0.0.1-beta.12"></a>
# [0.0.1-beta.12](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.11...v0.0.1-beta.12) (2017-12-05)

### Bug Fixes

* **bacnet-asn1:** correct behaviour for releasing priority / writing of null ([d6c893b](https://github.com/fh1ch/node-bacstack/commit/d6c893bed497f3fbdabc4fb9697fffb57dceeb5f)), closes [#65](https://github.com/fh1ch/node-bacstack/issues/65)  


<a name="0.0.1-beta.11"></a>
# [0.0.1-beta.11](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.10...v0.0.1-beta.11) (2017-10-08)

### Features

* **bacnet-asn1:** implement all BACNET string encodings ([14699e2](https://github.com/fh1ch/node-bacstack/commit/14699e20b11cef5b3dc98fb465e602b6a31298fe))


<a name="0.0.1-beta.10"></a>
# [0.0.1-beta.10](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.9...v0.0.1-beta.10) (2017-09-19)

### Features

* **bacnet-client:** implement handling of confirmed functions ([3e29ab0](https://github.com/fh1ch/node-bacstack/commit/3e29ab0a3b84a40f5e037d35e35929ec1602f5ba))
* **bacnet-service:** implement decoding functionality for COV and CreateObject ([635e419](https://github.com/fh1ch/node-bacstack/commit/635e41954ffd95a4b0cff252581f380981d4d278))
* **encoding:** add full read/write support for ISO 8859-1 charset ([e50b005](https://github.com/fh1ch/node-bacstack/commit/e50b005dcc4abdaf6aa233781816bc5d510fc439))
* implemented more BACNET functions ([2721232](https://github.com/fh1ch/node-bacstack/commit/2721232a5c71f560b5e629004f1d6c73e626fd90))

### BREAKING CHANGES

* bacnet-asn1: requires renaming the `tag` parameter for all write commands to `type`

* encoding: rename enum BacnetCharacterStringEncodings value CHARACTER_ISO8859 to CHARACTER_ISO8859_1 which conforms with the BACnet

* index: the iAm event no longer passes multiple parameters but a single nested object


<a name="0.0.1-beta.9"></a>
# [0.0.1-beta.9](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.8...v0.0.1-beta.9) (2017-07-12)

### Features

* **bacnet-client:** expose BACNET errors and aborts to user ([8cda7de](https://github.com/fh1ch/node-bacstack/commit/8cda7de50f60c12cbaaf0c6d44240f15013ea040))
* **bacnet-client:** expose underlying transport errors to user ([7d547be](https://github.com/fh1ch/node-bacstack/commit/7d547be4c0220eed7c6b0601116de079d30b4849))
* **bacnet-client:** implement close function for BACstack and underlying UDP socket ([4be06bd](https://github.com/fh1ch/node-bacstack/commit/4be06bd2afd3775fdd76b907516cd7bc3d8bbb69))
* **bacnet-services:** implement missing BACNET service encodings ([db6ac7f](https://github.com/fh1ch/node-bacstack/commit/db6ac7fd62e76f1f79992b90fbf4c42fb7f1b536))
* **bacnet-services:** implement writePropertyMultiple service ([ea9332c](https://github.com/fh1ch/node-bacstack/commit/ea9332c945884e163dba9b908d2161047f322031))
* **bacnet-transport:** allow reuse of network interface when using bacstack ([0fb216c](https://github.com/fh1ch/node-bacstack/commit/0fb216ca7ab94af6ea657c3a736d6079657e4ea0))
* implement write-property-multiple ([5f9f7a0](https://github.com/fh1ch/node-bacstack/commit/5f9f7a0447c333414f8d9f2cd9316dbb3673bf8f))
* implement reinitialize-device ([1283cc3](https://github.com/fh1ch/node-bacstack/commit/1283cc32f6b0b66ea71cb16751d82f53a8f0a548))
* implement device-communication-control ([04a38a8](https://github.com/fh1ch/node-bacstack/commit/04a38a829afabd77c932698bec412525f4ad5ef5))
* implement time-sync ([9980a4d](https://github.com/fh1ch/node-bacstack/commit/9980a4d7b8524a1175be9aec182dc58eab4a23ac))

### Bug Fixes

* **ba-enums:** make sure the exported enums are not overridden ([8369cc8](https://github.com/fh1ch/node-bacstack/commit/8369cc8daa0a97d5e20e554eea5e9fbc0d570c93))
* **bacnet-client:** correct error message format for BACNET aborts and errors ([6533e3f](https://github.com/fh1ch/node-bacstack/commit/6533e3f3185a23b990fff66fd9b5122a1282f1a8))
* **string-decode:** add decoding support for ISO 8859-1 ([a224928](https://github.com/fh1ch/node-bacstack/commit/a224928360da49d1c1d620b025f5066db006d1ff))

### BREAKING CHANGES

* index: enumerations are no longer accessible via BACStack client instance and have been moved to the module level (`require("bacstack").enum;`).

* `Tag` and `Value` parameters for writeProperty and writePropertyMultiple have to be adapted to small-case


<a name="0.0.1-beta.8"></a>
# [0.0.1-beta.8](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.7...v0.0.1-beta.8) (2017-06-19)

### Features

* **bacnet-client:** implement additional unsupported services ([d82fefe](https://github.com/fh1ch/node-bacstack/commit/d82fefee7a2a5d53e9551cdf1ce09d9c6ca238cd))
* **bacnet-client:** rework unconfirmed services to utilize even emitter ([b5b8d78](https://github.com/fh1ch/node-bacstack/commit/b5b8d785e5e153a287cf73dc38f522e6a8daf347))

### Bug Fixes

* **bacnet-client:** ensure invokeId range of 0-255 ([c195331](https://github.com/fh1ch/node-bacstack/commit/c19533139097eccd7cefde4a4d709fa7923b2ad6))


<a name="0.0.1-beta.7"></a>
# [0.0.1-beta.7](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.6...v0.0.1-beta.7) (2017-06-11)

### Bug Fixes

* **bacnet-services:** correct all invalid no-array and no-priority checks ([ba16839](https://github.com/fh1ch/node-bacstack/commit/f0cb5bdf0da45903f893d915e9eead2e555800d8)), closes [#20](https://github.com/fh1ch/node-bacstack/issues/20)  


<a name="0.0.1-beta.6"></a>
# [0.0.1-beta.6](https://github.com/fh1ch/node-bacstack/compare/v0.0.1-beta.5...v0.0.1-beta.6) (2017-06-04)

### Features

* **bacnet-asn1:** implement read-access-specification, cov-subscription, calendar decoding functionality ([b015f62](https://github.com/fh1ch/node-bacstack/commit/b015f627b06123de531462be04c8aa1b8ae9e1d9))
* **bacnet-asn1:** implement additional ASN1 base encoding functions ([2d6276e](https://github.com/fh1ch/node-bacstack/commit/2d6276ee9bba71b855adfb3110f9d91edb5e19be))
* **bacnet-services:** implemented various new BACNET service encodings ([d891305](https://github.com/fh1ch/node-bacstack/commit/d891305acf6d2eda10711d81f4cdae2279dd79b1))
* **bacnet-services.spec:** implement test coverage for cov-subscription and read-access-specification value types ([6665a7c](https://github.com/fh1ch/node-bacstack/commit/6665a7cc24b40ce90024d56c1833fc28a66dfd50))
* add JSDoc inline documentation and gh-page publishing ([44f88be](https://github.com/fh1ch/node-bacstack/commit/44f88be7a4f42195c9a4cae29efab717618681fb))

### Bug Fixes

* **bacnet-asn1:** add guard to prevent endless loops ([63d7d8f](https://github.com/fh1ch/node-bacstack/commit/63d7d8fefc0aaf3135a6d9ec330c8bf4d882cbff))
* **bacnet-asn1:** correct generic blob decoding context implementation ([63eacc6](https://github.com/fh1ch/node-bacstack/commit/63eacc61203f08e6fb4f403f1d00ceedca6138f6))
* **bacnet-asn1:** correct variable initialization for datetime decoding ([3bc1591](https://github.com/fh1ch/node-bacstack/commit/3bc159181c5ad37f2df3f3e003bd7a805dcda2cb))
* **bacnet-asn1:** correct bit-string encoding and decoding ([14cda6d](https://github.com/fh1ch/node-bacstack/commit/14cda6d9edf5a37432adce8d4f467c742169b269))
* **bacnet-asn1:** correct octet-string encoding and decoding ([aee51a5](https://github.com/fh1ch/node-bacstack/commit/aee51a5be16cf4c229dec31249807bc577a141f5))
* **bacnet-asn1:** correct ASN1 date and time encodings ([486153c](https://github.com/fh1ch/node-bacstack/commit/486153c1a055a7317e181c03258b611e6c3b8966))
* **bacnet-asn1:** align error handling to prevent dead-loop ([3feaaba](https://github.com/fh1ch/node-bacstack/commit/3feaabae56973831cf8236432ecb60142b37a6f4))
* **bacnet-client:** correctly handle invalid encoding cases ([347b0ed](https://github.com/fh1ch/node-bacstack/commit/347b0ed8fc4671ca1d49a49431f96dadfb97b9fb))
* **bacnet-client:** remove callback from store if already invoked ([16e4483](https://github.com/fh1ch/node-bacstack/commit/16e4483a39187069a6a9f1f53117e135ac924ee4))
* **bacnet-services:** correct string and tag comparison ([0302fe0](https://github.com/fh1ch/node-bacstack/commit/0302fe0d3748c1892b21c0cc8237c3bc74eece26))


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


