import type { Config } from '@jest/types';

export default {
  verbose: true,
  testTimeout: 10000,
  testEnvironment: 'node',
  transform: {
    '.(ts|tsx)': 'ts-jest',
  },
  projects: [
    '<rootDir>/packages/app',
    '<rootDir>/packages/cli'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  coverageDirectory: '<rootDir>/dist/unit/coverage',
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,ts}'
  ],
  reporters: [
    'default',
    '<rootDir>/tests/reporters/total-coverage-reporter.js',
    ['jest-junit', {
      outputDirectory: 'dist/unit/report'
    }]
  ],
  cacheDirectory: '<rootDir>/.cache/jest'
} as Config.InitialOptions;
