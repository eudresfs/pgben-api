import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CacheMetricsProvider } from './cache-metrics.provider';

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

  constructor(
    @InjectQueue('cache') private readonly cacheQueue: Queue,
    private readonly metricsProvider: CacheMetricsProvider,
  ) {}

  /**
   * Obtém um valor do cache
   * @param key Chave do valor no cache
   * @returns O valor armazenado ou null se não existir
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const job = await this.cacheQueue.getJob(key);

      if (!job) {
        // Cache miss
        this.metricsProvider.registerCacheMiss();
        return null;
      }

      const jobData = await job.data;

      // Verificar se o job expirou
      if (job.finishedOn && Date.now() > job.finishedOn) {
        await job.remove();
        this.metricsProvider.registerCacheMiss();
        return null;
      }

      // Cache hit
      this.metricsProvider.registerCacheHit();
      return jobData.value as T;
    } catch (error) {
      this.logger.error(
        `Erro ao obter valor do cache: ${error.message}`,
        error.stack,
      );
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
    try {
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
      
      // Registrar operação de set no cache
      this.metricsProvider.registerCacheSet();
    } catch (error) {
      this.logger.error(
        `Erro ao armazenar valor no cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Remove um valor do cache
   * @param key Chave do valor a ser removido
   */
  async del(key: string): Promise<void> {
    try {
      const job = await this.cacheQueue.getJob(key);

      if (job) {
        await job.remove();
        // Registrar operação de delete no cache
        this.metricsProvider.registerCacheDelete();
      }
    } catch (error) {
      this.logger.error(
        `Erro ao remover valor do cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Verifica se uma chave existe no cache
   * @param key Chave a ser verificada
   * @returns true se a chave existir, false caso contrário
   */
  async has(key: string): Promise<boolean> {
    try {
      const job = await this.cacheQueue.getJob(key);
      return !!job;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar existência no cache: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheQueue.empty();
      // Registrar operação de clear no cache
      this.metricsProvider.registerCacheClear();
    } catch (error) {
      this.logger.error(`Erro ao limpar cache: ${error.message}`, error.stack);
    }
  }
}
