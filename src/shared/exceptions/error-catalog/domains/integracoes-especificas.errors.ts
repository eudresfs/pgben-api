/**
 * Domínio de Erros: INTEGRAÇÕES ESPECÍFICAS
 *
 * Define códigos de erro específicos para integrações com
 * sistemas externos do SEMTAS (CadÚnico, SIAFI, etc.).
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de integrações
 */
export interface IntegracoesEspecificasErrorContext extends ErrorContext {
  data?: {
    sistemaExterno?: string;
    endpoint?: string;
    statusCode?: number;
    requestBody?: any;
    responseBody?: any;
    timeout?: number;
    tentativas?: number;
    cpf?: string;
    nis?: string;
    codigoRetorno?: string;
    mensagemSistema?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos para integrações (INT_1xxx)
 */
export const INTEGRACOES_ESPECIFICAS_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // INT_1001-1010: CADÚNICO
  // ========================================

  INT_1001: {
    code: 'INT_1001',
    message: 'CPF não encontrado na base do CadÚnico',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'CPF não foi encontrado na base de dados do CadÚnico',
      'en-US': 'CPF not found in CadÚnico database',
    },
  },

  INT_1002: {
    code: 'INT_1002',
    message: 'Dados do CadÚnico desatualizados (mais de 2 anos)',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Dados do CadÚnico estão desatualizados há mais de 2 anos',
      'en-US': 'CadÚnico data is outdated for more than 2 years',
    },
    legalReference: 'Decreto Federal 6.135/2007',
  },

  INT_1003: {
    code: 'INT_1003',
    message: 'Família não atende critério de renda per capita do CadÚnico',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Renda per capita familiar excede limite do CadÚnico (meio salário mínimo)',
      'en-US':
        'Family per capita income exceeds CadÚnico limit (half minimum wage)',
    },
    legalReference: 'Lei 10.836/2004',
  },

  INT_1004: {
    code: 'INT_1004',
    message: 'Situação familiar irregular no CadÚnico',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Situação da família está irregular no CadÚnico',
      'en-US': 'Family situation is irregular in CadÚnico',
    },
  },

  INT_1005: {
    code: 'INT_1005',
    message: 'Timeout na consulta ao CadÚnico',
    httpStatus: HttpStatus.REQUEST_TIMEOUT,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tempo limite excedido na consulta ao CadÚnico',
      'en-US': 'Timeout exceeded in CadÚnico query',
    },
  },

  INT_1006: {
    code: 'INT_1006',
    message: 'Serviço CadÚnico temporariamente indisponível',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Serviço do CadÚnico está temporariamente indisponível',
      'en-US': 'CadÚnico service is temporarily unavailable',
    },
  },

  // ========================================
  // INT_1011-1020: SIAFI
  // ========================================

  INT_1011: {
    code: 'INT_1011',
    message: 'Erro na geração de empenho no SIAFI',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha na geração do empenho no sistema SIAFI',
      'en-US': 'Failed to generate commitment in SIAFI system',
    },
  },

  INT_1012: {
    code: 'INT_1012',
    message: 'Dotação orçamentária insuficiente no SIAFI',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Dotação orçamentária insuficiente para o benefício',
      'en-US': 'Insufficient budget allocation for the benefit',
    },
    legalReference: 'Lei 4.320/1964',
  },

  INT_1013: {
    code: 'INT_1013',
    message: 'Conta bancária inválida no SIAFI',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Dados bancários não são válidos no sistema SIAFI',
      'en-US': 'Bank account data is not valid in SIAFI system',
    },
  },

  INT_1014: {
    code: 'INT_1014',
    message: 'Falha na liquidação do pagamento no SIAFI',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na liquidação do pagamento no SIAFI',
      'en-US': 'Payment settlement error in SIAFI',
    },
  },

  INT_1015: {
    code: 'INT_1015',
    message: 'Exercício financeiro encerrado no SIAFI',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Exercício financeiro está encerrado no SIAFI',
      'en-US': 'Financial year is closed in SIAFI',
    },
  },

  // ========================================
  // INT_1021-1030: RECEITA FEDERAL
  // ========================================

  INT_1021: {
    code: 'INT_1021',
    message: 'CPF inválido na Receita Federal',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'CPF não é válido na base da Receita Federal',
      'en-US': 'CPF is not valid in Federal Revenue database',
    },
  },

  INT_1022: {
    code: 'INT_1022',
    message: 'CPF com situação irregular na Receita Federal',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'CPF possui situação irregular na Receita Federal',
      'en-US': 'CPF has irregular status in Federal Revenue',
    },
  },

  INT_1023: {
    code: 'INT_1023',
    message: 'Limite de consultas à Receita Federal excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite diário de consultas à Receita Federal foi excedido',
      'en-US': 'Daily query limit to Federal Revenue has been exceeded',
    },
  },

  // ========================================
  // INT_1031-1040: BANCO CENTRAL
  // ========================================

  INT_1031: {
    code: 'INT_1031',
    message: 'Chave PIX inválida ou inexistente',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Chave PIX informada é inválida ou não existe',
      'en-US': 'Provided PIX key is invalid or does not exist',
    },
  },

  INT_1032: {
    code: 'INT_1032',
    message: 'Conta PIX não pertence ao beneficiário',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Chave PIX não pertence ao CPF do beneficiário',
      'en-US': 'PIX key does not belong to beneficiary CPF',
    },
  },

  INT_1033: {
    code: 'INT_1033',
    message: 'Falha na transferência PIX',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na execução da transferência PIX',
      'en-US': 'Error executing PIX transfer',
    },
  },

  // ========================================
  // INT_1041-1050: CARTÓRIO CIVIL
  // ========================================

  INT_1041: {
    code: 'INT_1041',
    message: 'Certidão de nascimento não encontrada no cartório',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Certidão de nascimento não foi encontrada no sistema de cartórios',
      'en-US': 'Birth certificate not found in registry office system',
    },
  },

  INT_1042: {
    code: 'INT_1042',
    message: 'Certidão de óbito não encontrada no cartório',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Certidão de óbito não foi encontrada no sistema de cartórios',
      'en-US': 'Death certificate not found in registry office system',
    },
  },

  INT_1043: {
    code: 'INT_1043',
    message: 'Dados da certidão não conferem com solicitação',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Dados da certidão não conferem com os informados na solicitação',
      'en-US':
        'Certificate data does not match the information provided in the request',
    },
  },

  // ========================================
  // INT_1051-1060: SISTEMA MUNICIPAL
  // ========================================

  INT_1051: {
    code: 'INT_1051',
    message: 'Falha na sincronização com sistema de protocolo',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro na sincronização com o sistema de protocolo municipal',
      'en-US': 'Error synchronizing with municipal protocol system',
    },
  },

  INT_1052: {
    code: 'INT_1052',
    message: 'Falha na integração com sistema de estoque',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro na integração com o sistema de controle de estoque',
      'en-US': 'Error integrating with inventory control system',
    },
  },

  INT_1053: {
    code: 'INT_1053',
    message: 'Falha na notificação por SMS/Email',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.LOW,
    localizedMessages: {
      'pt-BR': 'Erro no envio de notificação por SMS ou email',
      'en-US': 'Error sending SMS or email notification',
    },
  },
};

// ========================================
// HELPERS PARA INTEGRAÇÕES ESPECÍFICAS
// ========================================

/**
 * Lança erro de CPF não encontrado no CadÚnico
 */
export function throwCadUnicoCpfNaoEncontrado(
  cpf: string,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INT_1001',
    {
      ...context,
      data: {
        cpf,
        sistemaExterno: 'CadÚnico',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de dados desatualizados no CadÚnico
 */
export function throwCadUnicoDadosDesatualizados(
  cpf: string,
  ultimaAtualizacao: Date,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INT_1002',
    {
      ...context,
      data: {
        cpf,
        ultimaAtualizacao: ultimaAtualizacao.toISOString(),
        sistemaExterno: 'CadÚnico',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de dotação orçamentária insuficiente no SIAFI
 */
export function throwSiafiDotacaoInsuficiente(
  valor: number,
  saldoDisponivel: number,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INT_1012',
    {
      ...context,
      data: {
        valor,
        saldoDisponivel,
        sistemaExterno: 'SIAFI',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de CPF irregular na Receita Federal
 */
export function throwReceitaFederalCpfIrregular(
  cpf: string,
  situacao: string,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INT_1022',
    {
      ...context,
      data: {
        cpf,
        situacao,
        sistemaExterno: 'Receita Federal',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de chave PIX inválida
 */
export function throwPixChaveInvalida(
  chavePix: string,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INT_1031',
    {
      ...context,
      data: {
        chavePix,
        sistemaExterno: 'Banco Central',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de timeout em integração
 */
export function throwIntegraçãoTimeout(
  sistemaExterno: string,
  endpoint: string,
  timeout: number,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    CadÚnico: 'INT_1005',
    SIAFI: 'INT_1014',
    'Receita Federal': 'INT_1023',
  };

  const errorCode = errorCodes[sistemaExterno] || 'INT_1005';

  throw new AppError(
    errorCode,
    {
      ...context,
      data: {
        sistemaExterno,
        endpoint,
        timeout,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de serviço indisponível
 */
export function throwServicoIndisponivel(
  sistemaExterno: string,
  statusCode: number,
  context: IntegracoesEspecificasErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    CadÚnico: 'INT_1006',
    SIAFI: 'INT_1014',
    'Banco Central': 'INT_1033',
  };

  const errorCode = errorCodes[sistemaExterno] || 'INT_1006';

  throw new AppError(
    errorCode,
    {
      ...context,
      data: {
        sistemaExterno,
        statusCode,
        ...context.data,
      },
    },
    language,
  );
}
