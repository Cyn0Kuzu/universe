// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const fontAssetExtensions = ['ttf', 'otf', 'woff', 'woff2'];

// Transformer configuration
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false, // Keep require() available globally
    },
  }),
};

// Ensure custom polyfills (global require alias) run before the main module
const globalRequirePolyfillPath = require.resolve('./polyfills/globalRequirePolyfill.js');
const reactUseMemoPolyfillPath = require.resolve('./polyfills/reactUseMemoPolyfill.js');

const defaultModulesBeforeMain =
  config.serializer?.getModulesRunBeforeMainModule ??
  (() => []);

config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    globalRequirePolyfillPath,
    reactUseMemoPolyfillPath,
    ...defaultModulesBeforeMain(),
  ],
};

const defaultGetPolyfills =
  config.serializer?.getPolyfills ??
  (() => []);

config.serializer.getPolyfills = (...args) => [
  globalRequirePolyfillPath,
  reactUseMemoPolyfillPath,
  ...defaultGetPolyfills(...args),
];

// Resolver tweaks
config.resolver = {
  ...config.resolver,
  symlinks: true,
  assetExts: Array.from(
    new Set([...config.resolver.assetExts, ...fontAssetExtensions]),
  ),
};

// Performance monitoring headers (useful for debugging in dev servers)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('X-Performance-Optimized', 'true');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
