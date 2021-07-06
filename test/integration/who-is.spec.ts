'use strict';

import * as utils from './utils';

describe('bacstack - whoIs integration', () => {
  it('should not invoke a event if no device is available', (next) => {
    const client = new utils.BacnetClient({apduTimeout: 200});
    client.on('iAm', () => {
      client.close();
      next(new Error('Unallowed Callback'));
    });
    setTimeout(() => {
      client.close();
      next();
    }, 300);
    client.whoIs();
  });
});
