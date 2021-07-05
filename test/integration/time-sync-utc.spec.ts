'use strict';

import * as utils from './utils';

describe('bacstack - timeSyncUTC integration', () => {
  it('should send a time UTC sync package', () => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    client.timeSyncUTC('127.0.0.1', new Date());
    client.close();
  });
});
