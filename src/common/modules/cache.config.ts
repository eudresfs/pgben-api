import { registerAs } from '@nestjs/config';

/**
 * Configuração de cache para filtros avançados
 * 
 * Define TTLs específicos, limites de memória e estratégias de invalidação
 */
export const cacheConfig = registerAs('cache', () => ({
  // Configurações gerais
  enabled: process.env.CACHE_ENABLED !== 'false',
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300000'), // 5 minutos
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
  compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'),
  
  // TTLs específicos por entidade (em milissegundos)
  filtros: {
    ttls: {
      // Dados que mudam frequentemente
      solicitacao: parseInt(process.env.CACHE_TTL_SOLICITACAO || '300000'), // 5 minutos
      pagamento: parseInt(process.env.CACHE_TTL_PAGAMENTO || '180000'), // 3 minutos
      auditoria: parseInt(process.env.CACHE_TTL_AUDITORIA || '120000'), // 2 minutos
      
      // Dados que mudam moderadamente
      cidadao: parseInt(process.env.CACHE_TTL_CIDADAO || '600000'), // 10 minutos
      documento: parseInt(process.env.CACHE_TTL_DOCUMENTO || '600000'), // 10 minutos
      
      // Dados que mudam pouco
      usuario: parseInt(process.env.CACHE_TTL_USUARIO || '900000'), // 15 minutos
      beneficio: parseInt(process.env.CACHE_TTL_BENEFICIO || '1800000'), // 30 minutos
      unidade: parseInt(process.env.CACHE_TTL_UNIDADE || '3600000'), // 1 hora
    },
    
    // Configurações específicas por tipo de operação
    operations: {
      count: {
        ttl: parseInt(process.env.CACHE_TTL_COUNT || '180000'), // 3 minutos
        enabled: process.env.CACHE_COUNT_ENABLED !== 'false',
      },
      list: {
        ttl: parseInt(process.env.CACHE_TTL_LIST || '300000'), // 5 minutos
        enabled: process.env.CACHE_LIST_ENABLED !== 'false',
        maxPageSize: parseInt(process.env.CACHE_MAX_PAGE_SIZE || '100'),
      },
      search: {
        ttl: parseInt(process.env.CACHE_TTL_SEARCH || '600000'), // 10 minutos
        enabled: process.env.CACHE_SEARCH_ENABLED !== 'false',
        minQueryLength: parseInt(process.env.CACHE_SEARCH_MIN_LENGTH || '3'),
      },
    },
    
    // Estratégias de invalidação
    invalidation: {
      // Invalidar automaticamente em operações de escrita
      onWrite: process.env.CACHE_INVALIDATE_ON_WRITE !== 'false',
      
      // Invalidar caches relacionados
      cascading: process.env.CACHE_CASCADING_INVALIDATION !== 'false',
      
      // Padrões de invalidação por entidade
      patterns: {
        solicitacao: [
          'filtros:solicitacao:*',
          'filtros:cidadao:*:solicitacao:*', // Invalidar caches de cidadão relacionados
        ],
        cidadao: [
          'filtros:cidadao:*',
          'filtros:solicitacao:*:cidadao:*', // Invalidar caches de solicitação relacionados
        ],
        usuario: [
          'filtros:usuario:*',
          'filtros:auditoria:*:usuario:*', // Invalidar caches de auditoria relacionados
        ],
        pagamento: [
          'filtros:pagamento:*',
          'filtros:solicitacao:*:pagamento:*',
        ],
        beneficio: [
          'filtros:beneficio:*',
          'filtros:solicitacao:*:beneficio:*',
        ],
        unidade: [
          'filtros:unidade:*',
          'filtros:usuario:*:unidade:*',
          'filtros:solicitacao:*:unidade:*',
        ],
        auditoria: [
          'filtros:auditoria:*',
        ],
        documento: [
          'filtros:documento:*',
          'filtros:solicitacao:*:documento:*',
        ],
      },
    },
    
    // Queries para warming do cache
    warmup: {
      enabled: process.env.CACHE_WARMUP_ENABLED !== 'false',
      interval: parseInt(process.env.CACHE_WARMUP_INTERVAL || '3600000'), // 1 hora
      queries: [
        // Solicitações mais comuns
        {
          entity: 'solicitacao',
          filters: { status: ['ativa', 'pendente'] },
          priority: 'high',
        },
        {
          entity: 'solicitacao',
          filters: { dataInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Últimos 30 dias
          priority: 'medium',
        },
        
        // Cidadãos ativos
        {
          entity: 'cidadao',
          filters: { ativo: true },
          priority: 'high',
        },
        
        // Usuários por perfil
        {
          entity: 'usuario',
          filters: { perfis: ['admin', 'operador'] },
          priority: 'medium',
        },
        
        // Pagamentos recentes
        {
          entity: 'pagamento',
          filters: { 
            status: ['processado', 'pendente'],
            dataInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
          },
          priority: 'medium',
        },
        
        // Benefícios ativos
        {
          entity: 'beneficio',
          filters: { ativo: true },
          priority: 'low',
        },
        
        // Unidades ativas
        {
          entity: 'unidade',
          filters: { ativa: true },
          priority: 'low',
        },
      ],
    },
  },
  
  // Configurações de Redis (se disponível)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'pgben:cache:',
    
    // Configurações de conexão
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
    lazyConnect: true,
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    
    // Pool de conexões
    family: 4,
    keepAlive: true,
    
    // Configurações específicas para cache
    cache: {
      // Serialização
      serializer: process.env.REDIS_SERIALIZER || 'json', // json, msgpack
      compression: process.env.REDIS_COMPRESSION === 'true',
      
      // Clustering (se aplicável)
      cluster: {
        enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
        nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
      },
    },
  },
  
  // Configurações de monitoramento
  monitoring: {
    enabled: process.env.CACHE_MONITORING_ENABLED !== 'false',
    
    // Métricas
    metrics: {
      enabled: process.env.CACHE_METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.CACHE_METRICS_INTERVAL || '60000'), // 1 minuto
      retention: parseInt(process.env.CACHE_METRICS_RETENTION || '86400000'), // 24 horas
    },
    
    // Alertas
    alerts: {
      enabled: process.env.CACHE_ALERTS_ENABLED !== 'false',
      thresholds: {
        hitRatio: parseFloat(process.env.CACHE_ALERT_HIT_RATIO || '0.8'), // 80%
        memoryUsage: parseFloat(process.env.CACHE_ALERT_MEMORY_USAGE || '0.9'), // 90%
        responseTime: parseInt(process.env.CACHE_ALERT_RESPONSE_TIME || '1000'), // 1s
      },
    },
    
    // Logging
    logging: {
      enabled: process.env.CACHE_LOGGING_ENABLED !== 'false',
      level: process.env.CACHE_LOG_LEVEL || 'info', // debug, info, warn, error
      logHits: process.env.CACHE_LOG_HITS === 'true',
      logMisses: process.env.CACHE_LOG_MISSES === 'true',
      logSets: process.env.CACHE_LOG_SETS === 'true',
      logDeletes: process.env.CACHE_LOG_DELETES === 'true',
    },
  },
  
  // Configurações de desenvolvimento
  development: {
    // Desabilitar cache em desenvolvimento
    disabled: process.env.NODE_ENV === 'development' && process.env.CACHE_DEV_DISABLED === 'true',
    
    // TTLs reduzidos para desenvolvimento
    shortTTL: process.env.NODE_ENV === 'development',
    
    // Debug detalhado
    debug: process.env.NODE_ENV === 'development' && process.env.CACHE_DEBUG === 'true',
    
    // Limpar cache na inicialização
    clearOnStart: process.env.NODE_ENV === 'development' && process.env.CACHE_CLEAR_ON_START === 'true',
  },
  
  // Configurações de produção
  production: {
    // Otimizações para produção
    optimized: process.env.NODE_ENV === 'production',
    
    // Compressão obrigatória
    forceCompression: process.env.NODE_ENV === 'production',
    
    // TTLs estendidos
    extendedTTL: process.env.NODE_ENV === 'production',
    
    // Warming automático
    autoWarmup: process.env.NODE_ENV === 'production',
  },
}));

/**
 * Tipos para configuração de cache
 */
export interface CacheConfigType {
  enabled: boolean;
  defaultTTL: number;
  maxSize: number;
  compressionThreshold: number;
  filtros: {
    ttls: Record<string, number>;
    operations: {
      count: { ttl: number; enabled: boolean };
      list: { ttl: number; enabled: boolean; maxPageSize: number };
      search: { ttl: number; enabled: boolean; minQueryLength: number };
    };
    invalidation: {
      onWrite: boolean;
      cascading: boolean;
      patterns: Record<string, string[]>;
    };
    warmup: {
      enabled: boolean;
      interval: number;
      queries: Array<{
        entity: string;
        filters: any;
        priority: 'high' | 'medium' | 'low';
      }>;
    };
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    connectTimeout: number;
    lazyConnect: boolean;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    family: number;
    keepAlive: boolean;
    cache: {
      serializer: string;
      compression: boolean;
      cluster: {
        enabled: boolean;
        nodes: string[];
      };
    };
  };
  monitoring: {
    enabled: boolean;
    metrics: {
      enabled: boolean;
      interval: number;
      retention: number;
    };
    alerts: {
      enabled: boolean;
      thresholds: {
        hitRatio: number;
        memoryUsage: number;
        responseTime: number;
      };
    };
    logging: {
      enabled: boolean;
      level: string;
      logHits: boolean;
      logMisses: boolean;
      logSets: boolean;
      logDeletes: boolean;
    };
  };
  development: {
    disabled: boolean;
    shortTTL: boolean;
    debug: boolean;
    clearOnStart: boolean;
  };
  production: {
    optimized: boolean;
    forceCompression: boolean;
    extendedTTL: boolean;
    autoWarmup: boolean;
  };
}

/**
 * Validação da configuração de cache
 */
export function validateCacheConfig(config: any): void {
  const errors: string[] = [];
  
  if (config.defaultTTL <= 0) {
    errors.push('defaultTTL deve ser maior que 0');
  }
  
  if (config.maxSize <= 0) {
    errors.push('maxSize deve ser maior que 0');
  }
  
  if (config.compressionThreshold < 0) {
    errors.push('compressionThreshold deve ser maior ou igual a 0');
  }
  
  // Validar TTLs específicos
  for (const [entity, ttl] of Object.entries(config.filtros.ttls)) {
    if (typeof ttl !== 'number' || ttl <= 0) {
      errors.push(`TTL para ${entity} deve ser um número maior que 0`);
    }
  }
  
  // Validar configurações do Redis
  if (config.redis.enabled) {
    if (!config.redis.host) {
      errors.push('Redis host é obrigatório quando Redis está habilitado');
    }
    
    if (config.redis.port <= 0 || config.redis.port > 65535) {
      errors.push('Redis port deve estar entre 1 e 65535');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuração de cache inválida: ${errors.join(', ')}`);
  }
}

/**
 * Utilitários para configuração de cache
 */
export class CacheConfigUtils {
  /**
   * Obtém TTL para uma entidade específica
   */
  static getTTLForEntity(config: CacheConfigType, entity: string): number {
    return config.filtros.ttls[entity] || config.defaultTTL;
  }
  
  /**
   * Obtém TTL para um tipo de operação
   */
  static getTTLForOperation(config: CacheConfigType, operation: 'count' | 'list' | 'search'): number {
    return config.filtros.operations[operation].ttl;
  }
  
  /**
   * Verifica se uma operação está habilitada
   */
  static isOperationEnabled(config: CacheConfigType, operation: 'count' | 'list' | 'search'): boolean {
    return config.enabled && config.filtros.operations[operation].enabled;
  }
  
  /**
   * Obtém padrões de invalidação para uma entidade
   */
  static getInvalidationPatterns(config: CacheConfigType, entity: string): string[] {
    return config.filtros.invalidation.patterns[entity] || [`filtros:${entity}:*`];
  }
  
  /**
   * Verifica se o cache está habilitado para o ambiente atual
   */
  static isCacheEnabled(config: CacheConfigType): boolean {
    if (!config.enabled) return false;
    
    // Verificar se está desabilitado em desenvolvimento
    if (process.env.NODE_ENV === 'development' && config.development.disabled) {
      return false;
    }
    
    return true;
  }
}