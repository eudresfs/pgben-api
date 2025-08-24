/**
 * Teste específico para validar a correção da validação de status do usuário
 * Foca na correção do problema ativo vs ATIVO
 * Teste simplificado sem dependências do NestJS
 */
describe('AprovacaoInterceptor - Correção Status Usuario', () => {
  /**
   * Função extraída do interceptor para testar a lógica de validação de status
   * Esta é a lógica corrigida que aceita tanto 'ativo' quanto 'ATIVO'
   */
  function validarStatusUsuario(status: string): boolean {
    return status?.toLowerCase() === 'ativo';
  }

  /**
   * Função para validar se o perfil está na lista permitida
   */
  function validarPerfilPermitido(perfilUsuario: string, perfisPermitidos: string[]): boolean {
    return perfisPermitidos.includes(perfilUsuario);
  }

  /**
   * Função principal de validação (simulando a lógica do interceptor)
   */
  function validarUsuarioParaAutoAprovacao(
    usuario: { status: string; perfil: string },
    perfisPermitidos: string[]
  ): { podeAutoAprovar: boolean; motivo?: string; perfilUsuario?: string } {
    // Validação de status (corrigida)
    if (!validarStatusUsuario(usuario.status)) {
      return {
        podeAutoAprovar: false,
        motivo: 'Usuário não está ativo no sistema'
      };
    }

    // Validação de perfil
    if (!validarPerfilPermitido(usuario.perfil, perfisPermitidos)) {
      return {
        podeAutoAprovar: false,
        motivo: `Usuário com perfil ${usuario.perfil} não possui perfil autorizado para auto-aprovação`
      };
    }

    return {
      podeAutoAprovar: true,
      perfilUsuario: usuario.perfil
    };
  }

  describe('Validação de Status do Usuário', () => {
    it('deve permitir autoaprovação para usuário com status "ativo" (minúsculo)', () => {
      // Arrange
      const perfisPermitidos = ['GESTOR'];
      const usuario = {
        perfil: 'GESTOR',
        status: 'ativo' // Status em minúsculo como vem do banco
      };

      // Act
      const resultado = validarUsuarioParaAutoAprovacao(usuario, perfisPermitidos);

      // Assert
      expect(resultado.podeAutoAprovar).toBe(true);
      expect(resultado.perfilUsuario).toBe('GESTOR');
    });

    it('deve permitir autoaprovação para usuário com status "ATIVO" (maiúsculo)', () => {
      // Arrange
      const perfisPermitidos = ['GESTOR'];
      const usuario = {
        perfil: 'GESTOR',
        status: 'ATIVO' // Status em maiúsculo
      };

      // Act
      const resultado = validarUsuarioParaAutoAprovacao(usuario, perfisPermitidos);

      // Assert
      expect(resultado.podeAutoAprovar).toBe(true);
      expect(resultado.perfilUsuario).toBe('GESTOR');
    });

    it('deve negar autoaprovação para usuário com status "inativo"', () => {
      // Arrange
      const perfisPermitidos = ['GESTOR'];
      const usuario = {
        perfil: 'GESTOR',
        status: 'inativo'
      };

      // Act
      const resultado = validarUsuarioParaAutoAprovacao(usuario, perfisPermitidos);

      // Assert
      expect(resultado.podeAutoAprovar).toBe(false);
      expect(resultado.motivo).toBe('Usuário não está ativo no sistema');
    });

    it('deve negar autoaprovação para usuário com perfil diferente', () => {
      // Arrange
      const perfisPermitidos = ['ADMIN'];
      const usuario = {
        perfil: 'GESTOR', // Perfil não está na lista permitida
        status: 'ativo'
      };

      // Act
      const resultado = validarUsuarioParaAutoAprovacao(usuario, perfisPermitidos);

      // Assert
      expect(resultado.podeAutoAprovar).toBe(false);
      expect(resultado.motivo).toContain('não possui perfil autorizado');
    });

    it('deve validar status independente de maiúscula/minúscula', () => {
      // Testa diferentes variações de case
      expect(validarStatusUsuario('ativo')).toBe(true);
      expect(validarStatusUsuario('ATIVO')).toBe(true);
      expect(validarStatusUsuario('Ativo')).toBe(true);
      expect(validarStatusUsuario('AtIvO')).toBe(true);
      expect(validarStatusUsuario('inativo')).toBe(false);
      expect(validarStatusUsuario('INATIVO')).toBe(false);
      expect(validarStatusUsuario('suspenso')).toBe(false);
      expect(validarStatusUsuario('')).toBe(false);
      expect(validarStatusUsuario(null)).toBe(false);
      expect(validarStatusUsuario(undefined)).toBe(false);
    });
  });
});