const { getDefaultConfig } = require('expo/metro-config');

const {
  resolver: { sourceExts, assetExts },
} = getDefaultConfig(__dirname);

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  resolver: '<rootDir>/jest.resolver.js',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-status-bar|expo-constants|expo-linear-gradient|expo-haptics|expo-secure-store|expo-modules-core|react-native-safe-area-context|@expo|@react-navigation)/)',
  ],
  moduleFileExtensions: [...sourceExts, ...assetExts, 'json', 'tsx', 'ts', 'js', 'jsx'],
  moduleNameMapper: {
    '^react-native/Libraries/BatchedBridge/NativeModules$':
      '<rootDir>/jest.mocks/NativeModules.js',
    '^react-native/jest/mocks/NativeModules$': '<rootDir>/jest.mocks/NativeModules.js',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@schemas/(.*)$': '<rootDir>/src/types/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@realtime/(.*)$': '<rootDir>/src/realtime/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^expo/build/winter$': '<rootDir>/jest.mocks/expo-winter.ts',
    'react-native/Libraries/BatchedBridge/NativeModules$':
      '<rootDir>/jest.mocks/NativeModules.ts',
  },
};
