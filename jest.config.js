module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^react-native-quick-crypto$': '<rootDir>/test/nodeCrypto.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
