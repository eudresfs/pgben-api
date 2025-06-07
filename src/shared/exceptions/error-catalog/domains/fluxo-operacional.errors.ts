/**
 * Domínio de Erros: FLUXO OPERACIONAL
 *
 * Define códigos de erro específicos para o fluxo operacional
 * do sistema SEMTAS, incluindo aprovações, prazos e transições.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de fluxo operacional
 */
export interface FluxoOperacionalErrorContext extends ErrorContext {
  data?: {
    solicitacaoId?: string;
    statusAtual?: string;
    statusDestino?: string;
    usuarioId?: string;
    perfilUsuario?: string;
    prazoLimite?: string;
    dataLimite?: string;
    etapaAtual?: string;
    proximaEtapa?: string;
    motivoRejeicao?: string;
    documentosObrigatorios?: string[];
    documentosFaltantes?: string[];
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos para fluxo operacional (FLU_1xxx)
 */
export const FLUXO_OPERACIONAL_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // FLU_1001-1010: TRANSIÇÕES DE STATUS
  // ========================================

  FLU_1001: {
    code: 'FLU_1001',
    message: 'Transição de status não permitida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Não é possível alterar o status da solicitação para o estado solicitado',
      'en-US': 'Cannot change request status to the requested state',
    },
  },

  FLU_1002: {
    code: 'FLU_1002',
    message: 'Solicitação já foi finalizada',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Solicitação já foi finalizada e não pode ser alterada',
      'en-US': 'Request has already been finalized and cannot be changed',
    },
  },

  FLU_1003: {
    code: 'FLU_1003',
    message: 'Solicitação cancelada não pode ser processada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Solicitação cancelada não pode ser processada',
      'en-US': 'Cancelled request cannot be processed',
    },
  },

  FLU_1004: {
    code: 'FLU_1004',
    message: 'Status atual não permite a operação solicitada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'O status atual da solicitação não permite esta operação',
      'en-US': 'Current request status does not allow this operation',
    },
  },

  // ========================================
  // FLU_1011-1020: APROVAÇÕES E AUTORIZAÇÕES
  // ========================================

  FLU_1011: {
    code: 'FLU_1011',
    message: 'Usuário não possui permissão para aprovar',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Usuário não possui permissão para aprovar esta solicitação',
      'en-US': 'User does not have permission to approve this request',
    },
  },

  FLU_1012: {
    code: 'FLU_1012',
    message: 'Aprovação já foi realizada por outro usuário',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Esta solicitação já foi aprovada por outro usuário',
      'en-US': 'This request has already been approved by another user',
    },
  },

  FLU_1013: {
    code: 'FLU_1013',
    message: 'Rejeição requer justificativa obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Justificativa é obrigatória para rejeitar a solicitação',
      'en-US': 'Justification is required to reject the request',
    },
  },

  FLU_1014: {
    code: 'FLU_1014',
    message: 'Aprovação requer análise de supervisor',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Esta solicitação requer aprovação de um supervisor',
      'en-US': 'This request requires supervisor approval',
    },
  },

  FLU_1015: {
    code: 'FLU_1015',
    message: 'Limite de valor requer aprovação especial',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Valor excede limite e requer aprovação especial',
      'en-US': 'Value exceeds limit and requires special approval',
    },
  },

  // ========================================
  // FLU_1021-1030: PRAZOS E TEMPORALIDADE
  // ========================================

  FLU_1021: {
    code: 'FLU_1021',
    message: 'Prazo de análise excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prazo máximo para análise da solicitação foi excedido',
      'en-US': 'Maximum deadline for request analysis has been exceeded',
    },
    legalReference: 'Lei 9.784/1999 - Art. 49',
  },

  FLU_1022: {
    code: 'FLU_1022',
    message: 'Solicitação fora do período de vigência do programa',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Solicitação está fora do período de vigência do programa',
      'en-US': 'Request is outside the program validity period',
    },
  },

  FLU_1023: {
    code: 'FLU_1023',
    message: 'Prazo de recurso expirado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prazo para interposição de recurso foi expirado',
      'en-US': 'Deadline for filing an appeal has expired',
    },
    legalReference: 'Lei 9.784/1999 - Art. 59',
  },

  FLU_1024: {
    code: 'FLU_1024',
    message: 'Horário de atendimento encerrado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.LOW,
    localizedMessages: {
      'pt-BR': 'Operação não pode ser realizada fora do horário de atendimento',
      'en-US': 'Operation cannot be performed outside business hours',
    },
  },

  // ========================================
  // FLU_1031-1040: DOCUMENTAÇÃO E ANEXOS
  // ========================================

  FLU_1031: {
    code: 'FLU_1031',
    message: 'Documentação obrigatória incompleta',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documentação obrigatória está incompleta para prosseguir',
      'en-US': 'Required documentation is incomplete to proceed',
    },
  },

  FLU_1032: {
    code: 'FLU_1032',
    message: 'Documento com validade expirada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Um ou mais documentos apresentados estão com validade expirada',
      'en-US': 'One or more submitted documents have expired validity',
    },
  },

  FLU_1033: {
    code: 'FLU_1033',
    message: 'Formato de documento não aceito',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Formato do documento não é aceito pelo sistema',
      'en-US': 'Document format is not accepted by the system',
    },
  },

  FLU_1034: {
    code: 'FLU_1034',
    message: 'Tamanho do arquivo excede limite permitido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tamanho do arquivo excede o limite máximo permitido',
      'en-US': 'File size exceeds the maximum allowed limit',
    },
  },

  // ========================================
  // FLU_1041-1050: ETAPAS E WORKFLOW
  // ========================================

  FLU_1041: {
    code: 'FLU_1041',
    message: 'Etapa anterior não foi concluída',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Etapa anterior do processo não foi concluída',
      'en-US': 'Previous process step has not been completed',
    },
  },

  FLU_1042: {
    code: 'FLU_1042',
    message: 'Workflow em estado inconsistente',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Fluxo de trabalho está em estado inconsistente',
      'en-US': 'Workflow is in an inconsistent state',
    },
  },

  FLU_1043: {
    code: 'FLU_1043',
    message: 'Retorno para etapa anterior não permitido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Não é possível retornar para a etapa anterior',
      'en-US': 'Cannot return to previous step',
    },
  },

  FLU_1044: {
    code: 'FLU_1044',
    message: 'Etapa requer validação externa',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Esta etapa requer validação de sistema externo',
      'en-US': 'This step requires external system validation',
    },
  },

  // ========================================
  // FLU_1051-1060: RECURSOS E CONTESTAÇÕES
  // ========================================

  FLU_1051: {
    code: 'FLU_1051',
    message: 'Recurso já foi interposto para esta solicitação',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Já existe um recurso interposto para esta solicitação',
      'en-US': 'An appeal has already been filed for this request',
    },
  },

  FLU_1052: {
    code: 'FLU_1052',
    message: 'Solicitação não está em status passível de recurso',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Solicitação não está em status que permite recurso',
      'en-US': 'Request is not in a status that allows appeal',
    },
  },

  FLU_1053: {
    code: 'FLU_1053',
    message: 'Fundamentação do recurso insuficiente',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Fundamentação apresentada para o recurso é insuficiente',
      'en-US': 'Reasoning provided for the appeal is insufficient',
    },
  },
};

// ========================================
// HELPERS PARA FLUXO OPERACIONAL
// ========================================

/**
 * Lança erro de transição de status não permitida
 */
export function throwTransicaoStatusNaoPermitida(
  statusAtual: string,
  statusDestino: string,
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1001',
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
 * Lança erro de permissão para aprovação
 */
export function throwPermissaoAprovacaoNegada(
  usuarioId: string,
  perfilUsuario: string,
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1011',
    {
      ...context,
      data: {
        usuarioId,
        perfilUsuario,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de prazo de análise excedido
 */
export function throwPrazoAnaliseExcedido(
  solicitacaoId: string,
  dataLimite: Date,
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1021',
    {
      ...context,
      data: {
        solicitacaoId,
        dataLimite: dataLimite.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documentação incompleta
 */
export function throwDocumentacaoIncompleta(
  documentosFaltantes: string[],
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1031',
    {
      ...context,
      data: {
        documentosFaltantes,
        totalFaltantes: documentosFaltantes.length,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de etapa anterior não concluída
 */
export function throwEtapaAnteriorNaoConcluida(
  etapaAtual: string,
  etapaAnterior: string,
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1041',
    {
      ...context,
      data: {
        etapaAtual,
        etapaAnterior,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de rejeição sem justificativa
 */
export function throwRejeicaoSemJustificativa(
  solicitacaoId: string,
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1013',
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
 * Lança erro de recurso já interposto
 */
export function throwRecursoJaInterposto(
  solicitacaoId: string,
  context: FluxoOperacionalErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'FLU_1051',
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