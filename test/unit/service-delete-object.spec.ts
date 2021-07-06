'use strict';

import * as utils from './utils';
import * as baServices from '../../lib/services';

describe('bacstack - Services layer DeleteObject unit', () => {
  it('should successfully encode and decode', () => {
    const buffer = utils.getBuffer();
    baServices.deleteObject.encode(buffer, {type: 1, instance: 10});
    const result = baServices.deleteObject.decode(buffer.buffer, 0, buffer.offset);
    delete result.len;
    expect(result).toEqual({
      objectType: 1,
      instance: 10
    });
  });
});
