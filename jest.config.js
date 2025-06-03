const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Preset otimizado para TypeScript
  preset: 'ts-jest',
  
  // Configuração do ambiente
  testEnvironment: 'node',
  
  // Extensões de arquivo suportadas
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  
  // Diretório raiz
  rootDir: '.',
  
  // Padrões de busca para testes
  testMatch: [
    '**/test/**/*.spec.ts',
    '**/src/**/*.spec.ts',
    '**/src/**/*.test.ts',
    '**/__tests__/**/*.ts',
  ],
  
  // Ignorar arquivos/diretórios nos testes
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],
  
  // Transformações de arquivo - configuração moderna
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      tsconfig: {
        // Configurações específicas para testes
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
      // Melhora performance ignorando type checking em alguns casos
      isolatedModules: true,
    }],
  },
  
  // Mapeamento de módulos usando paths do tsconfig
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, { 
      prefix: '<rootDir>/' 
    }),
    // Mapeamentos adicionais comuns
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // Coleta de cobertura otimizada
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.module.ts',
    '!src/**/main.ts',
    '!src/**/index.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.type.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.config.ts',
    '!src/**/migrations/**',
    '!src/**/seeds/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
  ],
  
  // Configuração de cobertura
  coverageDirectory: './coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
  ],
  
  // Limites de cobertura
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Arquivos de configuração
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Otimizações de performance
  maxWorkers: '50%',
  
  // Cache para melhorar performance
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Configurações para debugging
  verbose: false,
  silent: false,
  
  // Configurações para CI/CD
  ci: process.env.CI === 'true',
  
  // Timeout global para testes
  testTimeout: 10000,
  
  // Configurações de módulos
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Resolver configurações
  resolver: undefined,
  
  // Configurações adicionais para TypeScript
  extensionsToTreatAsEsm: [],
  
  // Configurações para watch mode
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Configurações para relatórios
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
    }],
  ],
  
  // Configurações específicas para diferentes ambientes
  projects: undefined,
  
  // Configurações de mock
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  
  // Configurações de snapshot
  updateSnapshot: false,
};