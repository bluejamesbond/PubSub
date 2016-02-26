'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SocketIO = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _clientCom = require('../client-com.js');

var _clientCom2 = _interopRequireDefault(_clientCom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SocketIO = exports.SocketIO = function (_ClientCom) {
  _inherits(SocketIO, _ClientCom);

  function SocketIO() {
    var debug = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

    _classCallCheck(this, SocketIO);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SocketIO).call(this, debug));

    _this.sio = (0, _socket2.default)();
    _this.connected = new Map();
    return _this;
  }

  _createClass(SocketIO, [{
    key: 'attach',
    value: function attach(server) {
      var _this2 = this;

      this.sio.on('connection', function (socket) {
        return _this2._onConnect(socket);
      });
      this.sio.attach(server);
    }
  }, {
    key: 'accept',
    value: function accept(origin, token) {
      var uuid = _get(Object.getPrototypeOf(SocketIO.prototype), 'accept', this).call(this, origin, token);

      this.log('added uuid', uuid);

      this._emit('token-added', origin, { token: token, uuid: uuid });
    }
  }, {
    key: 'reject',
    value: function reject(origin, token) {
      var uuid = _get(Object.getPrototypeOf(SocketIO.prototype), 'reject', this).call(this, origin, token);

      this.log('removed uuid', uuid);

      if (uuid) {
        var currSocket = this.connected.get(uuid);
        SocketIO.terminate(currSocket);

        this.connected.delete(token);
      }

      this._emit('token-removed', origin, { token: token });
    }

    // TODO awk?

  }, {
    key: 'broadcast',
    value: function broadcast(channel, data) {
      this.sio.sockets.emit(channel, data);
    }

    // FIXME respond with client-error?

  }, {
    key: 'emit',
    value: function emit(origin, token, channel, id, data) {
      var _this3 = this;

      var awk = arguments.length <= 5 || arguments[5] === undefined ? true : arguments[5];

      var uuid = this.uuidOf(origin, token);
      var socket = this.connected.get(uuid);

      if (socket) {
        this.log('socket exists on ' + token);

        // FIXME too much scoping?
        try {
          if (!awk) {
            socket.emit(channel, data);
          } else {
            socket.emit(channel, data, function (res) {
              _this3._emit('client-received', origin, { token: token, channel: channel, id: id, _data: data, data: res }); // awk
            });
          }

          this.log('socket data emitted ' + token + '/' + channel, data);
        } catch (e) {
          console.error(e);
          // ignore
        }
      } else {
          this.log('token does not exist: ' + token);
        }
    }
  }, {
    key: '_onConnect',
    value: function _onConnect(socket) {
      var _this4 = this;

      var uuid = socket.handshake.query.id;

      if (this.isAccepted(uuid)) {
        (function () {
          var _originOf = _this4.originOf(uuid);

          var origin = _originOf.origin;
          var token = _originOf.token;

          var currSocket = _this4.connected.get(uuid);

          SocketIO.terminate(currSocket);

          _this4.connected.set(uuid, socket);

          _this4.log('server connected to client with token: ' + token);

          socket.on('disconnect', function () {
            _this4.log('socket disconnected with token: ' + token);

            _this4.connected.delete(uuid);

            _this4._emit('client-disconnected', origin, { token: token });
          });
        })();
      } else {
        console.log('socket uuid not found', uuid);

        SocketIO.terminate(socket);
      }
    }
  }], [{
    key: 'terminate',
    value: function terminate(socket) {
      if (!socket) {
        return;
      }

      try {
        socket.emit('termination', { data: 'forced disconnection' });
        socket.disconnect();
      } catch (e) {
        console.error(e);
      }
    }
  }]);

  return SocketIO;
}(_clientCom2.default);

exports.default = SocketIO;

//# sourceMappingURL=sio.js.map