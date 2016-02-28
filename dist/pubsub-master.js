'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _index = require('./client-com/index.js');

var _index2 = require('./ipc/index.js');

var _address = require('./libs/address.js');

var _address2 = _interopRequireDefault(_address);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PubSubMaster = function () {
  function PubSubMaster(id) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, PubSubMaster);

    this.opts = opts;

    this.client = new _index.SocketIO(opts.debug);
    this.ipc = new _index2.NodeIPC(id, opts);
    this.Slave = this.ipc.Slave;
  }

  _createClass(PubSubMaster, [{
    key: 'listen',
    value: function listen(server, ipcPort, clientPort, cb) {
      var _this = this;

      this.server = server;

      this.client.attach(server);

      this.ipc.on('add-token', function (origin, data) {
        return _this.client.accept(origin, data.token);
      });
      this.ipc.on('remove-token', function (origin, data) {
        return _this.client.reject(origin, data.token);
      });
      this.ipc.on('broadcast', function (origin, data) {
        return _this.client.broadcast(origin, data.channel, data.data);
      });
      this.ipc.on('emit', function (origin, data) {
        return _this.client.emit(origin, data.token, data.channel, data.id, data.data, data.awk);
      });
      this.ipc.on('get-server-address', function (origin) {
        return (0, _address2.default)(server, _this.opts.remote).then(function (a) {
          return _this.ipc.emit(origin, 'server-address', a);
        });
      });

      this.client.on('client-received', function (origin, data) {
        return _this.ipc.emit(origin, 'client-received', data);
      });
      this.client.on('client-disconnected', function (origin, data) {
        return _this.ipc.emit(origin, 'client-disconnected', data);
      });
      this.client.on('token-added', function (origin, data) {
        return _this.ipc.emit(origin, 'token-added', data);
      });
      this.client.on('token-removed', function (origin, data) {
        return _this.ipc.emit(origin, 'token-removed', data);
      });

      this.ipc.listen(ipcPort, function () {
        return _this.server.listen(clientPort, cb);
      });
    }
  }]);

  return PubSubMaster;
}();

exports.default = PubSubMaster;

//# sourceMappingURL=pubsub-master.js.map