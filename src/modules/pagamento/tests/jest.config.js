/**
 * Configuração do Jest para testes do módulo de pagamento
 */

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../../../..',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/modules/pagamento/**/*.ts',
    '!src/modules/pagamento/**/*.module.ts',
    '!src/modules/pagamento/**/*.dto.ts',
    '!src/modules/pagamento/**/*.entity.ts',
    '!src/modules/pagamento/**/*.enum.ts',
    '!src/modules/pagamento/**/*.interface.ts',
    '!src/modules/pagamento/tests/**/*.ts',
  ],
  coverageDirectory: './coverage/pagamento',
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  setupFilesAfterEnv: ['<rootDir>/src/modules/pagamento/tests/setup-pagamento-tests.ts'],
};
