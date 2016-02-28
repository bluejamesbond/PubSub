import ipc from 'node-ipc';
import async from 'async';
import EventEmitter from 'events';
import Promise from 'bluebird';
import crypto from 'crypto';

const noop = () => 0;

const defaultEventMap = {
  delimiter: '-',

  // request events
  requestBroadcast: 'broadcast',
  requestEmit: 'emit',
  requestServerAddress: 'get-server-address',
  requestAddToken: 'add-token',
  requestRemoveToken: 'remove-token',
  requestAuthorization: 'authorize',
  requestDeauthorization: 'deauthorize',
  requestMasterEmit: 'slave-emit',
  requestPeerBroadcast: 'broadcast-peer',
  requestPeerEmit: 'emit-peer',

  // response events
  responseTokenAdded: 'token-added',
  responseTokenRemoved: 'token-removed',
  responseClientConnected: 'client-connected',
  responseClientDisconnected: 'client-disconnected',
  responseClientAwk: 'client-received',

  responseMasterMessage: 'master-message',
  responseMasterAwk: 'master-received',
  responseSlaveReceived: 'slave-got',

  responsePeerMessage: 'peer-message',
  responsePeerReceived: 'peer-got',
  responsePeerAwk: 'peer-received',

  responseServerAddress: 'server-address'
};

// TODO
// Client events: connect, disconnect, accept, reject
// Peer events: connect, disconnect, channel
// Master events: channel

const active = {};

const defaultOpts = {
  resDefaultTimeout: 60000,
  debug: false,
  concurrency: 50,
  scope: 'socket',
  eventMap: defaultEventMap,
  appspace: 'socket'
};

class PubSubSlave extends EventEmitter {
  constructor(origin, address, opts = defaultOpts) {
    super();

    opts = Object.assign(defaultOpts, opts);

    this.origin = origin;
    this.opts = opts;
    this.scope = opts.scope;
    this.eventMap = Object.assign(defaultEventMap, opts.eventMap);
    this.remoteAddress = address;
    this.remote = opts.remote;
    this.resDefaultTimeout = opts.resDefaultTimeout;
    this.debug = opts.debug;

    this.setMaxListeners(Number.MAX_SAFE_INTEGER);

    this.queue = async.queue((data, callback) => {
      const _callback = () => process.nextTick(callback);
      if (typeof data === 'function') {
        if (data.length) {
          data(_callback);
        } else {
          data();
          _callback();
        }

        return;
      }

      this._handleTransmit(data, _callback);
    }, opts.concurrency);

    this.queue.pause();
  }

  Peer = {
    broadcast: this._peerBroadcast.bind(this),
    volatile: this._peerVolatile.bind(this),
    emit: this._peerEmit.bind(this),
    on: this._peerOn.bind(this),
    removeListener: this._peerRemoveListener.bind(this),
    once: this._peerOnce.bind(this)
  };

  Client = {
    broadcast: this.broadcast.bind(this),
    volatile: this.volatile.bind(this),
    emit: this.emit.bind(this),
    accept: this.accept.bind(this),
    reject: this.reject.bind(this),
    on: this._clientOn.bind(this),
    removeListener: this._clientRemoveListener.bind(this),
    once: this._clientOnce.bind(this)
  };

  Master = {
    emit: this._masterEmit.bind(this),
    on: this._masterOn.bind(this),
    removeListener: this._masterRemoveListener.bind(this),
    once: this._masterOnce.bind(this)
  };

  _clientOn(channel, ...args) {
    return this.on(`client-${channel}`, ...args);
  }

  _clientOnce(channel, ...args) {
    return this.once(`client-${channel}`, ...args);
  }

  _clientRemoveListener(channel, ...args) {
    return this.removeListener(`client-${channel}`, ...args);
  }

  _masterOn(channel, ...args) {
    return this.on(this.for(this.eventMap.responseMasterMessage, channel), ...args);
  }

  _masterOnce(channel, ...args) {
    return this.on(this.for(this.eventMap.responseMasterMessage, channel), ...args);
  }

  _masterRemoveListener(channel, ...args) {
    return this.on(this.for(this.eventMap.responseMasterMessage, channel), ...args);
  }

  _peerOn(channel, ...args) {
    return this.on(this.for(this.eventMap.responsePeerMessage, channel), ...args);
  }

  _peerOnce(channel, ...args) {
    return this.on(this.for(this.eventMap.responsePeerMessage, channel), ...args);
  }

  _peerRemoveListener(channel, ...args) {
    return this.on(this.for(this.eventMap.responsePeerMessage, channel), ...args);
  }

  _masterEmit(channel, data, awk = true) {
    if (!awk) {
      return this.queue.push({action: this.eventMap.requestMasterEmit, channel, data});
    }

    return new Promise((resolve, reject) => {
      this.queue.push({action: this.eventMap.requestMasterEmit, channel, data, awk, resolve, reject});
    });
  }

  _peerBroadcast(channel, data) {
    this.queue.push({channel, action: this.eventMap.requestPeerBroadcast, data, awk: true});
  }

  _peerVolatile(dest, channel, data) {
    this._peerEmit(dest, channel, data, false);
  }

  _peerEmit(dest, channel, data, awk = true, resolve, reject) {
    if (!awk) {
      return this.queue.push({action: this.eventMap.requestPeerEmit, channel, data, dest});
    }

    if (typeof resolve === 'function' && typeof reject === 'function') {
      return this.queue.push({action: this.eventMap.requestPeerEmit, channel, data, awk, dest, resolve, reject});
    }

    return new Promise((_resolve, _reject) => {
      const req = {
        action: this.eventMap.requestPeerEmit,
        channel,
        data,
        awk,
        dest,
        resolve: _resolve,
        reject: _reject
      };

      this.queue.push(req);
    });
  }

  // private emit
  _emit(...args) {
    super.emit(...args);
  }

  resolveHost(address) {
    let host = address.hostname || '0.0.0.0';

    if (host === 'localhost' || host === '::1' || host === '127.0.0.1') {
      host = '0.0.0.0';
    }

    return host;
  }

  resolvePort(address) {
    return address.port;
  }

  configure(_ipc) {
    noop(_ipc);
  }

  connect() {
    const eventMap = this.eventMap;
    const address = this.remoteAddress;

    if (!active.hasOwnProperty(this.scope)) {
      active[this.scope] = {};
    }

    active[this.scope] = {[this.origin]: true};

    ipc.config.retry = 5000;
    ipc.config.maxRetries = 20;
    ipc.config.silent = !this.debug;
    ipc.config.networkHost = this.resolveHost(address);
    ipc.config.networkPort = this.resolvePort(address);
    ipc.config.appspace = this.opts.master || this.opts.appspace;

    this.configure(ipc);

    return new Promise(resolve => {
      ipc[this.remote ? 'connectToNet' : 'connectTo'](this.scope, () => {
        ipc.config.stopRetrying = false;
        resolve();

        this.queue.unshift(() => {
          const req = {
            id: this.origin,
            data: {origin: this.origin}
          };

          this._emitIPC(this.eventMap.requestAuthorization, req);
        });

        this.queue.resume();

        this._emit('connect'); // FIXME wait for acceptance
      });

      ipc.of[this.scope].on('disconnect', () => {
        this.queue.pause();
        this._emit('disconnect');
      });

      ipc.of[this.scope].on(eventMap.responseTokenAdded, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseTokenAdded).data;

        this._emit(eventMap.responseTokenAdded, data);
        this._emit(this.for(eventMap.responseTokenAdded, data.token), data);
      });

      ipc.of[this.scope].on(eventMap.responseServerAddress, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseServerAddress).data;

        this._emit(eventMap.responseServerAddress, data);
      });

      ipc.of[this.scope].on(eventMap.responseTokenRemoved, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseTokenRemoved).data;

        this._emit(eventMap.responseTokenRemoved, data);
        this._emit(this.for(eventMap.responseTokenRemoved, data.token), data);
        this._emit(`client-reject-${data.token}`, data.token);
        this._emit(`client-reject`, data.token);
      });

      ipc.of[this.scope].on(eventMap.responseClientAwk, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseClientAwk).data;

        this._emit(eventMap.responseClientAwk, data);
        this._emit(this.for(eventMap.responseClientAwk, data.id), data);
      });

      ipc.of[this.scope].on(eventMap.responsePeerAwk, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responsePeerAwk).data;

        this._emit(eventMap.responsePeerAwk, data);
        this._emit(this.for(eventMap.responsePeerAwk, data.id), data);
      });

      ipc.of[this.scope].on(eventMap.responseMasterAwk, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseMasterAwk).data;

        this._emit(eventMap.responseMasterAwk, data);
        this._emit(this.for(eventMap.responseMasterAwk, data.id), data);
      });

      ipc.of[this.scope].on(eventMap.responseClientConnected, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseClientConnected).data;

        this._emit(eventMap.responseClientConnected, data);
        this._emit(this.for(eventMap.responseClientConnected, data.token), data);
        this._emit(`client-connect-${data.token}`, data.token);
        this._emit(`client-connect`, data.token);
      });

      ipc.of[this.scope].on(eventMap.responsePeerMessage, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responsePeerMessage).data;

        let v = 0;
        const respond = res => {
          if (v++) return;
          const response = {id: this.origin, data: {...data, _data: data.data, data: res}};
          this.queue.push(() => this._emitIPC(eventMap.responsePeerReceived, response));
        };

        this._emit(eventMap.responsePeerMessage, data.from, data, respond);
        this._emit(this.for(eventMap.responsePeerMessage, data.channel), data.from, data.data, respond);
      });

      ipc.of[this.scope].on(eventMap.responseMasterMessage, data => {
        if (data.dest !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseMasterMessage).data;

        let v = 0;
        const respond = res => {
          if (v++) return;
          const response = {id: this.origin, data: {...data, _data: data.data, data: res}};
          this.queue.push(() => this._emitIPC(eventMap.responseSlaveReceived, response));
        };

        this._emit(eventMap.responseMasterMessage, data, respond);
        this._emit(this.for(eventMap.responseMasterMessage, data.channel), data.data, respond);
      });

      ipc.of[this.scope].on(eventMap.responseClientDisconnected, data => {
        data = this.unwrap(data, eventMap.responseClientDisconnected).data;

        this._emit(eventMap.responseClientDisconnected, data);
        this._emit(this.for(eventMap.responseClientDisconnected, data.token), data);
        this._emit(`client-disconnect-${data.token}`, data.token);
        this._emit(`client-disconnect`, data.token);
      });
    });
  }

  _generateUUID() {
    return crypto.randomBytes(10).toString('hex');
  }

  unwrap(data) {
    return data || {data: {}};
  }

  wrap(data) {
    return data;
  }

  _handleTransmit({token, dest, channel, data, resolve, action, reject, awk}, callback) {
    const eventMap = this.eventMap;
    const eventId = this._generateUUID();

    if (action === this.eventMap.requestBroadcast ||
      action === this.eventMap.requestPeerBroadcast) {
      const req = {
        id: this.origin,
        data: {
          dest,
          id: eventId,
          token,
          channel,
          data,
          awk
        }
      };

      this._emitIPC(action, req);

      return callback();
    }

    let tid;
    let event;

    const accepted = res => {
      clearTimeout(tid);
      resolve(res.data);
    };

    const timeout = () => {
      this.removeListener(event, accepted);
      reject({token, channel, data, awk});
    };

    let awkChan;

    if (action === eventMap.requestEmit) {
      awkChan = eventMap.responseClientAwk;
    } else if (action === eventMap.requestPeerEmit) {
      awkChan = eventMap.responsePeerAwk;
    } else if (eventMap.requestMasterEmit) {
      awkChan = eventMap.responseMasterAwk;
    }

    if (awk) {
      event = this.for(awkChan, eventId);

      const wait = typeof awk === 'number' && awk > 0 ? awk : this.resDefaultTimeout;

      this.once(event, accepted);
      tid = setTimeout(timeout, wait);
    }

    const req = {
      id: this.origin,
      data: {
        dest,
        id: eventId,
        token,
        channel,
        data,
        awk
      }
    };

    this._emitIPC(action, req);

    callback();
  }

  for(event, id) {
    return [event, id].join(this.eventMap.delimiter);
  }

  _emitIPC(event, data) {
    ipc.of[this.scope].emit(event, this.wrap(data, event));
  }

  accept(token) {
    const eventMap = this.eventMap;

    return new Promise(resolve => {
      if (eventMap.responseTokenAdded) {
        this.once(this.for(eventMap.responseTokenAdded, token), data => resolve(data));
      }

      const req = {
        id: this.origin,
        data: {token}
      };

      this._emitIPC(eventMap.requestAddToken, req);

      if (!eventMap.responseTokenAdded) {
        resolve(token);
      }
    });
  }

  reject(token) {
    const eventMap = this.eventMap;

    return new Promise(resolve => {
      if (eventMap.responseTokenRemoved) {
        this.once(this.for(eventMap.responseTokenRemoved, token), () => {
          resolve(token);
        });
      }

      const req = {
        id: this.origin,
        data: {token}
      };

      this._emitIPC(eventMap.requestRemoveToken, req);

      if (!eventMap.responseTokenRemoved) {
        resolve(token);
      }
    });
  }

  volatile(token, channel, data) {
    return this.emit(token, channel, data, false);
  }

  emit(token, channel, data, awk = true, resolve, reject) {
    if (!awk) {
      return this.queue.push({token, action: this.eventMap.requestEmit, channel, data});
    }

    if (typeof resolve === 'function' && typeof reject === 'function') {
      return this.queue.push({token, action: this.eventMap.requestEmit, channel, data, awk, resolve, reject});
    }

    return new Promise((_resolve, _reject) => {
      const req = {
        token,
        action: this.eventMap.requestEmit,
        channel,
        data,
        awk,
        resolve: _resolve,
        reject: _reject
      };

      this.queue.push(req);
    });
  }

  address() {
    if (!this._address) {
      this._address = new Promise(resolve => {
        this.queue.push(callback => {
          this.once(this.eventMap.responseServerAddress, _address => resolve(_address));

          const req = {
            id: this.origin,
            data: {}
          };

          this._emitIPC(this.eventMap.requestServerAddress, req);
          callback();
        });
      });
    }

    return this._address;
  }

  broadcast(channel, data) {
    this.queue.push({channel, action: this.eventMap.requestBroadcast, data, awk: true});
  }

  disconnect() {
    if (active.hasOwnProperty(this.scope)) {
      delete active[this.scope][this.origin];

      const sync = ipc.config.sync;
      ipc.config.sync = true;

      // bypass queue
      try {
        ipc.of[this.scope].emit(this.eventMap.requestDeauthorization, {id: this.origin, data: {origin: this.origin}});
      } catch (e) {
        // ignore
      }

      ipc.config.sync = sync;

      if (!active[this.scope].length) {
        ipc.disconnect(this.scope);
      }
    }
  }

  isRemote() {
    return this.remote;
  }

  isLocal() {
    return !this.remote;
  }
}

export default PubSubSlave;
