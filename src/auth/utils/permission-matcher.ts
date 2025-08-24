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
    this.logger.debug(
      `Verificando se usuário com permissões [${userPermissions.join(', ')}] possui permissão '${required}'`,
    );

    // Verificar cada permissão do usuário
    for (const userPermission of userPermissions) {
      // Caso 1: Usuário tem permissão total (*.*)
      if (userPermission === '*.*' || userPermission === '*.*.*') {
        this.logger.debug(`Usuário possui permissão total (${userPermission})`);
        return true;
      }

      // Caso 2: Correspondência exata (modulo.acao === modulo.acao)
      if (userPermission === required) {
        this.logger.debug(
          `Correspondência exata: ${userPermission} === ${required}`,
        );
        return true;
      }

      // Caso 3: Permissão de módulo (modulo.* cobre modulo.qualquercoisa)
      if (userPermission.endsWith('.*')) {
        // Extrair o prefixo do módulo (ex: "modulo" de "modulo.*")
        const modulePrefix = userPermission.substring(
          0,
          userPermission.length - 2,
        ); // Remove ".*"

        // Verifica se a permissão requerida começa com o mesmo módulo
        // e tem apenas uma parte adicional após o módulo (modulo.acao)
        const requiredParts = required.split('.');
        const moduleParts = modulePrefix.split('.');

        if (
          requiredParts.length > 0 &&
          moduleParts.length > 0 &&
          requiredParts[0] === moduleParts[0]
        ) {
          this.logger.debug(
            `Correspondência por wildcard de módulo: ${userPermission} cobre ${required}`,
          );
          return true;
        }
      }

      // Caso 4: Usar a implementação robusta de patternMatches para casos mais complexos
      if (this.patternMatches(userPermission, required)) {
        this.logger.debug(
          `Correspondência por padrão: ${userPermission} cobre ${required}`,
        );
        return true;
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
    const regexStr =
      '^' + escaped.replace(/\\\*/g, '.*').replace(/\*/g, '.*') + '$';
    try {
      const regex = new RegExp(regexStr);
      return regex.test(permission);
    } catch (err) {
      this.logger.warn(
        `Padrão de permissão inválido: ${pattern}`,
        err as Error,
      );
      return false;
    }
  }
}
