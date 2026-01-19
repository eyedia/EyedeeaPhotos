export default {
  transform: {},
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!jest.config.js',
  ],
  testMatch: ['**/tests/**/*.test.js'],
  forceExit: true,
  testTimeout: 10000,
};
