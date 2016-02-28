# PubSub
Pusher system using the publisher/subscriber model; supports clustering

## Design
- **Peers**: Your application (logic) servers clustered for performance
  - Connected to Master via. TCP or Unix/Windows Socket (set via `remote` option)
  - Peers can communicate with each other via the `PubSub.Peer` API
  - Peers can communicate with master via the `PubSub.Master` API
  - Peers can communicate with clients via the `PubSub.Client` API
- **Clients**: Clients which are communicating with your application servers
  - Connected to Master via. WebSocket (Socket.IO)
  - Clients can listen to information sent by the application servers
  - Clients can respond back when an application sends a request
- **Master**: Contains the PubSub hub that connects your users (connected via WebSockets) to your application servers 
  - Master can communicate with application servers via the `PubSub.Slave` API 

## Install

Install with `npm`

```sh
npm install git://github.com/bluejamesbond/PubSub.js.git
```

## Spin up this example (via. BranchOff)
```
npm install pm2 -g
pm2 install branch-off

// go to to localhost:5000 (build/build)
// add this repo and the "master" branch
```

## Communicate Master ↔ Peer

### Master
```js
const app = express();
const server = http.createServer(app);
const pubsub = new PubSub.Master('master-server-0', {debug, remote});

pubsub.listen(server, port, port + offset, () => {
  console.log(`Listening on ${port} and ${port + offset}`);
});

const {Slave} = pubsub;

Slave.on('connect', origin => {
  console.log('Connected', origin);
});

Slave.on('cat', (origin, respond) => {
  respond('dog');
});
```

### Peer
```js
// connect to master
const master = 'master-server-0'; // master name
const address = {port: 3000, protocol: 'http', hostname: '0.0.0.0'}; // master address
const ps = new PubSub.Slave('my-name', address, {remote, master});

ps.connect();

const {Master} = ps;

ps.on('connect', async () => {
  const res = await Master.emit('cat');
  console.log(res); // 'dog'
});
```

## Communicate Peer ↔ Client

### Peer
```es6
// ... connect to master

const {Client} = ps;

Client.accept('user-01'); // only accepted users can connect

Client.on('connect-user-01', async () => {
  const res = await Client.emit('foo');
  console.log(res); // 'bar'
});
```

### Client
```es6
socket = io(url, {query: 'id=user-01'});

socket.once('foo', respond => 
  respond('bar');
});
```

## Communicate Peer ↔ Peer

### Peer 1
```es6
// ... connect to master

const {Peer} = ps;

ps.on('connect', async () => {
  const res = await Peer.emit('add', [5, 4]);
  console.log(res); // 9
});
```

### Peer 2
```es6
// ... connect to master

const {Peer} = ps;

Peer.on('add', ([a, b]) => {
  respond(a + b);
});
```
