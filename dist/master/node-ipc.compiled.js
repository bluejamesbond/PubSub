'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _nodeIpc = require('node-ipc');

var _nodeIpc2 = _interopRequireDefault(_nodeIpc);

var _master = require('../master.compiled.js');

var _master2 = _interopRequireDefault(_master);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NodeIPC = function (_Master) {
  _inherits(NodeIPC, _Master);

  function NodeIPC(remote) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, NodeIPC);

    opts = Object.assign({ debug: true, appspace: '' }, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeIPC).call(this, opts.debug));

    _this.remote = remote;
    _this.accepted = new Map();

    _nodeIpc2.default.config.id = 'socket';
    _nodeIpc2.default.config.retry = 5;
    _nodeIpc2.default.config.maxRetries = 20;
    _nodeIpc2.default.config.networkHost = _this.remote ? '0.0.0.0' : '127.0.0.1';
    _nodeIpc2.default.config.maxConnections = 10;
    _nodeIpc2.default.config.appspace = opts.appspace;
    _nodeIpc2.default.config.silent = !_this.debug;
    return _this;
  }

  _createClass(NodeIPC, [{
    key: 'listen',
    value: function listen(port) {
      var _this2 = this;

      var cb = arguments.length <= 1 || arguments[1] === undefined ? function () {
        return 0;
      } : arguments[1];

      _nodeIpc2.default.config.networkPort = port;

      _nodeIpc2.default[this.remote ? 'serveNet' : 'serve'](function () {
        _nodeIpc2.default.config.stopRetrying = true; // TODO test corner cases

        _nodeIpc2.default.server.on('authorize', function (req, socket) {
          var origin = socket.id;

          if (_this2.accepted.has(origin)) {
            var prevSocket = _this2.accepted.get(origin);

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

          _this2.accepted.set(origin, socket);
        });

        _nodeIpc2.default.server.on('deauthorize', function (req, socket) {
          var origin = socket.id;

          _this2.accepted.delete(origin);

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _this2.accepted.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var _step$value = _slicedToArray(_step.value, 2);

              var _socket = _step$value[1];

              if (_socket === socket) {
                _this2.log('found another connection', origin);
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

        _nodeIpc2.default.server.on('*', function (event, req) {
          if (event === 'authorize') {
            return;
          }

          var origin = req.id;

          if (_this2.accepted.has(origin)) {
            _this2._emit(event, origin, req.data);
          }
        });

        _nodeIpc2.default.server.on('socket.disconnected', function (socket) {
          if (socket.__destroyed) {
            return;
          }

          var origin = socket.id;

          _this2.accepted.delete(origin);
        });

        _nodeIpc2.default.server.on('broadcast-peer', function (req, socket) {
          var origin = socket.id;

          console.log(req);

          _this2.broadcast('peer-message', req.data, origin);
        });

        _nodeIpc2.default.server.on('emit-peer', function (req, socket) {
          var id = req.data.id;
          var origin = socket.id;

          _this2.once('peer-got-' + id, function (data) {
            _this2.emit(origin, 'peer-received', _extends({}, req.data, { _data: req.data.data, data: data.data }));
          });

          var dest = req.data.dest;

          req.data.from = req.data.dest;

          delete req.data.dest;

          _this2.emit(dest, 'peer-message', req.data);
        });

        _nodeIpc2.default.server.on('peer-got', function (req) {
          _this2._emit('peer-got-' + req.data.id, req.data);
        });

        process.nextTick(cb);
      });

      _nodeIpc2.default.server.start();
    }
  }, {
    key: 'broadcast',
    value: function broadcast(channel, data) {
      for (var _len = arguments.length, except = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        except[_key - 2] = arguments[_key];
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.accepted.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
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
    value: function emit(origin, channel, data) {
      try {
        if (this.accepted.has(origin)) {
          var socket = this.accepted.get(origin);

          try {
            _nodeIpc2.default.server.emit(socket, channel, { id: _nodeIpc2.default.config.id, origin: origin, data: data });
          } catch (e) {
            console.error(e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }]);

  return NodeIPC;
}(_master2.default);

exports.default = NodeIPC;

//# sourceMappingURL=node-ipc.compiled.js.map