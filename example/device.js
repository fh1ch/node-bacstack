var bacnet = require('../');

var client = new bacnet();

var settings = {
  deviceId: 443,
  vendorId: 7
};

var dataStore = {
  '1:0': {
    75: [{value: {type: 1, instance: 0}, type: 12}],    // PROP_OBJECT_IDENTIFIER
    77: [{value: 'Analog Output 1', type: 7}],          // PROP_OBJECT_NAME
    79: [{value: 1, type: 9}],                          // PROP_OBJECT_TYPE
    85: [{value: 5, type: 4}]                           // PROP_PRESENT_VALUE
  },
  '8:443': {
    75: [{value: {type: 8, instance: 443}, type: 12}],  // PROP_OBJECT_IDENTIFIER
    76: [
      {value: {type: 8, instance: 443}, type: 12},
      {value: {type: 1, instance: 0}, type: 12}
    ],                                                  // PROP_OBJECT_IDENTIFIER
    77: [{value: 'my-device-443', type: 7}],            // PROP_OBJECT_NAME
    79: [{value: 8, type: 9}]                           // PROP_OBJECT_TYPE
  }
};

client.on('whoIs', function(data) {
  console.log(data);
  if (data.lowLimit && data.lowLimit > settings.deviceId) return;
  if (data.highLimit && data.highLimit < settings.deviceId) return;
  client.iAmResponse(settings.deviceId, bacnet.enum.BacnetSegmentations.SEGMENTATION_BOTH, settings.vendorId);
});

client.on('whoHas', function(data) {
  console.log(data);
  if (data.lowLimit && data.lowLimit > settings.deviceId) return;
  if (data.highLimit && data.highLimit < settings.deviceId) return;
  // TODO: Find stuff...
  if (data.objId) {
    client.iHaveResponse(settings.deviceId, {type: 1, instance: 1}, 'test');
  }
  if (data.objName) {
    client.iHaveResponse(settings.deviceId, {type: 1, instance: 1}, 'test');
  }
});

client.on('timeSync', function(data) {
  // TODO: Implement
});

client.on('timeSyncUTC', function(data) {
  // TODO: Implement
});

client.on('readProperty', function(data) {
  var object = dataStore[data.request.objectId.type + ':' + data.request.objectId.instance];
  console.log('object', object);
  if (!object) return client.errorResponse(data.address, bacnet.enum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_OBJECT, bacnet.enum.BacnetErrorCodes.ERROR_CODE_UNKNOWN_OBJECT);
  var property = object[data.request.property.propertyIdentifier];
  console.log('object', property);
  if (!property) return client.errorResponse(data.address, bacnet.enum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_PROPERTY, bacnet.enum.BacnetErrorCodes.ERROR_CODE_UNKNOWN_PROPERTY);
  if (data.request.property.propertyArrayIndex === 0xFFFFFFFF) {
    client.readPropertyResponse(data.address, data.invokeId, data.request.objectId, data.request.property, property);
  } else {
    var slot = property[data.request.property.propertyArrayIndex];
    if (!slot) return client.errorResponse(data.address, bacnet.enum.BacnetConfirmedServices.SERVICE_CONFIRMED_READ_PROPERTY, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_PROPERTY, bacnet.enum.BacnetErrorCodes.ERROR_CODE_INVALID_ARRAY_INDEX);
    client.readPropertyResponse(data.address, data.invokeId, data.request.objectId, data.request.property, [slot]);
  }
});

client.on('writeProperty', function(data) {
  var object = dataStore[data.request.objectId.type + ':' + data.request.objectId.instance];
  if (!object) return client.errorResponse(data.address, data.service, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_OBJECT, bacnet.enum.BacnetErrorCodes.ERROR_CODE_UNKNOWN_OBJECT);
  var property = object[data.request.property.propertyIdentifier];
  if (!property) return client.errorResponse(data.address, data.service, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_PROPERTY, bacnet.enum.BacnetErrorCodes.ERROR_CODE_UNKNOWN_PROPERTY);
  if (data.request.property.propertyArrayIndex === 0xFFFFFFFF) {
    property = data.request.value.value;
    client.simpleAckResponse(data.address, data.service, data.invokeId);
  } else {
    var slot = property[data.request.property.propertyArrayIndex];
    if (!slot) return client.errorResponse(data.address, data.service, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_PROPERTY, bacnet.enum.BacnetErrorCodes.ERROR_CODE_INVALID_ARRAY_INDEX);
    slot = data.request.value.value[0];
    client.simpleAckResponse(data.address, data.service, data.invokeId);
  }
});

client.on('readPropertyMultiple', function(data) {
  console.log(data.request.properties);
  var responseList = [];
  var properties = data.request.properties;
  properties.forEach(function(property) {

    responseList.push();
  });

  /*expect(result).to.deep.equal({properties: [{objectIdentifier: {type: 51, instance: 1}, propertyReferences: [
    {propertyIdentifier: 85, propertyArrayIndex: 0xFFFFFFFF},
    {propertyIdentifier: 85, propertyArrayIndex: 4}
  ]}]});*/

  var data = [{objectIdentifier: {type: 8, instance: 443}, values: [
    {property: {propertyIdentifier: 77, propertyArrayIndex: 0xFFFFFFFF}, value: [
      {type: 7, value: 'Fabio Device'}
    ]},
    {property: {propertyIdentifier: 28, propertyArrayIndex: 0xFFFFFFFF}, value: [
      {type: 7, value: 'Test1234$'}
    ]},
    {property: {propertyIdentifier: 76, propertyArrayIndex: 0xFFFFFFFF}, value: [
      {value: {type: 8, instance: 443}, type: 12}
    ]}
  ]}];

  client.readPropertyMultipleResponse('192.168.178.255', data.invokeId, data);
  // TODO: Implement
});

client.on('writePropertyMultiple', function(data) {
  // TODO: Implement
  // TODO: valuesRefs
  //if () client.simpleAckResponse(data.address, data.service, data.invokeId);
  //else client.errorResponse(data.address, data.service, data.invokeId, bacnet.enum.BacnetErrorClasses.ERROR_CLASS_OBJECT, bacnet.enum.BacnetErrorCodes.ERROR_CODE_UNKNOWN_OBJECT);
});
