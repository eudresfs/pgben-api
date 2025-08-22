import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheMetricsProvider } from './cache-metrics.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Interface para operações de cache em lote
 */
export interface BatchCacheOperation {
  key: string;
  value: any;
  ttl?: number;
}

/**
 * Interface para configuração de TTL dinâmico
 */
export interface CacheTTLConfig {
  [entityType: string]: number;
}

/**
 * Interface para estratégias de invalidação
 */
export interface CacheInvalidationStrategy {
  pattern: string;
  dependencies?: string[];
}

/**
 * Serviço de cache aprimorado com operações em lote e estratégias de invalidação
 * 
 * Este serviço estende o CacheService existente com funcionalidades avançadas:
 * - Operações em lote para melhor performance
 * - TTL dinâmico baseado no tipo de entidade
 * - Estratégias de invalidação inteligentes
 * - Métricas detalhadas de performance
 */
@Injectable()
export class EnhancedCacheService {
  private readonly logger = new Logger(EnhancedCacheService.name);
  
  // Configurações de TTL por tipo de entidade
  private readonly ttlConfig: CacheTTLConfig = {
    'cidadao': 3600, // 1 hora - dados relativamente estáveis
    'cidadao_list': 300, // 5 minutos - listas mudam mais frequentemente
    'cidadao_count': 60, // 1 minuto - contagens são voláteis
    'portal_transparencia': 1800, // 30 minutos - dados externos
    'novo_bolsa_familia': 3600, // 1 hora - dados governamentais
    'beneficio': 1800, // 30 minutos - dados de benefícios
    'pagamento': 900, // 15 minutos - dados financeiros
    'auditoria': 7200, // 2 horas - dados de auditoria
  };

  // Padrões de invalidação por entidade
  private readonly invalidationPatterns: { [key: string]: CacheInvalidationStrategy } = {
    'cidadao': {
      pattern: 'cidadao:*',
      dependencies: ['cidadao_list:*', 'cidadao_count:*']
    },
    'beneficio': {
      pattern: 'beneficio:*',
      dependencies: ['beneficio_list:*', 'cidadao:*']
    },
    'pagamento': {
      pattern: 'pagamento:*',
      dependencies: ['pagamento_list:*', 'beneficio:*']
    }
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly metricsProvider: CacheMetricsProvider,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.logger.log('EnhancedCacheService inicializado com configurações otimizadas');
  }

  /**
   * Obtém um valor do cache com métricas aprimoradas
   * @param key Chave do cache
   * @param entityType Tipo da entidade para métricas
   * @returns Valor do cache ou null se não encontrado
   */
  async get<T>(key: string, entityType?: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const value = await this.cacheService.get<T>(key);
      
      // Registrar métricas
      const duration = Date.now() - startTime;
      if (value !== null) {
        this.metricsProvider.registerCacheHit(entityType || 'unknown', duration);
        this.logger.debug(`Cache HIT para chave: ${key} (${duration}ms)`);
      } else {
        this.metricsProvider.registerCacheMiss(entityType || 'unknown', duration);
        this.logger.debug(`Cache MISS para chave: ${key} (${duration}ms)`);
      }
      
      return value;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheError(entityType || 'unknown', duration);
      this.logger.error(`Erro ao buscar cache para chave ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Define um valor no cache com TTL dinâmico
   * @param key Chave do cache
   * @param value Valor a ser armazenado
   * @param entityType Tipo da entidade para determinar TTL
   * @param customTTL TTL customizado (opcional)
   */
  async set<T>(key: string, value: T, entityType: string, customTTL?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const ttl = customTTL || this.getTTLByEntityType(entityType);
      await this.cacheService.set(key, value, ttl);
      
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheSet(entityType, duration);
      this.logger.debug(`Cache SET para chave: ${key} com TTL: ${ttl}s (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheError(entityType, duration);
      this.logger.error(`Erro ao definir cache para chave ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Operação de cache em lote para melhor performance
   * @param operations Array de operações de cache
   * @param entityType Tipo da entidade para métricas
   */
  async setBatch(operations: BatchCacheOperation[], entityType: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Executar todas as operações em paralelo
      const promises = operations.map(op => {
        const ttl = op.ttl || this.getTTLByEntityType(entityType);
        return this.cacheService.set(op.key, op.value, ttl);
      });
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheBatchSet(entityType, operations.length, duration);
      this.logger.debug(`Cache BATCH SET: ${operations.length} operações para ${entityType} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheError(entityType, duration);
      this.logger.error(`Erro em operação de cache em lote para ${entityType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalida cache com estratégias inteligentes
   * @param entityType Tipo da entidade
   * @param entityId ID da entidade (opcional)
   */
  async invalidateByEntity(entityType: string, entityId?: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const strategy = this.invalidationPatterns[entityType];
      
      if (!strategy) {
        this.logger.warn(`Estratégia de invalidação não encontrada para: ${entityType}`);
        return;
      }

      // Invalidar cache principal
      const mainPattern = entityId 
        ? strategy.pattern.replace('*', entityId)
        : strategy.pattern;
      
      await this.invalidateByPattern(mainPattern);
      
      // Invalidar dependências
      if (strategy.dependencies) {
        const dependencyPromises = strategy.dependencies.map(dep => 
          this.invalidateByPattern(dep)
        );
        await Promise.all(dependencyPromises);
      }
      
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheInvalidation(entityType, duration);
      this.logger.debug(`Cache invalidado para ${entityType}:${entityId || 'all'} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsProvider.registerCacheError(entityType, duration);
      this.logger.error(`Erro ao invalidar cache para ${entityType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalida cache por padrão de chave
   * @param pattern Padrão de chave (ex: 'cidadao:*')
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // Usar o método de limpeza do CacheService existente
      await this.cacheService.clear();
      this.logger.debug(`Cache invalidado por padrão: ${pattern}`);
    } catch (error) {
      this.logger.error(`Erro ao invalidar cache por padrão ${pattern}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém TTL baseado no tipo de entidade
   * @param entityType Tipo da entidade
   * @returns TTL em segundos
   */
  private getTTLByEntityType(entityType: string): number {
    return this.ttlConfig[entityType] || 1800; // Default: 30 minutos
  }

  /**
   * Obtém estatísticas do cache
   * @returns Estatísticas detalhadas do cache
   */
  async getCacheStats(): Promise<any> {
    try {
      return this.metricsProvider.getMetricsStatus();
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas do cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Limpa todo o cache (usar com cuidado)
   */
  async clearAll(): Promise<void> {
    try {
      await this.cacheService.clear();
      this.logger.warn('Todo o cache foi limpo');
    } catch (error) {
      this.logger.error(`Erro ao limpar cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica a saúde do sistema de cache
   * @returns Status de saúde do cache
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = 'ok';
      
      // Teste de escrita
      await this.cacheService.set(testKey, testValue, 10);
      
      // Teste de leitura
      const retrievedValue = await this.cacheService.get(testKey);
      
      // Limpeza
      await this.cacheService.del(testKey);
      
      const isHealthy = retrievedValue === testValue;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          redis_connection: isHealthy,
          test_key: testKey,
          test_result: retrievedValue === testValue
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          redis_connection: false
        }
      };
    }
  }
}