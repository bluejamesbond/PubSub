'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pubsubMaster = require('./pubsub-master.compiled.js');

Object.defineProperty(exports, 'Master', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_pubsubMaster).default;
  }
});

var _pubsubSlave = require('./pubsub-slave.compiled.js');

Object.defineProperty(exports, 'Slave', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_pubsubSlave).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//# sourceMappingURL=index.compiled.js.map