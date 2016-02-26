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

var Master = function (_EventEmitter) {
  _inherits(Master, _EventEmitter);

  function Master() {
    var debug = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

    _classCallCheck(this, Master);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Master).call(this));

    _this.debug = debug;

    _this.on('error', function (err) {
      return console.error(err);
    });
    return _this;
  }

  // privatizing emit


  _createClass(Master, [{
    key: '_emit',
    value: function _emit() {
      var _get2;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return (_get2 = _get(Object.getPrototypeOf(Master.prototype), 'emit', this)).call.apply(_get2, [this].concat(args));
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
    key: 'send',
    value: function send(channel, data) {
      throw new Error('Not implemented', channel, data);
    }
  }]);

  return Master;
}(_events2.default);

exports.default = Master;

//# sourceMappingURL=master.compiled.js.map