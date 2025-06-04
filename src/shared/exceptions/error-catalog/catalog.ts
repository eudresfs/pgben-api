/**
 * Catálogo Central de Erros do Sistema SEMTAS
 *
 * Este arquivo centraliza todas as definições de erro do sistema,
 * fornecendo códigos padronizados, mensagens localizadas e metadados
 * para tratamento consistente de exceções.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from './types';
import { DOMAIN_ERRORS } from './domains';

// Re-exportar tipos para compatibilidade
export { ErrorDefinition, ErrorCategory, ErrorSeverity } from './types';

/**
 * Catálogo principal de erros do sistema
 * Inclui erros básicos do sistema e todos os domínios específicos
 */
export const ERROR_CATALOG: Record<string, ErrorDefinition> = {
  // ========================================
  // ERROS DE DOMÍNIO
  // ========================================
  ...DOMAIN_ERRORS,

  // ========================================
  // ERROS BÁSICOS DO SISTEMA (LEGADO)
  // ========================================
  // ========================================
  // CATEGORIA: VALIDAÇÕES
  // ========================================

  // Validações de CPF
  VALIDATIONS_CPF_INVALID: {
    code: 'VALIDATIONS_CPF_INVALID',
    message: 'CPF inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'CPF informado é inválido',
      'en-US': 'Invalid CPF number',
    },
  },

  VALIDATIONS_CPF_DUPLICATE: {
    code: 'VALIDATIONS_CPF_DUPLICATE',
    message: 'CPF já cadastrado no sistema',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Este CPF já está cadastrado no sistema',
      'en-US': 'This CPF is already registered in the system',
    },
  },

  // Validações de NIS
  VALIDATIONS_NIS_INVALID: {
    code: 'VALIDATIONS_NIS_INVALID',
    message: 'NIS inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'NIS informado é inválido',
      'en-US': 'Invalid NIS number',
    },
  },

  VALIDATIONS_NIS_DUPLICATE: {
    code: 'VALIDATIONS_NIS_DUPLICATE',
    message: 'NIS já cadastrado no sistema',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Este NIS já está cadastrado no sistema',
      'en-US': 'This NIS is already registered in the system',
    },
  },

  // Validações de idade
  VALIDATIONS_AGE_INVALID: {
    code: 'VALIDATIONS_AGE_INVALID',
    message: 'Idade inválida para o benefício',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Idade não atende aos critérios do benefício',
      'en-US': 'Age does not meet benefit criteria',
    },
  },

  // Validações de renda
  VALIDATIONS_INCOME_INVALID: {
    code: 'VALIDATIONS_INCOME_INVALID',
    message: 'Renda familiar inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Renda familiar informada é inválida',
      'en-US': 'Invalid family income',
    },
  },

  VALIDATIONS_INCOME_EXCEEDS_LIMIT: {
    code: 'VALIDATIONS_INCOME_EXCEEDS_LIMIT',
    message: 'Renda familiar excede o limite permitido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Renda familiar excede o limite permitido para o benefício',
      'en-US': 'Family income exceeds the allowed limit for the benefit',
    },
    legalReference: 'Lei Municipal nº XXX/XXXX',
  },

  // ========================================
  // CATEGORIA: BENEFÍCIOS
  // ========================================

  // Auxílio Natalidade
  BENEFITS_NATALIDADE_ALREADY_RECEIVED: {
    code: 'BENEFITS_NATALIDADE_ALREADY_RECEIVED',
    message: 'Auxílio natalidade já recebido para este nascimento',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Auxílio natalidade já foi concedido para este nascimento',
      'en-US': 'Maternity benefit already granted for this birth',
    },
    legalReference: 'Decreto Municipal nº XXX/XXXX',
  },

  BENEFITS_NATALIDADE_BIRTH_DATE_INVALID: {
    code: 'BENEFITS_NATALIDADE_BIRTH_DATE_INVALID',
    message: 'Data de nascimento inválida para auxílio natalidade',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Data de nascimento deve ser recente para solicitar auxílio natalidade',
      'en-US': 'Birth date must be recent to request maternity benefit',
    },
  },

  // Aluguel Social
  BENEFITS_ALUGUEL_ALREADY_ACTIVE: {
    code: 'BENEFITS_ALUGUEL_ALREADY_ACTIVE',
    message: 'Cidadão já possui aluguel social ativo',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cidadão já possui um benefício de aluguel social ativo',
      'en-US': 'Citizen already has an active social rent benefit',
    },
  },

  BENEFITS_ALUGUEL_PROPERTY_INVALID: {
    code: 'BENEFITS_ALUGUEL_PROPERTY_INVALID',
    message: 'Imóvel não atende aos critérios do aluguel social',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Imóvel não atende aos critérios estabelecidos para aluguel social',
      'en-US': 'Property does not meet social rent criteria',
    },
  },

  // Benefícios gerais
  BENEFITS_NOT_FOUND: {
    code: 'BENEFITS_NOT_FOUND',
    message: 'Benefício não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Benefício não encontrado no sistema',
      'en-US': 'Benefit not found in the system',
    },
  },

  BENEFITS_WORKFLOW_INVALID_TRANSITION: {
    code: 'BENEFITS_WORKFLOW_INVALID_TRANSITION',
    message: 'Transição de status inválida no workflow',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.BENEFITS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR':
        'Não é possível alterar o status do benefício para o estado solicitado',
      'en-US': 'Cannot change benefit status to the requested state',
    },
  },

  // ========================================
  // CATEGORIA: INTEGRAÇÕES
  // ========================================

  INTEGRATIONS_AZURE_BLOB_UPLOAD_FAILED: {
    code: 'INTEGRATIONS_AZURE_BLOB_UPLOAD_FAILED',
    message: 'Falha no upload para Azure Blob Storage',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao fazer upload do arquivo. Tente novamente.',
      'en-US': 'File upload error. Please try again.',
    },
  },

  INTEGRATIONS_EMAIL_SEND_FAILED: {
    code: 'INTEGRATIONS_EMAIL_SEND_FAILED',
    message: 'Falha no envio de email',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao enviar email. O processo continuará normalmente.',
      'en-US': 'Email sending error. The process will continue normally.',
    },
  },

  INTEGRATIONS_DATABASE_CONNECTION_FAILED: {
    code: 'INTEGRATIONS_DATABASE_CONNECTION_FAILED',
    message: 'Falha na conexão com banco de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Erro interno do sistema. Tente novamente em alguns minutos.',
      'en-US': 'Internal system error. Please try again in a few minutes.',
    },
  },

  // ========================================
  // CATEGORIA: FLUXO OPERACIONAL
  // ========================================

  OPERATIONAL_FLOW_PERMISSION_DENIED: {
    code: 'OPERATIONAL_FLOW_PERMISSION_DENIED',
    message: 'Permissão negada para esta operação',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para realizar esta operação',
      'en-US': 'You do not have permission to perform this operation',
    },
  },

  OPERATIONAL_FLOW_DOCUMENT_REQUIRED: {
    code: 'OPERATIONAL_FLOW_DOCUMENT_REQUIRED',
    message: 'Documento obrigatório não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documento obrigatório não foi fornecido',
      'en-US': 'Required document was not provided',
    },
  },

  OPERATIONAL_FLOW_APPROVAL_DEADLINE_EXCEEDED: {
    code: 'OPERATIONAL_FLOW_APPROVAL_DEADLINE_EXCEEDED',
    message: 'Prazo para aprovação excedido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Prazo para aprovação do benefício foi excedido',
      'en-US': 'Benefit approval deadline has been exceeded',
    },
    legalReference: 'Portaria SEMTAS nº XXX/XXXX',
  },

  // ========================================
  // CATEGORIA: SISTEMA
  // ========================================

  SYSTEM_FOREIGN_KEY_VIOLATION: {
    code: 'SYSTEM_FOREIGN_KEY_VIOLATION',
    message: 'Violação de integridade referencial',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Operação não pode ser realizada devido a dependências existentes',
      'en-US': 'Operation cannot be performed due to existing dependencies',
    },
  },

  SYSTEM_UNIQUE_CONSTRAINT_VIOLATION: {
    code: 'SYSTEM_UNIQUE_CONSTRAINT_VIOLATION',
    message: 'Violação de restrição de unicidade',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Registro duplicado não é permitido',
      'en-US': 'Duplicate record is not allowed',
    },
  },

  SYSTEM_CHECK_CONSTRAINT_VIOLATION: {
    code: 'SYSTEM_CHECK_CONSTRAINT_VIOLATION',
    message: 'Violação de restrição de verificação',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Dados fornecidos não atendem às regras de validação',
      'en-US': 'Provided data does not meet validation rules',
    },
  },

  SYSTEM_NOT_NULL_VIOLATION: {
    code: 'SYSTEM_NOT_NULL_VIOLATION',
    message: 'Campo obrigatório não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Campo obrigatório não foi fornecido',
      'en-US': 'Required field was not provided',
    },
  },

  SYSTEM_RATE_LIMIT_EXCEEDED: {
    code: 'SYSTEM_RATE_LIMIT_EXCEEDED',
    message: 'Limite de requisições excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Muitas requisições. Tente novamente em alguns minutos.',
      'en-US': 'Too many requests. Please try again in a few minutes.',
    },
  },

  SYSTEM_MAINTENANCE_MODE: {
    code: 'SYSTEM_MAINTENANCE_MODE',
    message: 'Sistema em manutenção',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Sistema temporariamente indisponível para manutenção',
      'en-US': 'System temporarily unavailable for maintenance',
    },
  },
};

/**
 * Mapas de códigos PostgreSQL para códigos do catálogo
 */
export const POSTGRES_ERROR_MAP: Record<string, string> = {
  '23503': 'SYSTEM_FOREIGN_KEY_VIOLATION',
  '23505': 'SYSTEM_UNIQUE_CONSTRAINT_VIOLATION',
  '23514': 'SYSTEM_CHECK_CONSTRAINT_VIOLATION',
  '23502': 'SYSTEM_NOT_NULL_VIOLATION',
};
