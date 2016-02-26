'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = address;

var _externalIp = require('external-ip');

var _externalIp2 = _interopRequireDefault(_externalIp);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _address = undefined;

function address(server) {
  if (_address) {
    return _address;
  }

  _address = new _bluebird2.default(function (resolve) {
    var defAddress = server.address();

    (0, _externalIp2.default)()(function (err, hostname) {
      if (err) throw err;
      resolve(_extends({}, defAddress, { hostname: hostname, protocol: 'https' }));
    });
  }).catch(function (err) {
    console.error(err);

    // serious failure
    process.exit(1);
  });

  return _address;
}

//# sourceMappingURL=address.js.map