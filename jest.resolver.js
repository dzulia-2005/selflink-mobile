const nativeModulesMock = require.resolve('./jest.mocks/NativeModules.js');

module.exports = (request, options) => {
  if (
    request.includes('Libraries/BatchedBridge/NativeModules') ||
    request.includes('jest/mocks/NativeModules')
  ) {
    return nativeModulesMock;
  }
  return options.defaultResolver(request, options);
};
