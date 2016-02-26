import EventEmitter from 'events';

export default class IPC extends EventEmitter {
  constructor(debug = true) {
    super();

    this.debug = debug;

    this.on('error', err => console.error(err));
  }

  Slave = {
    volatile() {
      throw new Error('Not implemented');
    },
    emit(origin, channel, data) {
      throw new Error('Not implemented', origin, channel, data);
    },
    broadcast(channel, data) {
      throw new Error('Not implemented', channel, data);
    },
    on(channel, ...args) {
      throw new Error('Not implemented', channel, args);
    },
    once(channel, ...args) {
      throw new Error('Not implemented', channel, args);
    },
    removeListener(channel, ...args) {
      throw new Error('Not implemented', channel, args);
    }
  };

  // privatizing emit
  _emit(...args) {
    return super.emit(...args);
  }

  log(...args) {
    if (this.debug) {
      console.log(...args);
    }
  }

  listen(cb = () => 0) {
    throw new Error('Not implemented', cb);
  }

  disconnect(token) {
    throw new Error('Not implemented', token);
  }

  emit(dest, channel, data) {
    throw new Error('Not implemented', dest, channel, data);
  }
}
