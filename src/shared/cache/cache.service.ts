import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CacheMetricsProvider } from './cache-metrics.provider';

// Estados do Circuit Breaker
enum CircuitState {
  CLOSED, // Funcionamento normal
  OPEN,   // Em falha, não tenta operações
  HALF_OPEN // Tentando recuperar
}

/**
 * Serviço de cache
 *
 * Implementa um sistema de cache utilizando o Redis através do Bull
 * para melhorar a performance de operações frequentes
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 3600; // 1 hora em segundos
  
  // Circuit Breaker configurações
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private readonly failureThreshold: number = 5; // Número de falhas para abrir o circuito
  private readonly resetTimeout: number = 30000; // 30 segundos para tentar recuperar
  private lastFailureTime: number = 0;
  private inMemoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private readonly localCacheTTL = 300; // 5 minutos (valor padrão para cache local)

  constructor(
    @InjectQueue('cache') private readonly cacheQueue: Queue,
    private readonly metricsProvider: CacheMetricsProvider,
  ) {}

  /**
   * Obtém um valor do cache
   * @param key Chave do valor no cache
   * @returns O valor armazenado ou null se não existir
   */
  /**
   * Verifica o estado do circuit breaker e atualiza conforme necessário
   * @private
   */
  private checkCircuitState(): void {
    const now = Date.now();
    
    // Se estiver aberto, verificar se já passou o tempo para tentar recuperar
    if (this.circuitState === CircuitState.OPEN) {
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.logger.log('Circuit Breaker mudando para estado HALF_OPEN, tentando recuperar');
        this.circuitState = CircuitState.HALF_OPEN;
      }
    }
  }
  
  /**
   * Registra uma falha no circuit breaker
   * @private
   */
  private registerFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold && this.circuitState === CircuitState.CLOSED) {
      this.logger.warn(`Circuit Breaker mudando para estado OPEN após ${this.failureCount} falhas`);
      this.circuitState = CircuitState.OPEN;
    }
  }
  
  /**
   * Registra um sucesso no circuit breaker
   * @private
   */
  private registerSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit Breaker recuperado, voltando para estado CLOSED');
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;
    } else if (this.circuitState === CircuitState.CLOSED) {
      // Resetar contador de falhas gradualmente em caso de sucesso
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }
  
  /**
   * Salva um valor no cache local em memória
   * @private
   */
  private setLocalCache<T>(key: string, value: T, ttl: number = this.localCacheTTL): void {
    const expiry = Date.now() + (ttl * 1000);
    this.inMemoryCache.set(key, { value, expiry });
  }
  
  /**
   * Obtém um valor do cache local em memória
   * @private
   */
  private getLocalCache<T>(key: string): T | null {
    const cached = this.inMemoryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.inMemoryCache.delete(key);
      return null;
    }
    
    return cached.value as T;
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Primeiro verificar cache local (mais rápido e sem dependência do Redis)
    const localValue = this.getLocalCache<T>(key);
    if (localValue !== null) {
      this.metricsProvider.registerCacheHit();
      return localValue;
    }
    
    // Verificar o estado do circuit breaker
    this.checkCircuitState();
    
    // Se o circuit breaker estiver aberto, não tentar Redis
    if (this.circuitState === CircuitState.OPEN) {
      this.metricsProvider.registerCacheMiss();
      return null;
    }
    
    try {
      const job = await this.cacheQueue.getJob(key);

      if (!job) {
        // Cache miss
        this.metricsProvider.registerCacheMiss();
        this.registerSuccess(); // Operação concluída com sucesso (mesmo que seja um miss)
        return null;
      }

      const jobData = await job.data;

      // Verificar se o job expirou
      if (job.finishedOn && Date.now() > job.finishedOn) {
        await job.remove();
        this.metricsProvider.registerCacheMiss();
        this.registerSuccess(); // Operação concluída com sucesso
        return null;
      }

      // Cache hit - armazenar também no cache local
      const value = jobData.value as T;
      this.setLocalCache(key, value);
      this.metricsProvider.registerCacheHit();
      this.registerSuccess(); // Operação concluída com sucesso
      return value;
    } catch (error) {
      this.logger.error(
        `Erro ao obter valor do cache: ${error.message}`,
        error.stack,
      );
      this.registerFailure(); // Registrar falha para o circuit breaker
      this.metricsProvider.registerCacheMiss();
      return null;
    }
  }

  /**
   * Armazena um valor no cache
   * @param key Chave para armazenar o valor
   * @param value Valor a ser armazenado
   * @param ttl Tempo de vida em segundos (padrão: 1 hora)
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    // Sempre armazenar no cache local, independente do estado do Redis
    this.setLocalCache(key, value, Math.min(ttl, this.localCacheTTL));
    
    // Verificar o estado do circuit breaker
    this.checkCircuitState();
    
    // Se o circuit breaker estiver aberto, não tentar Redis
    if (this.circuitState === CircuitState.OPEN) {
      return;
    }
    
    try {
      // Timeout para evitar bloqueio da thread principal
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao armazenar no cache')), 500);
      });
      
      const cachePromise = (async () => {
        // Remover job existente com a mesma chave
        const existingJob = await this.cacheQueue.getJob(key);
        if (existingJob) {
          await existingJob.remove();
        }

        // Criar novo job com os dados
        await this.cacheQueue.add(
          { value },
          {
            jobId: key,
            removeOnComplete: ttl,
            removeOnFail: true,
          },
        );
      })();
      
      // Usar race para evitar bloqueio por tempo indefinido
      await Promise.race([cachePromise, timeoutPromise]);
      
      // Registrar operação de set no cache
      this.metricsProvider.registerCacheSet();
      this.registerSuccess(); // Operação concluída com sucesso
    } catch (error) {
      this.logger.error(
        `Erro ao armazenar valor no cache: ${error.message}`,
        error.stack,
      );
      this.registerFailure(); // Registrar falha para o circuit breaker
    }
  }

  /**
   * Remove um valor do cache
   * @param key Chave do valor a ser removido
   */
  async del(key: string): Promise<void> {
    // Remover do cache local
    this.inMemoryCache.delete(key);
    
    // Verificar o estado do circuit breaker
    this.checkCircuitState();
    
    // Se o circuit breaker estiver aberto, não tentar Redis
    if (this.circuitState === CircuitState.OPEN) {
      return;
    }
    
    try {
      // Timeout para evitar bloqueio da thread principal
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao remover do cache')), 500);
      });
      
      const cachePromise = (async () => {
        const job = await this.cacheQueue.getJob(key);
        if (job) {
          await job.remove();
        }
      })();
      
      // Usar race para evitar bloqueio por tempo indefinido
      await Promise.race([cachePromise, timeoutPromise]);
      
      // Registrar operação de delete no cache
      this.metricsProvider.registerCacheDelete();
      this.registerSuccess(); // Operação concluída com sucesso
    } catch (error) {
      this.logger.error(
        `Erro ao remover valor do cache: ${error.message}`,
        error.stack,
      );
      this.registerFailure(); // Registrar falha para o circuit breaker
    }
  }

  /**
   * Verifica se uma chave existe no cache
   * @param key Chave a ser verificada
   * @returns true se a chave existir, false caso contrário
   */
  async has(key: string): Promise<boolean> {
    // Verificar primeiro no cache local
    if (this.getLocalCache(key) !== null) {
      return true;
    }
    
    // Verificar o estado do circuit breaker
    this.checkCircuitState();
    
    // Se o circuit breaker estiver aberto, retornar apenas resultado do cache local
    if (this.circuitState === CircuitState.OPEN) {
      return false;
    }
    
    try {
      const job = await this.cacheQueue.getJob(key);
      const exists = !!job;
      this.registerSuccess(); // Operação concluída com sucesso
      return exists;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar existência no cache: ${error.message}`,
        error.stack,
      );
      this.registerFailure(); // Registrar falha para o circuit breaker
      return false;
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    // Limpar cache local
    this.inMemoryCache.clear();
    
    // Verificar o estado do circuit breaker
    this.checkCircuitState();
    
    // Se o circuit breaker estiver aberto, não tentar Redis
    if (this.circuitState === CircuitState.OPEN) {
      return;
    }
    
    try {
      // Timeout para evitar bloqueio da thread principal
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao limpar cache')), 1000);
      });
      
      const cachePromise = this.cacheQueue.empty();
      
      // Usar race para evitar bloqueio por tempo indefinido
      await Promise.race([cachePromise, timeoutPromise]);
      
      // Registrar operação de clear no cache
      this.metricsProvider.registerCacheClear();
      this.registerSuccess(); // Operação concluída com sucesso
    } catch (error) {
      this.logger.error(`Erro ao limpar cache: ${error.message}`, error.stack);
      this.registerFailure(); // Registrar falha para o circuit breaker
    }
  }
  
  /**
   * Obtém o estado atual do circuit breaker
   * @returns Estado atual do circuit breaker
   */
  getCircuitState(): string {
    switch (this.circuitState) {
      case CircuitState.CLOSED:
        return 'CLOSED';
      case CircuitState.OPEN:
        return 'OPEN';
      case CircuitState.HALF_OPEN:
        return 'HALF_OPEN';
      default:
        return 'UNKNOWN';
    }
  }
  
  /**
   * Obtém estatísticas do circuit breaker
   * @returns Estatísticas do circuit breaker
   */
  getCircuitStats(): any {
    return {
      state: this.getCircuitState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      localCacheSize: this.inMemoryCache.size,
      thresholdConfig: {
        failureThreshold: this.failureThreshold,
        resetTimeoutMs: this.resetTimeout,
      }
    };
  }
}
