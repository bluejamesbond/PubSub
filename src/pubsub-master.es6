import {SocketIO} from './slave/index.es6';
import {NodeIPC} from './master/index.es6';
import address from './libs/address.es6';

class PubSubMaster {
  constructor(server, opts = {}) {
    this.server = server;
    this.opts = opts;

    this.slave = new SocketIO(opts.debug);
    this.master = new NodeIPC(opts.remote, opts);
  }

  listen(master, slave, cb) {
    this.slave.attach(this.server);

    this.master.on('add-token', (origin, data) => this.slave.accept(origin, data.token));
    this.master.on('remove-token', (origin, data) => this.slave.reject(origin, data.token));
    this.master.on('broadcast', (origin, data) => this.slave.broadcast(origin, data.channel, data.data));
    this.master.on('emit',
                   (origin, data) => this.slave.emit(origin, data.token, data.channel, data.id, data.data, data.awk));
    this.master.on('get-server-address',
                   origin => address(this.server, this.opts.remote)
                   .then(a => this.master.emit(origin, 'server-address', a)));

    this.slave.on('client-received', (origin, data) => this.master.emit(origin, 'client-received', data));
    this.slave.on('client-disconnected', (origin, data) => this.master.emit(origin, 'client-disconnected', data));
    this.slave.on('token-added', (origin, data) => this.master.emit(origin, 'token-added', data));
    this.slave.on('token-removed', (origin, data) => this.master.emit(origin, 'token-removed', data));

    this.master.listen(master, () => this.server.listen(slave, cb));
  }
}

export default PubSubMaster;
