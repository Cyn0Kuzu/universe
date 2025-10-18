// babel.config.js
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
      // Performance optimizations
      '@babel/plugin-transform-runtime',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      // Reanimated plugin MUST be at the end
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          // Production optimizations
          '@babel/plugin-transform-react-constant-elements',
          '@babel/plugin-transform-react-inline-elements',
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
