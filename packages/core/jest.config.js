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
    '^@reasvyn/auth-types$': '<rootDir>/../types/src/index.ts',
  },
  // RateLimiter uses setInterval — prevent Jest from hanging after tests
  forceExit: true,
};
