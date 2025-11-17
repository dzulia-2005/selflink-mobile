module.exports = function (api) {
  api.cache(true);
  const plugins = [
    [
      'module-resolver',
      {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        alias: {
          '@api': './src/api',
          '@components': './src/components',
          '@screens': './src/screens',
          '@theme': './src/theme',
          '@navigation': './src/navigation',
          '@lib': './src/lib',
          '@realtime': './src/realtime',
          '@utils': './src/utils',
          '@hooks': './src/hooks',
          '@config': './src/config',
          '@services': './src/services',
          '@store': './src/store',
          '@schemas': './src/types',
          '@context': './src/context',
          'react-native-worklets/plugin': './src/utils/workletsPluginStub',
        },
      },
    ],
  ];

  if (!process.env.DISABLE_REANIMATED_PLUGIN) {
    try {
      require.resolve('react-native-reanimated/plugin');
      plugins.push('react-native-reanimated/plugin');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('react-native-reanimated/plugin not available, skipping.');
    }
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
