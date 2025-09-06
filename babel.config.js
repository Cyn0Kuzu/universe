// babel.config.js - Production-safe configuration
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      '@babel/preset-react',
      '@babel/preset-typescript' // added for TS/TSX support
    ],
    plugins: [
      '@babel/plugin-syntax-jsx', // added plugin to enable parsing of JSX syntax
      '@babel/plugin-transform-export-namespace-from', // Updated to new plugin name
      ['@babel/plugin-transform-runtime', {
        'helpers': true,
        'regenerator': false,
      }]
      // Removed problematic async-to-generator config that requires bluebird
    ],
    env: {
      production: {
        plugins: [
          // Keep function names in production to prevent crashes
          ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
        ]
      }
    }
  };
};
