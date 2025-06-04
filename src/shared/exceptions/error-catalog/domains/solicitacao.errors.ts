/**
 * Domínio de Erros: SOLICITACAO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de solicitações do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { AppError, ErrorContext } from '../AppError';
import { ErrorCategory, ErrorDefinition, ErrorSeverity } from '../types';

/**
 * Tipo para dados de contexto específicos de solicitação
 */
export interface SolicitacaoErrorContext extends ErrorContext {
  data?: {
    solicitacaoId?: string;
    cidadaoId?: string;
    beneficioId?: string;
    statusAtual?: string;
    statusDestino?: string;
    etapaWorkflow?: string;
    documentoId?: string;
    pendenciaId?: string;
    determinacaoJudicialId?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio SOLICITACAO
 */
export const SOLICITACAO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  SOLICITACAO_NOT_FOUND: {
    code: 'SOLICITACAO_NOT_FOUND',
    message: 'Solicitação não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Solicitação não encontrada no sistema',
      'en-US': 'Request not found in the system',
    },
  },

  SOLICITACAO_ALREADY_EXISTS: {
    code: 'SOLICITACAO_ALREADY_EXISTS',
    message: 'Solicitação já existe para este cidadão e benefício',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Já existe uma solicitação ativa para este cidadão e benefício',
      'en-US': 'An active request already exists for this citizen and benefit',
    },
  },

  SOLICITACAO_CANNOT_DELETE: {
    code: 'SOLICITACAO_CANNOT_DELETE',
    message: 'Solicitação não pode ser excluída no status atual',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Solicitação não pode ser excluída no status atual',
      'en-US': 'Request cannot be deleted in current status',
    },
  },

  // ========================================
  // WORKFLOW E TRANSIÇÕES DE STATUS
  // ========================================

  SOLICITACAO_INVALID_STATUS_TRANSITION: {
    code: 'SOLICITACAO_INVALID_STATUS_TRANSITION',
    message: 'Transição de status inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Não é possível alterar o status da solicitação para o estado solicitado',
      'en-US': 'Cannot change request status to the requested state',
    },
  },

  SOLICITACAO_WORKFLOW_STEP_REQUIRED: {
    code: 'SOLICITACAO_WORKFLOW_STEP_REQUIRED',
    message: 'Etapa obrigatória do workflow não concluída',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'É necessário concluir a etapa anterior do workflow antes de prosseguir',
      'en-US': 'Previous workflow step must be completed before proceeding',
    },
  },

  SOLICITACAO_APPROVAL_REQUIRED: {
    code: 'SOLICITACAO_APPROVAL_REQUIRED',
    message: 'Aprovação necessária para prosseguir',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Solicitação precisa ser aprovada antes de prosseguir',
      'en-US': 'Request needs approval before proceeding',
    },
  },

  SOLICITACAO_ALREADY_APPROVED: {
    code: 'SOLICITACAO_ALREADY_APPROVED',
    message: 'Solicitação já foi aprovada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Esta solicitação já foi aprovada',
      'en-US': 'This request has already been approved',
    },
  },

  SOLICITACAO_ALREADY_REJECTED: {
    code: 'SOLICITACAO_ALREADY_REJECTED',
    message: 'Solicitação já foi rejeitada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Esta solicitação já foi rejeitada',
      'en-US': 'This request has already been rejected',
    },
  },

  SOLICITACAO_DEADLINE_EXCEEDED: {
    code: 'SOLICITACAO_DEADLINE_EXCEEDED',
    message: 'Prazo da solicitação excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Prazo para processamento da solicitação foi excedido',
      'en-US': 'Request processing deadline has been exceeded',
    },
    legalReference: 'Portaria SEMTAS nº XXX/XXXX',
  },

  // ========================================
  // VALIDAÇÃO DE EXCLUSIVIDADE
  // ========================================

  SOLICITACAO_EXCLUSIVITY_VIOLATION: {
    code: 'SOLICITACAO_EXCLUSIVITY_VIOLATION',
    message: 'Violação de regra de exclusividade',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já possui benefício ativo que impede nova solicitação',
      'en-US': 'Citizen already has active benefit that prevents new request',
    },
    legalReference: 'Lei Municipal nº XXX/XXXX',
  },

  SOLICITACAO_BENEFIT_LIMIT_EXCEEDED: {
    code: 'SOLICITACAO_BENEFIT_LIMIT_EXCEEDED',
    message: 'Limite de benefícios excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já atingiu o limite máximo de benefícios permitidos',
      'en-US': 'Citizen has reached the maximum allowed benefit limit',
    },
    legalReference: 'Decreto Municipal nº XXX/XXXX',
  },

  SOLICITACAO_WAITING_PERIOD_NOT_MET: {
    code: 'SOLICITACAO_WAITING_PERIOD_NOT_MET',
    message: 'Período de carência não cumprido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Período de carência entre benefícios não foi cumprido',
      'en-US': 'Waiting period between benefits has not been met',
    },
    legalReference: 'Portaria SEMTAS nº XXX/XXXX',
  },

  // ========================================
  // DOCUMENTAÇÃO E PENDÊNCIAS
  // ========================================

  SOLICITACAO_REQUIRED_DOCUMENT_MISSING: {
    code: 'SOLICITACAO_REQUIRED_DOCUMENT_MISSING',
    message: 'Documento obrigatório não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documento obrigatório não foi fornecido para a solicitação',
      'en-US': 'Required document was not provided for the request',
    },
  },

  SOLICITACAO_DOCUMENT_INVALID: {
    code: 'SOLICITACAO_DOCUMENT_INVALID',
    message: 'Documento fornecido é inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento fornecido não atende aos critérios exigidos',
      'en-US': 'Provided document does not meet required criteria',
    },
  },

  SOLICITACAO_PENDING_ISSUES: {
    code: 'SOLICITACAO_PENDING_ISSUES',
    message: 'Solicitação possui pendências não resolvidas',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Solicitação possui pendências que devem ser resolvidas antes de prosseguir',
      'en-US':
        'Request has pending issues that must be resolved before proceeding',
    },
  },

  SOLICITACAO_PENDENCIA_NOT_FOUND: {
    code: 'SOLICITACAO_PENDENCIA_NOT_FOUND',
    message: 'Pendência não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Pendência não encontrada no sistema',
      'en-US': 'Pending issue not found in the system',
    },
  },

  // ========================================
  // DETERMINAÇÃO JUDICIAL
  // ========================================

  SOLICITACAO_JUDICIAL_ORDER_REQUIRED: {
    code: 'SOLICITACAO_JUDICIAL_ORDER_REQUIRED',
    message: 'Determinação judicial obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Esta solicitação requer determinação judicial para prosseguir',
      'en-US': 'This request requires judicial order to proceed',
    },
    legalReference: 'Código de Processo Civil',
  },

  SOLICITACAO_JUDICIAL_ORDER_INVALID: {
    code: 'SOLICITACAO_JUDICIAL_ORDER_INVALID',
    message: 'Determinação judicial inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Determinação judicial fornecida é inválida ou expirada',
      'en-US': 'Provided judicial order is invalid or expired',
    },
  },

  SOLICITACAO_JUDICIAL_ORDER_NOT_FOUND: {
    code: 'SOLICITACAO_JUDICIAL_ORDER_NOT_FOUND',
    message: 'Determinação judicial não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Determinação judicial não encontrada no sistema',
      'en-US': 'Judicial order not found in the system',
    },
  },

  // ========================================
  // PERMISSÕES E ACESSO
  // ========================================

  SOLICITACAO_ACCESS_DENIED: {
    code: 'SOLICITACAO_ACCESS_DENIED',
    message: 'Acesso negado à solicitação',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para acessar esta solicitação',
      'en-US': 'You do not have permission to access this request',
    },
  },

  SOLICITACAO_MODIFICATION_NOT_ALLOWED: {
    code: 'SOLICITACAO_MODIFICATION_NOT_ALLOWED',
    message: 'Modificação não permitida',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Não é possível modificar esta solicitação no status atual',
      'en-US': 'Cannot modify this request in current status',
    },
  },

  // ========================================
  // VALIDAÇÕES DE DADOS ESPECÍFICOS
  // ========================================

  SOLICITACAO_INVALID_BENEFIT_TYPE: {
    code: 'SOLICITACAO_INVALID_BENEFIT_TYPE',
    message: 'Tipo de benefício inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de benefício informado é inválido',
      'en-US': 'Invalid benefit type provided',
    },
  },

  SOLICITACAO_INVALID_PRIORITY: {
    code: 'SOLICITACAO_INVALID_PRIORITY',
    message: 'Prioridade inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prioridade informada é inválida',
      'en-US': 'Invalid priority provided',
    },
  },

  SOLICITACAO_INVALID_DATE_RANGE: {
    code: 'SOLICITACAO_INVALID_DATE_RANGE',
    message: 'Intervalo de datas inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Intervalo de datas informado é inválido',
      'en-US': 'Invalid date range provided',
    },
  },

  // ========================================
  // EXPORTAÇÃO E RELATÓRIOS
  // ========================================

  SOLICITACAO_EXPORT_FAILED: {
    code: 'SOLICITACAO_EXPORT_FAILED',
    message: 'Falha na exportação de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao exportar dados das solicitações',
      'en-US': 'Error exporting request data',
    },
  },

  SOLICITACAO_REPORT_GENERATION_FAILED: {
    code: 'SOLICITACAO_REPORT_GENERATION_FAILED',
    message: 'Falha na geração de relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao gerar relatório de solicitações',
      'en-US': 'Error generating request report',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA SOLICITAÇÃO
// ========================================

/**
 * Lança erro de solicitação não encontrada
 */
export function throwSolicitacaoNotFound(
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_NOT_FOUND',
    {
      ...context,
      data: {
        solicitacaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de transição de status inválida
 */
export function throwInvalidStatusTransition(
  statusAtual: string,
  statusDestino: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_INVALID_STATUS_TRANSITION',
    {
      ...context,
      data: {
        statusAtual,
        statusDestino,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de violação de exclusividade
 */
export function throwExclusivityViolation(
  cidadaoId: string,
  beneficioId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_EXCLUSIVITY_VIOLATION',
    {
      ...context,
      data: {
        cidadaoId,
        beneficioId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documento obrigatório ausente
 */
export function throwRequiredDocumentMissing(
  documentType: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_REQUIRED_DOCUMENT_MISSING',
    {
      ...context,
      data: {
        documentType,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de pendências não resolvidas
 */
export function throwPendingIssues(
  pendingCount: number,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_PENDING_ISSUES',
    {
      ...context,
      data: {
        pendingCount,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de determinação judicial obrigatória
 */
export function throwJudicialOrderRequired(
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_JUDICIAL_ORDER_REQUIRED',
    {
      ...context,
      data: {
        solicitacaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de acesso negado
 */
export function throwAccessDenied(
  solicitacaoId: string,
  userId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_ACCESS_DENIED',
    {
      ...context,
      data: {
        solicitacaoId,
        userId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de prazo excedido
 */
export function throwDeadlineExceeded(
  solicitacaoId: string,
  deadline: Date,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_DEADLINE_EXCEEDED',
    {
      ...context,
      data: {
        solicitacaoId,
        deadline: deadline.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de limite de benefícios excedido
 */
export function throwBenefitLimitExceeded(
  cidadaoId: string,
  currentCount: number,
  maxAllowed: number,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_BENEFIT_LIMIT_EXCEEDED',
    {
      ...context,
      data: {
        cidadaoId,
        currentCount,
        maxAllowed,
        ...context.data,
      },
    },
    language,
  );
}
