const { getDefaultConfig } = require('expo/metro-config.js');
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
