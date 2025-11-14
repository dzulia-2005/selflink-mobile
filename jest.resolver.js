module.exports = (request, options) => {
  if (request === 'react-native/Libraries/BatchedBridge/NativeModules') {
    return require.resolve('./jest.mocks/NativeModules.ts');
  }
  return options.defaultResolver(request, options);
};
