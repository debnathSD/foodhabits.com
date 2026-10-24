// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'website/*'],
  },
  {
    // react-three-fiber elements take three.js props (position, intensity…), which this
    // DOM-oriented rule doesn't know; there is no DOM in a React Native app anyway.
    rules: { 'react/no-unknown-property': 'off' },
  },
]);
