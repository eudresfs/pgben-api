/**
 * Domínio de Erros: INTEGRADOR
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de integrações com sistemas externos do SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de integrador
 */
export interface IntegradorErrorContext extends ErrorContext {
  data?: {
    integradorId?: string;
    sistemaExterno?: string;
    endpoint?: string;
    metodo?: string;
    statusCode?: number;
    responseBody?: any;
    requestBody?: any;
    headers?: any;
    timeout?: number;
    tentativas?: number;
    maxTentativas?: number;
    tempoResposta?: number;
    certificado?: string;
    chaveApi?: string;
    versaoApi?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio INTEGRADOR
 */
export const INTEGRADOR_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  INTEGRADOR_NOT_FOUND: {
    code: 'INTEGRADOR_NOT_FOUND',
    message: 'Integrador não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Integrador não encontrado no sistema',
      'en-US': 'Integrator not found in the system',
    },
  },

  INTEGRADOR_CREATION_FAILED: {
    code: 'INTEGRADOR_CREATION_FAILED',
    message: 'Falha na criação do integrador',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao criar integrador',
      'en-US': 'Error creating integrator',
    },
  },

  INTEGRADOR_UPDATE_FAILED: {
    code: 'INTEGRADOR_UPDATE_FAILED',
    message: 'Falha na atualização do integrador',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao atualizar integrador',
      'en-US': 'Error updating integrator',
    },
  },

  INTEGRADOR_DELETE_FAILED: {
    code: 'INTEGRADOR_DELETE_FAILED',
    message: 'Falha na exclusão do integrador',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao excluir integrador',
      'en-US': 'Error deleting integrator',
    },
  },

  // ========================================
  // VALIDAÇÕES DE CONFIGURAÇÃO
  // ========================================

  INTEGRADOR_INVALID_CONFIG: {
    code: 'INTEGRADOR_INVALID_CONFIG',
    message: 'Configuração do integrador inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Configuração do integrador é inválida',
      'en-US': 'Integrator configuration is invalid',
    },
  },

  INTEGRADOR_MISSING_CREDENTIALS: {
    code: 'INTEGRADOR_MISSING_CREDENTIALS',
    message: 'Credenciais ausentes',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Credenciais de acesso não fornecidas',
      'en-US': 'Access credentials not provided',
    },
  },

  INTEGRADOR_INVALID_CREDENTIALS: {
    code: 'INTEGRADOR_INVALID_CREDENTIALS',
    message: 'Credenciais inválidas',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Credenciais de acesso são inválidas',
      'en-US': 'Access credentials are invalid',
    },
  },

  INTEGRADOR_INVALID_ENDPOINT: {
    code: 'INTEGRADOR_INVALID_ENDPOINT',
    message: 'Endpoint inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Endpoint especificado é inválido',
      'en-US': 'Specified endpoint is invalid',
    },
  },

  INTEGRADOR_INVALID_METHOD: {
    code: 'INTEGRADOR_INVALID_METHOD',
    message: 'Método HTTP inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Método HTTP especificado é inválido',
      'en-US': 'Specified HTTP method is invalid',
    },
  },

  INTEGRADOR_INVALID_HEADERS: {
    code: 'INTEGRADOR_INVALID_HEADERS',
    message: 'Headers inválidos',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Headers da requisição são inválidos',
      'en-US': 'Request headers are invalid',
    },
  },

  // ========================================
  // CONEXÃO E COMUNICAÇÃO
  // ========================================

  INTEGRADOR_CONNECTION_FAILED: {
    code: 'INTEGRADOR_CONNECTION_FAILED',
    message: 'Falha na conexão',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha ao conectar com sistema externo',
      'en-US': 'Failed to connect to external system',
    },
  },

  INTEGRADOR_TIMEOUT: {
    code: 'INTEGRADOR_TIMEOUT',
    message: 'Timeout na requisição',
    httpStatus: HttpStatus.REQUEST_TIMEOUT,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Timeout na comunicação com sistema externo',
      'en-US': 'Timeout in communication with external system',
    },
  },

  INTEGRADOR_NETWORK_ERROR: {
    code: 'INTEGRADOR_NETWORK_ERROR',
    message: 'Erro de rede',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro de rede na comunicação',
      'en-US': 'Network error in communication',
    },
  },

  INTEGRADOR_DNS_RESOLUTION_FAILED: {
    code: 'INTEGRADOR_DNS_RESOLUTION_FAILED',
    message: 'Falha na resolução DNS',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha na resolução DNS do sistema externo',
      'en-US': 'DNS resolution failure for external system',
    },
  },

  INTEGRADOR_SSL_ERROR: {
    code: 'INTEGRADOR_SSL_ERROR',
    message: 'Erro SSL/TLS',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro SSL/TLS na comunicação',
      'en-US': 'SSL/TLS error in communication',
    },
  },

  // ========================================
  // RESPOSTAS E STATUS CODES
  // ========================================

  INTEGRADOR_BAD_REQUEST: {
    code: 'INTEGRADOR_BAD_REQUEST',
    message: 'Requisição inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Requisição enviada é inválida',
      'en-US': 'Sent request is invalid',
    },
  },

  INTEGRADOR_UNAUTHORIZED: {
    code: 'INTEGRADOR_UNAUTHORIZED',
    message: 'Não autorizado',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Acesso não autorizado ao sistema externo',
      'en-US': 'Unauthorized access to external system',
    },
  },

  INTEGRADOR_FORBIDDEN: {
    code: 'INTEGRADOR_FORBIDDEN',
    message: 'Acesso proibido',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Acesso proibido ao recurso do sistema externo',
      'en-US': 'Forbidden access to external system resource',
    },
  },

  INTEGRADOR_NOT_FOUND_EXTERNAL: {
    code: 'INTEGRADOR_NOT_FOUND_EXTERNAL',
    message: 'Recurso não encontrado no sistema externo',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Recurso não encontrado no sistema externo',
      'en-US': 'Resource not found in external system',
    },
  },

  INTEGRADOR_RATE_LIMIT_EXCEEDED: {
    code: 'INTEGRADOR_RATE_LIMIT_EXCEEDED',
    message: 'Limite de requisições excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite de requisições do sistema externo excedido',
      'en-US': 'External system rate limit exceeded',
    },
  },

  INTEGRADOR_INTERNAL_SERVER_ERROR: {
    code: 'INTEGRADOR_INTERNAL_SERVER_ERROR',
    message: 'Erro interno do sistema externo',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro interno no sistema externo',
      'en-US': 'Internal error in external system',
    },
  },

  INTEGRADOR_SERVICE_UNAVAILABLE: {
    code: 'INTEGRADOR_SERVICE_UNAVAILABLE',
    message: 'Serviço indisponível',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Sistema externo temporariamente indisponível',
      'en-US': 'External system temporarily unavailable',
    },
  },

  // ========================================
  // PROCESSAMENTO DE DADOS
  // ========================================

  INTEGRADOR_INVALID_RESPONSE: {
    code: 'INTEGRADOR_INVALID_RESPONSE',
    message: 'Resposta inválida',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Resposta do sistema externo é inválida',
      'en-US': 'External system response is invalid',
    },
  },

  INTEGRADOR_RESPONSE_PARSING_FAILED: {
    code: 'INTEGRADOR_RESPONSE_PARSING_FAILED',
    message: 'Falha no parsing da resposta',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao processar resposta do sistema externo',
      'en-US': 'Error processing external system response',
    },
  },

  INTEGRADOR_DATA_TRANSFORMATION_FAILED: {
    code: 'INTEGRADOR_DATA_TRANSFORMATION_FAILED',
    message: 'Falha na transformação de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na transformação dos dados recebidos',
      'en-US': 'Error transforming received data',
    },
  },

  INTEGRADOR_DATA_VALIDATION_FAILED: {
    code: 'INTEGRADOR_DATA_VALIDATION_FAILED',
    message: 'Falha na validação de dados',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Dados recebidos não passaram na validação',
      'en-US': 'Received data failed validation',
    },
  },

  INTEGRADOR_MAPPING_ERROR: {
    code: 'INTEGRADOR_MAPPING_ERROR',
    message: 'Erro no mapeamento de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro no mapeamento dos dados',
      'en-US': 'Error in data mapping',
    },
  },

  // ========================================
  // RETRY E CIRCUIT BREAKER
  // ========================================

  INTEGRADOR_MAX_RETRIES_EXCEEDED: {
    code: 'INTEGRADOR_MAX_RETRIES_EXCEEDED',
    message: 'Máximo de tentativas excedido',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Máximo de tentativas de conexão excedido',
      'en-US': 'Maximum connection attempts exceeded',
    },
  },

  INTEGRADOR_CIRCUIT_BREAKER_OPEN: {
    code: 'INTEGRADOR_CIRCUIT_BREAKER_OPEN',
    message: 'Circuit breaker aberto',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Circuit breaker ativo - sistema externo indisponível',
      'en-US': 'Circuit breaker active - external system unavailable',
    },
  },

  INTEGRADOR_RETRY_FAILED: {
    code: 'INTEGRADOR_RETRY_FAILED',
    message: 'Falha nas tentativas de retry',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Todas as tentativas de retry falharam',
      'en-US': 'All retry attempts failed',
    },
  },

  // ========================================
  // SISTEMAS ESPECÍFICOS
  // ========================================

  INTEGRADOR_CADUNICO_ERROR: {
    code: 'INTEGRADOR_CADUNICO_ERROR',
    message: 'Erro na integração com CadÚnico',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na comunicação com CadÚnico',
      'en-US': 'Error communicating with CadÚnico',
    },
  },

  INTEGRADOR_SIAFI_ERROR: {
    code: 'INTEGRADOR_SIAFI_ERROR',
    message: 'Erro na integração com SIAFI',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na comunicação com SIAFI',
      'en-US': 'Error communicating with SIAFI',
    },
  },

  INTEGRADOR_RECEITA_FEDERAL_ERROR: {
    code: 'INTEGRADOR_RECEITA_FEDERAL_ERROR',
    message: 'Erro na integração com Receita Federal',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na comunicação com Receita Federal',
      'en-US': 'Error communicating with Federal Revenue',
    },
  },

  INTEGRADOR_BANCO_CENTRAL_ERROR: {
    code: 'INTEGRADOR_BANCO_CENTRAL_ERROR',
    message: 'Erro na integração com Banco Central',
    httpStatus: HttpStatus.BAD_GATEWAY,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro na comunicação com Banco Central',
      'en-US': 'Error communicating with Central Bank',
    },
  },

  // ========================================
  // SEGURANÇA E CERTIFICADOS
  // ========================================

  INTEGRADOR_CERTIFICATE_INVALID: {
    code: 'INTEGRADOR_CERTIFICATE_INVALID',
    message: 'Certificado inválido',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certificado digital é inválido',
      'en-US': 'Digital certificate is invalid',
    },
  },

  INTEGRADOR_CERTIFICATE_EXPIRED: {
    code: 'INTEGRADOR_CERTIFICATE_EXPIRED',
    message: 'Certificado expirado',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certificado digital expirado',
      'en-US': 'Digital certificate expired',
    },
  },

  INTEGRADOR_API_KEY_INVALID: {
    code: 'INTEGRADOR_API_KEY_INVALID',
    message: 'Chave de API inválida',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Chave de API é inválida',
      'en-US': 'API key is invalid',
    },
  },

  INTEGRADOR_API_KEY_EXPIRED: {
    code: 'INTEGRADOR_API_KEY_EXPIRED',
    message: 'Chave de API expirada',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Chave de API expirada',
      'en-US': 'API key expired',
    },
  },

  // ========================================
  // VERSIONAMENTO E COMPATIBILIDADE
  // ========================================

  INTEGRADOR_VERSION_MISMATCH: {
    code: 'INTEGRADOR_VERSION_MISMATCH',
    message: 'Incompatibilidade de versão',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Versão da API não é compatível',
      'en-US': 'API version is not compatible',
    },
  },

  INTEGRADOR_DEPRECATED_VERSION: {
    code: 'INTEGRADOR_DEPRECATED_VERSION',
    message: 'Versão depreciada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Versão da API está depreciada',
      'en-US': 'API version is deprecated',
    },
  },

  INTEGRADOR_UNSUPPORTED_OPERATION: {
    code: 'INTEGRADOR_UNSUPPORTED_OPERATION',
    message: 'Operação não suportada',
    httpStatus: HttpStatus.NOT_IMPLEMENTED,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Operação não é suportada pelo sistema externo',
      'en-US': 'Operation not supported by external system',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA INTEGRADOR
// ========================================

/**
 * Lança erro de integrador não encontrado
 */
export function throwIntegradorNotFound(
  integradorId: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_NOT_FOUND',
    {
      ...context,
      data: {
        integradorId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na conexão
 */
export function throwConnectionFailed(
  sistemaExterno: string,
  endpoint: string,
  erro: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_CONNECTION_FAILED',
    {
      ...context,
      data: {
        sistemaExterno,
        endpoint,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de timeout
 */
export function throwIntegradorTimeout(
  sistemaExterno: string,
  timeout: number,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_TIMEOUT',
    {
      ...context,
      data: {
        sistemaExterno,
        timeout,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de credenciais inválidas
 */
export function throwInvalidCredentials(
  sistemaExterno: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_INVALID_CREDENTIALS',
    {
      ...context,
      data: {
        sistemaExterno,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de resposta inválida
 */
export function throwInvalidResponse(
  sistemaExterno: string,
  statusCode: number,
  responseBody: any,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_INVALID_RESPONSE',
    {
      ...context,
      data: {
        sistemaExterno,
        statusCode,
        responseBody,
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
  sistemaExterno: string,
  limite: number,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_RATE_LIMIT_EXCEEDED',
    {
      ...context,
      data: {
        sistemaExterno,
        limite,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de máximo de tentativas excedido
 */
export function throwMaxRetriesExceeded(
  sistemaExterno: string,
  tentativas: number,
  maxTentativas: number,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_MAX_RETRIES_EXCEEDED',
    {
      ...context,
      data: {
        sistemaExterno,
        tentativas,
        maxTentativas,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de circuit breaker aberto
 */
export function throwCircuitBreakerOpen(
  sistemaExterno: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_CIRCUIT_BREAKER_OPEN',
    {
      ...context,
      data: {
        sistemaExterno,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de certificado inválido
 */
export function throwCertificateInvalid(
  certificado: string,
  motivo: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_CERTIFICATE_INVALID',
    {
      ...context,
      data: {
        certificado,
        motivo,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na transformação de dados
 */
export function throwDataTransformationFailed(
  sistemaExterno: string,
  dadosOriginais: any,
  erro: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_DATA_TRANSFORMATION_FAILED',
    {
      ...context,
      data: {
        sistemaExterno,
        dadosOriginais,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de incompatibilidade de versão
 */
export function throwVersionMismatch(
  sistemaExterno: string,
  versaoEsperada: string,
  versaoRecebida: string,
  context: IntegradorErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'INTEGRADOR_VERSION_MISMATCH',
    {
      ...context,
      data: {
        sistemaExterno,
        versaoEsperada,
        versaoRecebida,
        ...context.data,
      },
    },
    language,
  );
}
