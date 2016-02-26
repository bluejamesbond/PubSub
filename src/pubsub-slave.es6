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
  requestPeerBroadcast: 'broadcast-peer',
  requestPeerEmit: 'emit-peer',

  // response events
  responsePeerReceived: 'peer-got',
  responseClientAwk: 'client-received',
  responsePeerAwk: 'peer-received',
  responseClientDisconnected: 'client-disconnected',
  responsePeerMessage: 'peer-message',
  responseClientConnected: 'client-connected',
  responseServerAddress: 'server-address',
  responseTokenAdded: 'token-added',
  responseTokenRemoved: 'token-removed'
};

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
  constructor(origin, address, remote, opts = defaultOpts) {
    super();

    opts = Object.assign(defaultOpts, opts);

    this.origin = origin;
    this.opts = opts;
    this.scope = opts.scope;
    this.eventMap = Object.assign(defaultEventMap, opts.eventMap);
    this.remoteAddress = address;
    this.remote = remote;
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

  peer = {
    broadcast: this.peerBroadcast.bind(this),
    volatile: this.peerVolatile.bind(this),
    emit: this.peerEmit.bind(this),
    emitCB: this.peerEmitCB.bind(this)
  }

  peerBroadcast(channel, data) {
    this.queue.push({channel, action: this.eventMap.requestPeerBroadcast, data, awk: true});
  }

  peerVolatile(dest, channel, data) {
    this.peerEmit(dest, channel, data, false);
  }

  peerEmit(dest, channel, data, awk = true) {
    if (!awk) {
      return this.queue.push({action: this.eventMap.requestPeerEmit, channel, data, dest});
    }

    return new Promise((resolve, reject) => {
      this.queue.push({action: this.eventMap.requestPeerEmit, channel, data, awk, dest, resolve, reject});
    });
  }

  peerEmitCB(dest, channel, data, resolve, reject) {
    this.queue.push({dest, channel, action: this.eventMap.requestPeerEmit, data, awk: true, resolve, reject});
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
    ipc.config.appspace = this.opts.appspace;

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
      });

      ipc.of[this.scope].on('disconnect', () => {
        this.queue.pause();
      });

      ipc.of[this.scope].on(eventMap.responseTokenAdded, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseTokenAdded).data;

        this._emit(eventMap.responseTokenAdded, data);
        this._emit(this.for(eventMap.responseTokenAdded, data.token), data);
      });

      ipc.of[this.scope].on(eventMap.responseServerAddress, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseServerAddress).data;

        this._emit(eventMap.responseServerAddress, data);
      });

      ipc.of[this.scope].on(eventMap.responseTokenRemoved, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseTokenRemoved).data;

        this._emit(eventMap.responseTokenRemoved, data);
        this._emit(this.for(eventMap.responseTokenRemoved, data.token), data);
      });

      ipc.of[this.scope].on(eventMap.responseClientAwk, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseClientAwk).data;

        this._emit(eventMap.responseClientAwk, data);
        this._emit(this.for(eventMap.responseClientAwk, data.id), data);
      });

      ipc.of[this.scope].on(eventMap.responsePeerAwk, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responsePeerAwk).data;

        this._emit(eventMap.responsePeerAwk, data);
        this._emit(this.for(eventMap.responsePeerAwk, data.id), data);
      });

      ipc.of[this.scope].on(eventMap.responseClientConnected, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responseClientConnected).data;

        this._emit(eventMap.responseClientConnected, data);
        this._emit(this.for(eventMap.responseClientConnected, data.token), data);
      });

      ipc.of[this.scope].on(eventMap.responsePeerMessage, data => {
        if (data.origin !== this.origin) {
          return;
        }

        data = this.unwrap(data, eventMap.responsePeerMessage).data;

        let v = 0;
        const respond = res => {
          if (v++) return;
          const response = {id: this.origin, data: {...data, _data: data.data, data: res}};
          this.queue.push(() => this._emitIPC(eventMap.responsePeerReceived, response));
        };

        this._emit(eventMap.responsePeerMessage, data, respond);
        this._emit(this.for(eventMap.responsePeerMessage, data.channel, respond), data.data);

        for (const e in this.eventMap) {
          if (this.eventMap.hasOwnProperty(e)) {
            if (data.channel === eventMap[e]) {
              return;
            }
          }
        }

        this._emit(data.channel, data.data, respond);
      });

      ipc.of[this.scope].on(eventMap.responseClientDisconnected, data => {
        data = this.unwrap(data, eventMap.responseClientDisconnected).data;

        this._emit(eventMap.responseClientDisconnected, data);
        this._emit(this.for(eventMap.responseClientDisconnected, data.token), data);
      });
    });
  }

  generateUUID() {
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
    const eventId = this.generateUUID();

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
    } else {
      awkChan = eventMap.responsePeerAwk;
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

  emit(token, channel, data, awk = true) {
    if (!awk) {
      return this.queue.push({token, action: this.eventMap.requestEmit, channel, data});
    }

    return new Promise((resolve, reject) => {
      this.queue.push({token, action: this.eventMap.requestEmit, channel, data, awk, resolve, reject});
    });
  }

  emitCB(token, channel, data, resolve, reject) {
    this.queue.push({token, channel, action: this.eventMap.requestEmit, data, awk: true, resolve, reject});
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
