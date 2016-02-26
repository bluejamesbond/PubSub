# PubSub
Pusher system using the publisher/subscriber model; supports clustering

## Install

Install with `npm`

```sh
npm install git://github.com/bluejamesbond/PubSub.js.git
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
const pubsub = new PubSub.Master({appspace: port, debug, remote});

pubsub.listen(server, port, port + offset, () => {
  console.log(`Listening on ${port} and ${port + offset}`);
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
const ps = new PubSub.Slave(id, {port: 3000, protocol: 'http', hostname: '0.0.0.0'}, remote);

ps.connect();

app.get('/socket', async (req, res) => {
    const accessor = await ps.accept(userId);
    const address = await ps.address();
    res.json({address, accessor});
});

app.listen(80);

// Interact with clients in your app
ps.Client.emit(userId, 'my-channel', {txt: 'hey!'});
```

### Client (WebSocket)
```es6
const res = await fetch('/socket');
const {address, accessor: {uuid}} = await res.json();
const url = format(address);

socket = io(url, {query: `id=${uuid}`});
socket.once('my-channel', res => console.log(res.text === 'hey!'));
```