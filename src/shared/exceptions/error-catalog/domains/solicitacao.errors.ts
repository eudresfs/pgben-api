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
    processoJudicialId?: string;
    context?: string;
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
    message: 'Solicitação já existe',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Já existe uma solicitação para este cidadão',
      'en-US': 'A request already exists for this citizen',
    },
  },

  SOLICITACAO_CANNOT_DELETE: {
    code: 'SOLICITACAO_CANNOT_DELETE',
    message: 'Solicitação não pode ser excluída',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Não é possível excluir esta solicitação no status atual',
      'en-US': 'Cannot delete this request in current status',
    },
  },

  SOLICITACAO_INVALID_STATUS_TRANSITION: {
    code: 'SOLICITACAO_INVALID_STATUS_TRANSITION',
    message: 'Transição de status inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Transição de status não permitida',
      'en-US': 'Status transition not allowed',
    },
  },

  SOLICITACAO_APPROVAL_REQUIRED: {
    code: 'SOLICITACAO_APPROVAL_REQUIRED',
    message: 'Aprovação obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Esta solicitação requer aprovação antes de prosseguir',
      'en-US': 'This request requires approval before proceeding',
    },
  },

  SOLICITACAO_WORKFLOW_STEP_REQUIRED: {
    code: 'SOLICITACAO_WORKFLOW_STEP_REQUIRED',
    message: 'Etapa do workflow obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Campo obrigatório não preenchido para esta etapa do workflow',
      'en-US': 'Required field not filled for this workflow step',
    },
  },

  // ========================================
  // PROCESSO JUDICIAL
  // ========================================

  PROCESSO_JUDICIAL_NOT_FOUND: {
    code: 'PROCESSO_JUDICIAL_NOT_FOUND',
    message: 'Processo judicial não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Processo judicial não encontrado no sistema',
      'en-US': 'Judicial process not found in the system',
    },
  },

  PROCESSO_JUDICIAL_ALREADY_LINKED: {
    code: 'PROCESSO_JUDICIAL_ALREADY_LINKED',
    message: 'Processo judicial já vinculado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Este processo judicial já está vinculado a outra solicitação',
      'en-US': 'This judicial process is already linked to another request',
    },
  },

  PROCESSO_JUDICIAL_NOT_LINKED: {
    code: 'PROCESSO_JUDICIAL_NOT_LINKED',
    message: 'Processo judicial não vinculado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Nenhum processo judicial está vinculado a esta solicitação',
      'en-US': 'No judicial process is linked to this request',
    },
  },

  // ========================================
  // DETERMINAÇÃO JUDICIAL
  // ========================================

  DETERMINACAO_JUDICIAL_NOT_FOUND: {
    code: 'DETERMINACAO_JUDICIAL_NOT_FOUND',
    message: 'Determinação judicial não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Determinação judicial não encontrada no sistema',
      'en-US': 'Judicial determination not found in the system',
    },
  },

  DETERMINACAO_JUDICIAL_ALREADY_LINKED: {
    code: 'DETERMINACAO_JUDICIAL_ALREADY_LINKED',
    message: 'Determinação judicial já vinculada',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Esta determinação judicial já está vinculada a outra solicitação',
      'en-US': 'This judicial determination is already linked to another request',
    },
  },

  DETERMINACAO_JUDICIAL_NOT_LINKED: {
    code: 'DETERMINACAO_JUDICIAL_NOT_LINKED',
    message: 'Determinação judicial não vinculada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Nenhuma determinação judicial está vinculada a esta solicitação',
      'en-US': 'No judicial determination is linked to this request',
    },
  },

  // ========================================
  // CIDADÃO E COMPOSIÇÃO FAMILIAR
  // ========================================

  CIDADAO_ALREADY_BENEFICIARIO: {
    code: 'CIDADAO_ALREADY_BENEFICIARIO',
    message: 'Cidadão já é beneficiário',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Este cidadão já é beneficiário de outra solicitação ativa',
      'en-US': 'This citizen is already a beneficiary of another active request',
    },
  },

  CIDADAO_ALREADY_IN_COMPOSICAO_FAMILIAR: {
    code: 'CIDADAO_ALREADY_IN_COMPOSICAO_FAMILIAR',
    message: 'Cidadão já está na composição familiar',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Este cidadão já faz parte da composição familiar de outra solicitação ativa',
      'en-US': 'This citizen is already part of the family composition of another active request',
    },
  },

  CIDADAO_NOT_IN_COMPOSICAO_FAMILIAR: {
    code: 'CIDADAO_NOT_IN_COMPOSICAO_FAMILIAR',
    message: 'Cidadão não está na composição familiar',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Este cidadão não faz parte da composição familiar desta solicitação',
      'en-US': 'This citizen is not part of the family composition of this request',
    },
  },

  // ========================================
  // ERROS INTERNOS
  // ========================================

  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Erro interno do sistema',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Ocorreu um erro interno no sistema',
      'en-US': 'An internal system error occurred',
    },
  },

  SOLICITACAO_EXCLUSIVITY_VIOLATION: {
    code: 'SOLICITACAO_EXCLUSIVITY_VIOLATION',
    message: 'Violação de exclusividade',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já possui solicitação ativa para este benefício',
      'en-US': 'Citizen already has an active request for this benefit',
    },
  },

  SOLICITACAO_REQUIRED_DOCUMENT_MISSING: {
    code: 'SOLICITACAO_REQUIRED_DOCUMENT_MISSING',
    message: 'Documento obrigatório ausente',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento obrigatório não foi anexado',
      'en-US': 'Required document was not attached',
    },
  },

  SOLICITACAO_PENDING_ISSUES: {
    code: 'SOLICITACAO_PENDING_ISSUES',
    message: 'Pendências não resolvidas',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Existem pendências que devem ser resolvidas antes de prosseguir',
      'en-US': 'There are pending issues that must be resolved before proceeding',
    },
  },

  SOLICITACAO_JUDICIAL_ORDER_REQUIRED: {
    code: 'SOLICITACAO_JUDICIAL_ORDER_REQUIRED',
    message: 'Determinação judicial obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Esta solicitação requer determinação judicial',
      'en-US': 'This request requires judicial determination',
    },
  },

  SOLICITACAO_ACCESS_DENIED: {
    code: 'SOLICITACAO_ACCESS_DENIED',
    message: 'Acesso negado',
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

  SOLICITACAO_DEADLINE_EXCEEDED: {
    code: 'SOLICITACAO_DEADLINE_EXCEEDED',
    message: 'Prazo excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'O prazo para esta operação foi excedido',
      'en-US': 'The deadline for this operation has been exceeded',
    },
  },

  SOLICITACAO_BENEFIT_LIMIT_EXCEEDED: {
    code: 'SOLICITACAO_BENEFIT_LIMIT_EXCEEDED',
    message: 'Limite de benefícios excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite máximo de benefícios foi excedido',
      'en-US': 'Maximum benefit limit has been exceeded',
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
 * Lança erro de solicitação já existente
 */
export function throwSolicitacaoAlreadyExists(
  cidadaoId: string,
  beneficioId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_ALREADY_EXISTS',
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
 * Lança erro de aprovação obrigatória
 */
export function throwApprovalRequired(
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_APPROVAL_REQUIRED',
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
 * Lança erro de etapa do workflow obrigatória
 */
export function throwWorkflowStepRequired(
  campo: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_WORKFLOW_STEP_REQUIRED',
    {
      ...context,
      data: {
        campo,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de solicitação não pode ser excluída
 */
export function throwSolicitacaoCannotDelete(
  solicitacaoId: string,
  statusAtual: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SOLICITACAO_CANNOT_DELETE',
    {
      ...context,
      data: {
        solicitacaoId,
        statusAtual,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de processo judicial não encontrado
 */
export function throwProcessoJudicialNotFound(
  processoJudicialId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'PROCESSO_JUDICIAL_NOT_FOUND',
    {
      ...context,
      data: {
        processoJudicialId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de processo judicial já vinculado
 */
export function throwProcessoJudicialAlreadyLinked(
  processoJudicialId: string,
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'PROCESSO_JUDICIAL_ALREADY_LINKED',
    {
      ...context,
      data: {
        processoJudicialId,
        solicitacaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de processo judicial não vinculado
 */
export function throwProcessoJudicialNotLinked(
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'PROCESSO_JUDICIAL_NOT_LINKED',
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
 * Lança erro de determinação judicial não encontrada
 */
export function throwDeterminacaoJudicialNotFound(
  determinacaoJudicialId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DETERMINACAO_JUDICIAL_NOT_FOUND',
    {
      ...context,
      data: {
        determinacaoJudicialId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de determinação judicial já vinculada
 */
export function throwDeterminacaoJudicialAlreadyLinked(
  determinacaoJudicialId: string,
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DETERMINACAO_JUDICIAL_ALREADY_LINKED',
    {
      ...context,
      data: {
        determinacaoJudicialId,
        solicitacaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de determinação judicial não vinculada
 */
export function throwDeterminacaoJudicialNotLinked(
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DETERMINACAO_JUDICIAL_NOT_LINKED',
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
 * Lança erro de cidadão já é beneficiário
 */
export function throwCidadaoAlreadyBeneficiario(
  cidadaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_ALREADY_BENEFICIARIO',
    {
      ...context,
      data: {
        cidadaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de cidadão já está na composição familiar
 */
export function throwCidadaoAlreadyInComposicaoFamiliar(
  cidadaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_ALREADY_IN_COMPOSICAO_FAMILIAR',
    {
      ...context,
      data: {
        cidadaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de cidadão não está na composição familiar
 */
export function throwCidadaoNotInComposicaoFamiliar(
  cidadaoId: string,
  solicitacaoId: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_NOT_IN_COMPOSICAO_FAMILIAR',
    {
      ...context,
      data: {
        cidadaoId,
        solicitacaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro interno do sistema
 */
export function throwInternalError(
  message: string,
  context: SolicitacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTERNAL_ERROR',
    {
      ...context,
      data: {
        message,
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
