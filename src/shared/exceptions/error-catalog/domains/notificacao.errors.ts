/**
 * Domínio de Erros: NOTIFICACAO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de notificações do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de notificação
 */
export interface NotificacaoErrorContext extends ErrorContext {
  data?: {
    notificacaoId?: string;
    userId?: string;
    cidadaoId?: string;
    tipoNotificacao?: string;
    canal?: string;
    destinatario?: string;
    assunto?: string;
    conteudo?: string;
    templateId?: string;
    agendamento?: string;
    tentativasEnvio?: number;
    ultimoErro?: string;
    statusEntrega?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio NOTIFICACAO
 */
export const NOTIFICACAO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  NOTIFICACAO_NOT_FOUND: {
    code: 'NOTIFICACAO_NOT_FOUND',
    message: 'Notificação não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Notificação não encontrada no sistema',
      'en-US': 'Notification not found in the system',
    },
  },

  NOTIFICACAO_TEMPLATE_NOT_FOUND: {
    code: 'NOTIFICACAO_TEMPLATE_NOT_FOUND',
    message: 'Template de notificação não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Template de notificação não encontrado',
      'en-US': 'Notification template not found',
    },
  },

  NOTIFICACAO_CREATION_FAILED: {
    code: 'NOTIFICACAO_CREATION_FAILED',
    message: 'Falha na criação da notificação',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao criar notificação',
      'en-US': 'Error creating notification',
    },
  },

  NOTIFICACAO_UPDATE_FAILED: {
    code: 'NOTIFICACAO_UPDATE_FAILED',
    message: 'Falha na atualização da notificação',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao atualizar notificação',
      'en-US': 'Error updating notification',
    },
  },

  NOTIFICACAO_DELETE_FAILED: {
    code: 'NOTIFICACAO_DELETE_FAILED',
    message: 'Falha na exclusão da notificação',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao excluir notificação',
      'en-US': 'Error deleting notification',
    },
  },

  // ========================================
  // VALIDAÇÕES DE DADOS
  // ========================================

  NOTIFICACAO_INVALID_TYPE: {
    code: 'NOTIFICACAO_INVALID_TYPE',
    message: 'Tipo de notificação inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de notificação especificado é inválido',
      'en-US': 'Specified notification type is invalid',
    },
  },

  NOTIFICACAO_INVALID_CHANNEL: {
    code: 'NOTIFICACAO_INVALID_CHANNEL',
    message: 'Canal de notificação inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Canal de notificação especificado é inválido',
      'en-US': 'Specified notification channel is invalid',
    },
  },

  NOTIFICACAO_INVALID_RECIPIENT: {
    code: 'NOTIFICACAO_INVALID_RECIPIENT',
    message: 'Destinatário inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Destinatário da notificação é inválido',
      'en-US': 'Notification recipient is invalid',
    },
  },

  NOTIFICACAO_INVALID_EMAIL: {
    code: 'NOTIFICACAO_INVALID_EMAIL',
    message: 'Email inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Endereço de email é inválido',
      'en-US': 'Email address is invalid',
    },
  },

  NOTIFICACAO_INVALID_PHONE: {
    code: 'NOTIFICACAO_INVALID_PHONE',
    message: 'Telefone inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Número de telefone é inválido',
      'en-US': 'Phone number is invalid',
    },
  },

  NOTIFICACAO_EMPTY_CONTENT: {
    code: 'NOTIFICACAO_EMPTY_CONTENT',
    message: 'Conteúdo da notificação vazio',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Conteúdo da notificação não pode estar vazio',
      'en-US': 'Notification content cannot be empty',
    },
  },

  NOTIFICACAO_CONTENT_TOO_LONG: {
    code: 'NOTIFICACAO_CONTENT_TOO_LONG',
    message: 'Conteúdo da notificação muito longo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Conteúdo da notificação excede o limite de caracteres',
      'en-US': 'Notification content exceeds character limit',
    },
  },

  NOTIFICACAO_INVALID_SCHEDULE: {
    code: 'NOTIFICACAO_INVALID_SCHEDULE',
    message: 'Agendamento inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Data/hora de agendamento é inválida',
      'en-US': 'Schedule date/time is invalid',
    },
  },

  // ========================================
  // ENVIO DE NOTIFICAÇÕES
  // ========================================

  NOTIFICACAO_SEND_FAILED: {
    code: 'NOTIFICACAO_SEND_FAILED',
    message: 'Falha no envio da notificação',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao enviar notificação',
      'en-US': 'Error sending notification',
    },
  },

  NOTIFICACAO_EMAIL_SEND_FAILED: {
    code: 'NOTIFICACAO_EMAIL_SEND_FAILED',
    message: 'Falha no envio de email',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao enviar email',
      'en-US': 'Error sending email',
    },
  },

  NOTIFICACAO_SMS_SEND_FAILED: {
    code: 'NOTIFICACAO_SMS_SEND_FAILED',
    message: 'Falha no envio de SMS',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao enviar SMS',
      'en-US': 'Error sending SMS',
    },
  },

  NOTIFICACAO_PUSH_SEND_FAILED: {
    code: 'NOTIFICACAO_PUSH_SEND_FAILED',
    message: 'Falha no envio de push notification',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao enviar push notification',
      'en-US': 'Error sending push notification',
    },
  },

  NOTIFICACAO_DELIVERY_FAILED: {
    code: 'NOTIFICACAO_DELIVERY_FAILED',
    message: 'Falha na entrega da notificação',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha na entrega da notificação',
      'en-US': 'Notification delivery failed',
    },
  },

  NOTIFICACAO_BOUNCE_DETECTED: {
    code: 'NOTIFICACAO_BOUNCE_DETECTED',
    message: 'Bounce detectado no email',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Email retornou (bounce detectado)',
      'en-US': 'Email bounced (bounce detected)',
    },
  },

  NOTIFICACAO_SPAM_DETECTED: {
    code: 'NOTIFICACAO_SPAM_DETECTED',
    message: 'Notificação marcada como spam',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Notificação foi marcada como spam',
      'en-US': 'Notification was marked as spam',
    },
  },

  // ========================================
  // TEMPLATES
  // ========================================

  NOTIFICACAO_TEMPLATE_INVALID: {
    code: 'NOTIFICACAO_TEMPLATE_INVALID',
    message: 'Template de notificação inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Template de notificação é inválido',
      'en-US': 'Notification template is invalid',
    },
  },

  NOTIFICACAO_TEMPLATE_COMPILATION_FAILED: {
    code: 'NOTIFICACAO_TEMPLATE_COMPILATION_FAILED',
    message: 'Falha na compilação do template',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao compilar template de notificação',
      'en-US': 'Error compiling notification template',
    },
  },

  NOTIFICACAO_TEMPLATE_VARIABLES_MISSING: {
    code: 'NOTIFICACAO_TEMPLATE_VARIABLES_MISSING',
    message: 'Variáveis do template ausentes',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Variáveis obrigatórias do template estão ausentes',
      'en-US': 'Required template variables are missing',
    },
  },

  NOTIFICACAO_TEMPLATE_SYNTAX_ERROR: {
    code: 'NOTIFICACAO_TEMPLATE_SYNTAX_ERROR',
    message: 'Erro de sintaxe no template',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro de sintaxe no template de notificação',
      'en-US': 'Syntax error in notification template',
    },
  },

  // ========================================
  // PREFERÊNCIAS E CONFIGURAÇÕES
  // ========================================

  NOTIFICACAO_USER_OPTED_OUT: {
    code: 'NOTIFICACAO_USER_OPTED_OUT',
    message: 'Usuário optou por não receber notificações',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Usuário optou por não receber este tipo de notificação',
      'en-US': 'User opted out of this type of notification',
    },
  },

  NOTIFICACAO_CHANNEL_DISABLED: {
    code: 'NOTIFICACAO_CHANNEL_DISABLED',
    message: 'Canal de notificação desabilitado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Canal de notificação está desabilitado',
      'en-US': 'Notification channel is disabled',
    },
  },

  NOTIFICACAO_FREQUENCY_LIMIT_EXCEEDED: {
    code: 'NOTIFICACAO_FREQUENCY_LIMIT_EXCEEDED',
    message: 'Limite de frequência excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite de frequência de notificações excedido',
      'en-US': 'Notification frequency limit exceeded',
    },
  },

  NOTIFICACAO_QUIET_HOURS: {
    code: 'NOTIFICACAO_QUIET_HOURS',
    message: 'Horário de silêncio ativo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.LOW,
    localizedMessages: {
      'pt-BR': 'Notificação bloqueada devido ao horário de silêncio',
      'en-US': 'Notification blocked due to quiet hours',
    },
  },

  // ========================================
  // INTEGRAÇÃO COM SERVIÇOS EXTERNOS
  // ========================================

  NOTIFICACAO_SMTP_CONNECTION_FAILED: {
    code: 'NOTIFICACAO_SMTP_CONNECTION_FAILED',
    message: 'Falha na conexão SMTP',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha na conexão com servidor SMTP',
      'en-US': 'Failed to connect to SMTP server',
    },
  },

  NOTIFICACAO_SMS_PROVIDER_FAILED: {
    code: 'NOTIFICACAO_SMS_PROVIDER_FAILED',
    message: 'Falha no provedor de SMS',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha no provedor de SMS',
      'en-US': 'SMS provider failure',
    },
  },

  NOTIFICACAO_PUSH_PROVIDER_FAILED: {
    code: 'NOTIFICACAO_PUSH_PROVIDER_FAILED',
    message: 'Falha no provedor de push notifications',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Falha no provedor de push notifications',
      'en-US': 'Push notification provider failure',
    },
  },

  NOTIFICACAO_API_QUOTA_EXCEEDED: {
    code: 'NOTIFICACAO_API_QUOTA_EXCEEDED',
    message: 'Cota da API excedida',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cota da API de notificações excedida',
      'en-US': 'Notification API quota exceeded',
    },
  },

  // ========================================
  // SEGURANÇA E PERMISSÕES
  // ========================================

  NOTIFICACAO_ACCESS_DENIED: {
    code: 'NOTIFICACAO_ACCESS_DENIED',
    message: 'Acesso negado à notificação',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para acessar esta notificação',
      'en-US': 'You do not have permission to access this notification',
    },
  },

  NOTIFICACAO_UNAUTHORIZED_SENDER: {
    code: 'NOTIFICACAO_UNAUTHORIZED_SENDER',
    message: 'Remetente não autorizado',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Remetente não autorizado para este tipo de notificação',
      'en-US': 'Sender not authorized for this type of notification',
    },
  },

  NOTIFICACAO_CONTENT_BLOCKED: {
    code: 'NOTIFICACAO_CONTENT_BLOCKED',
    message: 'Conteúdo bloqueado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR':
        'Conteúdo da notificação foi bloqueado por políticas de segurança',
      'en-US': 'Notification content was blocked by security policies',
    },
  },

  // ========================================
  // AGENDAMENTO E FILA
  // ========================================

  NOTIFICACAO_QUEUE_FULL: {
    code: 'NOTIFICACAO_QUEUE_FULL',
    message: 'Fila de notificações cheia',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Fila de notificações está cheia',
      'en-US': 'Notification queue is full',
    },
  },

  NOTIFICACAO_SCHEDULE_CONFLICT: {
    code: 'NOTIFICACAO_SCHEDULE_CONFLICT',
    message: 'Conflito de agendamento',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Conflito no agendamento da notificação',
      'en-US': 'Notification scheduling conflict',
    },
  },

  NOTIFICACAO_EXPIRED: {
    code: 'NOTIFICACAO_EXPIRED',
    message: 'Notificação expirada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Notificação expirou e não pode mais ser enviada',
      'en-US': 'Notification has expired and can no longer be sent',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA NOTIFICACAO
// ========================================

/**
 * Lança erro de notificação não encontrada
 */
export function throwNotificacaoNotFound(
  notificacaoId: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_NOT_FOUND',
    {
      ...context,
      data: {
        notificacaoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha no envio
 */
export function throwSendFailed(
  canal: string,
  destinatario: string,
  erro: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_SEND_FAILED',
    {
      ...context,
      data: {
        canal,
        destinatario,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de email inválido
 */
export function throwInvalidEmail(
  email: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_INVALID_EMAIL',
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
 * Lança erro de telefone inválido
 */
export function throwInvalidPhone(
  telefone: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_INVALID_PHONE',
    {
      ...context,
      data: {
        telefone,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de template não encontrado
 */
export function throwTemplateNotFound(
  templateId: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_TEMPLATE_NOT_FOUND',
    {
      ...context,
      data: {
        templateId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de variáveis do template ausentes
 */
export function throwTemplateVariablesMissing(
  variaveisAusentes: string[],
  templateId: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_TEMPLATE_VARIABLES_MISSING',
    {
      ...context,
      data: {
        variaveisAusentes,
        templateId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de usuário optou por não receber
 */
export function throwUserOptedOut(
  userId: string,
  tipoNotificacao: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_USER_OPTED_OUT',
    {
      ...context,
      data: {
        userId,
        tipoNotificacao,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de limite de frequência excedido
 */
export function throwFrequencyLimitExceeded(
  userId: string,
  tipoNotificacao: string,
  limiteAtual: number,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_FREQUENCY_LIMIT_EXCEEDED',
    {
      ...context,
      data: {
        userId,
        tipoNotificacao,
        limiteAtual,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na conexão SMTP
 */
export function throwSmtpConnectionFailed(
  servidor: string,
  porta: number,
  erro: string,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_SMTP_CONNECTION_FAILED',
    {
      ...context,
      data: {
        servidor,
        porta,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de cota da API excedida
 */
export function throwApiQuotaExceeded(
  provedor: string,
  cotaAtual: number,
  cotaMaxima: number,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_API_QUOTA_EXCEEDED',
    {
      ...context,
      data: {
        provedor,
        cotaAtual,
        cotaMaxima,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de fila cheia
 */
export function throwQueueFull(
  tamanhoAtual: number,
  capacidadeMaxima: number,
  context: NotificacaoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'NOTIFICACAO_QUEUE_FULL',
    {
      ...context,
      data: {
        tamanhoAtual,
        capacidadeMaxima,
        ...context.data,
      },
    },
    language,
  );
}
