import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SseCircuitBreakerService, SseCircuitBreakerConfig } from './sse-circuit-breaker.service';
import { SseRedisService } from './sse-redis.service';
import CircuitBreaker from 'opossum';

/**
 * Configuração específica para circuit breakers do Redis
 */
export interface RedisCircuitBreakerConfig extends SseCircuitBreakerConfig {
  /** Dados de fallback para operações de leitura */
  fallbackData?: any;
  /** Habilitar cache local para fallback */
  enableLocalCache?: boolean;
  /** TTL do cache local em ms */
  localCacheTtl?: number;
}

/**
 * Serviço que implementa circuit breakers específicos para operações Redis do SSE
 * Fornece resilência contra falhas de conectividade e performance do Redis
 */
@Injectable()
export class SseRedisCircuitBreakerService {
  private readonly logger = new Logger(SseRedisCircuitBreakerService.name);
  private readonly localCache = new Map<string, { data: any; expires: number }>();
  private readonly redisConfig: RedisCircuitBreakerConfig;

  // Circuit breakers específicos para operações Redis
  private readonly getCircuitBreaker: CircuitBreaker;
  private readonly setCircuitBreaker: CircuitBreaker;
  private readonly delCircuitBreaker: CircuitBreaker;
  private readonly publishCircuitBreaker: CircuitBreaker;
  private readonly subscribeCircuitBreaker: CircuitBreaker;

  constructor(
    private readonly circuitBreakerService: SseCircuitBreakerService,
    private readonly redisService: SseRedisService,
    private readonly configService: ConfigService,
  ) {
    // Configuração específica para Redis
    this.redisConfig = {
      timeout: this.configService.get<number>('SSE_REDIS_CIRCUIT_BREAKER_TIMEOUT', 3000),
      errorThresholdPercentage: this.configService.get<number>('SSE_REDIS_CIRCUIT_BREAKER_ERROR_THRESHOLD', 60),
      resetTimeout: this.configService.get<number>('SSE_REDIS_CIRCUIT_BREAKER_RESET_TIMEOUT', 20000),
      volumeThreshold: this.configService.get<number>('SSE_REDIS_CIRCUIT_BREAKER_VOLUME_THRESHOLD', 5),
      capacity: this.configService.get<number>('SSE_REDIS_CIRCUIT_BREAKER_CAPACITY', 10),
      bucketSpan: this.configService.get<number>('SSE_REDIS_CIRCUIT_BREAKER_BUCKET_SPAN', 30000),
      enableLocalCache: this.configService.get<boolean>('SSE_REDIS_ENABLE_LOCAL_CACHE', true),
      localCacheTtl: this.configService.get<number>('SSE_REDIS_LOCAL_CACHE_TTL', 60000), // 1 minuto
    };

    // Inicializar circuit breakers para operações específicas
    this.getCircuitBreaker = this.createRedisCircuitBreaker('redis-get');
    this.setCircuitBreaker = this.createRedisCircuitBreaker('redis-set');
    this.delCircuitBreaker = this.createRedisCircuitBreaker('redis-del');
    this.publishCircuitBreaker = this.createRedisCircuitBreaker('redis-publish');
    this.subscribeCircuitBreaker = this.createRedisCircuitBreaker('redis-subscribe');

  }

  /**
   * Operação GET com circuit breaker e fallback para cache local
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await this.getCircuitBreaker.fire(key) as string | null;
      
      // Atualizar cache local em caso de sucesso
      if (this.redisConfig.enableLocalCache && result !== null) {
        this.setLocalCache(key, result);
      }
      
      return result;
    } catch (error) {
      this.logger.warn(`Redis GET falhou para chave '${key}', tentando cache local`, {
        error: error.message,
      });
      
      // Tentar cache local como fallback
      return this.getLocalCache(key);
    }
  }

  /**
   * Operação SET com circuit breaker
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      await this.setCircuitBreaker.fire(key, value, ttl);
      
      // Atualizar cache local também
      if (this.redisConfig.enableLocalCache) {
        this.setLocalCache(key, value);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Redis SET falhou para chave '${key}'`, {
        error: error.message,
      });
      
      // Em caso de falha, pelo menos manter no cache local
      if (this.redisConfig.enableLocalCache) {
        this.setLocalCache(key, value);
      }
      
      return false;
    }
  }

  /**
   * Operação DEL com circuit breaker
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.delCircuitBreaker.fire(key);
      
      // Remover do cache local também
      this.localCache.delete(key);
      
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL falhou para chave '${key}'`, {
        error: error.message,
      });
      
      // Remover do cache local mesmo se Redis falhou
      this.localCache.delete(key);
      
      return false;
    }
  }

  /**
   * Operação PUBLISH com circuit breaker
   */
  async publish(channel: string, message: string): Promise<boolean> {
    try {
      await this.publishCircuitBreaker.fire(channel, message);
      return true;
    } catch (error) {
      this.logger.error(`Redis PUBLISH falhou para canal '${channel}'`, {
        error: error.message,
        messageLength: message.length,
      });
      return false;
    }
  }

  /**
   * Operação SUBSCRIBE com circuit breaker
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<boolean> {
    try {
      await this.subscribeCircuitBreaker.fire(channel, callback);
      return true;
    } catch (error) {
      this.logger.error(`Redis SUBSCRIBE falhou para canal '${channel}'`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Verifica se uma operação específica está disponível (circuito fechado)
   */
  isOperationAvailable(operation: 'get' | 'set' | 'del' | 'publish' | 'subscribe'): boolean {
    const breakers = {
      get: this.getCircuitBreaker,
      set: this.setCircuitBreaker,
      del: this.delCircuitBreaker,
      publish: this.publishCircuitBreaker,
      subscribe: this.subscribeCircuitBreaker,
    };

    const breaker = breakers[operation];
    return !breaker.opened;
  }

  /**
   * Obtém métricas de todos os circuit breakers Redis
   */
  getRedisCircuitBreakerMetrics() {
    return {
      get: this.circuitBreakerService.getCircuitBreakerMetrics('redis-get'),
      set: this.circuitBreakerService.getCircuitBreakerMetrics('redis-set'),
      del: this.circuitBreakerService.getCircuitBreakerMetrics('redis-del'),
      publish: this.circuitBreakerService.getCircuitBreakerMetrics('redis-publish'),
      subscribe: this.circuitBreakerService.getCircuitBreakerMetrics('redis-subscribe'),
      localCache: {
        size: this.localCache.size,
        enabled: this.redisConfig.enableLocalCache,
      },
    };
  }

  /**
   * Força a abertura de todos os circuit breakers Redis
   */
  openAllRedisCircuitBreakers(): void {
    this.circuitBreakerService.openCircuitBreaker('redis-get');
    this.circuitBreakerService.openCircuitBreaker('redis-set');
    this.circuitBreakerService.openCircuitBreaker('redis-del');
    this.circuitBreakerService.openCircuitBreaker('redis-publish');
    this.circuitBreakerService.openCircuitBreaker('redis-subscribe');
    
    this.logger.warn('Todos os circuit breakers Redis foram forçados para estado OPEN');
  }

  /**
   * Força o fechamento de todos os circuit breakers Redis
   */
  closeAllRedisCircuitBreakers(): void {
    this.circuitBreakerService.closeCircuitBreaker('redis-get');
    this.circuitBreakerService.closeCircuitBreaker('redis-set');
    this.circuitBreakerService.closeCircuitBreaker('redis-del');
    this.circuitBreakerService.closeCircuitBreaker('redis-publish');
    this.circuitBreakerService.closeCircuitBreaker('redis-subscribe');
    
    this.logger.log('Todos os circuit breakers Redis foram forçados para estado CLOSED');
  }

  /**
   * Limpa o cache local
   */
  clearLocalCache(): void {
    this.localCache.clear();
    this.logger.log('Cache local Redis limpo');
  }

  /**
   * Health check específico para Redis
   */
  getRedisHealthStatus() {
    const operations = ['get', 'set', 'del', 'publish', 'subscribe'] as const;
    const status: Record<string, boolean> = {};
    let allHealthy = true;

    for (const operation of operations) {
      const healthy = this.isOperationAvailable(operation);
      status[operation] = healthy;
      if (!healthy) {
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      operations: status,
      localCache: {
        enabled: this.redisConfig.enableLocalCache,
        size: this.localCache.size,
      },
    };
  }

  /**
   * Cria um circuit breaker específico para operações Redis
   */
  private createRedisCircuitBreaker(name: string): CircuitBreaker {
    const action = this.getRedisAction(name);
    const fallback = this.getRedisActionFallback(name);
    
    return this.circuitBreakerService.getCircuitBreaker(
      name,
      action,
      this.redisConfig,
      fallback,
    );
  }

  /**
   * Obtém a ação Redis correspondente ao nome do circuit breaker
   */
  private getRedisAction(name: string): (...args: any[]) => Promise<any> {
    switch (name) {
      case 'redis-get':
        return async (userId: string) => {
          const connections = await this.redisService.getUserConnections(userId);
          return connections.length > 0 ? connections[0] : null;
        };
      case 'redis-set':
        return (connectionId: string, userId: string) => this.redisService.storeConnection({ 
          connectionId, 
          userId, 
          connectedAt: new Date(), 
          lastHeartbeat: new Date(),
          instanceId: process.env.INSTANCE_ID || 'default'
        });
      case 'redis-del':
        return (connectionId: string, userId: string) => this.redisService.removeConnection(connectionId, userId);
      case 'redis-publish':
        return (userId: string, notification: any) => this.redisService.publishNotification({ userId: parseInt(userId), ...notification });
      case 'redis-subscribe':
        return (userId: string, callback: (notification: any) => void) => this.redisService.subscribeToUser(userId, callback);
      default:
        throw new Error(`Ação Redis desconhecida: ${name}`);
    }
  }

  /**
   * Obtém a função de fallback para operações Redis
   */
  private getRedisActionFallback(name: string): ((...args: any[]) => Promise<any>) | undefined {
    switch (name) {
      case 'redis-get':
        return async (key: string) => {
          this.logger.warn(`Fallback ativado para Redis GET: ${key}`);
          return this.getLocalCache(key);
        };
      case 'redis-set':
        return async (key: string, value: string) => {
          this.logger.warn(`Fallback ativado para Redis SET: ${key}`);
          if (this.redisConfig.enableLocalCache) {
            this.setLocalCache(key, value);
          }
          return 'OK';
        };
      case 'redis-del':
        return async (key: string) => {
          this.logger.warn(`Fallback ativado para Redis DEL: ${key}`);
          this.localCache.delete(key);
          return 1;
        };
      case 'redis-publish':
        return async (channel: string, message: string) => {
          this.logger.warn(`Fallback ativado para Redis PUBLISH: ${channel}`);
          // Em caso de falha do Redis, não há muito que possamos fazer
          // Apenas logar e retornar 0 (nenhum subscriber recebeu)
          return 0;
        };
      case 'redis-subscribe':
        return async (channel: string, callback: (message: string) => void) => {
          this.logger.warn(`Fallback ativado para Redis SUBSCRIBE: ${channel}`);
          // Em caso de falha, não podemos realmente fazer subscribe
          // Apenas retornar sem erro
          return;
        };
      default:
        return undefined;
    }
  }

  /**
   * Obtém dados do cache local
   */
  private getLocalCache(key: string): string | null {
    if (!this.redisConfig.enableLocalCache) {
      return null;
    }

    const cached = this.localCache.get(key);
    if (!cached) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() > cached.expires) {
      this.localCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Define dados no cache local
   */
  private setLocalCache(key: string, data: any): void {
    if (!this.redisConfig.enableLocalCache) {
      return;
    }

    const expires = Date.now() + this.redisConfig.localCacheTtl!;
    this.localCache.set(key, { data, expires });

    // Limpar entradas expiradas periodicamente
    if (this.localCache.size % 100 === 0) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Remove entradas expiradas do cache local
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.localCache.entries()) {
      if (now > cached.expires) {
        this.localCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cache local limpo: ${cleaned} entradas expiradas removidas`);
    }
  }
}