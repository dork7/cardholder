// Screens with the tab bar read the safe-area insets; tests have no provider.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
