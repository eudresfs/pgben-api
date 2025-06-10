const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['<rootDir>/test/**/*.unit.spec.ts'],
  
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { 
    prefix: '<rootDir>/' 
  }),
  
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!**/*.module.ts',
    '!**/*.entity.ts',
    '!**/*.dto.ts',
    '!**/*.interface.ts',
  ],
  
  coverageDirectory: './coverage/unit',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000,
};
