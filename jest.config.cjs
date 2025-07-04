/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/src/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'js'],
  testTimeout: 5000,
  verbose: true,
  bail: true,
  forceExit: true,
  watch: false,
  watchAll: false,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironmentOptions: {
    'process.env.NODE_ENV': 'test'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'esnext',
        target: 'es2022',
        types: ['jest', 'node']
      }
    }]
  }
};