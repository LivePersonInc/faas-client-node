module.exports = {
  preset: 'ts-jest',
  verbose: false,
  testEnvironment: 'node',
  resetMocks: false,
  setupFilesAfterEnv: [require.resolve('expect-more-jest')],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
};
