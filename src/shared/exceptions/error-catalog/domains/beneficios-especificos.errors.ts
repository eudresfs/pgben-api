/**
 * Domínio de Erros: BENEFÍCIOS ESPECÍFICOS
 *
 * Define códigos de erro específicos para regras de negócio
 * de cada modalidade de benefício do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de benefícios
 */
export interface BeneficiosEspecificosErrorContext extends ErrorContext {
  data?: {
    beneficiarioId?: string;
    tipoBeneficio?: string;
    valor?: number;
    prazoMaximo?: number;
    prazoAtual?: number;
    dataParto?: string;
    dataObito?: string;
    peso?: number;
    valorAluguel?: number;
    limiteValor?: number;
    modalidade?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos para benefícios (BEN_1xxx)
 */
export const BENEFICIOS_ESPECIFICOS_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // BEN_1001-1010: ALUGUEL SOCIAL
  // ========================================

  BEN_1001: {
    code: 'BEN_1001',
    message: 'Prazo máximo de aluguel social excedido (6 meses)',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prazo máximo de 6 meses para aluguel social foi excedido',
      'en-US': 'Maximum period of 6 months for social rent has been exceeded',
    },
    legalReference: 'Art. 15 da Lei 7.205/2021',
  },

  BEN_1002: {
    code: 'BEN_1002',
    message: 'Valor do aluguel excede limite permitido (R$ 600)',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Valor do aluguel excede o limite máximo de R$ 600,00',
      'en-US': 'Rent value exceeds the maximum limit of R$ 600.00',
    },
    legalReference: 'Portaria SEMTAS nº 001/2021',
  },

  BEN_1003: {
    code: 'BEN_1003',
    message: 'Contrato de locação inválido ou ausente',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Contrato de locação é obrigatório e deve estar válido',
      'en-US': 'Lease contract is required and must be valid',
    },
  },

  BEN_1004: {
    code: 'BEN_1004',
    message: 'Documentação do proprietário incompleta',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documentação completa do proprietário é obrigatória',
      'en-US': 'Complete property owner documentation is required',
    },
  },

  BEN_1005: {
    code: 'BEN_1005',
    message: 'Imóvel não atende critérios de habitabilidade',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Imóvel não atende aos critérios mínimos de habitabilidade',
      'en-US': 'Property does not meet minimum habitability criteria',
    },
  },

  // ========================================
  // BEN_1011-1020: BENEFÍCIO NATALIDADE
  // ========================================

  BEN_1011: {
    code: 'BEN_1011',
    message: 'Benefício natalidade: prazo de solicitação expirado (30 dias)',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prazo de 30 dias para solicitação do benefício natalidade expirado',
      'en-US': '30-day deadline for maternity benefit application has expired',
    },
    legalReference: 'Decreto 12.346/2021',
  },

  BEN_1012: {
    code: 'BEN_1012',
    message: 'Certidão de nascimento obrigatória não fornecida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certidão de nascimento é obrigatória para benefício natalidade',
      'en-US': 'Birth certificate is required for maternity benefit',
    },
  },

  BEN_1013: {
    code: 'BEN_1013',
    message: 'Modalidade de benefício natalidade inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Modalidade deve ser "kit_enxoval" ou "pix_500"',
      'en-US': 'Modality must be "kit_enxoval" or "pix_500"',
    },
  },

  BEN_1014: {
    code: 'BEN_1014',
    message: 'Benefício natalidade já concedido para este nascimento',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Benefício natalidade já foi concedido para este nascimento',
      'en-US': 'Maternity benefit has already been granted for this birth',
    },
  },

  // ========================================
  // BEN_1021-1030: BENEFÍCIO MORTALIDADE
  // ========================================

  BEN_1021: {
    code: 'BEN_1021',
    message: 'Certidão de óbito obrigatória não fornecida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certidão de óbito é obrigatória para benefício mortalidade',
      'en-US': 'Death certificate is required for mortality benefit',
    },
  },

  BEN_1022: {
    code: 'BEN_1022',
    message: 'Tipo de urna inválido para peso do falecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de urna não é adequado para o peso do falecido',
      'en-US': 'Coffin type is not suitable for the deceased weight',
    },
  },

  BEN_1023: {
    code: 'BEN_1023',
    message: 'Prazo para solicitação de benefício mortalidade expirado (7 dias)',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prazo de 7 dias para solicitação do benefício mortalidade expirado',
      'en-US': '7-day deadline for mortality benefit application has expired',
    },
  },

  BEN_1024: {
    code: 'BEN_1024',
    message: 'Serviço de translado não disponível para localidade',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Serviço de translado não está disponível para esta localidade',
      'en-US': 'Transfer service is not available for this location',
    },
  },

  // ========================================
  // BEN_1031-1040: CESTA BÁSICA
  // ========================================

  BEN_1031: {
    code: 'BEN_1031',
    message: 'Modalidade de cesta básica inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Modalidade deve ser "generos_alimenticios" ou "vale_alimentacao_200"',
      'en-US': 'Modality must be "generos_alimenticios" or "vale_alimentacao_200"',
    },
  },

  BEN_1032: {
    code: 'BEN_1032',
    message: 'Limite mensal de cestas básicas excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite mensal de cestas básicas por família foi excedido',
      'en-US': 'Monthly limit of basic food baskets per family has been exceeded',
    },
  },

  BEN_1033: {
    code: 'BEN_1033',
    message: 'Estoque de cestas básicas insuficiente',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Estoque de cestas básicas temporariamente insuficiente',
      'en-US': 'Basic food basket stock temporarily insufficient',
    },
  },

  // ========================================
  // BEN_1041-1050: PASSAGENS
  // ========================================

  BEN_1041: {
    code: 'BEN_1041',
    message: 'Tipo de passagem inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de passagem deve ser "terrestre" ou "aerea"',
      'en-US': 'Ticket type must be "terrestre" or "aerea"',
    },
  },

  BEN_1042: {
    code: 'BEN_1042',
    message: 'Destino não autorizado para passagem subsidiada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Destino não está na lista de locais autorizados',
      'en-US': 'Destination is not in the list of authorized locations',
    },
  },

  BEN_1043: {
    code: 'BEN_1043',
    message: 'Justificativa de viagem insuficiente',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Justificativa para a viagem deve ser detalhada e fundamentada',
      'en-US': 'Travel justification must be detailed and well-founded',
    },
  },

  BEN_1044: {
    code: 'BEN_1044',
    message: 'Valor da passagem excede limite autorizado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Valor da passagem excede o limite autorizado para o destino',
      'en-US': 'Ticket value exceeds the authorized limit for the destination',
    },
  },
};

// ========================================
// HELPERS PARA BENEFÍCIOS ESPECÍFICOS
// ========================================

/**
 * Lança erro de prazo de aluguel social excedido
 */
export function throwAluguelPrazoExcedido(
  beneficiarioId: string,
  context: BeneficiosEspecificosErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BEN_1001',
    {
      ...context,
      data: {
        beneficiarioId,
        prazoMaximo: 6,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de prazo de natalidade expirado
 */
export function throwNatalidadePrazoExpirado(
  cpf: string,
  dataParto: Date,
  context: BeneficiosEspecificosErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BEN_1011',
    {
      ...context,
      data: {
        cpf,
        dataParto: dataParto.toISOString(),
        prazoLimite: 30,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de tipo de urna inválido para mortalidade
 */
export function throwMortalidadeTipoUrnaInvalido(
  peso: number,
  context: BeneficiosEspecificosErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BEN_1022',
    {
      ...context,
      data: {
        peso,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de valor de aluguel excedente
 */
export function throwAluguelValorExcedente(
  valorAluguel: number,
  context: BeneficiosEspecificosErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BEN_1002',
    {
      ...context,
      data: {
        valorAluguel,
        limiteValor: 600,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de modalidade de benefício inválida
 */
export function throwModalidadeBeneficioInvalida(
  tipoBeneficio: string,
  modalidade: string,
  context: BeneficiosEspecificosErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    'natalidade': 'BEN_1013',
    'cesta_basica': 'BEN_1031',
    'passagem': 'BEN_1041',
  };

  const errorCode = errorCodes[tipoBeneficio] || 'BEN_1013';

  throw new AppError(
    errorCode,
    {
      ...context,
      data: {
        tipoBeneficio,
        modalidade,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documento obrigatório para benefício
 */
export function throwDocumentoBeneficioObrigatorio(
  tipoBeneficio: string,
  documentoTipo: string,
  context: BeneficiosEspecificosErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    'natalidade_certidao': 'BEN_1012',
    'mortalidade_certidao': 'BEN_1021',
    'aluguel_contrato': 'BEN_1003',
  };

  const errorKey = `${tipoBeneficio}_${documentoTipo}`;
  const errorCode = errorCodes[errorKey] || 'BEN_1012';

  throw new AppError(
    errorCode,
    {
      ...context,
      data: {
        tipoBeneficio,
        documentoTipo,
        ...context.data,
      },
    },
    language,
  );
}