import {SocketIO} from './client-com/index.es6';
import {NodeIPC} from './ipc/index.es6';
import address from './libs/address.es6';

class PubSubMaster {
  constructor(id, opts = {}) {
    this.opts = opts;

    this.client = new SocketIO(opts.debug);
    this.ipc = new NodeIPC(id, opts);
    this.Slave = this.ipc.Slave;
  }

  listen(server, ipcPort, clientPort, cb) {
    this.server = server;

    this.client.attach(server);

    this.ipc.on('add-token', (origin, data) => this.client.accept(origin, data.token));
    this.ipc.on('remove-token', (origin, data) => this.client.reject(origin, data.token));
    this.ipc.on('broadcast', (origin, data) => this.client.broadcast(origin, data.channel, data.data));
    this.ipc.on('emit',
                (origin, data) => this.client.emit(origin, data.token, data.channel, data.id, data.data, data.awk));
    this.ipc.on('get-server-address',
                origin => address(server, this.opts.remote).then(a => this.ipc.emit(origin, 'server-address', a)));

    this.client.on('client-received', (origin, data) => this.ipc.emit(origin, 'client-received', data));
    this.client.on('client-disconnected', (origin, data) => this.ipc.emit(origin, 'client-disconnected', data));
    this.client.on('token-added', (origin, data) => this.ipc.emit(origin, 'token-added', data));
    this.client.on('token-removed', (origin, data) => this.ipc.emit(origin, 'token-removed', data));

    this.ipc.listen(ipcPort, () => this.server.listen(clientPort, cb));
  }
}

export default PubSubMaster;
