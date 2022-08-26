import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest/utils';

import tsConfig from './tsconfig.json';

export default {
  rootDir: '.',
  testMatch: [
    '<rootDir>/tests/specs/**/*.test.ts',
  ],
  moduleNameMapper: pathsToModuleNameMapper(tsConfig.compilerOptions.paths, { prefix: '<rootDir>/' })
} as Config.InitialOptions;
