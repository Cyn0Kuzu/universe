// ULTRA SAFE babel.config.js - NO production optimizations
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      '@babel/preset-react',
      '@babel/preset-typescript'
    ],
    plugins: [
      '@babel/plugin-syntax-jsx',
      '@babel/plugin-transform-export-namespace-from',
      ['@babel/plugin-transform-runtime', {
        'helpers': true,
        'regenerator': false,
      }]
    ]
    // Removed all env-specific optimizations to prevent crashes
  };
};
