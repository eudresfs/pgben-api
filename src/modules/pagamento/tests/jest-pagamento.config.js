/**
 * Configuração específica do Jest para os testes do módulo de pagamento
 * 
 * Esta configuração estende a configuração principal do Jest, adicionando
 * configurações específicas para os testes do módulo de pagamento.
 * 
 * @author Equipe PGBen
 */

const baseConfig = require('../../../jest.config');

module.exports = {
  ...baseConfig,
  // Aumentar o timeout para evitar falhas em testes mais complexos
  testTimeout: 30000,
  // Configurar para detectar vazamentos de recursos
  detectOpenHandles: true,
  // Forçar a finalização após todos os testes
  forceExit: true,
  // Configurar o arquivo de setup específico para o módulo de pagamento
  setupFilesAfterEnv: ['<rootDir>/src/modules/pagamento/tests/setup-pagamento-tests.ts'],
  // Executar apenas os testes do módulo de pagamento
  testMatch: [
    '**/src/modules/pagamento/tests/**/*.spec.ts',
  ],
  // Desativar cache para evitar problemas
  cache: false,
  // Configurar cobertura específica para o módulo de pagamento
  collectCoverageFrom: [
    'src/modules/pagamento/**/*.ts',
    '!src/modules/pagamento/**/*.module.ts',
    '!src/modules/pagamento/**/*.dto.ts',
    '!src/modules/pagamento/**/*.entity.ts',
    '!src/modules/pagamento/**/*.enum.ts',
    '!src/modules/pagamento/**/*.interface.ts',
    '!src/modules/pagamento/tests/**/*.ts',
  ],
};
