'use strict';

import * as utils from './utils';

describe('bacstack - writeProperty integration', () => {
  it('should return a timeout error if no device is available', (next) => {
    const client = new utils.bacnetClient({apduTimeout: 200});
    client.writeProperty('127.0.0.1', {type: 8, instance: 44301}, 28, [{type: 4, value: 100}], {}, (err) => {
      expect(err.message).toEqual('ERR_TIMEOUT');
      client.close();
      next();
    });
  });
});
