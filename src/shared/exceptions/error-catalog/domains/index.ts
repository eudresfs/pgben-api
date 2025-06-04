/**
 * Índice dos Domínios de Erros
 *
 * Exporta todos os domínios de erro específicos do sistema SEMTAS.
 * Cada domínio contém códigos de erro padronizados e funções auxiliares
 * para lançamento de exceções com contexto específico.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

// ========================================
// EXPORTAÇÕES DOS DOMÍNIOS
// ========================================

// Domínio USUARIO
export * from './usuario.errors';

// Domínio SOLICITACAO
export * from './solicitacao.errors';

// Domínio CIDADAO
export * from './cidadao.errors';

// Domínio BENEFICIO
export * from './beneficio.errors';

// Domínio DOCUMENTO
export * from './documento.errors';

// Domínio AUDITORIA
export * from './auditoria.errors';

// Domínio NOTIFICACAO
export * from './notificacao.errors';

// Domínio RELATORIO - exportações específicas para evitar conflitos
export {
  throwRelatorioNotFound,
  throwGenerationFailed,
  throwInvalidDateRange,
  throwMissingParameters,
  throwProcessingTimeout,
  throwDataTooLarge,
  throwRelatorioAccessDenied,
  throwExportFailed,
  throwNoDataFound,
  throwMemoryLimitExceeded,
  throwTemplateNotFound as throwRelatorioTemplateNotFound,
} from './relatorio.errors';

// Domínio INTEGRADOR - exportações específicas para evitar conflitos
export {
  throwIntegradorNotFound,
  throwConnectionFailed,
  throwIntegradorTimeout,
  throwInvalidCredentials as throwIntegradorInvalidCredentials,
  throwInvalidResponse,
  throwRateLimitExceeded as throwIntegradorRateLimitExceeded,
  throwMaxRetriesExceeded,
  throwCircuitBreakerOpen,
  throwCertificateInvalid,
  throwDataTransformationFailed,
  throwVersionMismatch,
} from './integrador.errors';

// ========================================
// CONSOLIDAÇÃO DOS CATÁLOGOS
// ========================================

import { USUARIO_ERRORS } from './usuario.errors';
import { SOLICITACAO_ERRORS } from './solicitacao.errors';
import { CIDADAO_ERRORS } from './cidadao.errors';
import { BENEFICIO_ERRORS } from './beneficio.errors';
import { DOCUMENTO_ERRORS } from './documento.errors';
import { AUDITORIA_ERRORS } from './auditoria.errors';
import { NOTIFICACAO_ERRORS } from './notificacao.errors';
import { RELATORIO_ERRORS } from './relatorio.errors';
import { INTEGRADOR_ERRORS } from './integrador.errors';

/**
 * Catálogo consolidado de todos os erros de domínio
 */
export const DOMAIN_ERRORS = {
  ...USUARIO_ERRORS,
  ...SOLICITACAO_ERRORS,
  ...CIDADAO_ERRORS,
  ...BENEFICIO_ERRORS,
  ...DOCUMENTO_ERRORS,
  ...AUDITORIA_ERRORS,
  ...NOTIFICACAO_ERRORS,
  ...RELATORIO_ERRORS,
  ...INTEGRADOR_ERRORS,
} as const;

/**
 * Lista de todos os códigos de erro de domínio
 */
export const DOMAIN_ERROR_CODES = Object.keys(DOMAIN_ERRORS) as Array<
  keyof typeof DOMAIN_ERRORS
>;

/**
 * Verifica se um código de erro pertence aos domínios
 */
export function isDomainError(code: string): code is string {
  return code in DOMAIN_ERRORS;
}

/**
 * Obtém a definição de erro de um código de domínio
 */
export function getDomainErrorDefinition(code: keyof typeof DOMAIN_ERRORS) {
  return DOMAIN_ERRORS[code];
}

// ========================================
// ESTATÍSTICAS DOS DOMÍNIOS
// ========================================

/**
 * Estatísticas dos domínios de erro
 * Função para evitar problemas de ordem de importação
 */
export function getDomainStatistics() {
  return {
    USUARIO: Object.keys(USUARIO_ERRORS).length,
    SOLICITACAO: Object.keys(SOLICITACAO_ERRORS).length,
    CIDADAO: Object.keys(CIDADAO_ERRORS).length,
    BENEFICIO: Object.keys(BENEFICIO_ERRORS).length,
    DOCUMENTO: Object.keys(DOCUMENTO_ERRORS).length,
    AUDITORIA: Object.keys(AUDITORIA_ERRORS).length,
    NOTIFICACAO: Object.keys(NOTIFICACAO_ERRORS).length,
    RELATORIO: Object.keys(RELATORIO_ERRORS).length,
    INTEGRADOR: Object.keys(INTEGRADOR_ERRORS).length,
    TOTAL: Object.keys(DOMAIN_ERRORS).length,
  } as const;
}

// DOMAIN_STATISTICS removido para evitar problemas de inicialização
// Use getDomainStatistics() quando necessário

/**
 * Informações sobre a cobertura dos domínios
 */
export function getDomainCoverage() {
  const stats = getDomainStatistics();
  return {
    domains: [
      'USUARIO',
      'SOLICITACAO',
      'CIDADAO',
      'BENEFICIO',
      'DOCUMENTO',
      'AUDITORIA',
      'NOTIFICACAO',
      'RELATORIO',
      'INTEGRADOR',
    ],
    totalDomains: 9,
    totalErrors: stats.TOTAL,
    averageErrorsPerDomain: Math.round(stats.TOTAL / 9),
  } as const;
}
