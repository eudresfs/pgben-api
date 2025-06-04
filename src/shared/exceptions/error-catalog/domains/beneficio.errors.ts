/**
 * Domínio de Erros: BENEFICIO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de benefícios do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de benefício
 */
export interface BeneficioErrorContext extends ErrorContext {
  data?: {
    beneficioId?: string;
    tipoBeneficio?: string;
    cidadaoId?: string;
    valor?: number;
    dataInicio?: string;
    dataFim?: string;
    statusAtual?: string;
    motivoRejeicao?: string;
    documentosObrigatorios?: string[];
    criteriosElegibilidade?: any;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio BENEFICIO
 */
export const BENEFICIO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  BENEFICIO_NOT_FOUND: {
    code: 'BENEFICIO_NOT_FOUND',
    message: 'Benefício não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Benefício não encontrado no sistema',
      'en-US': 'Benefit not found in the system',
    },
  },

  BENEFICIO_TYPE_NOT_FOUND: {
    code: 'BENEFICIO_TYPE_NOT_FOUND',
    message: 'Tipo de benefício não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de benefício não encontrado no sistema',
      'en-US': 'Benefit type not found in the system',
    },
  },

  BENEFICIO_CANNOT_DELETE: {
    code: 'BENEFICIO_CANNOT_DELETE',
    message: 'Benefício não pode ser excluído',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Benefício não pode ser excluído no status atual',
      'en-US': 'Benefit cannot be deleted in current status',
    },
  },

  // ========================================
  // VALIDAÇÕES DE ELEGIBILIDADE
  // ========================================

  BENEFICIO_ELIGIBILITY_NOT_MET: {
    code: 'BENEFICIO_ELIGIBILITY_NOT_MET',
    message: 'Critérios de elegibilidade não atendidos',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Cidadão não atende aos critérios de elegibilidade para este benefício',
      'en-US': 'Citizen does not meet eligibility criteria for this benefit',
    },
    legalReference: 'Lei Municipal nº XXX/XXXX',
  },

  BENEFICIO_AGE_REQUIREMENT_NOT_MET: {
    code: 'BENEFICIO_AGE_REQUIREMENT_NOT_MET',
    message: 'Requisito de idade não atendido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Idade do cidadão não atende ao requisito para este benefício',
      'en-US': 'Citizen age does not meet the requirement for this benefit',
    },
  },

  BENEFICIO_INCOME_REQUIREMENT_NOT_MET: {
    code: 'BENEFICIO_INCOME_REQUIREMENT_NOT_MET',
    message: 'Requisito de renda não atendido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Renda familiar não atende ao requisito para este benefício',
      'en-US': 'Family income does not meet the requirement for this benefit',
    },
  },

  BENEFICIO_RESIDENCY_REQUIREMENT_NOT_MET: {
    code: 'BENEFICIO_RESIDENCY_REQUIREMENT_NOT_MET',
    message: 'Requisito de residência não atendido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Tempo de residência no município não atende ao requisito',
      'en-US': 'Municipality residence time does not meet the requirement',
    },
    legalReference: 'Lei Orgânica Municipal',
  },

  // ========================================
  // AUXÍLIO NATALIDADE - ESPECÍFICO
  // ========================================

  AUXILIO_NATALIDADE_ALREADY_RECEIVED: {
    code: 'AUXILIO_NATALIDADE_ALREADY_RECEIVED',
    message: 'Auxílio natalidade já recebido',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já recebeu auxílio natalidade para este nascimento',
      'en-US': 'Citizen has already received maternity aid for this birth',
    },
    legalReference: 'Decreto Municipal nº XXX/XXXX',
  },

  AUXILIO_NATALIDADE_INVALID_BIRTH_DATE: {
    code: 'AUXILIO_NATALIDADE_INVALID_BIRTH_DATE',
    message: 'Data de nascimento inválida para auxílio natalidade',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Data de nascimento está fora do prazo permitido para solicitação',
      'en-US': 'Birth date is outside the allowed period for application',
    },
  },

  AUXILIO_NATALIDADE_BIRTH_CERTIFICATE_REQUIRED: {
    code: 'AUXILIO_NATALIDADE_BIRTH_CERTIFICATE_REQUIRED',
    message: 'Certidão de nascimento obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certidão de nascimento é obrigatória para auxílio natalidade',
      'en-US': 'Birth certificate is required for maternity aid',
    },
  },

  AUXILIO_NATALIDADE_MOTHER_NOT_FOUND: {
    code: 'AUXILIO_NATALIDADE_MOTHER_NOT_FOUND',
    message: 'Mãe não encontrada no sistema',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Mãe da criança não encontrada no sistema',
      'en-US': 'Child mother not found in the system',
    },
  },

  // ========================================
  // ALUGUEL SOCIAL - ESPECÍFICO
  // ========================================

  ALUGUEL_SOCIAL_ALREADY_ACTIVE: {
    code: 'ALUGUEL_SOCIAL_ALREADY_ACTIVE',
    message: 'Aluguel social já ativo',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já possui aluguel social ativo',
      'en-US': 'Citizen already has active social rent',
    },
  },

  ALUGUEL_SOCIAL_INVALID_PROPERTY: {
    code: 'ALUGUEL_SOCIAL_INVALID_PROPERTY',
    message: 'Imóvel inválido para aluguel social',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Imóvel não atende aos critérios para aluguel social',
      'en-US': 'Property does not meet criteria for social rent',
    },
  },

  ALUGUEL_SOCIAL_PROPERTY_NOT_AVAILABLE: {
    code: 'ALUGUEL_SOCIAL_PROPERTY_NOT_AVAILABLE',
    message: 'Imóvel não disponível',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Imóvel não está disponível para aluguel social',
      'en-US': 'Property is not available for social rent',
    },
  },

  ALUGUEL_SOCIAL_RENT_VALUE_EXCEEDS_LIMIT: {
    code: 'ALUGUEL_SOCIAL_RENT_VALUE_EXCEEDS_LIMIT',
    message: 'Valor do aluguel excede limite',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Valor do aluguel excede o limite permitido pelo programa',
      'en-US': 'Rent value exceeds the limit allowed by the program',
    },
    legalReference: 'Portaria SEMTAS nº XXX/XXXX',
  },

  ALUGUEL_SOCIAL_LEASE_CONTRACT_REQUIRED: {
    code: 'ALUGUEL_SOCIAL_LEASE_CONTRACT_REQUIRED',
    message: 'Contrato de locação obrigatório',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Contrato de locação é obrigatório para aluguel social',
      'en-US': 'Lease contract is required for social rent',
    },
  },

  ALUGUEL_SOCIAL_OWNER_DOCUMENTATION_REQUIRED: {
    code: 'ALUGUEL_SOCIAL_OWNER_DOCUMENTATION_REQUIRED',
    message: 'Documentação do proprietário obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documentação do proprietário do imóvel é obrigatória',
      'en-US': 'Property owner documentation is required',
    },
  },

  // ========================================
  // GESTÃO DE VALORES E PAGAMENTOS
  // ========================================

  BENEFICIO_INVALID_VALUE: {
    code: 'BENEFICIO_INVALID_VALUE',
    message: 'Valor do benefício inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Valor do benefício é inválido',
      'en-US': 'Invalid benefit value',
    },
  },

  BENEFICIO_VALUE_EXCEEDS_LIMIT: {
    code: 'BENEFICIO_VALUE_EXCEEDS_LIMIT',
    message: 'Valor excede limite permitido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Valor do benefício excede o limite permitido',
      'en-US': 'Benefit value exceeds allowed limit',
    },
    legalReference: 'Decreto Municipal nº XXX/XXXX',
  },

  BENEFICIO_PAYMENT_FAILED: {
    code: 'BENEFICIO_PAYMENT_FAILED',
    message: 'Falha no pagamento do benefício',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao processar pagamento do benefício',
      'en-US': 'Error processing benefit payment',
    },
  },

  BENEFICIO_PAYMENT_ALREADY_PROCESSED: {
    code: 'BENEFICIO_PAYMENT_ALREADY_PROCESSED',
    message: 'Pagamento já processado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Pagamento do benefício já foi processado',
      'en-US': 'Benefit payment has already been processed',
    },
  },

  // ========================================
  // PERÍODOS E VIGÊNCIA
  // ========================================

  BENEFICIO_INVALID_PERIOD: {
    code: 'BENEFICIO_INVALID_PERIOD',
    message: 'Período do benefício inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Período de vigência do benefício é inválido',
      'en-US': 'Invalid benefit validity period',
    },
  },

  BENEFICIO_EXPIRED: {
    code: 'BENEFICIO_EXPIRED',
    message: 'Benefício expirado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Benefício está expirado',
      'en-US': 'Benefit has expired',
    },
  },

  BENEFICIO_NOT_YET_ACTIVE: {
    code: 'BENEFICIO_NOT_YET_ACTIVE',
    message: 'Benefício ainda não está ativo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Benefício ainda não está ativo',
      'en-US': 'Benefit is not yet active',
    },
  },

  BENEFICIO_RENEWAL_NOT_ALLOWED: {
    code: 'BENEFICIO_RENEWAL_NOT_ALLOWED',
    message: 'Renovação não permitida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Renovação do benefício não é permitida',
      'en-US': 'Benefit renewal is not allowed',
    },
  },

  // ========================================
  // SUSPENSÃO E CANCELAMENTO
  // ========================================

  BENEFICIO_ALREADY_SUSPENDED: {
    code: 'BENEFICIO_ALREADY_SUSPENDED',
    message: 'Benefício já suspenso',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Benefício já está suspenso',
      'en-US': 'Benefit is already suspended',
    },
  },

  BENEFICIO_ALREADY_CANCELLED: {
    code: 'BENEFICIO_ALREADY_CANCELLED',
    message: 'Benefício já cancelado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Benefício já está cancelado',
      'en-US': 'Benefit is already cancelled',
    },
  },

  BENEFICIO_SUSPENSION_REASON_REQUIRED: {
    code: 'BENEFICIO_SUSPENSION_REASON_REQUIRED',
    message: 'Motivo da suspensão obrigatório',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Motivo da suspensão é obrigatório',
      'en-US': 'Suspension reason is required',
    },
  },

  BENEFICIO_CANCELLATION_REASON_REQUIRED: {
    code: 'BENEFICIO_CANCELLATION_REASON_REQUIRED',
    message: 'Motivo do cancelamento obrigatório',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Motivo do cancelamento é obrigatório',
      'en-US': 'Cancellation reason is required',
    },
  },

  // ========================================
  // DOCUMENTAÇÃO E COMPROVAÇÃO
  // ========================================

  BENEFICIO_REQUIRED_DOCUMENTS_MISSING: {
    code: 'BENEFICIO_REQUIRED_DOCUMENTS_MISSING',
    message: 'Documentos obrigatórios ausentes',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documentos obrigatórios não foram fornecidos',
      'en-US': 'Required documents were not provided',
    },
  },

  BENEFICIO_DOCUMENT_VALIDATION_FAILED: {
    code: 'BENEFICIO_DOCUMENT_VALIDATION_FAILED',
    message: 'Falha na validação de documentos',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documentos fornecidos não passaram na validação',
      'en-US': 'Provided documents failed validation',
    },
  },

  BENEFICIO_PROOF_OF_NEED_REQUIRED: {
    code: 'BENEFICIO_PROOF_OF_NEED_REQUIRED',
    message: 'Comprovação de necessidade obrigatória',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Comprovação da necessidade do benefício é obrigatória',
      'en-US': 'Proof of benefit need is required',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA BENEFÍCIO
// ========================================

/**
 * Lança erro de benefício não encontrado
 */
export function throwBeneficioNotFound(
  beneficioId: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_NOT_FOUND',
    {
      ...context,
      data: {
        beneficioId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de critérios de elegibilidade não atendidos
 */
export function throwEligibilityNotMet(
  tipoBeneficio: string,
  criterios: string[],
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_ELIGIBILITY_NOT_MET',
    {
      ...context,
      data: {
        tipoBeneficio,
        criteriosNaoAtendidos: criterios,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de auxílio natalidade já recebido
 */
export function throwAuxilioNatalidadeAlreadyReceived(
  cidadaoId: string,
  dataNascimento: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'AUXILIO_NATALIDADE_ALREADY_RECEIVED',
    {
      ...context,
      data: {
        cidadaoId,
        dataNascimento,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de aluguel social já ativo
 */
export function throwAluguelSocialAlreadyActive(
  cidadaoId: string,
  beneficioAtivoId: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'ALUGUEL_SOCIAL_ALREADY_ACTIVE',
    {
      ...context,
      data: {
        cidadaoId,
        beneficioAtivoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de valor excedendo limite
 */
export function throwValueExceedsLimit(
  valor: number,
  limiteMaximo: number,
  tipoBeneficio: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_VALUE_EXCEEDS_LIMIT',
    {
      ...context,
      data: {
        valor,
        limiteMaximo,
        tipoBeneficio,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documentos obrigatórios ausentes
 */
export function throwRequiredDocumentsMissing(
  documentosAusentes: string[],
  tipoBeneficio: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_REQUIRED_DOCUMENTS_MISSING',
    {
      ...context,
      data: {
        documentosAusentes,
        tipoBeneficio,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de requisito de idade não atendido
 */
export function throwAgeRequirementNotMet(
  idadeAtual: number,
  idadeMinima: number,
  idadeMaxima: number,
  tipoBeneficio: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_AGE_REQUIREMENT_NOT_MET',
    {
      ...context,
      data: {
        idadeAtual,
        idadeMinima,
        idadeMaxima,
        tipoBeneficio,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de requisito de renda não atendido
 */
export function throwIncomeRequirementNotMet(
  rendaFamiliar: number,
  rendaMaximaPermitida: number,
  tipoBeneficio: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_INCOME_REQUIREMENT_NOT_MET',
    {
      ...context,
      data: {
        rendaFamiliar,
        rendaMaximaPermitida,
        tipoBeneficio,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de benefício expirado
 */
export function throwBeneficioExpired(
  beneficioId: string,
  dataExpiracao: Date,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_EXPIRED',
    {
      ...context,
      data: {
        beneficioId,
        dataExpiracao: dataExpiracao.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha no pagamento
 */
export function throwPaymentFailed(
  beneficioId: string,
  valor: number,
  erro: string,
  context: BeneficioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFICIO_PAYMENT_FAILED',
    {
      ...context,
      data: {
        beneficioId,
        valor,
        erro,
        ...context.data,
      },
    },
    language,
  );
}
