/**
 * Domínio de Erros: CIDADAO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de cidadãos do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de cidadão
 */
export interface CidadaoErrorContext extends ErrorContext {
  data?: {
    cidadaoId?: string;
    cpf?: string;
    nis?: string;
    rg?: string;
    email?: string;
    telefone?: string;
    endereco?: any;
    familiaId?: string;
    responsavelId?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio CIDADAO
 */
export const CIDADAO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  CIDADAO_NOT_FOUND: {
    code: 'CIDADAO_NOT_FOUND',
    message: 'Cidadão não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Cidadão não encontrado no sistema',
      'en-US': 'Citizen not found in the system',
    },
  },

  CIDADAO_ALREADY_EXISTS: {
    code: 'CIDADAO_ALREADY_EXISTS',
    message: 'Cidadão já cadastrado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Já existe um cidadão cadastrado com estes dados',
      'en-US': 'A citizen is already registered with this data',
    },
  },

  CIDADAO_CANNOT_DELETE: {
    code: 'CIDADAO_CANNOT_DELETE',
    message: 'Cidadão não pode ser excluído',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão possui vínculos ativos e não pode ser excluído',
      'en-US': 'Citizen has active links and cannot be deleted',
    },
  },

  // ========================================
  // VALIDAÇÕES DE DOCUMENTOS
  // ========================================

  CIDADAO_INVALID_CPF: {
    code: 'CIDADAO_INVALID_CPF',
    message: 'CPF inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'CPF informado é inválido',
      'en-US': 'Invalid CPF provided',
    },
  },

  CIDADAO_DUPLICATE_CPF: {
    code: 'CIDADAO_DUPLICATE_CPF',
    message: 'CPF já cadastrado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'CPF já está cadastrado no sistema',
      'en-US': 'CPF is already registered in the system',
    },
  },

  CIDADAO_INVALID_NIS: {
    code: 'CIDADAO_INVALID_NIS',
    message: 'NIS inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'NIS informado é inválido',
      'en-US': 'Invalid NIS provided',
    },
  },

  CIDADAO_DUPLICATE_NIS: {
    code: 'CIDADAO_DUPLICATE_NIS',
    message: 'NIS já cadastrado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'NIS já está cadastrado no sistema',
      'en-US': 'NIS is already registered in the system',
    },
  },

  CIDADAO_INVALID_RG: {
    code: 'CIDADAO_INVALID_RG',
    message: 'RG inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'RG informado é inválido',
      'en-US': 'Invalid RG provided',
    },
  },

  CIDADAO_DUPLICATE_RG: {
    code: 'CIDADAO_DUPLICATE_RG',
    message: 'RG já cadastrado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'RG já está cadastrado no sistema',
      'en-US': 'RG is already registered in the system',
    },
  },

  // ========================================
  // VALIDAÇÕES DE DADOS PESSOAIS
  // ========================================

  CIDADAO_INVALID_NAME: {
    code: 'CIDADAO_INVALID_NAME',
    message: 'Nome inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Nome informado é inválido',
      'en-US': 'Invalid name provided',
    },
  },

  CIDADAO_INVALID_BIRTH_DATE: {
    code: 'CIDADAO_INVALID_BIRTH_DATE',
    message: 'Data de nascimento inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Data de nascimento informada é inválida',
      'en-US': 'Invalid birth date provided',
    },
  },

  CIDADAO_INVALID_AGE: {
    code: 'CIDADAO_INVALID_AGE',
    message: 'Idade inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Idade do cidadão é inválida para o benefício solicitado',
      'en-US': 'Citizen age is invalid for the requested benefit',
    },
  },

  CIDADAO_INVALID_EMAIL: {
    code: 'CIDADAO_INVALID_EMAIL',
    message: 'Email inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Email informado é inválido',
      'en-US': 'Invalid email provided',
    },
  },

  CIDADAO_DUPLICATE_EMAIL: {
    code: 'CIDADAO_DUPLICATE_EMAIL',
    message: 'Email já cadastrado',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Email já está cadastrado no sistema',
      'en-US': 'Email is already registered in the system',
    },
  },

  CIDADAO_INVALID_PHONE: {
    code: 'CIDADAO_INVALID_PHONE',
    message: 'Telefone inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Telefone informado é inválido',
      'en-US': 'Invalid phone number provided',
    },
  },

  CIDADAO_INVALID_GENDER: {
    code: 'CIDADAO_INVALID_GENDER',
    message: 'Gênero inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Gênero informado é inválido',
      'en-US': 'Invalid gender provided',
    },
  },

  CIDADAO_INVALID_MARITAL_STATUS: {
    code: 'CIDADAO_INVALID_MARITAL_STATUS',
    message: 'Estado civil inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Estado civil informado é inválido',
      'en-US': 'Invalid marital status provided',
    },
  },

  // ========================================
  // VALIDAÇÕES DE ENDEREÇO
  // ========================================

  CIDADAO_INVALID_ADDRESS: {
    code: 'CIDADAO_INVALID_ADDRESS',
    message: 'Endereço inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Endereço informado é inválido',
      'en-US': 'Invalid address provided',
    },
  },

  CIDADAO_INVALID_CEP: {
    code: 'CIDADAO_INVALID_CEP',
    message: 'CEP inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'CEP informado é inválido',
      'en-US': 'Invalid ZIP code provided',
    },
  },

  CIDADAO_ADDRESS_NOT_IN_MUNICIPALITY: {
    code: 'CIDADAO_ADDRESS_NOT_IN_MUNICIPALITY',
    message: 'Endereço fora do município',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Endereço informado não pertence ao município atendido',
      'en-US': 'Address is not within the served municipality',
    },
    legalReference: 'Lei Orgânica Municipal',
  },

  // ========================================
  // VALIDAÇÕES SOCIOECONÔMICAS
  // ========================================

  CIDADAO_INVALID_INCOME: {
    code: 'CIDADAO_INVALID_INCOME',
    message: 'Renda inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Renda informada é inválida',
      'en-US': 'Invalid income provided',
    },
  },

  CIDADAO_INCOME_EXCEEDS_LIMIT: {
    code: 'CIDADAO_INCOME_EXCEEDS_LIMIT',
    message: 'Renda excede limite permitido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Renda familiar excede o limite permitido para o benefício',
      'en-US': 'Family income exceeds the allowed limit for the benefit',
    },
    legalReference: 'Decreto Municipal nº XXX/XXXX',
  },

  CIDADAO_INVALID_FAMILY_SIZE: {
    code: 'CIDADAO_INVALID_FAMILY_SIZE',
    message: 'Composição familiar inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Composição familiar informada é inválida',
      'en-US': 'Invalid family composition provided',
    },
  },

  CIDADAO_INVALID_VULNERABILITY_SCORE: {
    code: 'CIDADAO_INVALID_VULNERABILITY_SCORE',
    message: 'Índice de vulnerabilidade inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Índice de vulnerabilidade social é inválido',
      'en-US': 'Invalid social vulnerability index',
    },
  },

  // ========================================
  // RELACIONAMENTOS FAMILIARES
  // ========================================

  CIDADAO_FAMILY_NOT_FOUND: {
    code: 'CIDADAO_FAMILY_NOT_FOUND',
    message: 'Família não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Família não encontrada no sistema',
      'en-US': 'Family not found in the system',
    },
  },

  CIDADAO_INVALID_FAMILY_RELATIONSHIP: {
    code: 'CIDADAO_INVALID_FAMILY_RELATIONSHIP',
    message: 'Relacionamento familiar inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Relacionamento familiar informado é inválido',
      'en-US': 'Invalid family relationship provided',
    },
  },

  CIDADAO_ALREADY_IN_FAMILY: {
    code: 'CIDADAO_ALREADY_IN_FAMILY',
    message: 'Cidadão já pertence a uma família',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já pertence a uma composição familiar',
      'en-US': 'Citizen already belongs to a family composition',
    },
  },

  CIDADAO_CANNOT_BE_OWN_RESPONSIBLE: {
    code: 'CIDADAO_CANNOT_BE_OWN_RESPONSIBLE',
    message: 'Cidadão não pode ser responsável por si mesmo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Cidadão não pode ser responsável por si mesmo',
      'en-US': 'Citizen cannot be responsible for themselves',
    },
  },

  CIDADAO_RESPONSIBLE_NOT_FOUND: {
    code: 'CIDADAO_RESPONSIBLE_NOT_FOUND',
    message: 'Responsável não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Responsável não encontrado no sistema',
      'en-US': 'Responsible person not found in the system',
    },
  },

  CIDADAO_MINOR_WITHOUT_RESPONSIBLE: {
    code: 'CIDADAO_MINOR_WITHOUT_RESPONSIBLE',
    message: 'Menor de idade sem responsável',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Menor de idade deve ter um responsável cadastrado',
      'en-US': 'Minor must have a registered responsible person',
    },
    legalReference: 'Estatuto da Criança e do Adolescente',
  },

  // ========================================
  // INTEGRAÇÃO COM SISTEMAS EXTERNOS
  // ========================================

  CIDADAO_CADUN_VALIDATION_FAILED: {
    code: 'CIDADAO_CADUN_VALIDATION_FAILED',
    message: 'Falha na validação do CadÚnico',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha na validação dos dados no Cadastro Único',
      'en-US': 'Failed to validate data in Unified Registry',
    },
  },

  CIDADAO_CADUN_NOT_FOUND: {
    code: 'CIDADAO_CADUN_NOT_FOUND',
    message: 'Cidadão não encontrado no CadÚnico',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão não encontrado no Cadastro Único',
      'en-US': 'Citizen not found in Unified Registry',
    },
    legalReference: 'Decreto Federal nº 6.135/2007',
  },

  CIDADAO_CADUN_DATA_MISMATCH: {
    code: 'CIDADAO_CADUN_DATA_MISMATCH',
    message: 'Dados divergentes do CadÚnico',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Dados informados divergem do Cadastro Único',
      'en-US': 'Provided data differs from Unified Registry',
    },
  },

  // ========================================
  // PERMISSÕES E ACESSO
  // ========================================

  CIDADAO_ACCESS_DENIED: {
    code: 'CIDADAO_ACCESS_DENIED',
    message: 'Acesso negado aos dados do cidadão',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para acessar os dados deste cidadão',
      'en-US': 'You do not have permission to access this citizen data',
    },
  },

  CIDADAO_LGPD_CONSENT_REQUIRED: {
    code: 'CIDADAO_LGPD_CONSENT_REQUIRED',
    message: 'Consentimento LGPD obrigatório',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'É necessário o consentimento do cidadão para tratamento dos dados pessoais',
      'en-US': 'Citizen consent is required for personal data processing',
    },
    legalReference: 'Lei nº 13.709/2018 (LGPD)',
  },

  CIDADAO_DATA_RETENTION_EXPIRED: {
    code: 'CIDADAO_DATA_RETENTION_EXPIRED',
    message: 'Prazo de retenção de dados expirado',
    httpStatus: HttpStatus.GONE,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Prazo de retenção dos dados do cidadão expirou',
      'en-US': 'Citizen data retention period has expired',
    },
    legalReference: 'Lei nº 13.709/2018 (LGPD)',
  },
};

// ========================================
// FUNÇÕES HELPER PARA CIDADÃO
// ========================================

/**
 * Lança erro de cidadão não encontrado
 */
export function throwCidadaoNotFound(
  identifier: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_NOT_FOUND',
    {
      ...context,
      data: {
        identifier,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de CPF inválido
 */
export function throwInvalidCpf(
  cpf: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_INVALID_CPF',
    {
      ...context,
      data: {
        cpf,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de CPF duplicado
 */
export function throwDuplicateCpf(
  cpf: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_DUPLICATE_CPF',
    {
      ...context,
      data: {
        cpf,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de NIS inválido
 */
export function throwInvalidNis(
  nis: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_INVALID_NIS',
    {
      ...context,
      data: {
        nis,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de NIS duplicado
 */
export function throwDuplicateNis(
  nis: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_DUPLICATE_NIS',
    {
      ...context,
      data: {
        nis,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de renda excedendo limite
 */
export function throwIncomeExceedsLimit(
  currentIncome: number,
  maxAllowed: number,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_INCOME_EXCEEDS_LIMIT',
    {
      ...context,
      data: {
        currentIncome,
        maxAllowed,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de endereço fora do município
 */
export function throwAddressNotInMunicipality(
  address: string,
  municipality: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_ADDRESS_NOT_IN_MUNICIPALITY',
    {
      ...context,
      data: {
        address,
        municipality,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de menor sem responsável
 */
export function throwMinorWithoutResponsible(
  cidadaoId: string,
  age: number,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_MINOR_WITHOUT_RESPONSIBLE',
    {
      ...context,
      data: {
        cidadaoId,
        age,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na validação do CadÚnico
 */
export function throwCadunValidationFailed(
  cpf: string,
  nis: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_CADUN_VALIDATION_FAILED',
    {
      ...context,
      data: {
        cpf,
        nis,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de consentimento LGPD obrigatório
 */
export function throwLgpdConsentRequired(
  cidadaoId: string,
  dataType: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_LGPD_CONSENT_REQUIRED',
    {
      ...context,
      data: {
        cidadaoId,
        dataType,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de acesso negado
 */
export function throwCidadaoAccessDenied(
  cidadaoId: string,
  userId: string,
  context: CidadaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'CIDADAO_ACCESS_DENIED',
    {
      ...context,
      data: {
        cidadaoId,
        userId,
        ...context.data,
      },
    },
    language,
  );
}
