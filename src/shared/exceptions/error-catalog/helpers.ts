/**
 * Funções helper para lançamento de erros padronizados
 *
 * Fornece uma interface conveniente para lançar erros específicos
 * do catálogo com contexto apropriado, facilitando o uso em
 * serviços e controladores.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { AppError, ErrorContext } from './AppError';

/**
 * Tipo para dados de contexto específicos de validação
 */
export interface ValidationErrorContext extends ErrorContext {
  data?: {
    field?: string;
    value?: any;
    constraint?: string;
    [key: string]: any;
  };
}

/**
 * Tipo para dados de contexto específicos de benefícios
 */
export interface BenefitErrorContext extends ErrorContext {
  data?: {
    benefitType?: string;
    benefitId?: string;
    citizenId?: string;
    currentStatus?: string;
    targetStatus?: string;
    [key: string]: any;
  };
}

/**
 * Tipo para dados de contexto específicos de integrações
 */
export interface IntegrationErrorContext extends ErrorContext {
  data?: {
    service?: string;
    endpoint?: string;
    statusCode?: number;
    responseBody?: any;
    [key: string]: any;
  };
}

// ========================================
// HELPERS PARA VALIDAÇÕES
// ========================================

/**
 * Lança erro de CPF inválido
 */
export function throwInvalidCpf(
  cpf: string,
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_CPF_INVALID',
    {
      ...context,
      data: {
        field: 'cpf',
        value: cpf,
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
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_CPF_DUPLICATE',
    {
      ...context,
      data: {
        field: 'cpf',
        value: cpf,
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
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_NIS_INVALID',
    {
      ...context,
      data: {
        field: 'nis',
        value: nis,
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
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_NIS_DUPLICATE',
    {
      ...context,
      data: {
        field: 'nis',
        value: nis,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de idade inválida
 */
export function throwInvalidAge(
  age: number,
  minAge?: number,
  maxAge?: number,
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_AGE_INVALID',
    {
      ...context,
      data: {
        field: 'age',
        value: age,
        minAge,
        maxAge,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de renda inválida
 */
export function throwInvalidIncome(
  income: number,
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_INCOME_INVALID',
    {
      ...context,
      data: {
        field: 'income',
        value: income,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de renda que excede limite
 */
export function throwIncomeExceedsLimit(
  income: number,
  limit: number,
  context: ValidationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'VALIDATIONS_INCOME_EXCEEDS_LIMIT',
    {
      ...context,
      data: {
        field: 'income',
        value: income,
        limit,
        ...context.data,
      },
    },
    language,
  );
}

// ========================================
// HELPERS PARA BENEFÍCIOS
// ========================================

/**
 * Lança erro de auxílio natalidade já recebido
 */
export function throwNatalidadeAlreadyReceived(
  citizenId: string,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFITS_NATALIDADE_ALREADY_RECEIVED',
    {
      ...context,
      data: {
        benefitType: 'NATALIDADE',
        citizenId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de data de nascimento inválida para natalidade
 */
export function throwInvalidBirthDateForNatalidade(
  birthDate: Date,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFITS_NATALIDADE_BIRTH_DATE_INVALID',
    {
      ...context,
      data: {
        benefitType: 'NATALIDADE',
        birthDate: birthDate.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de aluguel social já ativo
 */
export function throwAluguelAlreadyActive(
  citizenId: string,
  activeBenefitId: string,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFITS_ALUGUEL_ALREADY_ACTIVE',
    {
      ...context,
      data: {
        benefitType: 'ALUGUEL_SOCIAL',
        citizenId,
        activeBenefitId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de imóvel inválido para aluguel social
 */
export function throwInvalidPropertyForAluguel(
  propertyInfo: any,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFITS_ALUGUEL_PROPERTY_INVALID',
    {
      ...context,
      data: {
        benefitType: 'ALUGUEL_SOCIAL',
        propertyInfo,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de benefício não encontrado
 */
export function throwBenefitNotFound(
  benefitId: string,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFITS_NOT_FOUND',
    {
      ...context,
      data: {
        benefitId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de transição inválida no workflow
 */
export function throwInvalidWorkflowTransition(
  benefitId: string,
  currentStatus: string,
  targetStatus: string,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'BENEFITS_WORKFLOW_INVALID_TRANSITION',
    {
      ...context,
      data: {
        benefitId,
        currentStatus,
        targetStatus,
        ...context.data,
      },
    },
    language,
  );
}

// ========================================
// HELPERS PARA INTEGRAÇÕES
// ========================================

/**
 * Lança erro de falha no upload para Azure Blob
 */
export function throwAzureBlobUploadFailed(
  fileName: string,
  error: Error,
  context: IntegrationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRATIONS_AZURE_BLOB_UPLOAD_FAILED',
    {
      ...context,
      cause: error,
      data: {
        service: 'Azure Blob Storage',
        fileName,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha no envio de email
 */
export function throwEmailSendFailed(
  recipient: string,
  error: Error,
  context: IntegrationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRATIONS_EMAIL_SEND_FAILED',
    {
      ...context,
      cause: error,
      data: {
        service: 'Email Service',
        recipient,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na conexão com banco de dados
 */
export function throwDatabaseConnectionFailed(
  error: Error,
  context: IntegrationErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRATIONS_DATABASE_CONNECTION_FAILED',
    {
      ...context,
      cause: error,
      data: {
        service: 'Database',
        ...context.data,
      },
    },
    language,
  );
}

// ========================================
// HELPERS PARA FLUXO OPERACIONAL
// ========================================

/**
 * Lança erro de permissão negada
 */
export function throwPermissionDenied(
  operation: string,
  userId: string,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'OPERATIONAL_FLOW_PERMISSION_DENIED',
    {
      ...context,
      userId,
      data: {
        operation,
        userId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documento obrigatório não fornecido
 */
export function throwDocumentRequired(
  documentType: string,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'OPERATIONAL_FLOW_DOCUMENT_REQUIRED',
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
 * Lança erro de prazo de aprovação excedido
 */
export function throwApprovalDeadlineExceeded(
  benefitId: string,
  deadline: Date,
  context: BenefitErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'OPERATIONAL_FLOW_APPROVAL_DEADLINE_EXCEEDED',
    {
      ...context,
      data: {
        benefitId,
        deadline: deadline.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

// ========================================
// HELPERS PARA SISTEMA
// ========================================

/**
 * Lança erro de violação de chave estrangeira
 */
export function throwForeignKeyViolation(
  table: string,
  constraint: string,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SYSTEM_FOREIGN_KEY_VIOLATION',
    {
      ...context,
      data: {
        table,
        constraint,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de violação de restrição de unicidade
 */
export function throwUniqueConstraintViolation(
  table: string,
  constraint: string,
  value: any,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SYSTEM_UNIQUE_CONSTRAINT_VIOLATION',
    {
      ...context,
      data: {
        table,
        constraint,
        value,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de limite de requisições excedido
 */
export function throwRateLimitExceeded(
  limit: number,
  windowMs: number,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SYSTEM_RATE_LIMIT_EXCEEDED',
    {
      ...context,
      data: {
        limit,
        windowMs,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de sistema em manutenção
 */
export function throwMaintenanceMode(
  estimatedEndTime?: Date,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SYSTEM_MAINTENANCE_MODE',
    {
      ...context,
      data: {
        estimatedEndTime: estimatedEndTime?.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

// ========================================
// HELPER GENÉRICO PARA POSTGRES
// ========================================

/**
 * Lança erro baseado em código PostgreSQL
 */
export function throwFromPostgresError(
  postgresCode: string,
  error: Error,
  context: ErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw AppError.fromPostgresError(
    postgresCode,
    {
      ...context,
      cause: error,
    },
    language,
  );
}
