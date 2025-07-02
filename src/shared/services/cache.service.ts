import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Serviço de cache em memória para otimização de performance
 *
 * Este serviço implementa um cache LRU (Least Recently Used) em memória
 * para armazenar resultados de consultas frequentes e reduzir a carga no banco de dados.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheItem>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(private configService: ConfigService) {
    this.maxSize = this.configService.get<number>('CACHE_MAX_SIZE', 1000);
    this.defaultTTL = this.configService.get<number>(
      'CACHE_DEFAULT_TTL',
      300000,
    ); // 5 minutos
  }

  /**
   * Armazena um valor no cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      // Verificar se precisa remover itens antigos
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      const expiresAt = Date.now() + ttl;
      const item: CacheItem = {
        value,
        expiresAt,
        createdAt: Date.now(),
      };

      this.cache.set(key, item);
      this.updateAccessOrder(key);

      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
    } catch (error) {
      this.logger.error(
        `Erro ao armazenar no cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Recupera um valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);

      if (!item) {
        this.logger.debug(`Cache MISS: ${key}`);
        return null;
      }

      // Verificar se expirou
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.logger.debug(`Cache EXPIRED: ${key}`);
        return null;
      }

      this.updateAccessOrder(key);
      this.logger.debug(`Cache HIT: ${key}`);
      return item.value as T;
    } catch (error) {
      this.logger.error(
        `Erro ao recuperar do cache: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Remove um item do cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.cache.delete(key);
      this.accessOrder.delete(key);

      if (deleted) {
        this.logger.debug(`Cache DELETE: ${key}`);
      }

      return deleted;
    } catch (error) {
      this.logger.error(
        `Erro ao remover do cache: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Remove itens do cache baseado em padrão
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let deletedCount = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          deletedCount++;
        }
      }

      this.logger.debug(
        `Cache DELETE_PATTERN: ${pattern} (${deletedCount} items)`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Erro ao remover padrão do cache: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.accessOrder.clear();
      this.accessCounter = 0;

      this.logger.debug(`Cache CLEAR: ${size} items removed`);
    } catch (error) {
      this.logger.error(`Erro ao limpar cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expiredCount,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Executa limpeza de itens expirados
   */
  async cleanup(): Promise<number> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(
          `Cache CLEANUP: ${cleanedCount} expired items removed`,
        );
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Erro na limpeza do cache: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Wrapper para operações com cache automático
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL,
  ): Promise<T> {
    // Tentar obter do cache primeiro
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Se não estiver no cache, executar factory e armazenar
    try {
      const value = await factory();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      this.logger.error(
        `Erro no getOrSet para chave ${key}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza a ordem de acesso para LRU
   */
  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Remove o item menos recentemente usado
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.logger.debug(`Cache LRU_EVICT: ${lruKey}`);
    }
  }

  /**
   * Estima o uso de memória do cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      // Estimativa básica: tamanho da chave + tamanho serializado do valor
      totalSize += key.length * 2; // UTF-16
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 24; // overhead do objeto CacheItem
    }

    return totalSize;
  }
}

/**
 * Interface para item do cache
 */
interface CacheItem {
  value: any;
  expiresAt: number;
  createdAt: number;
}

/**
 * Interface para estatísticas do cache
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  expiredCount: number;
  memoryUsage: number;
}
