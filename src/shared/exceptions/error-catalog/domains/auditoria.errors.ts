/**
 * Domínio de Erros: AUDITORIA
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de auditoria e logs do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de auditoria
 */
export interface AuditoriaErrorContext extends ErrorContext {
  data?: {
    logId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    timestamp?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    correlationId?: string;
    dataAnterior?: any;
    dataNova?: any;
    motivoAlteracao?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio AUDITORIA
 */
export const AUDITORIA_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES DE LOG
  // ========================================

  AUDITORIA_LOG_NOT_FOUND: {
    code: 'AUDITORIA_LOG_NOT_FOUND',
    message: 'Log de auditoria não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Log de auditoria não encontrado no sistema',
      'en-US': 'Audit log not found in the system',
    },
  },

  AUDITORIA_LOG_CREATION_FAILED: {
    code: 'AUDITORIA_LOG_CREATION_FAILED',
    message: 'Falha na criação do log de auditoria',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Erro ao criar log de auditoria',
      'en-US': 'Error creating audit log',
    },
  },

  AUDITORIA_LOG_STORAGE_FAILED: {
    code: 'AUDITORIA_LOG_STORAGE_FAILED',
    message: 'Falha no armazenamento do log',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Erro ao armazenar log de auditoria',
      'en-US': 'Error storing audit log',
    },
  },

  AUDITORIA_LOG_RETRIEVAL_FAILED: {
    code: 'AUDITORIA_LOG_RETRIEVAL_FAILED',
    message: 'Falha na recuperação do log',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao recuperar logs de auditoria',
      'en-US': 'Error retrieving audit logs',
    },
  },

  // ========================================
  // VALIDAÇÕES DE DADOS
  // ========================================

  AUDITORIA_INVALID_ACTION: {
    code: 'AUDITORIA_INVALID_ACTION',
    message: 'Ação de auditoria inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Ação de auditoria especificada é inválida',
      'en-US': 'Specified audit action is invalid',
    },
  },

  AUDITORIA_INVALID_ENTITY_TYPE: {
    code: 'AUDITORIA_INVALID_ENTITY_TYPE',
    message: 'Tipo de entidade inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de entidade especificado é inválido',
      'en-US': 'Specified entity type is invalid',
    },
  },

  AUDITORIA_MISSING_REQUIRED_DATA: {
    code: 'AUDITORIA_MISSING_REQUIRED_DATA',
    message: 'Dados obrigatórios ausentes',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Dados obrigatórios para auditoria estão ausentes',
      'en-US': 'Required audit data is missing',
    },
  },

  AUDITORIA_INVALID_TIMESTAMP: {
    code: 'AUDITORIA_INVALID_TIMESTAMP',
    message: 'Timestamp inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Timestamp fornecido é inválido',
      'en-US': 'Provided timestamp is invalid',
    },
  },

  AUDITORIA_INVALID_USER_ID: {
    code: 'AUDITORIA_INVALID_USER_ID',
    message: 'ID de usuário inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'ID de usuário fornecido é inválido',
      'en-US': 'Provided user ID is invalid',
    },
  },

  // ========================================
  // CONTROLE DE ACESSO
  // ========================================

  AUDITORIA_ACCESS_DENIED: {
    code: 'AUDITORIA_ACCESS_DENIED',
    message: 'Acesso negado aos logs de auditoria',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para acessar logs de auditoria',
      'en-US': 'You do not have permission to access audit logs',
    },
  },

  AUDITORIA_INSUFFICIENT_PRIVILEGES: {
    code: 'AUDITORIA_INSUFFICIENT_PRIVILEGES',
    message: 'Privilégios insuficientes',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Privilégios insuficientes para esta operação de auditoria',
      'en-US': 'Insufficient privileges for this audit operation',
    },
  },

  AUDITORIA_UNAUTHORIZED_ENTITY_ACCESS: {
    code: 'AUDITORIA_UNAUTHORIZED_ENTITY_ACCESS',
    message: 'Acesso não autorizado à entidade',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Acesso não autorizado aos logs desta entidade',
      'en-US': 'Unauthorized access to logs of this entity',
    },
  },

  // ========================================
  // INTEGRIDADE E SEGURANÇA
  // ========================================

  AUDITORIA_LOG_TAMPERING_DETECTED: {
    code: 'AUDITORIA_LOG_TAMPERING_DETECTED',
    message: 'Tentativa de alteração de log detectada',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Tentativa de alteração de log de auditoria detectada',
      'en-US': 'Audit log tampering attempt detected',
    },
  },

  AUDITORIA_CHECKSUM_MISMATCH: {
    code: 'AUDITORIA_CHECKSUM_MISMATCH',
    message: 'Checksum do log não confere',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Checksum do log de auditoria não confere',
      'en-US': 'Audit log checksum mismatch',
    },
  },

  AUDITORIA_ENCRYPTION_FAILED: {
    code: 'AUDITORIA_ENCRYPTION_FAILED',
    message: 'Falha na criptografia do log',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Erro ao criptografar log de auditoria',
      'en-US': 'Error encrypting audit log',
    },
  },

  AUDITORIA_DECRYPTION_FAILED: {
    code: 'AUDITORIA_DECRYPTION_FAILED',
    message: 'Falha na descriptografia do log',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Erro ao descriptografar log de auditoria',
      'en-US': 'Error decrypting audit log',
    },
  },

  // ========================================
  // CONFORMIDADE LGPD
  // ========================================

  AUDITORIA_LGPD_VIOLATION: {
    code: 'AUDITORIA_LGPD_VIOLATION',
    message: 'Violação de conformidade LGPD',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Operação viola diretrizes da LGPD',
      'en-US': 'Operation violates LGPD guidelines',
    },
  },

  AUDITORIA_DATA_RETENTION_VIOLATION: {
    code: 'AUDITORIA_DATA_RETENTION_VIOLATION',
    message: 'Violação de retenção de dados',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Violação das políticas de retenção de dados',
      'en-US': 'Data retention policy violation',
    },
  },

  AUDITORIA_CONSENT_NOT_FOUND: {
    code: 'AUDITORIA_CONSENT_NOT_FOUND',
    message: 'Consentimento não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Consentimento para processamento de dados não encontrado',
      'en-US': 'Data processing consent not found',
    },
  },

  AUDITORIA_CONSENT_EXPIRED: {
    code: 'AUDITORIA_CONSENT_EXPIRED',
    message: 'Consentimento expirado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Consentimento para processamento de dados expirado',
      'en-US': 'Data processing consent has expired',
    },
  },

  // ========================================
  // RELATÓRIOS E CONSULTAS
  // ========================================

  AUDITORIA_REPORT_GENERATION_FAILED: {
    code: 'AUDITORIA_REPORT_GENERATION_FAILED',
    message: 'Falha na geração de relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao gerar relatório de auditoria',
      'en-US': 'Error generating audit report',
    },
  },

  AUDITORIA_INVALID_DATE_RANGE: {
    code: 'AUDITORIA_INVALID_DATE_RANGE',
    message: 'Intervalo de datas inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Intervalo de datas especificado é inválido',
      'en-US': 'Specified date range is invalid',
    },
  },

  AUDITORIA_QUERY_TOO_BROAD: {
    code: 'AUDITORIA_QUERY_TOO_BROAD',
    message: 'Consulta muito ampla',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Consulta muito ampla, refine os filtros',
      'en-US': 'Query too broad, please refine filters',
    },
  },

  AUDITORIA_EXPORT_FAILED: {
    code: 'AUDITORIA_EXPORT_FAILED',
    message: 'Falha na exportação de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao exportar dados de auditoria',
      'en-US': 'Error exporting audit data',
    },
  },

  // ========================================
  // PERFORMANCE E LIMITES
  // ========================================

  AUDITORIA_QUERY_TIMEOUT: {
    code: 'AUDITORIA_QUERY_TIMEOUT',
    message: 'Timeout na consulta de auditoria',
    httpStatus: HttpStatus.REQUEST_TIMEOUT,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Timeout na consulta de logs de auditoria',
      'en-US': 'Audit log query timeout',
    },
  },

  AUDITORIA_STORAGE_LIMIT_EXCEEDED: {
    code: 'AUDITORIA_STORAGE_LIMIT_EXCEEDED',
    message: 'Limite de armazenamento excedido',
    httpStatus: HttpStatus.INSUFFICIENT_STORAGE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Limite de armazenamento de logs excedido',
      'en-US': 'Log storage limit exceeded',
    },
  },

  AUDITORIA_RATE_LIMIT_EXCEEDED: {
    code: 'AUDITORIA_RATE_LIMIT_EXCEEDED',
    message: 'Limite de taxa excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite de consultas de auditoria excedido',
      'en-US': 'Audit query rate limit exceeded',
    },
  },

  // ========================================
  // ARQUIVAMENTO E PURGA
  // ========================================

  AUDITORIA_ARCHIVE_FAILED: {
    code: 'AUDITORIA_ARCHIVE_FAILED',
    message: 'Falha no arquivamento de logs',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao arquivar logs de auditoria',
      'en-US': 'Error archiving audit logs',
    },
  },

  AUDITORIA_PURGE_FAILED: {
    code: 'AUDITORIA_PURGE_FAILED',
    message: 'Falha na purga de logs',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao purgar logs de auditoria',
      'en-US': 'Error purging audit logs',
    },
  },

  AUDITORIA_CANNOT_DELETE_ACTIVE_LOG: {
    code: 'AUDITORIA_CANNOT_DELETE_ACTIVE_LOG',
    message: 'Não é possível excluir log ativo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Não é possível excluir log de auditoria ativo',
      'en-US': 'Cannot delete active audit log',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA AUDITORIA
// ========================================

/**
 * Lança erro de log não encontrado
 */
export function throwAuditoriaLogNotFound(
  logId: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_LOG_NOT_FOUND',
    {
      ...context,
      data: {
        logId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na criação do log
 */
export function throwLogCreationFailed(
  entityType: string,
  entityId: string,
  action: string,
  erro: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_LOG_CREATION_FAILED',
    {
      ...context,
      data: {
        entityType,
        entityId,
        action,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de acesso negado
 */
export function throwAuditoriaAccessDenied(
  userId: string,
  recursoSolicitado: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_ACCESS_DENIED',
    {
      ...context,
      data: {
        userId,
        recursoSolicitado,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de tentativa de alteração de log
 */
export function throwLogTamperingDetected(
  logId: string,
  userId: string,
  tentativaAlteracao: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_LOG_TAMPERING_DETECTED',
    {
      ...context,
      data: {
        logId,
        userId,
        tentativaAlteracao,
        timestamp: new Date().toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de violação LGPD
 */
export function throwLgpdViolation(
  operacao: string,
  motivoViolacao: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_LGPD_VIOLATION',
    {
      ...context,
      data: {
        operacao,
        motivoViolacao,
        timestamp: new Date().toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de consentimento não encontrado
 */
export function throwConsentNotFound(
  cidadaoId: string,
  tipoProcessamento: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_CONSENT_NOT_FOUND',
    {
      ...context,
      data: {
        cidadaoId,
        tipoProcessamento,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de consentimento expirado
 */
export function throwConsentExpired(
  cidadaoId: string,
  dataExpiracao: Date,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_CONSENT_EXPIRED',
    {
      ...context,
      data: {
        cidadaoId,
        dataExpiracao: dataExpiracao.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de consulta muito ampla
 */
export function throwQueryTooBroad(
  parametrosConsulta: any,
  sugestaoRefinamento: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_QUERY_TOO_BROAD',
    {
      ...context,
      data: {
        parametrosConsulta,
        sugestaoRefinamento,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de checksum não conferindo
 */
export function throwChecksumMismatch(
  logId: string,
  checksumEsperado: string,
  checksumCalculado: string,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_CHECKSUM_MISMATCH',
    {
      ...context,
      data: {
        logId,
        checksumEsperado,
        checksumCalculado,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de limite de armazenamento excedido
 */
export function throwStorageLimitExceeded(
  tamanhoAtual: number,
  limiteMaximo: number,
  context: AuditoriaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUDITORIA_STORAGE_LIMIT_EXCEEDED',
    {
      ...context,
      data: {
        tamanhoAtual,
        limiteMaximo,
        ...context.data,
      },
    },
    language,
  );
}
