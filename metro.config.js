// ULTRA SAFE Metro Config - Fixed transformer error
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver extensions
config.resolver.assetExts.push('bin', 'cjs');

// Disable experimental import support
config.transformer.experimentalImportSupport = false;

module.exports = config;
