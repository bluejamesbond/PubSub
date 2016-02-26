'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _index = require('./slave/index.compiled.js');

var _index2 = require('./master/index.compiled.js');

var _address = require('./libs/address.compiled.js');

var _address2 = _interopRequireDefault(_address);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PubSubMaster = function () {
  function PubSubMaster(server) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, PubSubMaster);

    this.server = server;
    this.opts = opts;

    this.slave = new _index.SocketIO(opts.debug);
    this.master = new _index2.NodeIPC(opts.remote, opts);
  }

  _createClass(PubSubMaster, [{
    key: 'listen',
    value: function listen(master, slave, cb) {
      var _this = this;

      this.slave.attach(this.server);

      this.master.on('add-token', function (origin, data) {
        return _this.slave.accept(origin, data.token);
      });
      this.master.on('remove-token', function (origin, data) {
        return _this.slave.reject(origin, data.token);
      });
      this.master.on('broadcast', function (origin, data) {
        return _this.slave.broadcast(origin, data.channel, data.data);
      });
      this.master.on('emit', function (origin, data) {
        return _this.slave.emit(origin, data.token, data.channel, data.id, data.data, data.awk);
      });
      this.master.on('get-server-address', function (origin) {
        return (0, _address2.default)(_this.server, _this.opts.remote).then(function (a) {
          return _this.master.emit(origin, 'server-address', a);
        });
      });

      this.slave.on('client-received', function (origin, data) {
        return _this.master.emit(origin, 'client-received', data);
      });
      this.slave.on('client-disconnected', function (origin, data) {
        return _this.master.emit(origin, 'client-disconnected', data);
      });
      this.slave.on('token-added', function (origin, data) {
        return _this.master.emit(origin, 'token-added', data);
      });
      this.slave.on('token-removed', function (origin, data) {
        return _this.master.emit(origin, 'token-removed', data);
      });

      this.master.listen(master, function () {
        return _this.server.listen(slave, cb);
      });
    }
  }]);

  return PubSubMaster;
}();

exports.default = PubSubMaster;

//# sourceMappingURL=pubsub-master.compiled.js.map