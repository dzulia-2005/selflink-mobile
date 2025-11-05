module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@theme': './src/theme',
            '@navigation': './src/navigation',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@config': './src/config',
            '@services': './src/services',
          },
        },
      ],
    ],
  };
};
