import { ScopeType } from '../../src/auth/entities/user-permission.entity';

/**
 * Testes básicos para verificar a configuração do ambiente de testes
 * 
 * Este arquivo contém testes simples para garantir que a configuração do Jest
 * está funcionando corretamente e que podemos importar os tipos necessários.
 */
describe('Testes Básicos de Permissão', () => {
  it('deve ser verdadeiro', () => {
    expect(true).toBe(true);
  });

  it('deve verificar se o enum ScopeType está disponível', () => {
    expect(ScopeType.GLOBAL).toBeDefined();
    expect(ScopeType.UNIT).toBeDefined();
    expect(ScopeType.SELF).toBeDefined();
  });
});
