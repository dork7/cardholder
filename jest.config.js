module.exports = {
  preset: 'jest-expo',
  // Runs Reanimated and Worklets in their JS implementation instead of the native modules.
  resolver: 'react-native-reanimated/jest/resolver',
  moduleNameMapper: {
    '^react-native-quick-crypto$': '<rootDir>/test/nodeCrypto.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
