// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Vector icons için font asset extensions
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Font bundling için transformer ayarları
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
