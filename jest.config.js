module.exports = {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'node',
  resetMocks: false,
  setupFilesAfterEnv: [require.resolve('expect-more-jest')],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
};
