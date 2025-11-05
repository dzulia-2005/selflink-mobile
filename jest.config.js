const { getDefaultConfig } = require('expo/metro-config');

const {
  resolver: { sourceExts, assetExts },
} = getDefaultConfig(__dirname);

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-status-bar|expo-constants|expo-linear-gradient|expo-haptics|expo-modules-core|react-native-safe-area-context|@expo|@react-navigation)/)',
  ],
  moduleFileExtensions: [...sourceExts, ...assetExts, 'json', 'tsx', 'ts', 'js', 'jsx'],
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^expo/build/winter$': '<rootDir>/jest.mocks/expo-winter.ts',
  },
};
