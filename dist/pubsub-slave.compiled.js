'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _nodeIpc = require('node-ipc');

var _nodeIpc2 = _interopRequireDefault(_nodeIpc);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var noop = function noop() {
  return 0;
};

var defaultEventMap = {
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

var active = {};

var defaultOpts = {
  resDefaultTimeout: 60000,
  debug: false,
  concurrency: 50,
  scope: 'socket',
  eventMap: defaultEventMap,
  appspace: 'socket'
};

var PubSubSlave = function (_EventEmitter) {
  _inherits(PubSubSlave, _EventEmitter);

  function PubSubSlave(origin, address, remote) {
    var opts = arguments.length <= 3 || arguments[3] === undefined ? defaultOpts : arguments[3];

    _classCallCheck(this, PubSubSlave);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(PubSubSlave).call(this));

    _this.peer = {
      broadcast: _this.peerBroadcast.bind(_this),
      volatile: _this.peerVolatile.bind(_this),
      emit: _this.peerEmit.bind(_this),
      emitCB: _this.peerEmitCB.bind(_this)
    };


    opts = Object.assign(defaultOpts, opts);

    _this.origin = origin;
    _this.opts = opts;
    _this.scope = opts.scope;
    _this.eventMap = Object.assign(defaultEventMap, opts.eventMap);
    _this.remoteAddress = address;
    _this.remote = remote;
    _this.resDefaultTimeout = opts.resDefaultTimeout;
    _this.debug = opts.debug;

    _this.setMaxListeners(Number.MAX_SAFE_INTEGER);

    _this.queue = _async2.default.queue(function (data, callback) {
      var _callback = function _callback() {
        return process.nextTick(callback);
      };
      if (typeof data === 'function') {
        if (data.length) {
          data(_callback);
        } else {
          data();
          _callback();
        }

        return;
      }

      _this._handleTransmit(data, _callback);
    }, opts.concurrency);

    _this.queue.pause();
    return _this;
  }

  _createClass(PubSubSlave, [{
    key: 'peerBroadcast',
    value: function peerBroadcast(channel, data) {
      this.queue.push({ channel: channel, action: this.eventMap.requestPeerBroadcast, data: data, awk: true });
    }
  }, {
    key: 'peerVolatile',
    value: function peerVolatile(dest, channel, data) {
      this.peerEmit(dest, channel, data, false);
    }
  }, {
    key: 'peerEmit',
    value: function peerEmit(dest, channel, data) {
      var _this2 = this;

      var awk = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

      if (!awk) {
        return this.queue.push({ action: this.eventMap.requestPeerEmit, channel: channel, data: data, dest: dest });
      }

      return new _bluebird2.default(function (resolve, reject) {
        _this2.queue.push({ action: _this2.eventMap.requestPeerEmit, channel: channel, data: data, awk: awk, dest: dest, resolve: resolve, reject: reject });
      });
    }
  }, {
    key: 'peerEmitCB',
    value: function peerEmitCB(dest, channel, data, resolve, reject) {
      this.queue.push({ dest: dest, channel: channel, action: this.eventMap.requestPeerEmit, data: data, awk: true, resolve: resolve, reject: reject });
    }

    // private emit

  }, {
    key: '_emit',
    value: function _emit() {
      var _get2;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      (_get2 = _get(Object.getPrototypeOf(PubSubSlave.prototype), 'emit', this)).call.apply(_get2, [this].concat(args));
    }
  }, {
    key: 'resolveHost',
    value: function resolveHost(address) {
      var host = address.hostname || '0.0.0.0';

      if (host === 'localhost' || host === '::1' || host === '127.0.0.1') {
        host = '0.0.0.0';
      }

      return host;
    }
  }, {
    key: 'resolvePort',
    value: function resolvePort(address) {
      return address.port;
    }
  }, {
    key: 'configure',
    value: function configure(_ipc) {
      noop(_ipc);
    }
  }, {
    key: 'connect',
    value: function connect() {
      var _this3 = this;

      var eventMap = this.eventMap;
      var address = this.remoteAddress;

      if (!active.hasOwnProperty(this.scope)) {
        active[this.scope] = {};
      }

      active[this.scope] = _defineProperty({}, this.origin, true);

      _nodeIpc2.default.config.retry = 5000;
      _nodeIpc2.default.config.maxRetries = 20;
      _nodeIpc2.default.config.silent = !this.debug;
      _nodeIpc2.default.config.networkHost = this.resolveHost(address);
      _nodeIpc2.default.config.networkPort = this.resolvePort(address);
      _nodeIpc2.default.config.appspace = this.opts.appspace;

      this.configure(_nodeIpc2.default);

      return new _bluebird2.default(function (resolve) {
        _nodeIpc2.default[_this3.remote ? 'connectToNet' : 'connectTo'](_this3.scope, function () {
          _nodeIpc2.default.config.stopRetrying = false;
          resolve();

          _this3.queue.unshift(function () {
            var req = {
              id: _this3.origin,
              data: { origin: _this3.origin }
            };

            _this3._emitIPC(_this3.eventMap.requestAuthorization, req);
          });

          _this3.queue.resume();
        });

        _nodeIpc2.default.of[_this3.scope].on('disconnect', function () {
          _this3.queue.pause();
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responseTokenAdded, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responseTokenAdded).data;

          _this3._emit(eventMap.responseTokenAdded, data);
          _this3._emit(_this3.for(eventMap.responseTokenAdded, data.token), data);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responseServerAddress, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responseServerAddress).data;

          _this3._emit(eventMap.responseServerAddress, data);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responseTokenRemoved, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responseTokenRemoved).data;

          _this3._emit(eventMap.responseTokenRemoved, data);
          _this3._emit(_this3.for(eventMap.responseTokenRemoved, data.token), data);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responseClientAwk, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responseClientAwk).data;

          _this3._emit(eventMap.responseClientAwk, data);
          _this3._emit(_this3.for(eventMap.responseClientAwk, data.id), data);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responsePeerAwk, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responsePeerAwk).data;

          _this3._emit(eventMap.responsePeerAwk, data);
          _this3._emit(_this3.for(eventMap.responsePeerAwk, data.id), data);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responseClientConnected, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responseClientConnected).data;

          _this3._emit(eventMap.responseClientConnected, data);
          _this3._emit(_this3.for(eventMap.responseClientConnected, data.token), data);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responsePeerMessage, function (data) {
          if (data.origin !== _this3.origin) {
            return;
          }

          data = _this3.unwrap(data, eventMap.responsePeerMessage).data;

          var v = 0;
          var respond = function respond(res) {
            if (v++) return;
            var response = { id: _this3.origin, data: _extends({}, data, { _data: data.data, data: res }) };
            _this3.queue.push(function () {
              return _this3._emitIPC(eventMap.responsePeerReceived, response);
            });
          };

          _this3._emit(eventMap.responsePeerMessage, data, respond);
          _this3._emit(_this3.for(eventMap.responsePeerMessage, data.channel, respond), data.data);

          for (var e in _this3.eventMap) {
            if (_this3.eventMap.hasOwnProperty(e)) {
              if (data.channel === eventMap[e]) {
                return;
              }
            }
          }

          _this3._emit(data.channel, data.data, respond);
        });

        _nodeIpc2.default.of[_this3.scope].on(eventMap.responseClientDisconnected, function (data) {
          data = _this3.unwrap(data, eventMap.responseClientDisconnected).data;

          _this3._emit(eventMap.responseClientDisconnected, data);
          _this3._emit(_this3.for(eventMap.responseClientDisconnected, data.token), data);
        });
      });
    }
  }, {
    key: 'generateUUID',
    value: function generateUUID() {
      return _crypto2.default.randomBytes(10).toString('hex');
    }
  }, {
    key: 'unwrap',
    value: function unwrap(data) {
      return data || { data: {} };
    }
  }, {
    key: 'wrap',
    value: function wrap(data) {
      return data;
    }
  }, {
    key: '_handleTransmit',
    value: function _handleTransmit(_ref, callback) {
      var _this4 = this;

      var token = _ref.token;
      var dest = _ref.dest;
      var channel = _ref.channel;
      var data = _ref.data;
      var resolve = _ref.resolve;
      var action = _ref.action;
      var reject = _ref.reject;
      var awk = _ref.awk;

      var eventMap = this.eventMap;
      var eventId = this.generateUUID();

      if (action === this.eventMap.requestBroadcast || action === this.eventMap.requestPeerBroadcast) {
        var _req = {
          id: this.origin,
          data: {
            dest: dest,
            id: eventId,
            token: token,
            channel: channel,
            data: data,
            awk: awk
          }
        };

        this._emitIPC(action, _req);

        return callback();
      }

      var tid = undefined;
      var event = undefined;

      var accepted = function accepted(res) {
        clearTimeout(tid);
        resolve(res.data);
      };

      var timeout = function timeout() {
        _this4.removeListener(event, accepted);
        reject({ token: token, channel: channel, data: data, awk: awk });
      };

      var awkChan = undefined;

      if (action === eventMap.requestEmit) {
        awkChan = eventMap.responseClientAwk;
      } else {
        awkChan = eventMap.responsePeerAwk;
      }

      if (awk) {
        event = this.for(awkChan, eventId);

        var wait = typeof awk === 'number' && awk > 0 ? awk : this.resDefaultTimeout;

        this.once(event, accepted);
        tid = setTimeout(timeout, wait);
      }

      var req = {
        id: this.origin,
        data: {
          dest: dest,
          id: eventId,
          token: token,
          channel: channel,
          data: data,
          awk: awk
        }
      };

      this._emitIPC(action, req);

      callback();
    }
  }, {
    key: 'for',
    value: function _for(event, id) {
      return [event, id].join(this.eventMap.delimiter);
    }
  }, {
    key: '_emitIPC',
    value: function _emitIPC(event, data) {
      _nodeIpc2.default.of[this.scope].emit(event, this.wrap(data, event));
    }
  }, {
    key: 'accept',
    value: function accept(token) {
      var _this5 = this;

      var eventMap = this.eventMap;

      return new _bluebird2.default(function (resolve) {
        if (eventMap.responseTokenAdded) {
          _this5.once(_this5.for(eventMap.responseTokenAdded, token), function (data) {
            return resolve(data);
          });
        }

        var req = {
          id: _this5.origin,
          data: { token: token }
        };

        _this5._emitIPC(eventMap.requestAddToken, req);

        if (!eventMap.responseTokenAdded) {
          resolve(token);
        }
      });
    }
  }, {
    key: 'reject',
    value: function reject(token) {
      var _this6 = this;

      var eventMap = this.eventMap;

      return new _bluebird2.default(function (resolve) {
        if (eventMap.responseTokenRemoved) {
          _this6.once(_this6.for(eventMap.responseTokenRemoved, token), function () {
            resolve(token);
          });
        }

        var req = {
          id: _this6.origin,
          data: { token: token }
        };

        _this6._emitIPC(eventMap.requestRemoveToken, req);

        if (!eventMap.responseTokenRemoved) {
          resolve(token);
        }
      });
    }
  }, {
    key: 'volatile',
    value: function volatile(token, channel, data) {
      return this.emit(token, channel, data, false);
    }
  }, {
    key: 'emit',
    value: function emit(token, channel, data) {
      var _this7 = this;

      var awk = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

      if (!awk) {
        return this.queue.push({ token: token, action: this.eventMap.requestEmit, channel: channel, data: data });
      }

      return new _bluebird2.default(function (resolve, reject) {
        _this7.queue.push({ token: token, action: _this7.eventMap.requestEmit, channel: channel, data: data, awk: awk, resolve: resolve, reject: reject });
      });
    }
  }, {
    key: 'emitCB',
    value: function emitCB(token, channel, data, resolve, reject) {
      this.queue.push({ token: token, channel: channel, action: this.eventMap.requestEmit, data: data, awk: true, resolve: resolve, reject: reject });
    }
  }, {
    key: 'address',
    value: function address() {
      var _this8 = this;

      if (!this._address) {
        this._address = new _bluebird2.default(function (resolve) {
          _this8.queue.push(function (callback) {
            _this8.once(_this8.eventMap.responseServerAddress, function (_address) {
              return resolve(_address);
            });

            var req = {
              id: _this8.origin,
              data: {}
            };

            _this8._emitIPC(_this8.eventMap.requestServerAddress, req);
            callback();
          });
        });
      }

      return this._address;
    }
  }, {
    key: 'broadcast',
    value: function broadcast(channel, data) {
      this.queue.push({ channel: channel, action: this.eventMap.requestBroadcast, data: data, awk: true });
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      if (active.hasOwnProperty(this.scope)) {
        delete active[this.scope][this.origin];

        var sync = _nodeIpc2.default.config.sync;
        _nodeIpc2.default.config.sync = true;

        // bypass queue
        try {
          _nodeIpc2.default.of[this.scope].emit(this.eventMap.requestDeauthorization, { id: this.origin, data: { origin: this.origin } });
        } catch (e) {
          // ignore
        }

        _nodeIpc2.default.config.sync = sync;

        if (!active[this.scope].length) {
          _nodeIpc2.default.disconnect(this.scope);
        }
      }
    }
  }, {
    key: 'isRemote',
    value: function isRemote() {
      return this.remote;
    }
  }, {
    key: 'isLocal',
    value: function isLocal() {
      return !this.remote;
    }
  }]);

  return PubSubSlave;
}(_events2.default);

exports.default = PubSubSlave;

//# sourceMappingURL=pubsub-slave.compiled.js.map