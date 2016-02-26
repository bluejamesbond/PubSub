# PubSub

Install with `npm`

```sh
npm install git://github.com/bluejamesbond/PubSub.git
```

## Socket

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
const pubsub = new PubSub.Master(server, {appspace: port, debug, remote});

pubsub.listen(port, port + offset, () => {
  console.log(`Listening on ${port} and ${port + offset}`);
});
```