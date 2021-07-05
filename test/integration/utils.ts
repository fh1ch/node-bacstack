'use strict';

import {EventEmitter} from 'events';
import {Client} from '../../lib/client';

export const BacnetClient = Client;

export class TransportStub extends EventEmitter {
  constructor() {
    super();
  }
  getBroadcastAddress() {
    return '255.255.255.255';
  }
  getMaxPayload() {
    return 1482;
  }
  send() {} // eslint-disable-line @typescript-eslint/no-empty-function
  open() {} // eslint-disable-line @typescript-eslint/no-empty-function
  close() {} // eslint-disable-line @typescript-eslint/no-empty-function
}

export const propertyFormater = (object: {id: number; value: any}[]) => {
  const converted: {[name: number]: any} = {};
  object.forEach((property) => converted[property.id] = property.value);
  return converted;
};
