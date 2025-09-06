// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver settings to prevent crashes
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'bin'],
  sourceExts: [...config.resolver.sourceExts, 'cjs']
};

// Add transformer settings for better stability
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    // Keep function names to prevent crashes
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
