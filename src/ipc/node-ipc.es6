import ipc from 'node-ipc';
import IPC from '../ipc.es6';
import crypto from 'crypto';

// TODO: Add groups via key

const noop = () => 0;
const defaultOpts = {
  debug: true,
  appspace: '',
  allowPeerEmit: true, // true: slaves can message a specific slave by origin
  allowPeerBroadcast: true, // true: slaves can talk amongst themselves
  allowSlaveEmit: true // true: slaves can talk to master
};

class NodeIPC extends IPC {
  constructor(remote, opts = {}) {
    opts = Object.assign(defaultOpts, opts);

    super(opts.debug);

    this.remote = remote;
    this.accepted = new Map();
    this.opts = opts;

    ipc.config.id = 'socket';
    ipc.config.retry = 5;
    ipc.config.maxRetries = 20;
    ipc.config.networkHost = this.remote ? '0.0.0.0' : '127.0.0.1';
    ipc.config.maxConnections = 10;
    ipc.config.appspace = opts.appspace;
    ipc.config.silent = !this.debug;
  }

  Slave = {
    volatile: this._slaveVolatile.bind(this),
    emit: this._slaveEmit.bind(this),
    broadcast: this._slaveBroadcast.bind(this),
    on: this._slaveOn.bind(this),
    once: this._slaveOnce.bind(this),
    removeListener: this._slaveRemoveListener.bind(this)
  };

  _slaveOn(channel, ...args) {
    return this.on(`slave-emit-${channel}`, ...args);
  }

  _slaveOnce(channel, ...args) {
    return this.on(`slave-emit-${channel}`, ...args);
  }

  _slaveRemoveListener(channel, ...args) {
    return this.removeListener(`slave-emit-${channel}`, ...args);
  }

  _slaveVolatile(dest, channel, data) {
    this._slaveEmit(dest, channel, data, false);
  }

  _slaveEmit(dest, channel, data, awk = true) {
    if (!awk) {
      return this._handleTransmit({dest, action: 'master-message', channel, data, awk}, noop);
    }

    return new Promise((resolve, reject) => {
      this._handleTransmit({dest, action: 'master-message', channel, data, resolve, reject, awk}, noop);
    });
  }

  _slaveBroadcast(channel, data, except = []) {
    return this._handleTransmit({action: 'master-broadcast', channel, data, except}, noop);
  }

  _handleTransmit({dest, channel, data, resolve, action, reject, awk, except = []}, callback) {
    const eventId = this._generateUUID();

    if (action === 'master-broadcast') {
      this.broadcast('master-message', {id: eventId, channel, data}, ...except);
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
      reject({dest, channel, data, awk});
    };

    let awkChan;

    // if its not a master-broadcast
    if (action === 'master-message') {
      awkChan = 'master-awk';
    }

    if (awk) {
      const wait = typeof awk === 'number' && awk > 0 ? awk : this.resDefaultTimeout;

      this.once(`${awkChan}-${eventId}`, accepted);
      tid = setTimeout(timeout, wait);
    }

    const req = {
      id: this.origin,
      data: {id: eventId, channel, data}
    };

    this.emit(dest, action, req);

    callback();
  }

  _generateUUID() {
    return crypto.randomBytes(10).toString('hex');
  }

  listen(port, cb = () => 0) {
    ipc.config.networkPort = port;

    ipc[this.remote ? 'serveNet' : 'serve'](() => {
      ipc.config.stopRetrying = true; // TODO test corner cases

      ipc.server.on('authorize', (req, socket) => {
        const origin = socket.id;

        if (this.accepted.has(origin)) {
          const prevSocket = this.accepted.get(origin);

          if (prevSocket && prevSocket.writable) {
            socket.__destroyed = true;
            socket.destroy();
            return;
          }

          try {
            prevSocket.destroy();
          } catch (e) {
            // ignore
          }
        }

        this.accepted.set(origin, socket);
      });

      ipc.server.on('deauthorize', (req, socket) => {
        const origin = socket.id;

        this.accepted.delete(origin);

        for (const [, _socket] of this.accepted.entries()) {
          if (_socket === socket) {
            this.log('found another connection', origin);
            return;
          }
        }

        socket.destroy();
      });

      if (this.opts.allowSlaveEmit !== false) {
        ipc.server.on('slave-emit', (req, socket) => {
          const origin = socket.id;
          const data = req.data;

          let v = 0;
          const respond = res => {
            if (v++) return;
            this.emit(origin, 'master-received', {...data, _data: data.data, data: res});
          };

          this._emit('slave-emit', origin, data, respond);
          this._emit(`slave-emit-${data.channel}`, origin, data.data, respond);
        });
      }

      ipc.server.on('*', (event, req) => {
        if (event === 'authorize') {
          return;
        }

        const origin = req.id;

        if (this.accepted.has(origin)) {
          this._emit(event, origin, req.data);
        }
      });

      ipc.server.on('socket.disconnected', socket => {
        if (socket.__destroyed) {
          return;
        }

        const origin = socket.id;

        this.accepted.delete(origin);
      });

      if (this.opts.allowPeerBroadcast !== false) {
        ipc.server.on('broadcast-peer', (req, socket) => {
          const origin = socket.id;

          req.data.from = origin;

          this.broadcast('peer-message', req.data, origin);
        });
      }

      if (this.opts.allowPeerEmit !== false) {
        ipc.server.on('emit-peer', (req, socket) => {
          const id = req.data.id;
          const origin = socket.id;

          this.once(`peer-got-${id}`, data => {
            this.emit(origin, 'peer-received', {...req.data, _data: req.data.data, data: data.data});
          });

          const dest = req.data.dest;

          req.data.from = req.data.dest;

          delete req.data.dest;

          this.emit(dest, 'peer-message', req.data);
        });
      }

      if (this.opts.allowPeerEmit !== false) {
        ipc.server.on('peer-got', req => {
          this._emit(`peer-got-${req.data.id}`, req.data);
        });
      }

      process.nextTick(cb);
    });

    ipc.server.start();
  }

  broadcast(channel, data, ...except) {
    for (const origin of this.accepted.keys()) {
      if (except.indexOf(origin) > -1) {
        continue;
      }

      this.emit(origin, channel, data);
    }
  }

  emit(dest, channel, data) {
    try {
      if (this.accepted.has(dest)) {
        const socket = this.accepted.get(dest);

        try {
          ipc.server.emit(socket, channel, {id: ipc.config.id, dest, data});
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export default NodeIPC;
