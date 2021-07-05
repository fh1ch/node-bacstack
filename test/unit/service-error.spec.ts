'use strict';

import * as utils from './utils';
import * as baServices from '../../lib/services';

describe('bacstack - Services layer Error unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.error.encode(buffer, 15, 25);
    const result = baServices.error.decode(buffer.buffer, 0);
    delete result.len;
    expect(result).toEqual({
      class: 15,
      code: 25
    });
  });
});
