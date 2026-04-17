/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
  moduleNameMapper: {
    '^@reasvyn/auth-types$': '<rootDir>/../../types/src/index.ts',
    '^@reasvyn/auth-core$': '<rootDir>/../../core/src/index.ts',
    // Stub next/server for middleware tests
    '^next/server$': '<rootDir>/src/__tests__/__mocks__/next-server.ts',
  },
  forceExit: true,
};
