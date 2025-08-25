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
      '@babel/plugin-syntax-jsx' // added plugin to enable parsing of JSX syntax
    ],
    // ...existing config...
  };
};
