/**
 * @fileoverview Domínio de Erros - UNIDADE
 *
 * Define códigos de erro específicos para operações relacionadas a unidades e setores.
 * Inclui validações de negócio, operações CRUD e integridade referencial.
 *
 * @module UnidadeErrors
 * @version 1.0.0
 */

import { AppError, ErrorContext } from '../AppError';
import { DomainErrorCode } from '../types';

// ========================================
// CÓDIGOS DE ERRO DO DOMÍNIO UNIDADE
// ========================================

/**
 * Códigos de erro específicos do domínio UNIDADE
 */
export const UNIDADE_ERROR_CODES = {
  // Erros de Unidade
  UNIDADE_NOT_FOUND: 'UNIDADE_NOT_FOUND' as DomainErrorCode,
  UNIDADE_ALREADY_EXISTS: 'UNIDADE_ALREADY_EXISTS' as DomainErrorCode,
  UNIDADE_OPERATION_FAILED: 'UNIDADE_OPERATION_FAILED' as DomainErrorCode,
  UNIDADE_INVALID_STATUS: 'UNIDADE_INVALID_STATUS' as DomainErrorCode,
  UNIDADE_INVALID_TYPE: 'UNIDADE_INVALID_TYPE' as DomainErrorCode,
  UNIDADE_HAS_DEPENDENCIES: 'UNIDADE_HAS_DEPENDENCIES' as DomainErrorCode,

  // Erros de Setor
  SETOR_NOT_FOUND: 'SETOR_NOT_FOUND' as DomainErrorCode,
  SETOR_ALREADY_EXISTS: 'SETOR_ALREADY_EXISTS' as DomainErrorCode,
  SETOR_OPERATION_FAILED: 'SETOR_OPERATION_FAILED' as DomainErrorCode,
  SETOR_INVALID_UNIDADE: 'SETOR_INVALID_UNIDADE' as DomainErrorCode,
  SETOR_HAS_DEPENDENCIES: 'SETOR_HAS_DEPENDENCIES' as DomainErrorCode,
} as const;

/**
 * Mensagens técnicas para logs e debugging
 */
export const UNIDADE_TECH_MESSAGES = {
  [UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND]:
    'Unidade não encontrada no banco de dados',
  [UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS]:
    'Unidade já existe com os dados fornecidos',
  [UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED]:
    'Falha na operação da unidade',
  [UNIDADE_ERROR_CODES.UNIDADE_INVALID_STATUS]: 'Status da unidade inválido',
  [UNIDADE_ERROR_CODES.UNIDADE_INVALID_TYPE]: 'Tipo da unidade inválido',
  [UNIDADE_ERROR_CODES.UNIDADE_HAS_DEPENDENCIES]:
    'Unidade possui dependências e não pode ser removida',
  [UNIDADE_ERROR_CODES.SETOR_NOT_FOUND]:
    'Setor não encontrado no banco de dados',
  [UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS]:
    'Setor já existe com os dados fornecidos',
  [UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED]: 'Falha na operação do setor',
  [UNIDADE_ERROR_CODES.SETOR_INVALID_UNIDADE]:
    'Unidade associada ao setor é inválida',
  [UNIDADE_ERROR_CODES.SETOR_HAS_DEPENDENCIES]:
    'Setor possui dependências e não pode ser removido',
} as const;

/**
 * Mensagens amigáveis para o usuário
 */
export const UNIDADE_USER_MESSAGES = {
  [UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND]: 'Unidade não encontrada',
  [UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS]:
    'Já existe uma unidade com estes dados',
  [UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED]:
    'Erro ao processar operação da unidade',
  [UNIDADE_ERROR_CODES.UNIDADE_INVALID_STATUS]: 'Status da unidade é inválido',
  [UNIDADE_ERROR_CODES.UNIDADE_INVALID_TYPE]: 'Tipo da unidade é inválido',
  [UNIDADE_ERROR_CODES.UNIDADE_HAS_DEPENDENCIES]:
    'Não é possível remover a unidade pois ela possui setores associados',
  [UNIDADE_ERROR_CODES.SETOR_NOT_FOUND]: 'Setor não encontrado',
  [UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS]:
    'Já existe um setor com estes dados',
  [UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED]:
    'Erro ao processar operação do setor',
  [UNIDADE_ERROR_CODES.SETOR_INVALID_UNIDADE]:
    'A unidade selecionada é inválida',
  [UNIDADE_ERROR_CODES.SETOR_HAS_DEPENDENCIES]:
    'Não é possível remover o setor pois ele possui dependências',
} as const;

// ========================================
// CONTEXTOS DE ERRO
// ========================================

/**
 * Contexto específico para erros de unidade
 */
export interface UnidadeErrorContext extends ErrorContext {
  unidadeId?: string;
  codigo?: string;
  nome?: string;
  tipo?: string;
  status?: string;
  /** Dados específicos do erro para interpolação na mensagem */
  data?: Record<string, any>;
  /** Causa raiz do erro (para encadeamento) */
  cause?: Error;
  /** Metadados adicionais para logging e debugging */
  metadata?: Record<string, any>;
  /** ID da requisição para rastreabilidade */
  requestId?: string;
  /** ID do usuário que causou o erro */
  userId?: string;
  /** Contexto operacional adicional */
  operationalContext?: {
    module?: string;
    operation?: string;
    entityId?: string;
    entityType?: string;
  };
}

/**
 * Contexto específico para erros de setor
 */
export interface SetorErrorContext extends ErrorContext {
  setorId?: string;
  unidadeId?: string;
  nome?: string;
  sigla?: string;
  /** Dados específicos do erro para interpolação na mensagem */
  data?: Record<string, any>;
  /** Causa raiz do erro (para encadeamento) */
  cause?: Error;
  /** Metadados adicionais para logging e debugging */
  metadata?: Record<string, any>;
  /** ID da requisição para rastreabilidade */
  requestId?: string;
  /** ID do usuário que causou o erro */
  userId?: string;
  /** Contexto operacional adicional */
  operationalContext?: {
    module?: string;
    operation?: string;
    entityId?: string;
    entityType?: string;
  };
}

// ========================================
// BUILDERS DE ERRO
// ========================================

/**
 * Builder para erros de validação de unidade
 */
export class UnidadeValidationErrorBuilder {
  private context: UnidadeErrorContext = {};

  withUnidadeId(unidadeId: string): this {
    this.context.unidadeId = unidadeId;
    return this;
  }

  withCodigo(codigo: string): this {
    this.context.codigo = codigo;
    return this;
  }

  withNome(nome: string): this {
    this.context.nome = nome;
    return this;
  }

  withTipo(tipo: string): this {
    this.context.tipo = tipo;
    return this;
  }

  withStatus(status: string): this {
    this.context.status = status;
    return this;
  }

  build(errorCode: DomainErrorCode): AppError {
    return new AppError(errorCode, this.context);
  }
}

/**
 * Builder para erros de validação de setor
 */
export class SetorValidationErrorBuilder {
  private context: SetorErrorContext = {};

  withSetorId(setorId: string): this {
    this.context.setorId = setorId;
    return this;
  }

  withUnidadeId(unidadeId: string): this {
    this.context.unidadeId = unidadeId;
    return this;
  }

  withNome(nome: string): this {
    this.context.nome = nome;
    return this;
  }

  withSigla(sigla: string): this {
    this.context.sigla = sigla;
    return this;
  }

  build(errorCode: DomainErrorCode): AppError {
    return new AppError(errorCode, this.context);
  }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Lança erro de unidade não encontrada
 */
export function throwUnidadeNotFound(unidadeId?: string): never {
  const builder = new UnidadeValidationErrorBuilder();
  if (unidadeId) {
    builder.withUnidadeId(unidadeId);
  }
  throw builder.build(UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND);
}

/**
 * Lança erro de unidade já existente
 */
export function throwUnidadeAlreadyExists(
  context?: Partial<UnidadeErrorContext>,
): never {
  const builder = new UnidadeValidationErrorBuilder();
  if (context?.codigo) {
    builder.withCodigo(context.codigo);
  }
  if (context?.nome) {
    builder.withNome(context.nome);
  }
  throw builder.build(UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS);
}

/**
 * Lança erro de operação de unidade falhada
 */
export function throwUnidadeOperationFailed(
  context?: Partial<UnidadeErrorContext>,
): never {
  const builder = new UnidadeValidationErrorBuilder();
  if (context?.unidadeId) {
    builder.withUnidadeId(context.unidadeId);
  }
  throw builder.build(UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED);
}

/**
 * Lança erro de setor não encontrado
 */
export function throwSetorNotFound(setorId?: string): never {
  const builder = new SetorValidationErrorBuilder();
  if (setorId) {
    builder.withSetorId(setorId);
  }
  throw builder.build(UNIDADE_ERROR_CODES.SETOR_NOT_FOUND);
}

/**
 * Lança erro de setor já existente
 */
export function throwSetorAlreadyExists(
  context?: Partial<SetorErrorContext>,
): never {
  const builder = new SetorValidationErrorBuilder();
  if (context?.nome) {
    builder.withNome(context.nome);
  }
  if (context?.sigla) {
    builder.withSigla(context.sigla);
  }
  if (context?.unidadeId) {
    builder.withUnidadeId(context.unidadeId);
  }
  throw builder.build(UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS);
}

/**
 * Lança erro de operação de setor falhada
 */
export function throwSetorOperationFailed(
  context?: Partial<SetorErrorContext>,
): never {
  const builder = new SetorValidationErrorBuilder();
  if (context?.setorId) {
    builder.withSetorId(context.setorId);
  }
  if (context?.unidadeId) {
    builder.withUnidadeId(context.unidadeId);
  }
  throw builder.build(UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED);
}

// ========================================
// DEFINIÇÕES DE ERRO PARA O CATÁLOGO
// ========================================

import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { HttpStatus } from '@nestjs/common';

/**
 * Catálogo de erros do domínio UNIDADE
 */
export const UNIDADE_ERRORS: Record<string, ErrorDefinition> = {
  [UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND]: {
    code: UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND],
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_NOT_FOUND],
      'en-US': 'Unit not found',
    },
  },
  [UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS]: {
    code: UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS],
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_ALREADY_EXISTS],
      'en-US': 'Unit already exists with this data',
    },
  },
  [UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED]: {
    code: UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED,
    message:
      UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED],
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_OPERATION_FAILED],
      'en-US': 'Error processing unit operation',
    },
  },
  [UNIDADE_ERROR_CODES.UNIDADE_INVALID_STATUS]: {
    code: UNIDADE_ERROR_CODES.UNIDADE_INVALID_STATUS,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_INVALID_STATUS],
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_INVALID_STATUS],
      'en-US': 'Unit status is invalid',
    },
  },
  [UNIDADE_ERROR_CODES.UNIDADE_INVALID_TYPE]: {
    code: UNIDADE_ERROR_CODES.UNIDADE_INVALID_TYPE,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_INVALID_TYPE],
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_INVALID_TYPE],
      'en-US': 'Unit type is invalid',
    },
  },
  [UNIDADE_ERROR_CODES.UNIDADE_HAS_DEPENDENCIES]: {
    code: UNIDADE_ERROR_CODES.UNIDADE_HAS_DEPENDENCIES,
    message:
      UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_HAS_DEPENDENCIES],
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.UNIDADE_HAS_DEPENDENCIES],
      'en-US': 'Cannot remove unit as it has associated sectors',
    },
  },
  [UNIDADE_ERROR_CODES.SETOR_NOT_FOUND]: {
    code: UNIDADE_ERROR_CODES.SETOR_NOT_FOUND,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_NOT_FOUND],
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_NOT_FOUND],
      'en-US': 'Sector not found',
    },
  },
  [UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS]: {
    code: UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS],
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_ALREADY_EXISTS],
      'en-US': 'Sector already exists with this data',
    },
  },
  [UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED]: {
    code: UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED],
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_OPERATION_FAILED],
      'en-US': 'Error processing sector operation',
    },
  },
  [UNIDADE_ERROR_CODES.SETOR_INVALID_UNIDADE]: {
    code: UNIDADE_ERROR_CODES.SETOR_INVALID_UNIDADE,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_INVALID_UNIDADE],
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_INVALID_UNIDADE],
      'en-US': 'Selected unit is invalid',
    },
  },
  [UNIDADE_ERROR_CODES.SETOR_HAS_DEPENDENCIES]: {
    code: UNIDADE_ERROR_CODES.SETOR_HAS_DEPENDENCIES,
    message: UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_HAS_DEPENDENCIES],
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        UNIDADE_USER_MESSAGES[UNIDADE_ERROR_CODES.SETOR_HAS_DEPENDENCIES],
      'en-US': 'Cannot remove sector as it has dependencies',
    },
  },
} as const;
