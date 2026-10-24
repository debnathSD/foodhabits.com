const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the on-device food model with the app.
config.resolver.assetExts.push('tflite');

// The marketing site in website/ is a separate Vite app with its own dependencies.
config.resolver.blockList = [/\/website\/.*/];

module.exports = config;
