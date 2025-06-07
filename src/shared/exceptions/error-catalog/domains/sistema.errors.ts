/**
 * Domínio de Erros: SISTEMA
 *
 * Define códigos de erro específicos para operações de sistema,
 * infraestrutura e funcionalidades técnicas do SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de sistema
 */
export interface SistemaErrorContext extends ErrorContext {
  data?: {
    recurso?: string;
    operacao?: string;
    tentativas?: number;
    limiteMaximo?: number;
    tempoEspera?: number;
    versaoSistema?: string;
    moduloAfetado?: string;
    codigoErro?: string;
    stackTrace?: string;
    memoryUsage?: number;
    diskSpace?: number;
    cpuUsage?: number;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos para sistema (SIS_1xxx)
 */
export const SISTEMA_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // SIS_1001-1010: RECURSOS E LIMITES
  // ========================================

  SIS_1001: {
    code: 'SIS_1001',
    message: 'Limite de requisições por minuto excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite de requisições por minuto foi excedido. Tente novamente em alguns instantes',
      'en-US': 'Request rate limit per minute exceeded. Please try again in a few moments',
    },
  },

  SIS_1002: {
    code: 'SIS_1002',
    message: 'Memória do sistema insuficiente',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Memória do sistema insuficiente para processar a solicitação',
      'en-US': 'Insufficient system memory to process the request',
    },
  },

  SIS_1003: {
    code: 'SIS_1003',
    message: 'Espaço em disco insuficiente',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Espaço em disco insuficiente para armazenar dados',
      'en-US': 'Insufficient disk space to store data',
    },
  },

  SIS_1004: {
    code: 'SIS_1004',
    message: 'CPU sobrecarregada',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Sistema temporariamente sobrecarregado. Tente novamente em alguns instantes',
      'en-US': 'System temporarily overloaded. Please try again in a few moments',
    },
  },

  SIS_1005: {
    code: 'SIS_1005',
    message: 'Limite de conexões simultâneas excedido',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite de conexões simultâneas foi excedido',
      'en-US': 'Simultaneous connections limit has been exceeded',
    },
  },

  // ========================================
  // SIS_1011-1020: MANUTENÇÃO E DISPONIBILIDADE
  // ========================================

  SIS_1011: {
    code: 'SIS_1011',
    message: 'Sistema em modo de manutenção',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Sistema está temporariamente em manutenção. Tente novamente mais tarde',
      'en-US': 'System is temporarily under maintenance. Please try again later',
    },
  },

  SIS_1012: {
    code: 'SIS_1012',
    message: 'Módulo do sistema indisponível',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Módulo do sistema está temporariamente indisponível',
      'en-US': 'System module is temporarily unavailable',
    },
  },

  SIS_1013: {
    code: 'SIS_1013',
    message: 'Versão do sistema incompatível',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Versão do sistema não é compatível com a operação solicitada',
      'en-US': 'System version is not compatible with the requested operation',
    },
  },

  SIS_1014: {
    code: 'SIS_1014',
    message: 'Atualização do sistema em andamento',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Atualização do sistema em andamento. Serviço temporariamente indisponível',
      'en-US': 'System update in progress. Service temporarily unavailable',
    },
  },

  // ========================================
  // SIS_1021-1030: CACHE E PERFORMANCE
  // ========================================

  SIS_1021: {
    code: 'SIS_1021',
    message: 'Falha no sistema de cache',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Falha no sistema de cache. Performance pode estar reduzida',
      'en-US': 'Cache system failure. Performance may be reduced',
    },
  },

  SIS_1022: {
    code: 'SIS_1022',
    message: 'Cache expirado ou inválido',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.LOW,
    localizedMessages: {
      'pt-BR': 'Cache expirado ou inválido. Dados serão recarregados',
      'en-US': 'Cache expired or invalid. Data will be reloaded',
    },
  },

  SIS_1023: {
    code: 'SIS_1023',
    message: 'Timeout na operação de sistema',
    httpStatus: HttpStatus.REQUEST_TIMEOUT,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tempo limite excedido na operação do sistema',
      'en-US': 'System operation timeout exceeded',
    },
  },

  // ========================================
  // SIS_1031-1040: LOGS E AUDITORIA
  // ========================================

  SIS_1031: {
    code: 'SIS_1031',
    message: 'Falha na gravação de logs',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Falha na gravação de logs do sistema',
      'en-US': 'System log writing failure',
    },
  },

  SIS_1032: {
    code: 'SIS_1032',
    message: 'Sistema de auditoria indisponível',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Sistema de auditoria está indisponível',
      'en-US': 'Audit system is unavailable',
    },
  },

  SIS_1033: {
    code: 'SIS_1033',
    message: 'Falha na rotação de logs',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.LOW,
    localizedMessages: {
      'pt-BR': 'Falha na rotação automática de logs',
      'en-US': 'Automatic log rotation failure',
    },
  },

  // ========================================
  // SIS_1041-1050: BACKUP E RECUPERAÇÃO
  // ========================================

  SIS_1041: {
    code: 'SIS_1041',
    message: 'Falha no processo de backup',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha no processo de backup do sistema',
      'en-US': 'System backup process failure',
    },
  },

  SIS_1042: {
    code: 'SIS_1042',
    message: 'Backup corrompido ou ilegível',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Arquivo de backup está corrompido ou ilegível',
      'en-US': 'Backup file is corrupted or unreadable',
    },
  },

  SIS_1043: {
    code: 'SIS_1043',
    message: 'Falha na recuperação de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha no processo de recuperação de dados',
      'en-US': 'Data recovery process failure',
    },
  },

  // ========================================
  // SIS_1051-1060: SEGURANÇA E CRIPTOGRAFIA
  // ========================================

  SIS_1051: {
    code: 'SIS_1051',
    message: 'Falha na criptografia de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha no processo de criptografia de dados',
      'en-US': 'Data encryption process failure',
    },
  },

  SIS_1052: {
    code: 'SIS_1052',
    message: 'Chave de criptografia inválida ou expirada',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Chave de criptografia é inválida ou está expirada',
      'en-US': 'Encryption key is invalid or expired',
    },
  },

  SIS_1053: {
    code: 'SIS_1053',
    message: 'Falha na descriptografia de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha no processo de descriptografia de dados',
      'en-US': 'Data decryption process failure',
    },
  },

  SIS_1054: {
    code: 'SIS_1054',
    message: 'Certificado digital inválido ou expirado',
    httpStatus: HttpStatus.UNAUTHORIZED,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certificado digital é inválido ou está expirado',
      'en-US': 'Digital certificate is invalid or expired',
    },
  },

  // ========================================
  // SIS_1061-1070: CONFIGURAÇÃO E AMBIENTE
  // ========================================

  SIS_1061: {
    code: 'SIS_1061',
    message: 'Configuração de ambiente inválida',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Configuração do ambiente do sistema é inválida',
      'en-US': 'System environment configuration is invalid',
    },
  },

  SIS_1062: {
    code: 'SIS_1062',
    message: 'Variável de ambiente obrigatória ausente',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Variável de ambiente obrigatória não foi definida',
      'en-US': 'Required environment variable is not defined',
    },
  },

  SIS_1063: {
    code: 'SIS_1063',
    message: 'Falha na inicialização do sistema',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Falha crítica na inicialização do sistema',
      'en-US': 'Critical failure in system initialization',
    },
  },

  SIS_1064: {
    code: 'SIS_1064',
    message: 'Dependência externa não disponível',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Dependência externa necessária não está disponível',
      'en-US': 'Required external dependency is not available',
    },
  },
};

// ========================================
// HELPERS PARA SISTEMA
// ========================================

/**
 * Lança erro de limite de requisições excedido
 */
export function throwLimiteRequisoesExcedido(
  tentativas: number,
  limiteMaximo: number,
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SIS_1001',
    {
      ...context,
      data: {
        tentativas,
        limiteMaximo,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de sistema em manutenção
 */
export function throwSistemaEmManutencao(
  tempoEspera?: number,
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SIS_1011',
    {
      ...context,
      data: {
        tempoEspera,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de módulo indisponível
 */
export function throwModuloIndisponivel(
  moduloAfetado: string,
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SIS_1012',
    {
      ...context,
      data: {
        moduloAfetado,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de recursos insuficientes
 */
export function throwRecursosInsuficientes(
  recurso: 'memoria' | 'disco' | 'cpu',
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    memoria: 'SIS_1002',
    disco: 'SIS_1003',
    cpu: 'SIS_1004',
  };

  throw new AppError(
    errorCodes[recurso],
    {
      ...context,
      data: {
        recurso,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na criptografia
 */
export function throwFalhaCriptografia(
  operacao: 'criptografia' | 'descriptografia',
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  const errorCodes = {
    criptografia: 'SIS_1051',
    descriptografia: 'SIS_1053',
  };

  throw new AppError(
    errorCodes[operacao],
    {
      ...context,
      data: {
        operacao,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de configuração inválida
 */
export function throwConfiguracaoInvalida(
  configuracao: string,
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SIS_1061',
    {
      ...context,
      data: {
        configuracao,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de timeout de sistema
 */
export function throwTimeoutSistema(
  operacao: string,
  tempoEspera: number,
  context: SistemaErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'SIS_1023',
    {
      ...context,
      data: {
        operacao,
        tempoEspera,
        ...context.data,
      },
    },
    language,
  );
}