'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _lokijs = require('lokijs');

var _lokijs2 = _interopRequireDefault(_lokijs);

var _exitHook = require('exit-hook');

var _exitHook2 = _interopRequireDefault(_exitHook);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var dbFile = 'accepted.cache.json';

var ClientCom = function (_EventEmitter) {
  _inherits(ClientCom, _EventEmitter);

  function ClientCom() {
    var debug = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

    _classCallCheck(this, ClientCom);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ClientCom).call(this));

    var db = new _lokijs2.default();

    var accepted = db.addCollection('accepted');

    _this.debug = debug;
    _this.accepted = accepted;
    _this.on('error', function (err) {
      return console.error(err);
    });

    _this._restore();

    (0, _exitHook2.default)(function () {
      return _this._dump();
    });
    return _this;
  }

  _createClass(ClientCom, [{
    key: '_restore',
    value: function _restore() {
      try {
        var _accepted;

        var res = JSON.parse(_fs2.default.readFileSync(dbFile, 'utf8'));

        (_accepted = this.accepted).insert.apply(_accepted, _toConsumableArray(res));
      } catch (e) {
        // ignore
      }
    }
  }, {
    key: '_dump',
    value: function _dump() {
      var res = this.accepted.find();

      try {
        _fs2.default.writeFileSync(dbFile, JSON.stringify(res), 'utf8');
      } catch (e) {
        // ignore
      }
    }

    // privatizing

  }, {
    key: '_emit',
    value: function _emit() {
      var _get2;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return (_get2 = _get(Object.getPrototypeOf(ClientCom.prototype), 'emit', this)).call.apply(_get2, [this].concat(args));
    }
  }, {
    key: 'tokens',
    value: function tokens() {
      var tokens = [];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.entries(this.origins)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _slicedToArray(_step.value, 2);

          var toks = _step$value[1];

          tokens = tokens.concat(toks);
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
    }
  }, {
    key: 'accept',
    value: function accept(origin, token) {
      var res = this.accepted.findOne({ token: token, origin: origin });

      if (!res) {
        var uuid = _crypto2.default.randomBytes(20).toString('hex');

        // TODO ensure unique
        res = this.accepted.insert({ origin: origin, token: token, uuid: uuid });
      }

      return res.uuid;
    }
  }, {
    key: 'isAccepted',
    value: function isAccepted(uuid) {
      var res = this.accepted.findOne({ uuid: uuid });
      return res && res.uuid;
    }
  }, {
    key: 'originOf',
    value: function originOf(uuid) {
      var res = this.accepted.findOne({ uuid: uuid });
      return res;
    }
  }, {
    key: 'uuidOf',
    value: function uuidOf(origin, token) {
      origin = origin || '<stopper>';
      token = token || '<stopper>';

      var res = this.accepted.findOne({ token: token, origin: origin });

      return res && res.uuid;
    }
  }, {
    key: 'reject',
    value: function reject(origin, token) {
      var res = this.accepted.findOne({ token: token, origin: origin });

      try {
        this.accepted.remove(res);

        return res.uuid;
      } catch (e) {
        // ignore
      }
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
    key: 'attach',
    value: function attach(server) {
      throw new Error('Not implemented', server);
    }
  }, {
    key: 'emit',
    value: function emit(origin, token, channel, data) {
      throw new Error('Not implemented', origin, channel, token, data);
    }
  }, {
    key: 'broadcast',
    value: function broadcast(origin, channel, data) {
      throw new Error('Not implemented', origin, channel, data);
    }
  }]);

  return ClientCom;
}(_events2.default);

exports.default = ClientCom;

//# sourceMappingURL=client-com.js.map