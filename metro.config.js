// ULTRA SAFE Metro Config - NO minification/obfuscation
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver settings to prevent crashes
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'bin'],
  sourceExts: [...config.resolver.sourceExts, 'cjs']
};

// ULTRA SAFE transformer - NO minification
config.transformer = {
  ...config.transformer,
  // Disable all minification and optimization to prevent crashes
  minifierPath: undefined,
  minifierConfig: undefined,
};

// Disable all optimizations that can cause crashes
config.serializer = {
  ...config.serializer,
};

module.exports = config;
