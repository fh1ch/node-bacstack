var bacnet = require('../');

var client = new bacnet();

client.on('iAm', function(data) {
  console.log(data);
  var requestArray = [{objectIdentifier: {type: 8, instance: data.deviceId}, propertyReferences: [{propertyIdentifier: 8}]}];
  client.readPropertyMultiple(data.address, requestArray, function(err, value) {
    console.log('error: ', err);
    console.log('value: ', value);
  });
});

client.whoIs();
