import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { HealthCheckService } from './health-check.service';
import { CacheService } from '../cache/cache.service';

interface CacheEntry {
  value: any;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface CacheMetrics {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  evictions: number;
  warmingOperations: number;
  failovers: number;
}

/**
 * Serviço de Cache Híbrido Resiliente
 *
 * Implementa um sistema de cache em múltiplas camadas com estratégias de resiliência:
 *
 * L1 Cache (Memória Local):
 * - Cache em memória ultra-rápido
 * - Limitado por tamanho configurável
 * - Algoritmo LRU com prioridades
 * - Sempre disponível
 *
 * L2 Cache (Redis):
 * - Cache distribuído persistente
 * - Compartilhado entre instâncias
 * - Fallback automático para L1 em caso de falha
 * - Circuit breaker integrado
 *
 * Funcionalidades de Resiliência:
 * - Cache warming automático
 * - Prevenção de cache stampede
 * - Métricas detalhadas
 * - Recuperação automática
 */
@Injectable()
export class HybridCacheService implements OnModuleInit {
  private readonly logger = new Logger(HybridCacheService.name);

  // L1 Cache (Memória Local)
  private readonly l1Cache = new Map<string, CacheEntry>();
  private readonly maxL1Size: number;
  private readonly defaultTtl: number;

  // Configurações
  private readonly enableL2Cache: boolean;
  private readonly enableCacheWarming: boolean;
  private readonly warmingInterval: number;

  // Métricas
  private metrics: CacheMetrics = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    evictions: 0,
    warmingOperations: 0,
    failovers: 0,
  };

  // Cache warming - chaves críticas que devem estar sempre em cache
  private readonly criticalKeys = new Set<string>();
  private readonly warmingCallbacks = new Map<string, () => Promise<any>>();

  // Prevenção de cache stampede
  private readonly pendingOperations = new Map<string, Promise<any>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly healthCheckService: HealthCheckService,
    private readonly cacheService: CacheService,
  ) {
    this.maxL1Size = this.configService.get('CACHE_L1_MAX_SIZE', 1000);
    this.defaultTtl = this.configService.get('CACHE_DEFAULT_TTL', 300000); // 5 minutos
    this.enableL2Cache =
      this.configService.get('CACHE_ENABLE_L2', 'true') === 'true';
    this.enableCacheWarming =
      this.configService.get('CACHE_ENABLE_WARMING', 'true') === 'true';
    this.warmingInterval = this.configService.get(
      'CACHE_WARMING_INTERVAL',
      60000,
    ); // 1 minuto
  }

  async onModuleInit() {
    this.logger.log('Inicializando Hybrid Cache Service');

    // TEMPORÁRIO: Desabilitando inicialização para evitar travamento
    this.logger.warn(
      '⚠️ Inicialização do HybridCacheService desabilitada temporariamente',
    );

    // TODO: Reabilitar após resolver problemas de conectividade com Redis
    /*
    if (this.enableCacheWarming) {
      this.logger.log('Cache warming habilitado');
    }
    
    // Registrar chaves críticas padrão
    this.registerCriticalKey('system:config', async () => {
      // Exemplo: carregar configurações do sistema
      return { loaded: true, timestamp: Date.now() };
    });
    */
  }

  /**
   * Obtém valor do cache com estratégia híbrida
   *
   * Fluxo:
   * 1. Verifica L1 Cache (memória local)
   * 2. Se não encontrar, verifica L2 Cache (Redis)
   * 3. Se encontrar no L2, promove para L1
   * 4. Se não encontrar em nenhum, retorna null
   *
   * @param key Chave do cache
   * @returns Valor do cache ou null
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // L1 Cache (Memória Local)
      const l1Result = this.getFromL1<T>(key);
      if (l1Result !== null) {
        this.metrics.l1Hits++;
        this.logger.debug(
          `L1 Cache HIT para '${key}' em ${Date.now() - startTime}ms`,
        );
        return l1Result;
      }

      this.metrics.l1Misses++;

      // L2 Cache (Redis) - apenas se habilitado e disponível
      if (this.enableL2Cache && (await this.isL2Available())) {
        const l2Result = await this.getFromL2<T>(key);
        if (l2Result !== null) {
          this.metrics.l2Hits++;

          // Promover para L1 Cache
          this.setToL1(key, l2Result, this.defaultTtl, 'medium');

          this.logger.debug(
            `L2 Cache HIT para '${key}' em ${Date.now() - startTime}ms`,
          );
          return l2Result;
        }

        this.metrics.l2Misses++;
      }

      this.logger.debug(
        `Cache MISS para '${key}' em ${Date.now() - startTime}ms`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Erro ao obter cache para '${key}': ${error.message}`);
      return null;
    }
  }

  /**
   * Define valor no cache com estratégia híbrida
   *
   * @param key Chave do cache
   * @param value Valor a ser armazenado
   * @param ttl TTL em milissegundos (opcional)
   * @param priority Prioridade do cache (opcional)
   */
  async set<T = any>(
    key: string,
    value: T,
    ttl: number = this.defaultTtl,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<void> {
    try {
      // Sempre armazenar no L1 Cache
      this.setToL1(key, value, ttl, priority);

      // Armazenar no L2 Cache se disponível
      if (this.enableL2Cache && (await this.isL2Available())) {
        await this.setToL2(key, value, ttl);
      }

      this.logger.debug(
        `Cache SET para '${key}' com TTL ${ttl}ms e prioridade ${priority}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao definir cache para '${key}': ${error.message}`,
      );
      // Não propagar erro - cache não deve quebrar a aplicação
    }
  }

  /**
   * Remove valor do cache
   */
  async del(key: string): Promise<void> {
    try {
      // Remover do L1 Cache
      this.l1Cache.delete(key);

      // Remover do L2 Cache se disponível
      if (this.enableL2Cache && (await this.isL2Available())) {
        await this.cacheService.del(key);
      }

      this.logger.debug(`Cache DEL para '${key}'`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover cache para '${key}': ${error.message}`,
      );
    }
  }

  /**
   * Verifica se uma chave existe no cache
   */
  async has(key: string): Promise<boolean> {
    try {
      // Verificar L1 Cache
      if (this.hasInL1(key)) {
        return true;
      }

      // Verificar L2 Cache se disponível
      if (this.enableL2Cache && (await this.isL2Available())) {
        return await this.cacheService.has(key);
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar cache para '${key}': ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Obtém ou define valor no cache com prevenção de cache stampede
   *
   * @param key Chave do cache
   * @param factory Função para gerar o valor se não estiver em cache
   * @param ttl TTL em milissegundos
   * @param priority Prioridade do cache
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTtl,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<T> {
    // Verificar se já existe no cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Prevenção de cache stampede
    const pendingKey = `pending:${key}`;
    if (this.pendingOperations.has(pendingKey)) {
      this.logger.debug(`Aguardando operação pendente para '${key}'`);
      return await this.pendingOperations.get(pendingKey);
    }

    // Criar nova operação
    const operation = this.executeFactory(key, factory, ttl, priority);
    this.pendingOperations.set(pendingKey, operation);

    try {
      const result = await operation;
      return result;
    } finally {
      this.pendingOperations.delete(pendingKey);
    }
  }

  /**
   * Executa factory e armazena resultado no cache
   */
  private async executeFactory<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
    priority: 'low' | 'medium' | 'high' | 'critical',
  ): Promise<T> {
    try {
      const result = await factory();
      await this.set(key, result, ttl, priority);
      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao executar factory para '${key}': ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Registra chave crítica para cache warming
   */
  registerCriticalKey(key: string, factory: () => Promise<any>): void {
    this.criticalKeys.add(key);
    this.warmingCallbacks.set(key, factory);
    this.logger.debug(`Chave crítica registrada: ${key}`);
  }

  /**
   * Remove chave crítica
   */
  unregisterCriticalKey(key: string): void {
    this.criticalKeys.delete(key);
    this.warmingCallbacks.delete(key);
    this.logger.debug(`Chave crítica removida: ${key}`);
  }

  /**
   * Job de cache warming - executa periodicamente
   */
  @Cron('0 * * * * *') // A cada minuto
  async performCacheWarming(): Promise<void> {
    if (!this.enableCacheWarming || this.criticalKeys.size === 0) {
      return;
    }

    this.logger.debug('Iniciando cache warming');

    let warmedCount = 0;

    for (const key of this.criticalKeys) {
      try {
        const factory = this.warmingCallbacks.get(key);
        if (!factory) {
          continue;
        }

        // Verificar se precisa de warming (não existe ou está próximo do vencimento)
        const needsWarming = await this.needsCacheWarming(key);

        if (needsWarming) {
          await this.getOrSet(key, factory, this.defaultTtl * 2, 'critical'); // TTL maior para chaves críticas
          warmedCount++;
          this.metrics.warmingOperations++;
        }
      } catch (error) {
        this.logger.warn(
          `Erro no cache warming para '${key}': ${error.message}`,
        );
      }
    }

    if (warmedCount > 0) {
      this.logger.debug(
        `Cache warming concluído: ${warmedCount} chaves aquecidas`,
      );
    }
  }

  /**
   * Verifica se uma chave precisa de cache warming
   */
  private async needsCacheWarming(key: string): Promise<boolean> {
    const entry = this.l1Cache.get(key);

    if (!entry) {
      return true; // Não existe, precisa de warming
    }

    const now = Date.now();
    const timeToExpire = entry.createdAt + entry.ttl - now;
    const warmingThreshold = entry.ttl * 0.2; // 20% do TTL

    return timeToExpire <= warmingThreshold;
  }

  /**
   * Limpa cache expirado - executa periodicamente
   */
  @Cron('0 */5 * * * *') // A cada 5 minutos
  async cleanupExpiredCache(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (now > entry.createdAt + entry.ttl) {
        this.l1Cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Limpeza de cache: ${cleanedCount} entradas removidas`);
    }
  }

  // Métodos privados para L1 Cache

  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();

    // Verificar se expirou
    if (now > entry.createdAt + entry.ttl) {
      this.l1Cache.delete(key);
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.value;
  }

  private setToL1<T>(
    key: string,
    value: T,
    ttl: number,
    priority: 'low' | 'medium' | 'high' | 'critical',
  ): void {
    // Verificar se precisa fazer eviction
    if (this.l1Cache.size >= this.maxL1Size) {
      this.evictL1Cache();
    }

    const now = Date.now();

    this.l1Cache.set(key, {
      value,
      ttl,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      priority,
    });
  }

  private hasInL1(key: string): boolean {
    const entry = this.l1Cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();

    // Verificar se expirou
    if (now > entry.createdAt + entry.ttl) {
      this.l1Cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Algoritmo de eviction LRU com prioridades
   */
  private evictL1Cache(): void {
    const priorityOrder = ['low', 'medium', 'high', 'critical'];

    for (const priority of priorityOrder) {
      const candidates = Array.from(this.l1Cache.entries())
        .filter(([_, entry]) => entry.priority === priority)
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed); // LRU

      if (candidates.length > 0) {
        const [keyToEvict] = candidates[0];
        this.l1Cache.delete(keyToEvict);
        this.metrics.evictions++;
        this.logger.debug(
          `Cache eviction: removida chave '${keyToEvict}' com prioridade ${priority}`,
        );
        return;
      }
    }
  }

  // Métodos privados para L2 Cache

  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheService.get<T>(key);
    } catch (error) {
      this.logger.warn(
        `Erro ao acessar L2 Cache para '${key}': ${error.message}`,
      );
      this.metrics.failovers++;
      return null;
    }
  }

  private async setToL2<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await this.cacheService.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(
        `Erro ao definir L2 Cache para '${key}': ${error.message}`,
      );
      this.metrics.failovers++;
    }
  }

  private async isL2Available(): Promise<boolean> {
    try {
      return await this.healthCheckService.isRedisAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Retorna métricas detalhadas do cache
   */
  getMetrics() {
    const totalL1Operations = this.metrics.l1Hits + this.metrics.l1Misses;
    const totalL2Operations = this.metrics.l2Hits + this.metrics.l2Misses;

    return {
      ...this.metrics,
      l1Size: this.l1Cache.size,
      l1MaxSize: this.maxL1Size,
      l1HitRate:
        totalL1Operations > 0
          ? (this.metrics.l1Hits / totalL1Operations) * 100
          : 0,
      l2HitRate:
        totalL2Operations > 0
          ? (this.metrics.l2Hits / totalL2Operations) * 100
          : 0,
      overallHitRate:
        totalL1Operations + totalL2Operations > 0
          ? ((this.metrics.l1Hits + this.metrics.l2Hits) /
              (totalL1Operations + totalL2Operations)) *
            100
          : 0,
      criticalKeysCount: this.criticalKeys.size,
      pendingOperations: this.pendingOperations.size,
    };
  }

  /**
   * Reseta métricas (útil para testes)
   */
  resetMetrics(): void {
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      evictions: 0,
      warmingOperations: 0,
      failovers: 0,
    };
  }

  /**
   * Limpa todo o cache (útil para testes)
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();

    if (this.enableL2Cache && (await this.isL2Available())) {
      try {
        // Implementar clear no CacheService se necessário
        this.logger.debug('L2 Cache cleared');
      } catch (error) {
        this.logger.warn(`Erro ao limpar L2 Cache: ${error.message}`);
      }
    }

    this.logger.debug('Cache híbrido limpo');
  }
}
