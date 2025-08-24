import { Injectable, Logger } from '@nestjs/common';
import {
  Repository,
  SelectQueryBuilder,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import { performance } from 'perf_hooks';

/**
 * Interface para configuração de otimização de consultas
 */
interface QueryOptimizationConfig {
  enablePagination?: boolean;
  defaultLimit?: number;
  maxLimit?: number;
  enableCaching?: boolean;
  cacheTTL?: number;
  enableProfiling?: boolean;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number;
}

/**
 * Interface para resultado de consulta otimizada
 */
interface OptimizedQueryResult<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  executionTime?: number;
  fromCache?: boolean;
}

/**
 * Interface para opções de paginação
 */
interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Interface para opções de ordenação
 */
interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Interface para entrada do cache
 */
interface CachedQuery {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Serviço para otimização automática de consultas ao banco de dados
 * Implementa paginação, cache, profiling e outras otimizações
 */
@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly queryCache = new Map<string, CachedQuery>();
  private cacheHits = 0;
  private cacheMisses = 0;

  private readonly defaultConfig: QueryOptimizationConfig = {
    enablePagination: true,
    defaultLimit: 20,
    maxLimit: 100,
    enableCaching: true,
    cacheTTL: 300000, // 5 minutos
    enableProfiling: process.env.NODE_ENV === 'development',
    logSlowQueries: true,
    slowQueryThreshold: 1000, // 1 segundo
  };

  /**
   * Otimiza uma consulta com paginação, cache e profiling
   */
  async optimizeQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: {
      pagination?: PaginationOptions;
      sort?: SortOptions[];
      config?: Partial<QueryOptimizationConfig>;
      cacheKey?: string;
    } = {},
  ): Promise<OptimizedQueryResult<T>> {
    const config = { ...this.defaultConfig, ...options.config };
    const startTime = performance.now();

    // Gerar chave de cache se não fornecida
    const cacheKey =
      options.cacheKey || this.generateCacheKey(queryBuilder, options);

    // Verificar cache primeiro
    if (config.enableCaching) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        const endTime = performance.now();
        return {
          ...cached,
          executionTime: Math.round((endTime - startTime) * 100) / 100,
          fromCache: true,
        };
      }
    }

    // Aplicar ordenação
    if (options.sort && options.sort.length > 0) {
      this.applySorting(queryBuilder, options.sort);
    }

    let result: OptimizedQueryResult<T>;

    // Aplicar paginação se habilitada
    if (config.enablePagination && options.pagination) {
      result = await this.executePaginatedQuery(
        queryBuilder,
        options.pagination,
        config,
      );
    } else {
      const data = await this.executeQuery(queryBuilder, config);
      result = { data };
    }

    const endTime = performance.now();
    const executionTime = Math.round((endTime - startTime) * 100) / 100;

    result.executionTime = executionTime;
    result.fromCache = false;

    // Log de queries lentas
    if (config.logSlowQueries && executionTime > config.slowQueryThreshold!) {
      this.logger.warn(`Slow query detected: ${executionTime}ms`, {
        sql: queryBuilder.getSql(),
        parameters: queryBuilder.getParameters(),
        executionTime,
      });
    }

    // Salvar no cache
    if (config.enableCaching) {
      this.saveToCache(cacheKey, result, config.cacheTTL!);
    }

    // Log de profiling
    if (config.enableProfiling) {
      this.logger.debug(`Query executed in ${executionTime}ms`, {
        sql: queryBuilder.getSql(),
        parameters: queryBuilder.getParameters(),
        resultCount: result.data.length,
        fromCache: false,
      });
    }

    return result;
  }

  /**
   * Executa uma consulta paginada
   */
  private async executePaginatedQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    pagination: PaginationOptions,
    config: QueryOptimizationConfig,
  ): Promise<OptimizedQueryResult<T>> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(
      config.maxLimit!,
      Math.max(1, pagination.limit || config.defaultLimit!),
    );
    const offset = pagination.offset || (page - 1) * limit;

    // Clonar query builder para contar total
    const countQueryBuilder = queryBuilder.clone();

    // Executar contagem e consulta em paralelo
    const [data, total] = await Promise.all([
      queryBuilder.skip(offset).take(limit).getMany(),
      countQueryBuilder.getCount(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Executa uma consulta simples
   */
  private async executeQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    config: QueryOptimizationConfig,
  ): Promise<T[]> {
    return queryBuilder.getMany();
  }

  /**
   * Aplica ordenação ao query builder
   */
  private applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    sortOptions: SortOptions[],
  ): void {
    sortOptions.forEach((sort, index) => {
      if (index === 0) {
        queryBuilder.orderBy(sort.field, sort.direction);
      } else {
        queryBuilder.addOrderBy(sort.field, sort.direction);
      }
    });
  }

  /**
   * Gera uma chave de cache baseada na consulta
   */
  private generateCacheKey<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: any,
  ): string {
    const sql = queryBuilder.getSql();
    const parameters = JSON.stringify(queryBuilder.getParameters());
    const optionsStr = JSON.stringify(options);

    // Usar hash simples para a chave
    return Buffer.from(`${sql}:${parameters}:${optionsStr}`).toString('base64');
  }

  /**
   * Obtém dados do cache
   */
  private getFromCache<T>(key: string): OptimizedQueryResult<T> | null {
    const cached = this.queryCache.get(key);

    if (!cached) {
      this.cacheMisses++;
      return null;
    }

    // Verificar se o cache expirou
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      this.cacheMisses++;
      return null;
    }

    this.cacheHits++;
    return cached.data;
  }

  /**
   * Salva dados no cache
   */
  private saveToCache<T>(
    key: string,
    data: OptimizedQueryResult<T>,
    ttl: number,
  ): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Limpar cache antigo periodicamente
    if (this.queryCache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Limpa entradas expiradas do cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.queryCache.delete(key));

    this.logger.debug(
      `Cache cleanup: removed ${keysToDelete.length} expired entries`,
    );
  }

  /**
   * Limpa todo o cache
   */
  public clearCache(): void {
    const stats = this.getCacheStats();
    this.queryCache.clear();
    this.logger.log(
      `Query cache cleared. Previous stats: ${stats.size} entries, ${stats.hitRate}% hit rate`,
    );
  }

  /**
   * Reseta as estatísticas de cache
   */
  public resetCacheStats(): void {
    const previousStats = this.getCacheStats();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    this.logger.log(
      `Cache statistics reset. Previous: ${previousStats.hits} hits, ${previousStats.misses} misses, ${previousStats.hitRate}% hit rate`,
    );
  }

  /**
   * Log das estatísticas atuais do cache
   */
  public logCacheStats(): void {
    const stats = this.getCacheStats();

    this.logger.log(
      `Cache Statistics - Size: ${stats.size}, Hit Rate: ${stats.hitRate}%, ` +
        `Total Requests: ${stats.totalRequests}, Hits: ${stats.hits}, Misses: ${stats.misses}, ` +
        `Memory Usage: ${Math.round(stats.memoryUsage / 1024)} KB`,
    );
  }

  /**
   * Obtém estatísticas do cache
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
    totalRequests: number;
    hits: number;
    misses: number;
  } {
    const size = this.queryCache.size;
    const memoryUsage = JSON.stringify([...this.queryCache.entries()]).length;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate =
      totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      size,
      hitRate: Math.round(hitRate * 100) / 100, // Arredonda para 2 casas decimais
      memoryUsage,
      totalRequests,
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
  }

  /**
   * Cria um query builder otimizado para uma entidade
   */
  public createOptimizedQueryBuilder<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    config?: Partial<QueryOptimizationConfig>,
  ): SelectQueryBuilder<T> {
    const queryBuilder = repository.createQueryBuilder(alias);

    // Aplicar otimizações padrão
    if (config?.enableProfiling !== false) {
      // Adicionar comentário para identificar a query
      queryBuilder.comment(`Optimized query for ${alias}`);
    }

    return queryBuilder;
  }

  /**
   * Otimiza consultas com joins para evitar N+1
   */
  public optimizeJoins<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    relations: string[],
  ): SelectQueryBuilder<T> {
    relations.forEach((relation) => {
      queryBuilder.leftJoinAndSelect(
        `${queryBuilder.alias}.${relation}`,
        relation,
      );
    });

    return queryBuilder;
  }

  /**
   * Aplica filtros de forma otimizada
   */
  public applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: Record<string, any>,
    allowedFields: string[],
  ): SelectQueryBuilder<T> {
    const entityAlias = queryBuilder.alias;

    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null && value !== '') {
        const paramName = `filter_${key}_${index}`;

        if (Array.isArray(value)) {
          queryBuilder.andWhere(`${entityAlias}.${key} IN (:...${paramName})`, {
            [paramName]: value,
          });
        } else if (typeof value === 'string' && value.includes('%')) {
          queryBuilder.andWhere(`${entityAlias}.${key} ILIKE :${paramName}`, {
            [paramName]: value,
          });
        } else {
          queryBuilder.andWhere(`${entityAlias}.${key} = :${paramName}`, {
            [paramName]: value,
          });
        }
      }
    });

    return queryBuilder;
  }
}
