// babel.config.js
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
      '@babel/plugin-transform-runtime',
      ['@babel/plugin-transform-optional-chaining', { loose: true }],
      ['@babel/plugin-transform-nullish-coalescing-operator', { loose: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-object-rest-spread', { loose: true }],
      ['@babel/plugin-transform-async-generator-functions', { loose: true }],
      ['@babel/plugin-transform-numeric-separator', { loose: true }],
      ['@babel/plugin-transform-optional-catch-binding', { loose: true }],
      // Reanimated plugin MUST be at the end
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
          // Production optimizations - temporarily disabled
          // '@babel/plugin-transform-react-constant-elements',
          // '@babel/plugin-transform-react-inline-elements',
        ],
      },
      development: {
        plugins: [
          // Development optimizations
          '@babel/plugin-transform-react-jsx-source',
        ],
      },
    },
  };
};
