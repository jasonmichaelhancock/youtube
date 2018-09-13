'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var replace = _interopDefault(require('rollup-plugin-replace'));

const plugins = () => {
  const withVariables = {
    BEARER_SCENARIO_ID: process.env.BEARER_SCENARIO_ID,
    BEARER_INTEGRATION_HOST: process.env.BEARER_INTEGRATION_HOST || 'https://int.staging.bearer.sh/',
    BEARER_AUTHORIZATION_HOST: process.env.BEARER_AUTHORIZATION_HOST || 'https://int.staging.bearer.sh/'
  };

  if (process.env.BEARER_DEBUG) {
    console.log('[BEARER]', 'withVariables', withVariables);
  }

  return [replace(withVariables)]
};

exports.plugins = plugins;
exports.default = plugins;
