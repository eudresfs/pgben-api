/**
 * Domínio de Erros: USUARIO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de usuários do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';
import { UsuarioErrorContext } from './types';

/**
 * Catálogo de erros específicos do domínio USUARIO
 */
export const USUARIO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // AUTENTICAÇÃO E ACESSO
  // ========================================

  // Teste simples primeiro
  TESTE_ERRO: {
    code: 'TESTE_ERRO',
    message: 'Teste',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
  },

  USUARIO_CREDENTIALS_INVALID: {
    code: 'USUARIO_CREDENTIALS_INVALID',
    message: 'Credenciais inválidas',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Email ou senha incorretos',
      'en-US': 'Invalid email or password',
    },
  },

  USUARIO_ACCOUNT_BLOCKED: {
    code: 'USUARIO_ACCOUNT_BLOCKED',
    message: 'Conta de usuário bloqueada',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Sua conta foi bloqueada. Entre em contato com o administrador.',
      'en-US':
        'Your account has been blocked. Please contact the administrator.',
    },
  },

  USUARIO_EMAIL_DUPLICATE: {
    code: 'USUARIO_EMAIL_DUPLICATE',
    message: 'Email já está em uso',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Este email já está cadastrado no sistema.',
      'en-US': 'This email is already registered in the system.',
    },
  },

  USUARIO_ACCOUNT_INACTIVE: {
    code: 'USUARIO_ACCOUNT_INACTIVE',
    message: 'Conta de usuário inativa',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Sua conta está inativa. Entre em contato com o administrador.',
      'en-US': 'Your account is inactive. Please contact the administrator.',
    },
  },

  USUARIO_FIRST_ACCESS_REQUIRED: {
    code: 'USUARIO_FIRST_ACCESS_REQUIRED',
    message: 'Primeiro acesso obrigatório',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'É necessário realizar o primeiro acesso e alterar a senha.',
      'en-US': 'First access is required and password must be changed.',
    },
  },

  USUARIO_NOT_IN_FIRST_ACCESS: {
    code: 'USUARIO_NOT_IN_FIRST_ACCESS',
    message: 'Usuário não está em primeiro acesso',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Usuário não está em primeiro acesso. Esta operação só é permitida para usuários que ainda não alteraram sua senha inicial.',
      'en-US': 'User is not in first access. This operation is only allowed for users who have not yet changed their initial password.',
    },
  },

  USUARIO_PASSWORD_EXPIRED: {
    code: 'USUARIO_PASSWORD_EXPIRED',
    message: 'Senha expirada',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Sua senha expirou. É necessário alterá-la.',
      'en-US': 'Your password has expired. It must be changed.',
    },
  },

  // ========================================
  // VALIDAÇÕES DE DADOS
  // ========================================

  USUARIO_MATRICULA_DUPLICATE: {
    code: 'USUARIO_MATRICULA_DUPLICATE',
    message: 'Matrícula já cadastrada',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Esta matrícula já está cadastrada no sistema',
      'en-US': 'This registration number is already registered in the system',
    },
  },

  USUARIO_EMAIL_INVALID_FORMAT: {
    code: 'USUARIO_EMAIL_INVALID_FORMAT',
    message: 'Formato de email inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Formato de email inválido',
      'en-US': 'Invalid email format',
    },
  },

  USUARIO_PASSWORD_WEAK: {
    code: 'USUARIO_PASSWORD_WEAK',
    message: 'Senha não atende aos critérios de segurança',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos',
      'en-US':
        'Password must have at least 8 characters, including uppercase, lowercase, numbers and symbols',
    },
  },

  USUARIO_PASSWORD_MISMATCH: {
    code: 'USUARIO_PASSWORD_MISMATCH',
    message: 'As senhas não coincidem',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'A nova senha e a confirmação da senha não coincidem',
      'en-US': 'New password and password confirmation do not match',
    },
  },

  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  USUARIO_NOT_FOUND: {
    code: 'USUARIO_NOT_FOUND',
    message: 'Usuário não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Usuário não encontrado no sistema',
      'en-US': 'User not found in the system',
    },
  },

  USUARIO_CANNOT_DELETE_SELF: {
    code: 'USUARIO_CANNOT_DELETE_SELF',
    message: 'Usuário não pode excluir a própria conta',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Você não pode excluir sua própria conta',
      'en-US': 'You cannot delete your own account',
    },
  },

  USUARIO_CANNOT_CHANGE_OWN_PROFILE: {
    code: 'USUARIO_CANNOT_CHANGE_OWN_PROFILE',
    message: 'Usuário não pode alterar o próprio perfil',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Você não pode alterar seu próprio perfil de acesso',
      'en-US': 'You cannot change your own access profile',
    },
  },

  // ========================================
  // PERMISSÕES E PERFIS
  // ========================================

  USUARIO_INSUFFICIENT_PERMISSIONS: {
    code: 'USUARIO_INSUFFICIENT_PERMISSIONS',
    message: 'Permissões insuficientes',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para realizar esta operação',
      'en-US': 'You do not have permission to perform this operation',
    },
  },

  USUARIO_PROFILE_NOT_FOUND: {
    code: 'USUARIO_PROFILE_NOT_FOUND',
    message: 'Perfil de usuário não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Perfil de usuário não encontrado',
      'en-US': 'User profile not found',
    },
  },

  USUARIO_UNIT_NOT_FOUND: {
    code: 'USUARIO_UNIT_NOT_FOUND',
    message: 'Unidade não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Unidade não encontrada no sistema',
      'en-US': 'Unit not found in the system',
    },
  },

  // ========================================
  // INTEGRAÇÃO E NOTIFICAÇÕES
  // ========================================

  USUARIO_EMAIL_SEND_FAILED: {
    code: 'USUARIO_EMAIL_SEND_FAILED',
    message: 'Falha no envio de email para usuário',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Erro ao enviar email. O usuário foi criado mas não recebeu as credenciais por email.',
      'en-US':
        'Email sending error. User was created but did not receive credentials by email.',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA USUÁRIO
// ========================================

/**
 * Lança erro de credenciais inválidas
 */
export function throwInvalidCredentials(
  email: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_CREDENTIALS_INVALID',
    {
      ...context,
      data: {
        email,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de conta bloqueada
 */
export function throwAccountBlocked(
  userId: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_ACCOUNT_BLOCKED',
    {
      ...context,
      data: {
        userId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de email duplicado
 */
export function throwDuplicateEmail(
  email: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_EMAIL_DUPLICATE',
    {
      ...context,
      data: {
        email,
        field: 'email',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de matrícula duplicada
 */
export function throwDuplicateMatricula(
  matricula: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_MATRICULA_DUPLICATE',
    {
      ...context,
      data: {
        matricula,
        field: 'matricula',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de usuário não encontrado
 */
export function throwUserNotFound(
  identifier: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_NOT_FOUND',
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
 * Lança erro de permissões insuficientes
 */
export function throwInsufficientPermissions(
  requiredPermission: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_INSUFFICIENT_PERMISSIONS',
    {
      ...context,
      data: {
        requiredPermission,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de senha fraca
 */
export function throwWeakPassword(
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_PASSWORD_WEAK',
    {
      ...context,
      data: {
        field: 'password',
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de primeiro acesso obrigatório
 */
export function throwFirstAccessRequired(
  userId: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_FIRST_ACCESS_REQUIRED',
    {
      ...context,
      data: {
        userId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro quando usuário não está em primeiro acesso
 */
export function throwNotInFirstAccess(
  userId: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_NOT_IN_FIRST_ACCESS',
    {
      ...context,
      data: {
        userId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de senhas não coincidentes
 */
export function throwPasswordMismatch(
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_PASSWORD_MISMATCH',
    {
      ...context,
      data: {
        field: 'confirmarSenha',
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
  email: string,
  context: UsuarioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'USUARIO_EMAIL_SEND_FAILED',
    {
      ...context,
      data: {
        email,
        ...context.data,
      },
    },
    language,
  );
}
