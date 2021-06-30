'use strict';

const utils = require('./utils');

describe('bacstack - timeSync integration', () => {
  it('should send a time sync package', () => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.timeSync('127.0.0.1', new Date());
    client.close();
  });
});
