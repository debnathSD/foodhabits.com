const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the on-device food model with the app, and the web recognizer's dish embeddings.
config.resolver.assetExts.push('tflite', 'bin');

// The marketing site in website/ is a separate Vite app with its own dependencies.
config.resolver.blockList = [/\/website\/.*/];

module.exports = config;
