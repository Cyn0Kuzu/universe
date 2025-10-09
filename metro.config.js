// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Vector icons için font asset extensions
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Font bundling için transformer ayarları
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Performance optimizations
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
  // Suppress warnings for better performance
  suppressWarnings: true,
};

// Optimize resolver for better performance
config.resolver = {
  ...config.resolver,
  // Enable symlinks for better development experience
  symlinks: true,
  // Optimize asset resolution
  assetExts: [...config.resolver.assetExts, 'ttf', 'otf', 'woff', 'woff2'],
  // Suppress warnings
  suppressWarnings: true,
};

// Optimize serializer for better performance
config.serializer = {
  ...config.serializer,
  // Custom serializer options
  customSerializer: config.serializer.customSerializer,
  // Suppress warnings
  suppressWarnings: true,
};

// Performance monitoring
config.server = {
  ...config.server,
  // Enable performance monitoring
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add performance headers
      res.setHeader('X-Performance-Optimized', 'true');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
