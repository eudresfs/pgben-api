import { Logger } from '@nestjs/common';

/**
 * Utilitário estático para verificação de permissões em memória.
 * Lida com correspondência exata e padrões com `*`.
 */
export class PermissionMatcher {
  private static readonly logger = new Logger(PermissionMatcher.name);

  /**
   * Verifica se a lista de permissões do usuário satisfaz a permissão requerida.
   * Aceita vírgula (OR lógico) na permissão requerida.
   * @param userPermissions Permissões disponíveis para o usuário
   * @param requiredPermission Permissão solicitada (pode conter vírgulas para OR)
   */
  static hasPermission(
    userPermissions: string[] | undefined | null,
    requiredPermission: string,
  ): boolean {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }

    const requiredList = requiredPermission.split(',').map((p) => p.trim());
    for (const req of requiredList) {
      if (this.matchesAny(userPermissions, req)) {
        return true;
      }
    }
    return false;
  }

  private static matchesAny(
    userPermissions: string[],
    required: string,
  ): boolean {
    this.logger.debug(`Verificando se usuário com permissões [${userPermissions.join(', ')}] possui permissão '${required}'`);
    
    // Verificar permissão super admin
    if (userPermissions.includes('*.*') || userPermissions.includes('*.*.*')) {
      this.logger.debug(`Usuário possui permissão de super admin`);
      return true;
    }
    
    for (const up of userPermissions) {
      // Correspondência exata
      if (up === required) {
        this.logger.debug(`Correspondência exata: ${up} === ${required}`);
        return true;
      }
      
      // Verificar wildcard no formato 'modulo.*'
      if (up.endsWith('.*')) {
        const modulePrefix = up.substring(0, up.length - 2);
        if (required.startsWith(modulePrefix + '.')) {
          this.logger.debug(`Correspondência por wildcard de módulo: ${up} cobre ${required}`);
          return true;
        }
      }
      
      // Verificar wildcard no formato 'modulo.recurso.*'
      if (up.endsWith('.*')) {
        const prefix = up.substring(0, up.length - 1);
        if (required.startsWith(prefix)) {
          this.logger.debug(`Correspondência por wildcard de recurso: ${up} cobre ${required}`);
          return true;
        }
      }
    }
    
    this.logger.debug(`Nenhuma correspondência encontrada para '${required}'`);
    return false;
  }

  /**
   * Converte o padrão com `*` em expressão regular e testa.
   */
  private static patternMatches(pattern: string, permission: string): boolean {
    if (pattern === permission || pattern === '*.*.*' || pattern === '*.*') {
      return true;
    }

    // Escapa caracteres de regex e converte * para '.*' (qualquer sequência)
    const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\\\*/g, '.*').replace(/\*/g, '.*') + '$';
    try {
      const regex = new RegExp(regexStr);
      return regex.test(permission);
    } catch (err) {
      this.logger.warn(`Padrão de permissão inválido: ${pattern}`, err as Error);
      return false;
    }
  }
}
