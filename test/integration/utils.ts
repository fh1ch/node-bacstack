'use strict';

import { EventEmitter } from 'events';
import { Client } from '../../lib/client';

export const bacnetClient = Client;

export class transportStub extends EventEmitter {
  constructor() {
    super();
  }
  getBroadcastAddress() {
    return '255.255.255.255';
  }
  getMaxPayload() {
    return 1482;
  }
  send() { }
  open() { }
  close() { }
}

export const propertyFormater = (object: {id: number, value: any}[]) => {
  const converted: {[name: number]: any} = {};
  object.forEach((property) => converted[property.id] = property.value);
  return converted;
};
