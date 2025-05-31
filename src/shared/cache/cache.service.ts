import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
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
  private readonly failureThreshold: number = 3; // Reduzido para 3 falhas para abrir o circuito mais rapidamente
  private readonly resetTimeout: number = 10000; // 10 segundos para tentar recuperar (reduzido para resposta mais rápida)
  private lastFailureTime: number = 0;
  private inMemoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private readonly localCacheTTL: number;
  
  constructor(
    @InjectQueue('cache') private readonly cacheQueue: Queue,
    private readonly metricsProvider: CacheMetricsProvider,
    private readonly configService: ConfigService,
  ) {
    // Verificar se o Redis está desabilitado via configuração
    const disableRedis = this.configService.get('DISABLE_REDIS') === 'true';
    
    // Carregar configurações do circuit breaker
    this.failureThreshold = this.configService.get<number>('CACHE_CIRCUIT_BREAKER_THRESHOLD', 3);
    this.resetTimeout = this.configService.get<number>('CACHE_CIRCUIT_BREAKER_RESET', 10000);
    this.localCacheTTL = this.configService.get<number>('CACHE_LOCAL_TTL', 600);
    
    if (disableRedis) {
      this.logger.warn('Redis está desabilitado. Usando apenas cache local.');
      this.circuitState = CircuitState.OPEN; // Forçar uso do cache local
    }
    
    // Verificar conexão com Redis na inicialização
    this.checkRedisConnection();
  }
  
  /**
   * Verifica a conexão com o Redis na inicialização
   * @private
   */
  private async checkRedisConnection(): Promise<void> {
    try {
      // Definir um timeout para evitar bloqueio
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao verificar conexão com Redis')), 2000);
      });
      
      const pingPromise = this.cacheQueue.client.ping();
      
      await Promise.race([pingPromise, timeoutPromise]);
      this.logger.log('Conexão com Redis estabelecida com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao conectar com Redis: ${error.message}. Usando cache local.`, error.stack);
      // Abrir o circuit breaker para usar cache local
      this.circuitState = CircuitState.OPEN;
    }
  }
  
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
        // Resetar contador de falhas ao tentar recuperar
        this.failureCount = 0;
        
        // Registrar métrica de recuperação
        this.metricsProvider.registerCacheRecoveryAttempt();
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
     
    // Registrar métrica de falha
    this.metricsProvider.registerCacheFailure();
    
    if (this.failureCount >= this.failureThreshold && this.circuitState === CircuitState.CLOSED) {
      this.logger.warn(`Circuit Breaker mudando para estado OPEN após ${this.failureCount} falhas`);
      this.circuitState = CircuitState.OPEN;
      
      // Limpar fila de cache quando o circuito abrir para evitar acumular operações pendentes
      this.clearCacheQueue().catch(err => {
        this.logger.error(`Erro ao limpar fila de cache: ${err.message}`, err.stack);
      });
    }
  }
  
  /**
   * Limpa a fila de cache para evitar acumular operações pendentes
   * @private
   */
  private async clearCacheQueue(): Promise<void> {
    try {
      // Definir um timeout para evitar bloqueio
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao limpar fila de cache')), 1000);
      });
      
      const cleanPromise = Promise.all([
        this.cacheQueue.clean(0, 'delayed'),
        this.cacheQueue.clean(0, 'wait')
      ]);
      
      await Promise.race([cleanPromise, timeoutPromise]);
      this.logger.log('Fila de cache limpa com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao limpar fila de cache: ${error.message}`, error.stack);
      // Forçar o fechamento do circuito em caso de erro ao limpar a fila
      // Isso é importante para evitar que o sistema continue tentando usar o Redis
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
    if (!cached) {return null;}
    
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
    
    // Se o circuit breaker estiver aberto, não tentar Redis e retornar null
    if (this.circuitState === CircuitState.OPEN) {
      this.logger.debug(`Circuit breaker aberto, não tentando Redis para chave: ${key}`);
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
      
      // Se for um erro de timeout, tentar obter o valor do cache local novamente
      // Isso pode acontecer se o valor for adicionado ao cache local por outra thread
      if (error.message && error.message.includes('Timeout')) {
        const retryLocalValue = this.getLocalCache<T>(key);
        if (retryLocalValue !== null) {
          this.logger.debug(`Valor encontrado no cache local após timeout: ${key}`);
          return retryLocalValue;
        }
      }
      
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
    // Armazenar no cache local primeiro (mais rápido e sem dependência do Redis)
    this.setLocalCache(key, value, ttl);
    
    // Verificar o estado do circuit breaker
    this.checkCircuitState();
    
    // Se o circuit breaker estiver aberto, não tentar Redis
    if (this.circuitState === CircuitState.OPEN) {
      this.logger.debug(`Circuit breaker aberto, não tentando Redis para chave: ${key}`);
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
   * Força o fechamento do circuit breaker, útil para recuperação manual
   */
  forceCloseCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.logger.log('Circuit Breaker forçado para estado CLOSED manualmente');
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
