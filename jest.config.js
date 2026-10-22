/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    // This package only depends on `react-native` as a peerDependency (it's
    // not installed here), so redirect it to a lightweight manual mock
    // instead of letting Jest try (and fail) to resolve the real package.
    '^react-native$': '<rootDir>/test/mocks/react-native.ts',
  },
};
