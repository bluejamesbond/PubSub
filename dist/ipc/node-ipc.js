'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _nodeIpc = require('node-ipc');

var _nodeIpc2 = _interopRequireDefault(_nodeIpc);

var _ipc = require('../ipc.js');

var _ipc2 = _interopRequireDefault(_ipc);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// TODO: Add groups via key

var noop = function noop() {
  return 0;
};
var defaultOpts = {
  debug: true,
  appspace: '',
  allowPeerEmit: true, // true: slaves can message a specific slave by origin
  allowPeerBroadcast: true, // true: slaves can talk amongst themselves
  allowSlaveEmit: true, // true: slaves can talk to master
  allowAllConnections: true // false: set acceptable connections via accept, disconnect
};

var NodeIPC = function (_IPC) {
  _inherits(NodeIPC, _IPC);

  function NodeIPC(id) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, NodeIPC);

    opts = Object.assign(defaultOpts, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeIPC).call(this, opts.debug));

    _this.Slave = {
      volatile: _this._slaveVolatile.bind(_this),
      emit: _this._slaveEmit.bind(_this),
      broadcast: _this._slaveBroadcast.bind(_this),
      on: _this._slaveOn.bind(_this),
      once: _this._slaveOnce.bind(_this),
      accept: _this._slaveAccept.bind(_this),
      reject: _this._slaveReject.bind(_this),
      disconnect: _this._slaveDisconnect.bind(_this),
      removeListener: _this._slaveRemoveListener.bind(_this)
    };


    _this.remote = opts.remote;
    _this.accepted = new Map();
    _this.connections = new Map();
    _this.opts = opts;

    _nodeIpc2.default.config.id = opts.id || 'socket';
    _nodeIpc2.default.config.retry = 5;
    _nodeIpc2.default.config.maxRetries = 20;
    _nodeIpc2.default.config.networkHost = _this.remote ? '0.0.0.0' : '127.0.0.1';
    _nodeIpc2.default.config.maxConnections = 10;
    _nodeIpc2.default.config.appspace = id || opts.appspace;
    _nodeIpc2.default.config.silent = !_this.debug;
    return _this;
  }

  _createClass(NodeIPC, [{
    key: '_slaveAccept',
    value: function _slaveAccept(origin) {
      this.accepted.set(origin, true);
    }
  }, {
    key: '_slaveReject',
    value: function _slaveReject(origin) {
      this.accepted.delete(origin);
      this._slaveDisconnect(origin);
    }
  }, {
    key: '_slaveDisconnect',
    value: function _slaveDisconnect(origin) {
      var socket = this.connections.get(origin);

      NodeIPC.terminate(socket);
    }
  }, {
    key: '_slaveOn',

    // ignore
    value: function _slaveOn(channel) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return this.on.apply(this, ['slave-emit-' + channel].concat(args));
    }
  }, {
    key: '_slaveOnce',
    value: function _slaveOnce(channel) {
      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      return this.on.apply(this, ['slave-emit-' + channel].concat(args));
    }
  }, {
    key: '_slaveRemoveListener',
    value: function _slaveRemoveListener(channel) {
      for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }

      return this.removeListener.apply(this, ['slave-emit-' + channel].concat(args));
    }
  }, {
    key: '_slaveVolatile',
    value: function _slaveVolatile(dest, channel, data) {
      this._slaveEmit(dest, channel, data, false);
    }
  }, {
    key: '_slaveEmit',
    value: function _slaveEmit(dest, channel, data) {
      var _this2 = this;

      var awk = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

      if (!awk) {
        return this._handleTransmit({ dest: dest, action: 'master-message', channel: channel, data: data, awk: awk }, noop);
      }

      return new Promise(function (resolve, reject) {
        _this2._handleTransmit({ dest: dest, action: 'master-message', channel: channel, data: data, resolve: resolve, reject: reject, awk: awk }, noop);
      });
    }
  }, {
    key: '_slaveBroadcast',
    value: function _slaveBroadcast(channel, data) {
      var except = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      return this._handleTransmit({ action: 'master-broadcast', channel: channel, data: data, except: except }, noop);
    }
  }, {
    key: '_handleTransmit',
    value: function _handleTransmit(_ref, callback) {
      var _this3 = this;

      var dest = _ref.dest;
      var channel = _ref.channel;
      var data = _ref.data;
      var resolve = _ref.resolve;
      var action = _ref.action;
      var reject = _ref.reject;
      var awk = _ref.awk;
      var _ref$except = _ref.except;
      var except = _ref$except === undefined ? [] : _ref$except;

      var eventId = this._generateUUID();

      if (action === 'master-broadcast') {
        this.broadcast.apply(this, ['master-message', { id: eventId, channel: channel, data: data }].concat(_toConsumableArray(except)));
        return callback();
      }

      var tid = undefined;
      var event = undefined;

      var accepted = function accepted(res) {
        clearTimeout(tid);
        resolve(res.data);
      };

      var timeout = function timeout() {
        _this3.removeListener(event, accepted);
        reject({ dest: dest, channel: channel, data: data, awk: awk });
      };

      var awkChan = undefined;

      // if its not a master-broadcast
      if (action === 'master-message') {
        awkChan = 'master-awk';
      }

      if (awk) {
        var wait = typeof awk === 'number' && awk > 0 ? awk : this.resDefaultTimeout;

        this.once(awkChan + '-' + eventId, accepted);
        tid = setTimeout(timeout, wait);
      }

      var req = {
        id: this.origin,
        data: { id: eventId, channel: channel, data: data }
      };

      this.emit(dest, action, req);

      callback();
    }
  }, {
    key: '_generateUUID',
    value: function _generateUUID() {
      return _crypto2.default.randomBytes(10).toString('hex');
    }
  }, {
    key: 'listen',
    value: function listen(port) {
      var _this4 = this;

      var cb = arguments.length <= 1 || arguments[1] === undefined ? function () {
        return 0;
      } : arguments[1];

      _nodeIpc2.default.config.networkPort = port;

      _nodeIpc2.default[this.remote ? 'serveNet' : 'serve'](function () {
        _nodeIpc2.default.config.stopRetrying = true; // TODO test corner cases

        _nodeIpc2.default.server.on('authorize', function (req, socket) {
          var origin = socket.id;

          if (!_this4.opts.allowAllConnections) {
            if (!_this4.accepted.has(origin)) {
              _this4.log('Force disconnection', origin);
              return NodeIPC.terminate(socket);
            }
          }

          if (_this4.connections.has(origin)) {
            var prevSocket = _this4.connections.get(origin);

            if (prevSocket && prevSocket.writable) {
              return NodeIPC.terminate(socket);
            }

            NodeIPC.terminate(prevSocket);
          }

          _this4.connections.set(origin, socket);

          _this4._emit('slave-emit-connect', origin);
          _this4._emit('slave-emit-connect-' + origin, origin);
        });

        _nodeIpc2.default.server.on('deauthorize', function (req, socket) {
          var origin = socket.id;

          _this4.connections.delete(origin);

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _this4.connections.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var _step$value = _slicedToArray(_step.value, 2);

              var _socket = _step$value[1];

              if (_socket === socket) {
                _this4.log('found another connection', origin);
                return;
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          socket.destroy();
        });

        if (_this4.opts.allowSlaveEmit !== false) {
          _nodeIpc2.default.server.on('slave-emit', function (req, socket) {
            var origin = socket.id;
            var data = req.data;

            var v = 0;
            var respond = function respond(res) {
              if (v++) return;
              _this4.emit(origin, 'master-received', _extends({}, data, { _data: data.data, data: res }));
            };

            var channel = data.channel;
            if (channel === 'connect' || channel === 'disconnect') {
              channel = '_' + channel;
            }

            _this4._emit('slave-emit', origin, data, respond);
            _this4._emit('slave-emit-' + channel, origin, data.data, respond);
          });
        }

        _nodeIpc2.default.server.on('*', function (event, req) {
          if (event === 'authorize') {
            return;
          }

          var origin = req.id;

          if (_this4.connections.has(origin)) {
            _this4._emit(event, origin, req.data);
          }
        });

        _nodeIpc2.default.server.on('socket.disconnected', function (socket) {
          var origin = socket.id;

          if (!socket.__destroyed) {
            _this4.connections.delete(origin);
          }

          _this4._emit('slave-emit-disconnect', origin);
          _this4._emit('slave-emit-disconnect-' + origin, origin);
        });

        if (_this4.opts.allowPeerBroadcast !== false) {
          _nodeIpc2.default.server.on('broadcast-peer', function (req, socket) {
            var origin = socket.id;

            req.data.from = origin;

            _this4.broadcast('peer-message', req.data, origin);
          });
        }

        if (_this4.opts.allowPeerEmit !== false) {
          _nodeIpc2.default.server.on('emit-peer', function (req, socket) {
            var id = req.data.id;
            var origin = socket.id;

            _this4.once('peer-got-' + id, function (data) {
              _this4.emit(origin, 'peer-received', _extends({}, req.data, { _data: req.data.data, data: data.data }));
            });

            var dest = req.data.dest;

            req.data.from = req.data.dest;

            delete req.data.dest;

            _this4.emit(dest, 'peer-message', req.data);
          });
        }

        if (_this4.opts.allowPeerEmit !== false) {
          _nodeIpc2.default.server.on('peer-got', function (req) {
            _this4._emit('peer-got-' + req.data.id, req.data);
          });
        }

        process.nextTick(cb);
      });

      _nodeIpc2.default.server.start();
    }
  }, {
    key: 'broadcast',
    value: function broadcast(channel, data) {
      for (var _len4 = arguments.length, except = Array(_len4 > 2 ? _len4 - 2 : 0), _key4 = 2; _key4 < _len4; _key4++) {
        except[_key4 - 2] = arguments[_key4];
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.connections.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var origin = _step2.value;

          if (except.indexOf(origin) > -1) {
            continue;
          }

          this.emit(origin, channel, data);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  }, {
    key: 'emit',
    value: function emit(dest, channel, data) {
      try {
        if (this.connections.has(dest)) {
          var socket = this.connections.get(dest);

          try {
            _nodeIpc2.default.server.emit(socket, channel, { id: _nodeIpc2.default.config.id, dest: dest, data: data });
          } catch (e) {
            console.error(e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }], [{
    key: 'terminate',
    value: function terminate(socket) {
      if (socket) {
        try {
          socket.__destroyed = true;
          socket.destroy();
        } catch (e) {}
      }
    }
  }]);

  return NodeIPC;
}(_ipc2.default);

exports.default = NodeIPC;

//# sourceMappingURL=node-ipc.js.map