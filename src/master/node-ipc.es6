import ipc from 'node-ipc';
import Master from '../master.es6';

class NodeIPC extends Master {
  constructor(remote, opts = {}) {
    opts = Object.assign({debug: true, appspace: ''}, opts);

    super(opts.debug);

    this.remote = remote;
    this.accepted = new Map();

    ipc.config.id = 'socket';
    ipc.config.retry = 5;
    ipc.config.maxRetries = 20;
    ipc.config.networkHost = this.remote ? '0.0.0.0' : '127.0.0.1';
    ipc.config.maxConnections = 10;
    ipc.config.appspace = opts.appspace;
    ipc.config.silent = !this.debug;
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

      ipc.server.on('broadcast-peer', (req, socket) => {
        const origin = socket.id;

        console.log(req);

        this.broadcast('peer-message', req.data, origin);
      });

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

      ipc.server.on('peer-got', req => {
        this._emit(`peer-got-${req.data.id}`, req.data);
      });

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

  emit(origin, channel, data) {
    try {
      if (this.accepted.has(origin)) {
        const socket = this.accepted.get(origin);

        try {
          ipc.server.emit(socket, channel, {id: ipc.config.id, origin, data});
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
