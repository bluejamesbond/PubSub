'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var IPC = function (_EventEmitter) {
  _inherits(IPC, _EventEmitter);

  function IPC() {
    var debug = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

    _classCallCheck(this, IPC);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(IPC).call(this));

    _this.Slave = {
      volatile: function volatile() {
        throw new Error('Not implemented');
      },
      emit: function emit(origin, channel, data) {
        throw new Error('Not implemented', origin, channel, data);
      },
      broadcast: function broadcast(channel, data) {
        throw new Error('Not implemented', channel, data);
      },
      on: function on(channel) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        throw new Error('Not implemented', channel, args);
      },
      once: function once(channel) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }

        throw new Error('Not implemented', channel, args);
      },
      removeListener: function removeListener(channel) {
        for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          args[_key3 - 1] = arguments[_key3];
        }

        throw new Error('Not implemented', channel, args);
      }
    };


    _this.debug = debug;

    _this.on('error', function (err) {
      return console.error(err);
    });
    return _this;
  }

  _createClass(IPC, [{
    key: '_emit',


    // privatizing emit
    value: function _emit() {
      var _get2;

      for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }

      return (_get2 = _get(Object.getPrototypeOf(IPC.prototype), 'emit', this)).call.apply(_get2, [this].concat(args));
    }
  }, {
    key: 'log',
    value: function log() {
      if (this.debug) {
        var _console;

        (_console = console).log.apply(_console, arguments);
      }
    }
  }, {
    key: 'listen',
    value: function listen() {
      var cb = arguments.length <= 0 || arguments[0] === undefined ? function () {
        return 0;
      } : arguments[0];

      throw new Error('Not implemented', cb);
    }
  }, {
    key: 'disconnect',
    value: function disconnect(token) {
      throw new Error('Not implemented', token);
    }
  }, {
    key: 'emit',
    value: function emit(dest, channel, data) {
      throw new Error('Not implemented', dest, channel, data);
    }
  }]);

  return IPC;
}(_events2.default);

exports.default = IPC;

//# sourceMappingURL=ipc.js.map