# PubSub
Pusher system using the publisher/subscriber model; supports clustering

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

## Example

### PubSub Master (Server)
```js
import express from 'express';
import fs from 'fs';
import http from 'http';
import config from 'config';
import * as PubSub from 'node-pubsub';

const debug = true;
const remote = true;
const port = 3000;
const offset = 100;

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

Slave.on('verify', (origin, respond) => {
  respond({private: 5});
});
```

### Slave (Server)
```es6
import cluster from 'cluster';
import express from 'express';

const id = 'slave-server';
const remote = true;
const app = express();
const userId = crypto.randomBytes(15).toString('hex');
const address = {port: 3000, protocol: 'http', hostname: '0.0.0.0'};
const ps = new PubSub.Slave(id, address, {remote, master: 'master-server-0'});

ps.connect();

app.get('/socket', async (req, res) => {
    const accessor = await ps.accept(userId);
    const address = await ps.address();
    res.json({address, accessor});
});

app.listen(80);

// interact with peers, client, master

const {Peer, Client, Master} = ps;

// client connect
Client.on('connect', userId => {
  const response = await Client.emit(userId, 'channel-2', {txt: 'hey!'});
  Client.broadcast('channel-1', response); // broadcast to all clients
});

// client disconnect
Client.on('disconnect', userId => {
  console.log('Disconnected', userId);
});

// peer connect
Peer.on('connect', origin => {
  const response = Peer.emit(origin, 'password', {data: 'share-data'}); // ask peer for some data
  const data = Master.emit('verify', response); // ask master for verification
  Peer.broadcast('accept', {data, response}); // share with all peers
});

// peer disconnect
Peer.on('disconnect', origin => {
  console.log('Disconnected', origin);
});

Peer.on('accept', (origin, {data, response}) => {
  console.log(data, response);
});

Peer.on('password', (origin, {data}) => {
  console.log(data);
});
```

### Client (WebSocket)
```es6
const res = await fetch('/socket');
const {address, accessor: {uuid}} = await res.json();
const url = format(address);

socket = io(url, {query: `id=${uuid}`});
socket.once('channel-1', res => console.log(res.text === 'hey!'));
```
