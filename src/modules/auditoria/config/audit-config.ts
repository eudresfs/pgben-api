/**
 * AuditConfig
 *
 * Configurações centralizadas para o módulo de auditoria.
 * Define parâmetros de performance, filas, eventos e compliance.
 */

export interface AuditConfig {
  // Performance
  performance: {
    syncProcessingTimeoutMs: number;
    asyncProcessingTimeoutMs: number;
    batchSize: number;
    maxRetries: number;
  };

  // Filas BullMQ
  queues: {
    processing: {
      name: string;
      concurrency: number;
      removeOnComplete: number;
      removeOnFail: number;
    };
    batch: {
      name: string;
      concurrency: number;
      removeOnComplete: number;
      removeOnFail: number;
    };
    critical: {
      name: string;
      concurrency: number;
      removeOnComplete: number;
      removeOnFail: number;
      priority: number;
    };
    sensitive: {
      name: string;
      concurrency: number;
      removeOnComplete: number;
      removeOnFail: number;
      priority: number;
    };
  };

  // EventEmitter
  events: {
    maxListeners: number;
    wildcard: boolean;
    delimiter: string;
    verboseMemoryLeak: boolean;
  };

  // LGPD e Compliance
  compliance: {
    sensitiveFields: string[];
    retentionDays: number;
    encryptionEnabled: boolean;
    signatureEnabled: boolean;
  };

  // Compressão
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'deflate' | 'brotli';
    threshold: number; // bytes
  };

  // Monitoramento
  monitoring: {
    metricsEnabled: boolean;
    alertsEnabled: boolean;
    healthCheckInterval: number;
  };
}

export const defaultAuditConfig: AuditConfig = {
  performance: {
    syncProcessingTimeoutMs: 5, // <5ms para emissão síncrona
    asyncProcessingTimeoutMs: 100, // <100ms para processamento assíncrono
    batchSize: 100,
    maxRetries: 3,
  },

  queues: {
    processing: {
      name: 'auditoria',
      concurrency: 5,
      removeOnComplete: 100,
      removeOnFail: 50,
    },
    batch: {
      name: 'audit-batch-processing',
      concurrency: 2,
      removeOnComplete: 50,
      removeOnFail: 25,
    },
    critical: {
      name: 'audit-critical',
      concurrency: 10,
      removeOnComplete: 200,
      removeOnFail: 100,
      priority: 10,
    },
    sensitive: {
      name: 'audit-sensitive',
      concurrency: 3,
      removeOnComplete: 500,
      removeOnFail: 200,
      priority: 8,
    },
  },

  events: {
    maxListeners: 20,
    wildcard: false,
    delimiter: '.',
    verboseMemoryLeak: false,
  },

  compliance: {
    sensitiveFields: [
      'cpf',
      'rg',
      'email',
      'telefone',
      'endereco',
      'senha',
      'token',
      'cartao',
      'conta_bancaria',
      'pix',
      'biometria',
    ],
    retentionDays: 2555, // 7 anos conforme LGPD
    encryptionEnabled: true,
    signatureEnabled: true,
  },

  compression: {
    enabled: true,
    algorithm: 'gzip',
    threshold: 1024, // 1KB
  },

  monitoring: {
    metricsEnabled: true,
    alertsEnabled: true,
    healthCheckInterval: 30000, // 30 segundos
  },
};

/**
 * Factory para criar configuração de auditoria
 */
export function createAuditConfig(
  overrides?: Partial<AuditConfig>,
): AuditConfig {
  return {
    ...defaultAuditConfig,
    ...overrides,
    performance: {
      ...defaultAuditConfig.performance,
      ...overrides?.performance,
    },
    queues: {
      ...defaultAuditConfig.queues,
      ...overrides?.queues,
    },
    events: {
      ...defaultAuditConfig.events,
      ...overrides?.events,
    },
    compliance: {
      ...defaultAuditConfig.compliance,
      ...overrides?.compliance,
    },
    compression: {
      ...defaultAuditConfig.compression,
      ...overrides?.compression,
    },
    monitoring: {
      ...defaultAuditConfig.monitoring,
      ...overrides?.monitoring,
    },
  };
}
