'use strict';

const createSocket      = require('dgram').createSocket;
const EventEmitter      = require('events').EventEmitter;

const DefaultBACnetPort = 47808;

class Transport extends EventEmitter {
  constructor(settings) {
    super();
    this._settings = settings;
    this._server = createSocket({type: 'udp4', reuseAddr: true});
    this._server.on('message', (msg, rinfo) => this.emit('message', msg, rinfo.address + (rinfo.port === DefaultBACnetPort ? '' : ':' + rinfo.port)));
    this._server.on('error', (err) => this.emit('message', err));
  }

  getBroadcastAddress() {
    return this._settings.broadcastAddress;
  }

  getMaxPayload() {
    return 1482;
  }

  send(buffer, offset, receiver) {
    if (!receiver) receiver = this.getBroadcastAddress();
    const [address, port] = receiver.split(':');
    this._server.send(buffer, 0, offset, port || DefaultBACnetPort, address);
  }

  open() {
    this._server.bind(this._settings.port, this._settings.interface, () => {
      this._server.setBroadcast(true);
    });
  }

  close() {
    this._server.close();
  }
}
module.exports = Transport;
