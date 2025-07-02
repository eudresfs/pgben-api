import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  SseCircuitBreakerService,
  SseCircuitBreakerConfig,
} from './sse-circuit-breaker.service';
import { Notificacao } from '../../../entities/notificacao.entity';
import CircuitBreaker from 'opossum';

/**
 * Configuração específica para circuit breakers do banco de dados
 */
export interface DatabaseCircuitBreakerConfig extends SseCircuitBreakerConfig {
  /** Habilitar cache de consultas */
  enableQueryCache?: boolean;
  /** TTL do cache de consultas em ms */
  queryCacheTtl?: number;
  /** Máximo de itens no cache */
  maxCacheSize?: number;
}

/**
 * Interface para cache de consultas
 */
interface QueryCacheItem {
  data: any;
  expires: number;
  query: string;
}

/**
 * Serviço que implementa circuit breakers específicos para operações de banco de dados do SSE
 * Fornece resilência contra falhas de conectividade e performance do banco
 */
@Injectable()
export class SseDatabaseCircuitBreakerService {
  private readonly logger = new Logger(SseDatabaseCircuitBreakerService.name);
  private readonly queryCache = new Map<string, QueryCacheItem>();
  private readonly dbConfig: DatabaseCircuitBreakerConfig;

  // Circuit breakers específicos para operações de banco
  private readonly queryCircuitBreaker: CircuitBreaker;
  private readonly insertCircuitBreaker: CircuitBreaker;
  private readonly updateCircuitBreaker: CircuitBreaker;
  private readonly deleteCircuitBreaker: CircuitBreaker;
  private readonly transactionCircuitBreaker: CircuitBreaker;

  constructor(
    private readonly circuitBreakerService: SseCircuitBreakerService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(Notificacao)
    private readonly notificacaoRepository: Repository<Notificacao>,
  ) {
    // Configuração específica para banco de dados
    this.dbConfig = {
      timeout: this.configService.get<number>(
        'SSE_DB_CIRCUIT_BREAKER_TIMEOUT',
        5000,
      ),
      errorThresholdPercentage: this.configService.get<number>(
        'SSE_DB_CIRCUIT_BREAKER_ERROR_THRESHOLD',
        70,
      ),
      resetTimeout: this.configService.get<number>(
        'SSE_DB_CIRCUIT_BREAKER_RESET_TIMEOUT',
        30000,
      ),
      volumeThreshold: this.configService.get<number>(
        'SSE_DB_CIRCUIT_BREAKER_VOLUME_THRESHOLD',
        8,
      ),
      capacity: this.configService.get<number>(
        'SSE_DB_CIRCUIT_BREAKER_CAPACITY',
        15,
      ),
      bucketSpan: this.configService.get<number>(
        'SSE_DB_CIRCUIT_BREAKER_BUCKET_SPAN',
        30000,
      ),
      enableQueryCache: this.configService.get<boolean>(
        'SSE_DB_ENABLE_QUERY_CACHE',
        true,
      ),
      queryCacheTtl: this.configService.get<number>(
        'SSE_DB_QUERY_CACHE_TTL',
        120000,
      ), // 2 minutos
      maxCacheSize: this.configService.get<number>(
        'SSE_DB_MAX_CACHE_SIZE',
        1000,
      ),
    };

    // Inicializar circuit breakers para operações específicas
    this.queryCircuitBreaker = this.createDatabaseCircuitBreaker('db-query');
    this.insertCircuitBreaker = this.createDatabaseCircuitBreaker('db-insert');
    this.updateCircuitBreaker = this.createDatabaseCircuitBreaker('db-update');
    this.deleteCircuitBreaker = this.createDatabaseCircuitBreaker('db-delete');
    this.transactionCircuitBreaker =
      this.createDatabaseCircuitBreaker('db-transaction');
  }

  /**
   * Executa uma consulta com circuit breaker e cache
   */
  async executeQuery<T = any>(query: string, parameters?: any[]): Promise<T[]> {
    const cacheKey = this.generateCacheKey(query, parameters);

    // Tentar cache primeiro
    if (this.dbConfig.enableQueryCache) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached !== null) {
        this.logger.debug(
          `Cache hit para consulta: ${query.substring(0, 50)}...`,
        );
        return cached;
      }
    }

    try {
      const result = (await this.queryCircuitBreaker.fire(
        query,
        parameters,
      )) as T[];

      // Armazenar no cache em caso de sucesso
      if (this.dbConfig.enableQueryCache && result) {
        this.setInCache(cacheKey, result, query);
      }

      return result as T[];
    } catch (error) {
      this.logger.error(`Consulta falhou: ${query.substring(0, 50)}...`, {
        error: error.message,
        parameters,
      });

      // Tentar retornar dados em cache mesmo expirados como último recurso
      const staleCache = this.getFromCache<T[]>(cacheKey, true);
      if (staleCache !== null) {
        this.logger.warn('Retornando dados em cache expirados como fallback');
        return staleCache;
      }

      throw error;
    }
  }

  /**
   * Insere dados com circuit breaker
   */
  async insert<T>(entity: any, data: Partial<T>): Promise<T> {
    try {
      const result = (await this.insertCircuitBreaker.fire(entity, data)) as T;

      // Invalidar cache relacionado após inserção
      this.invalidateRelatedCache(entity.name);

      return result;
    } catch (error) {
      this.logger.error(`Inserção falhou para entidade ${entity.name}`, {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  /**
   * Atualiza dados com circuit breaker
   */
  async update<T>(entity: any, id: any, data: Partial<T>): Promise<T> {
    try {
      const result = await this.updateCircuitBreaker.fire(entity, id, data);

      // Invalidar cache relacionado após atualização
      this.invalidateRelatedCache(entity.name);

      return result as T;
    } catch (error) {
      this.logger.error(`Atualização falhou para entidade ${entity.name}`, {
        error: error.message,
        id,
        data,
      });
      throw error;
    }
  }

  /**
   * Remove dados com circuit breaker
   */
  async delete(entity: any, id: any): Promise<boolean> {
    try {
      await this.deleteCircuitBreaker.fire(entity, id);

      // Invalidar cache relacionado após remoção
      this.invalidateRelatedCache(entity.name);

      return true;
    } catch (error) {
      this.logger.error(`Remoção falhou para entidade ${entity.name}`, {
        error: error.message,
        id,
      });
      return false;
    }
  }

  /**
   * Executa uma transação com circuit breaker
   */
  async executeTransaction<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return (await this.transactionCircuitBreaker.fire(operation)) as T;
    } catch (error) {
      this.logger.error('Transação falhou', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Busca notificações com circuit breaker e cache
   */
  async findNotifications(filters: {
    usuarioId?: number;
    tipo?: string;
    lida?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notificacao[]> {
    const query = `
      SELECT * FROM notificacao 
      WHERE ($1::int IS NULL OR usuario_id = $1)
        AND ($2::text IS NULL OR tipo = $2)
        AND ($3::boolean IS NULL OR lida = $3)
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const parameters = [
      filters.usuarioId || null,
      filters.tipo || null,
      filters.lida !== undefined ? filters.lida : null,
      filters.limit || 50,
      filters.offset || 0,
    ];

    return this.executeQuery<Notificacao>(query, parameters);
  }

  /**
   * Conta notificações não lidas com circuit breaker e cache
   */
  async countUnreadNotifications(usuarioId: number): Promise<number> {
    const query =
      'SELECT COUNT(*) as count FROM notificacao WHERE usuario_id = $1 AND lida = false';
    const result = await this.executeQuery<{ count: string }>(query, [
      usuarioId,
    ]);
    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Marca notificação como lida com circuit breaker
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    return this.update(this.notificacaoRepository.target, notificationId, {
      lida: true,
      dataLeitura: new Date(),
    })
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Verifica se uma operação específica está disponível
   */
  isOperationAvailable(
    operation: 'query' | 'insert' | 'update' | 'delete' | 'transaction',
  ): boolean {
    const breakers = {
      query: this.queryCircuitBreaker,
      insert: this.insertCircuitBreaker,
      update: this.updateCircuitBreaker,
      delete: this.deleteCircuitBreaker,
      transaction: this.transactionCircuitBreaker,
    };

    const breaker = breakers[operation];
    return !breaker.opened;
  }

  /**
   * Obtém métricas de todos os circuit breakers de banco
   */
  getDatabaseCircuitBreakerMetrics() {
    return {
      query: this.circuitBreakerService.getCircuitBreakerMetrics('db-query'),
      insert: this.circuitBreakerService.getCircuitBreakerMetrics('db-insert'),
      update: this.circuitBreakerService.getCircuitBreakerMetrics('db-update'),
      delete: this.circuitBreakerService.getCircuitBreakerMetrics('db-delete'),
      transaction:
        this.circuitBreakerService.getCircuitBreakerMetrics('db-transaction'),
      queryCache: {
        size: this.queryCache.size,
        enabled: this.dbConfig.enableQueryCache,
        maxSize: this.dbConfig.maxCacheSize,
      },
    };
  }

  /**
   * Health check específico para banco de dados
   */
  getDatabaseHealthStatus() {
    const operations = [
      'query',
      'insert',
      'update',
      'delete',
      'transaction',
    ] as const;
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
      queryCache: {
        enabled: this.dbConfig.enableQueryCache,
        size: this.queryCache.size,
        maxSize: this.dbConfig.maxCacheSize,
      },
      connection: {
        isConnected: this.dataSource.isInitialized,
      },
    };
  }

  /**
   * Limpa o cache de consultas
   */
  clearQueryCache(): void {
    this.queryCache.clear();
    this.logger.log('Cache de consultas limpo');
  }

  /**
   * Força a abertura de todos os circuit breakers de banco
   */
  openAllDatabaseCircuitBreakers(): void {
    this.circuitBreakerService.openCircuitBreaker('db-query');
    this.circuitBreakerService.openCircuitBreaker('db-insert');
    this.circuitBreakerService.openCircuitBreaker('db-update');
    this.circuitBreakerService.openCircuitBreaker('db-delete');
    this.circuitBreakerService.openCircuitBreaker('db-transaction');

    this.logger.warn(
      'Todos os circuit breakers de banco foram forçados para estado OPEN',
    );
  }

  /**
   * Força o fechamento de todos os circuit breakers de banco
   */
  closeAllDatabaseCircuitBreakers(): void {
    this.circuitBreakerService.closeCircuitBreaker('db-query');
    this.circuitBreakerService.closeCircuitBreaker('db-insert');
    this.circuitBreakerService.closeCircuitBreaker('db-update');
    this.circuitBreakerService.closeCircuitBreaker('db-delete');
    this.circuitBreakerService.closeCircuitBreaker('db-transaction');

    this.logger.log(
      'Todos os circuit breakers de banco foram forçados para estado CLOSED',
    );
  }

  /**
   * Cria um circuit breaker específico para operações de banco
   */
  private createDatabaseCircuitBreaker(name: string): CircuitBreaker {
    const action = this.getDatabaseAction(name);
    const fallback = this.getDatabaseActionFallback(name);

    return this.circuitBreakerService.getCircuitBreaker(
      name,
      action,
      this.dbConfig,
      fallback,
    );
  }

  /**
   * Obtém a ação de banco correspondente ao nome do circuit breaker
   */
  private getDatabaseAction(name: string): (...args: any[]) => Promise<any> {
    switch (name) {
      case 'db-query':
        return async (query: string, parameters?: any[]) => {
          return this.dataSource.query(query, parameters);
        };
      case 'db-insert':
        return async (entity: any, data: any) => {
          const repository = this.dataSource.getRepository(entity);
          const result = await repository.save(data);
          return result;
        };
      case 'db-update':
        return async (entity: any, id: any, data: any) => {
          const repository = this.dataSource.getRepository(entity);
          await repository.update(id, data);
          return repository.findOne({ where: { id } });
        };
      case 'db-delete':
        return async (entity: any, id: any) => {
          const repository = this.dataSource.getRepository(entity);
          return repository.delete(id);
        };
      case 'db-transaction':
        return async (operation: () => Promise<any>) => {
          return this.dataSource.transaction(operation);
        };
      default:
        throw new Error(`Ação de banco desconhecida: ${name}`);
    }
  }

  /**
   * Obtém a função de fallback para operações de banco
   */
  private getDatabaseActionFallback(
    name: string,
  ): ((...args: any[]) => Promise<any>) | undefined {
    switch (name) {
      case 'db-query':
        return async (query: string, parameters?: any[]) => {
          this.logger.warn(
            `Fallback ativado para consulta: ${query.substring(0, 50)}...`,
          );

          // Tentar retornar dados em cache como fallback
          const cacheKey = this.generateCacheKey(query, parameters);
          const cached = this.getFromCache(cacheKey, true); // Aceitar cache expirado

          if (cached !== null) {
            this.logger.warn(
              'Retornando dados em cache expirados como fallback',
            );
            return cached;
          }

          // Se não há cache, retornar array vazio
          return [];
        };
      case 'db-insert':
        return async (entity: any, data: any) => {
          this.logger.warn(`Fallback ativado para inserção em ${entity.name}`);
          // Em caso de falha na inserção, não há muito que possamos fazer
          // Retornar os dados originais com um ID temporário
          return { ...data, id: -1, _fallback: true };
        };
      case 'db-update':
        return async (entity: any, id: any, data: any) => {
          this.logger.warn(
            `Fallback ativado para atualização em ${entity.name}`,
          );
          // Retornar os dados atualizados sem persistir
          return { id, ...data, _fallback: true };
        };
      case 'db-delete':
        return async (entity: any, id: any) => {
          this.logger.warn(`Fallback ativado para remoção em ${entity.name}`);
          // Simular sucesso na remoção
          return { affected: 1 };
        };
      case 'db-transaction':
        return async (operation: () => Promise<any>) => {
          this.logger.warn('Fallback ativado para transação');
          // Em caso de falha na transação, não executar a operação
          throw new Error('Transação não disponível - circuit breaker ativo');
        };
      default:
        return undefined;
    }
  }

  /**
   * Gera chave de cache para consulta
   */
  private generateCacheKey(query: string, parameters?: any[]): string {
    const paramStr = parameters ? JSON.stringify(parameters) : '';
    return `${query}:${paramStr}`;
  }

  /**
   * Obtém dados do cache
   */
  private getFromCache<T>(key: string, allowStale = false): T | null {
    if (!this.dbConfig.enableQueryCache) {
      return null;
    }

    const cached = this.queryCache.get(key);
    if (!cached) {
      return null;
    }

    // Verificar se expirou
    if (!allowStale && Date.now() > cached.expires) {
      return null;
    }

    return cached.data;
  }

  /**
   * Define dados no cache
   */
  private setInCache(key: string, data: any, query: string): void {
    if (!this.dbConfig.enableQueryCache) {
      return;
    }

    // Verificar limite de tamanho do cache
    if (this.queryCache.size >= this.dbConfig.maxCacheSize!) {
      this.cleanupOldestCache();
    }

    const expires = Date.now() + this.dbConfig.queryCacheTtl!;
    this.queryCache.set(key, { data, expires, query });
  }

  /**
   * Invalida cache relacionado a uma entidade
   */
  private invalidateRelatedCache(entityName: string): void {
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.queryCache.entries()) {
      if (cached.query.toLowerCase().includes(entityName.toLowerCase())) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.queryCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(
        `Cache invalidado: ${keysToDelete.length} entradas removidas para ${entityName}`,
      );
    }
  }

  /**
   * Remove as entradas mais antigas do cache
   */
  private cleanupOldestCache(): void {
    const entries = Array.from(this.queryCache.entries());
    entries.sort((a, b) => a[1].expires - b[1].expires);

    // Remover 10% das entradas mais antigas
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.queryCache.delete(entries[i][0]);
    }

    this.logger.debug(
      `Cache limpo: ${toRemove} entradas mais antigas removidas`,
    );
  }
}
