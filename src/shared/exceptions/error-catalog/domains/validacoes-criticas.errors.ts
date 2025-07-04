/**
 * Domínio de Erros: VALIDAÇÕES CRÍTICAS
 *
 * Define códigos de erro específicos para validações críticas
 * do sistema SEMTAS, incluindo conflitos de papéis, critérios
 * de elegibilidade e regras de negócio fundamentais.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de validações críticas
 */
export interface ValidacoesCriticasErrorContext extends ErrorContext {
  data?: {
    cpf?: string;
    beneficiarioId?: string;
    composicaoFamiliarId?: string;
    tempoResidencia?: number;
    rendaFamiliar?: number;
    limiteRenda?: number;
    documentoTipo?: string;
    prazoLimite?: string;
    dataVencimento?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos para validações críticas (VAL_2xxx)
 */
export const VALIDACOES_CRITICAS_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // VAL_2001-2010: CONFLITOS DE PAPÉIS
  // ========================================

  VAL_2001: {
    code: 'VAL_2001',
    message: 'CPF já cadastrado como beneficiário ativo',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'CPF já está cadastrado como beneficiário ativo no sistema',
      'en-US':
        'CPF is already registered as an active beneficiary in the system',
    },
    legalReference: 'Regra de exclusividade - Sistema SOBE',
  },

  VAL_2002: {
    code: 'VAL_2002',
    message: 'CPF consta em composição familiar de outro beneficiário',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'CPF já faz parte da composição familiar de outro beneficiário',
      'en-US':
        "CPF is already part of another beneficiary's family composition",
    },
    legalReference: 'Regra de exclusividade - Sistema SOBE',
  },

  VAL_2003: {
    code: 'VAL_2003',
    message: 'Residência em Natal inferior ao mínimo exigido (2 anos)',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Tempo de residência em Natal é inferior ao mínimo exigido de 2 anos',
      'en-US':
        'Residence time in Natal is less than the required minimum of 2 years',
    },
    legalReference: 'Lei Municipal 7.205/2021',
  },



  VAL_2005: {
    code: 'VAL_2005',
    message: 'Renda familiar excede limite para benefício',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Renda familiar per capita excede o limite estabelecido para o benefício',
      'en-US':
        'Family per capita income exceeds the established limit for the benefit',
    },
    legalReference: 'Critérios de elegibilidade - Lei 7.205/2021',
  },

  // ========================================
  // VAL_2011-2020: DOCUMENTAÇÃO OBRIGATÓRIA
  // ========================================

  VAL_2011: {
    code: 'VAL_2011',
    message: 'Documento de identidade obrigatório não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documento de identidade é obrigatório para prosseguir',
      'en-US': 'Identity document is required to proceed',
    },
  },

  VAL_2012: {
    code: 'VAL_2012',
    message: 'Comprovante de residência obrigatório não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Comprovante de residência é obrigatório para validar elegibilidade',
      'en-US': 'Proof of residence is required to validate eligibility',
    },
  },

  VAL_2013: {
    code: 'VAL_2013',
    message: 'Comprovante de renda obrigatório não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Comprovante de renda familiar é obrigatório',
      'en-US': 'Family income proof is required',
    },
  },

  // ========================================
  // VAL_2021-2030: CRITÉRIOS DE ELEGIBILIDADE
  // ========================================

  VAL_2021: {
    code: 'VAL_2021',
    message: 'Idade não atende critério de elegibilidade',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Idade do solicitante não atende aos critérios de elegibilidade',
      'en-US': 'Applicant age does not meet eligibility criteria',
    },
  },

  VAL_2022: {
    code: 'VAL_2022',
    message: 'Composição familiar não atende critérios mínimos',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Composição familiar não atende aos critérios mínimos estabelecidos',
      'en-US': 'Family composition does not meet established minimum criteria',
    },
  },

  VAL_2023: {
    code: 'VAL_2023',
    message: 'Situação de vulnerabilidade não comprovada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Situação de vulnerabilidade social não foi adequadamente comprovada',
      'en-US': 'Social vulnerability situation has not been adequately proven',
    },
  },
};

// ========================================
// HELPERS PARA VALIDAÇÕES CRÍTICAS
// ========================================





/**
 * Lança erro de residência insuficiente
 */
export function throwResidenciaInsuficiente(
  cpf: string,
  tempoResidencia: number,
  context: ValidacoesCriticasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VAL_2003',
    {
      ...context,
      data: {
        cpf,
        tempoResidencia,
        minimoExigido: 24, // 2 anos em meses
        ...context.data,
      },
    },
    language,
  );
}



/**
 * Lança erro de renda familiar excedente
 */
export function throwRendaFamiliarExcedente(
  rendaFamiliar: number,
  limiteRenda: number,
  context: ValidacoesCriticasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VAL_2005',
    {
      ...context,
      data: {
        rendaFamiliar,
        limiteRenda,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documento obrigatório não fornecido
 */
export function throwDocumentoObrigatorioNaoFornecido(
  documentoTipo: string,
  context: ValidacoesCriticasErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    identidade: 'VAL_2011',
    residencia: 'VAL_2012',
    renda: 'VAL_2013',
  };

  const errorCode = errorCodes[documentoTipo] || 'VAL_2011';

  throw new AppError(
    errorCode,
    {
      ...context,
      data: {
        documentoTipo,
        ...context.data,
      },
    },
    language,
  );
}
