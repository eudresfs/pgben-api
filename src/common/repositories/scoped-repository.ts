import {
  Repository,
  SelectQueryBuilder,
  EntityTarget,
  UpdateResult,
  DeleteResult,
  EntityManager,
  QueryRunner,
} from 'typeorm';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';
import {
  ScopeViolationException,
  ScopeContextRequiredException,
  StrictModeViolationException,
} from '../exceptions/scope.exceptions';
import { Logger } from '@nestjs/common';
import { CacheService } from '../../shared/cache/cache.service';

/**
 * Opções de configuração para o ScopedRepository
 */
export interface ScopedRepositoryOptions {
  /** Modo strict: desabilita métodos globais e exige contexto sempre */
  strictMode?: boolean;
  /** Permite escopo GLOBAL (para administradores) */
  allowGlobalScope?: boolean;
  /** Nome da operação para logs de auditoria */
  operationName?: string;
  /** Habilitar cache de metadados para melhor performance */
  enableMetadataCache?: boolean;
  /** TTL do cache de metadados em segundos (padrão: 1 hora) */
  metadataCacheTTL?: number;
  /** Habilitar query hints para otimização de performance */
  enableQueryHints?: boolean;
  /** Forçar uso de índices específicos */
  forceIndexUsage?: boolean;
}

/**
 * Configurações de query hints para otimização
 */
interface QueryHintConfig {
  /** Usar índice composto para escopo + ID */
  useScopeIdIndex?: boolean;
  /** Usar índice composto para escopo + data de criação */
  useScopeCreatedAtIndex?: boolean;
  /** Usar índice composto para escopo + status */
  useScopeStatusIndex?: boolean;
  /** Limite de registros para usar LIMIT otimizado */
  optimizedLimitThreshold?: number;
  /** Usar ORDER BY otimizado para paginação */
  useOptimizedPagination?: boolean;
}

/**
 * Interface para cache de metadados de entidade
 */
interface EntityMetadataCache {
  /** Nomes das colunas da entidade */
  columnNames: Set<string>;
  /** Nome da entidade */
  entityName: string;
  /** Timestamp do cache */
  cachedAt: number;
  /** TTL do cache em milissegundos */
  ttl: number;
}

/**
 * Repository base com aplicação automática de escopo
 *
 * @description
 * Estende o Repository do TypeORM para aplicar automaticamente
 * filtros de escopo baseados no contexto da requisição.
 *
 * - Fail-fast quando contexto ausente (previne vazamento de dados)
 * - Strict mode para desabilitar métodos globais
 * - Proteção em operações bulk (update/delete)
 * - Logs de auditoria para operações sensíveis
 */
export class ScopedRepository<Entity> extends Repository<Entity> {
  private readonly logger = new Logger(ScopedRepository.name);
  private readonly options: ScopedRepositoryOptions;
  private static cacheService: CacheService;
  private static metadataCache = new Map<string, EntityMetadataCache>();
  private readonly cacheKeyPrefix = 'scoped_repo_metadata';

  constructor(
    target: EntityTarget<Entity>,
    manager: EntityManager,
    queryRunner?: QueryRunner,
    options: ScopedRepositoryOptions = {},
    cacheService?: CacheService,
  ) {
    super(target, manager, queryRunner);
    this.options = {
      strictMode: true, // Strict mode habilitado por padrão
      allowGlobalScope: false, // Desabilitar GLOBAL por padrão
      enableMetadataCache: true, // Cache habilitado por padrão
      metadataCacheTTL: 3600, // 1 hora por padrão
      enableQueryHints: true, // Query hints habilitados por padrão
      forceIndexUsage: false, // Não forçar índices por padrão
      ...options,
    };

    // Configurar cache service se fornecido
    if (cacheService && !ScopedRepository.cacheService) {
      ScopedRepository.cacheService = cacheService;
    }
  }

  /**
   * Configura o serviço de cache globalmente para todos os ScopedRepositories
   */
  static setCacheService(cacheService: CacheService): void {
    ScopedRepository.cacheService = cacheService;
  }

  /**
   * Busca todas as entidades aplicando escopo automaticamente
   */
  async findAll(options?: any): Promise<Entity[]> {
    const queryBuilder = this.createQueryBuilder('entity');
    this.applyScopeToQuery(queryBuilder);

    if (options?.relations) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    // Ordenação padrão por data de criação
    queryBuilder.orderBy('entity.created_at', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Busca uma entidade por ID aplicando escopo
   */
  async findById(id: string | number, options?: any): Promise<Entity | null> {
    const queryBuilder = this.createQueryBuilder('entity');
    this.applyScopeToQuery(queryBuilder);

    queryBuilder.where('entity.id = :id', { id });

    if (options?.relations) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    return queryBuilder.getOne();
  }

  /**
   * Conta entidades aplicando escopo
   */
  async countScoped(): Promise<number> {
    const queryBuilder = this.createQueryBuilder('entity');
    this.applyScopeToQuery(queryBuilder);
    return queryBuilder.getCount();
  }

  /**
   * Busca com paginação aplicando escopo
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    options?: any,
  ): Promise<{ data: Entity[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.createQueryBuilder('entity');
    this.applyScopeToQuery(queryBuilder);

    if (options?.relations) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Cria um QueryBuilder com escopo aplicado
   */
  createScopedQueryBuilder(
    alias: string = 'entity',
  ): SelectQueryBuilder<Entity> {
    const queryBuilder = this.createQueryBuilder(alias);
    this.applyScopeToQuery(queryBuilder, alias);
    return queryBuilder;
  }

  /**
   * Salva uma entidade aplicando campos de criação baseados no escopo
   */
  async saveWithScope(entity: Partial<Entity>): Promise<Entity> {
    const context = RequestContextHolder.get();

    if (context) {
      this.applyCreationFields(entity, context);
    }

    return this.save(entity as any);
  }

  /**
   * Atualiza uma entidade verificando permissões de escopo
   */
  async updateWithScope(
    id: string | number,
    updateData: Partial<Entity>,
  ): Promise<Entity> {
    // Verificar se a entidade existe e está no escopo
    const existingEntity = await this.findById(id);

    if (!existingEntity) {
      throw new ScopeViolationException(
        `Entidade com ID ${id} não encontrada ou fora do escopo`,
      );
    }

    // Aplicar atualização usando critérios corretos
    await this.update({ id }, updateData as any);

    // Retornar entidade atualizada
    return this.findById(id);
  }

  /**
   * Remove uma entidade verificando permissões de escopo
   */
  async deleteWithScope(id: string | number): Promise<void> {
    // Verificar se a entidade existe e está no escopo
    const existingEntity = await this.findById(id);

    if (!existingEntity) {
      throw new ScopeViolationException(
        `Entidade com ID ${id} não encontrada ou fora do escopo`,
      );
    }

    await this.delete({ id });
  }

  // ========== MÉTODOS GLOBAIS (SEM ESCOPO) ==========

  /**
   * Busca todas as entidades SEM aplicar escopo (uso administrativo)
   *
   * @description
   * Método protegido por strict mode para prevenir bypass acidental de filtros
   */
  async findAllGlobal(options?: any): Promise<Entity[]> {
    // Verificar strict mode
    this.validateGlobalAccess('findAllGlobal');

    // Log de auditoria para operação global
    if (this.logger) {
      this.logger.warn(`GLOBAL ACCESS: findAllGlobal executado`, {
        entity: this.metadata.name,
        timestamp: new Date().toISOString(),
        context: RequestContextHolder.get(),
      });
    }

    const queryBuilder = this.createQueryBuilder('entity');

    if (options?.relations) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    // Ordenação padrão por data de criação
    queryBuilder.orderBy('entity.created_at', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Busca por ID SEM aplicar escopo (uso administrativo)
   */
  async findByIdGlobal(
    id: string | number,
    options?: any,
  ): Promise<Entity | null> {
    // Verificar strict mode
    this.validateGlobalAccess('findByIdGlobal');

    // Log de auditoria para operação global
    if (this.logger) {
      this.logger.warn(
        `GLOBAL ACCESS: findByIdGlobal executado para ID ${id}`,
        {
          entity: this.metadata.name,
          id,
          timestamp: new Date().toISOString(),
          context: RequestContextHolder.get(),
        },
      );
    }

    const queryBuilder = this.createQueryBuilder('entity');
    queryBuilder.where('entity.id = :id', { id });

    if (options?.relations) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    return queryBuilder.getOne();
  }

  /**
   * Conta todas as entidades SEM aplicar escopo
   */
  async countGlobal(): Promise<number> {
    // Verificar strict mode
    this.validateGlobalAccess('countGlobal');

    // Log de auditoria para operação global
    if (this.logger) {
      this.logger.warn(`GLOBAL ACCESS: countGlobal executado`, {
        entity: this.metadata.name,
        timestamp: new Date().toISOString(),
        context: RequestContextHolder.get(),
      });
    }

    return this.createQueryBuilder('entity').getCount();
  }

  // ========== PROTEÇÃO BULK OPERATIONS ==========

  /**
   * Override do método update para aplicar escopo
   *
   * @description
   * Previne updates em massa que podem afetar dados de outras unidades
   */
  async update(criteria: any, partialEntity: any): Promise<UpdateResult> {
    // Verificar se há contexto válido
    const context = RequestContextHolder.get();
    if (!context) {
      throw new ScopeContextRequiredException('bulk update');
    }

    // Log de auditoria para operação bulk
    if (this.logger) {
      this.logger.warn(`BULK UPDATE: Operação em massa detectada`, {
        entity: this.metadata.name,
        criteria: JSON.stringify(criteria),
        context: context,
        timestamp: new Date().toISOString(),
      });
    }

    // Aplicar filtros de escopo aos critérios
    const scopedCriteria = this.applyScopeToCriteria(criteria, context);

    return super.update(scopedCriteria, partialEntity);
  }

  /**
   * Override do método delete para aplicar escopo
   *
   * @description
   * Previne deletes em massa que podem afetar dados de outras unidades
   */
  async delete(criteria: any): Promise<DeleteResult> {
    // Verificar se há contexto válido
    const context = RequestContextHolder.get();
    if (!context) {
      throw new ScopeContextRequiredException('bulk delete');
    }

    // Log de auditoria para operação bulk
    if (this.logger) {
      this.logger.warn(`BULK DELETE: Operação em massa detectada`, {
        entity: this.metadata.name,
        criteria: JSON.stringify(criteria),
        context: context,
        timestamp: new Date().toISOString(),
      });
    }

    // Aplicar filtros de escopo aos critérios
    const scopedCriteria = this.applyScopeToCriteria(criteria, context);

    return super.delete(scopedCriteria);
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Valida acesso a métodos globais
   *
   * @description
   * Verifica se operações globais são permitidas baseado na configuração
   */
  private validateGlobalAccess(methodName: string): void {
    const context = RequestContextHolder.get();

    if (this.options?.strictMode) {
      // Em strict mode, só permite se o usuário tem escopo GLOBAL
      if (!context || context.tipo !== ScopeType.GLOBAL) {
        throw new StrictModeViolationException(methodName);
      }
    }

    if (
      context &&
      context.tipo !== ScopeType.GLOBAL &&
      !this.options?.allowGlobalScope
    ) {
      throw new ScopeViolationException(
        `Método ${methodName} requer escopo GLOBAL ou allowGlobalScope habilitado`,
      );
    }
  }

  /**
   * Aplica filtros de escopo aos critérios de bulk operations
   *
   * @description
   * Adiciona filtros de escopo aos critérios de update/delete para prevenir
   * operações em dados fora do escopo
   */
  private applyScopeToCriteria(criteria: any, context: IScopeContext): any {
    const scopedCriteria = { ...criteria };

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Escopo global: sem filtros adicionais
        break;

      case ScopeType.UNIDADE:
        if (context.unidade_id) {
          // Para entidades com unidade_id direto
          if (this.hasColumn('unidade_id')) {
            scopedCriteria.unidade_id = context.unidade_id;
          } else {
            // Para entidades relacionadas, não permitir bulk operations
            throw new ScopeViolationException(
              'Operações em massa não suportadas para entidades relacionadas em escopo UNIDADE',
            );
          }
        }
        break;

      case ScopeType.PROPRIO:
        if (this.hasColumn('user_id')) {
          scopedCriteria.user_id = context.user_id;
        } else {
          throw new ScopeViolationException(
            'Operações em massa não suportadas para entidades sem user_id em escopo PROPRIO',
          );
        }
        break;

      default:
        throw new ScopeViolationException(
          `Tipo de escopo não suportado para bulk operations: ${context.tipo}`,
        );
    }

    return scopedCriteria;
  }

  /**
   * Verifica se uma coluna existe na entidade com cache otimizado
   */
  private hasColumn(columnName: string): boolean {
    if (!this.options.enableMetadataCache) {
      // Cache desabilitado: usar verificação direta
      return this.metadata.columns.some(
        (column) => column.propertyName === columnName,
      );
    }

    const entityName = this.metadata.name;
    const cacheKey = `${this.cacheKeyPrefix}:${entityName}`;

    // Verificar cache em memória primeiro (L1)
    const memoryCache = ScopedRepository.metadataCache.get(cacheKey);
    if (memoryCache && this.isCacheValid(memoryCache)) {
      return memoryCache.columnNames.has(columnName);
    }

    // Cache miss ou expirado: reconstruir
    const columnNames = new Set(
      this.metadata.columns.map((column) => column.propertyName),
    );

    const cacheEntry: EntityMetadataCache = {
      columnNames,
      entityName,
      cachedAt: Date.now(),
      ttl: (this.options.metadataCacheTTL || 3600) * 1000, // Converter para ms
    };

    // Armazenar em cache L1 (memória)
    ScopedRepository.metadataCache.set(cacheKey, cacheEntry);

    // Armazenar em cache L2 (Redis) se disponível
    this.setCacheL2(cacheKey, cacheEntry);

    return columnNames.has(columnName);
  }

  /**
   * Verifica se o cache ainda é válido
   */
  private isCacheValid(cache: EntityMetadataCache): boolean {
    return Date.now() - cache.cachedAt < cache.ttl;
  }

  /**
   * Armazena metadados no cache L2 (Redis) de forma assíncrona
   */
  private setCacheL2(key: string, data: EntityMetadataCache): void {
    if (!ScopedRepository.cacheService) {
      return;
    }

    // Executar de forma assíncrona para não bloquear
    setImmediate(async () => {
      try {
        const serializedData = {
          columnNames: Array.from(data.columnNames),
          entityName: data.entityName,
          cachedAt: data.cachedAt,
          ttl: data.ttl,
        };

        await ScopedRepository.cacheService.set(
          key,
          JSON.stringify(serializedData),
          this.options.metadataCacheTTL || 3600,
        );

        this.logger.debug(
          `Cache L2 atualizado para entidade ${data.entityName}`,
        );
      } catch (error) {
        this.logger.warn(
          `Erro ao armazenar cache L2 para ${data.entityName}: ${error.message}`,
        );
      }
    });
  }

  /**
   * Recupera metadados do cache L2 (Redis)
   */
  private async getCacheL2(key: string): Promise<EntityMetadataCache | null> {
    if (!ScopedRepository.cacheService) {
      return null;
    }

    try {
      const cached = await ScopedRepository.cacheService.get(key);
      if (!cached || typeof cached !== 'string') {
        return null;
      }

      const data = JSON.parse(cached);
      return {
        columnNames: new Set(data.columnNames),
        entityName: data.entityName,
        cachedAt: data.cachedAt,
        ttl: data.ttl,
      };
    } catch (error) {
      this.logger.warn(
        `Erro ao recuperar cache L2 para ${key}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Limpa o cache de metadados para uma entidade específica
   */
  clearMetadataCache(): void {
    const entityName = this.metadata.name;
    const cacheKey = `${this.cacheKeyPrefix}:${entityName}`;

    // Limpar cache L1
    ScopedRepository.metadataCache.delete(cacheKey);

    // Limpar cache L2 de forma assíncrona
    if (ScopedRepository.cacheService) {
      setImmediate(async () => {
        try {
          await ScopedRepository.cacheService.del(cacheKey);
          this.logger.debug(`Cache limpo para entidade ${entityName}`);
        } catch (error) {
          this.logger.warn(
            `Erro ao limpar cache L2 para ${entityName}: ${error.message}`,
          );
        }
      });
    }
  }

  /**
   * Limpa todo o cache de metadados (método estático)
   */
  static clearAllMetadataCache(): void {
    ScopedRepository.metadataCache.clear();

    if (ScopedRepository.cacheService) {
      setImmediate(async () => {
        try {
          // Como delPattern não existe, limpar todo o cache
          // Em produção, seria melhor implementar delPattern no CacheService
          await ScopedRepository.cacheService.clear();
        } catch (error) {
          console.warn(`Erro ao limpar cache L2 completo: ${error.message}`);
        }
      });
    }
  }

  /**
   * Obtém estatísticas do cache de metadados
   */
  static getCacheStats(): {
    l1Size: number;
    entities: string[];
    oldestCache: number | null;
    newestCache: number | null;
  } {
    const entities = Array.from(ScopedRepository.metadataCache.keys());
    const caches = Array.from(ScopedRepository.metadataCache.values());

    return {
      l1Size: ScopedRepository.metadataCache.size,
      entities: entities.map((key) => key.replace('scoped_repo_metadata:', '')),
      oldestCache:
        caches.length > 0 ? Math.min(...caches.map((c) => c.cachedAt)) : null,
      newestCache:
        caches.length > 0 ? Math.max(...caches.map((c) => c.cachedAt)) : null,
    };
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder com fail-fast e otimizações
   *
   * @description
   * Método crítico que previne vazamento de dados aplicando fail-fast
   * quando contexto não está disponível, ao invés de retornar dados sem filtros
   */
  private applyScopeToQuery(
    queryBuilder: SelectQueryBuilder<Entity>,
    alias: string = 'entity',
  ): void {
    const context = RequestContextHolder.get();

    // Fail-fast para prevenir vazamento de dados
    if (!context) {
      const operation = this.options?.operationName || 'query';

      // Log de auditoria para tentativa de acesso sem contexto
      if (this.logger) {
        this.logger.error(
          `SECURITY ALERT: Tentativa de ${operation} sem contexto de escopo`,
          {
            entity: this.metadata.name,
            timestamp: new Date().toISOString(),
            stackTrace: new Error().stack,
          },
        );
      }

      // Lançar exceção ao invés de retornar dados sem filtros
      throw new ScopeContextRequiredException(operation);
    }

    // Log essencial para auditoria de escopo
    this.logger.debug(
      `[SCOPE-DEBUG] Aplicando escopo ${context.tipo} para ${this.metadata.name}`,
      {
        entityName: this.metadata.name,
        scopeType: context.tipo,
        unidadeId: context.unidade_id,
        alias: alias
      },
    );

    // Aplicar query hints se habilitado
    if (this.options.enableQueryHints) {
      this.applyQueryHints(queryBuilder, context, alias);
    }

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Escopo global - sem filtros adicionais
        this.logger.debug(`[SCOPE-DEBUG] Escopo GLOBAL - nenhum filtro aplicado para ${this.metadata.name}`);
        break;

      case ScopeType.UNIDADE:
        if (context.unidade_id) {
          this.logger.debug(`[SCOPE-DEBUG] Aplicando filtro UNIDADE para ${this.metadata.name} com unidade_id: ${context.unidade_id}`);
          this.applyCidadaoScopeToQuery(
            queryBuilder,
            alias,
            context.unidade_id,
          );
          
          // Log da query final para debug
          const finalSql = queryBuilder.getQuery();
          const parameters = queryBuilder.getParameters();
          this.logger.debug(`[SCOPE-DEBUG] Query final para ${this.metadata.name}:`, {
            sql: finalSql,
            parameters: parameters
          });
        } else {
          this.logger.warn(
            `Escopo UNIDADE sem unidade_id - fallback para GLOBAL`,
            { entity: this.metadata.name },
          );
        }
        break;

      case ScopeType.PROPRIO:
        if (this.hasColumn('user_id')) {
          queryBuilder.andWhere(`${alias}.user_id = :userId`, {
            userId: context.user_id,
          });
          this.logger.debug(`[SCOPE-DEBUG] Filtro PROPRIO aplicado para ${this.metadata.name} com user_id: ${context.user_id}`);
        }
        break;

      default:
        throw new ScopeViolationException(
          `Tipo de escopo não suportado: ${context.tipo}`,
        );
    }
  }

  /**
   * Aplica query hints para otimização de performance
   */
  private applyQueryHints(
    queryBuilder: SelectQueryBuilder<Entity>,
    context: IScopeContext,
    alias: string,
  ): void {
    const tableName = this.metadata.tableName;
    const hints: string[] = [];

    // Sugerir índices compostos baseados no tipo de escopo
    switch (context.tipo) {
      case ScopeType.UNIDADE:
        if (this.hasColumn('unidade_id')) {
          // Sugerir índice composto (unidade_id, id) para consultas por escopo
          hints.push(`USE INDEX (idx_${tableName}_unidade_id)`);

          // Para consultas com ordenação, sugerir índice com created_at
          if (this.hasColumn('created_at')) {
            hints.push(`USE INDEX (idx_${tableName}_unidade_created)`);
          }
        }
        break;

      case ScopeType.PROPRIO:
        // Para escopo próprio, otimizar índice user_id
        if (this.hasColumn('user_id')) {
          hints.push(`USE INDEX (idx_${tableName}_user_id)`);
        }
        break;
    }

    // Aplicar hints se disponíveis (PostgreSQL usa diferentes sintaxes)
    if (hints.length > 0 && this.options.forceIndexUsage) {
      // Para PostgreSQL, usar comentários como hints
      const hintComment = `/* ${hints.join(', ')} */`;
      queryBuilder.comment(hintComment);
    }

    // Otimizações específicas para paginação
    this.applyPaginationOptimizations(queryBuilder);
  }

  /**
   * Aplica otimizações específicas para paginação
   */
  private applyPaginationOptimizations(
    queryBuilder: SelectQueryBuilder<Entity>,
  ): void {
    // Se a query tem LIMIT, otimizar para paginação
    const queryString = queryBuilder.getQuery();

    if (queryString.includes('LIMIT') || queryString.includes('OFFSET')) {
      // Para PostgreSQL, usar LIMIT otimizado
      if (this.hasColumn('id')) {
        // Sugerir ordenação por ID para paginação eficiente
        queryBuilder.addOrderBy('entity.id', 'ASC');
      }

      // Para consultas com muitos registros, usar cursor-based pagination hint
      queryBuilder.comment(
        '/* HINT: Consider cursor-based pagination for large datasets */',
      );
    }
  }

  /**
   * Cria query builder otimizado com hints de performance
   */
  createOptimizedQueryBuilder(
    alias?: string,
    queryHints?: QueryHintConfig,
  ): SelectQueryBuilder<Entity> {
    const query = this.createQueryBuilder(alias);

    if (this.options.enableQueryHints && queryHints) {
      // Aplicar configurações específicas de hints
      if (queryHints.useScopeIdIndex && this.hasColumn('unidade_id')) {
        query.comment('/* USE INDEX: scope_id_composite */');
      }

      if (queryHints.useOptimizedPagination) {
        // Preparar para paginação otimizada
        query.comment('/* HINT: Optimized for pagination */');
      }

      if (queryHints.optimizedLimitThreshold) {
        // Configurar threshold para LIMIT otimizado
        query.comment(
          `/* LIMIT_THRESHOLD: ${queryHints.optimizedLimitThreshold} */`,
        );
      }
    }

    return query;
  }

  /**
   * Aplica filtro de unidade_id através do cidadão para entidades relacionadas
   */
  private applyCidadaoScopeToQuery(
    queryBuilder: SelectQueryBuilder<Entity>,
    alias: string,
    unidadeId: string,
  ): void {
    const entityName = this.metadata.name;

    this.logger.debug(
      `Aplicando filtro de unidade para ${entityName}`,
      { entityName, unidadeId },
    );

    switch (entityName) {
      case 'Solicitacao':
        // Para Solicitacao: JOIN com beneficiario (cidadão)
        queryBuilder
          .leftJoin(`${alias}.beneficiario`, 'cidadao')
          .andWhere('cidadao.unidade_id = :unidadeId', { unidadeId });
        break;

      case 'Concessao':
        // Para Concessao: JOIN com solicitacao.beneficiario
        queryBuilder
          .leftJoin(`${alias}.solicitacao`, 'solicitacao')
          .leftJoin('solicitacao.beneficiario', 'cidadao')
          .andWhere('cidadao.unidade_id = :unidadeId', { unidadeId });
        break;

      case 'Pagamento':
        // Para Pagamento: verificar se já existe JOIN com solicitacao
        const existingJoins = queryBuilder.expressionMap.joinAttributes;
        const hasExistingSolicitacaoJoin = existingJoins.some(
          (join) =>
            join.alias?.name === 'solicitacao' ||
            join.entityOrProperty === `${alias}.solicitacao`,
        );
        const hasExistingConcessaoJoin = existingJoins.some(
          (join) =>
            join.alias?.name === 'concessao' ||
            join.entityOrProperty === `${alias}.concessao`,
        );

        // Só fazer JOIN se não existir
        if (!hasExistingSolicitacaoJoin) {
          queryBuilder.leftJoin(`${alias}.solicitacao`, 'solicitacao_scope');
        }
        if (!hasExistingConcessaoJoin) {
          queryBuilder.leftJoin(`${alias}.concessao`, 'concessao_scope');
        }

        // Usar aliases únicos para evitar conflitos
        const solicitacaoAlias = hasExistingSolicitacaoJoin
          ? 'solicitacao'
          : 'solicitacao_scope';
        const concessaoAlias = hasExistingConcessaoJoin
          ? 'concessao'
          : 'concessao_scope';

        queryBuilder
          .leftJoin(
            `${solicitacaoAlias}.beneficiario`,
            'cidadao_solicitacao_scope',
          )
          .leftJoin(
            `${concessaoAlias}.solicitacao`,
            'concessao_solicitacao_scope',
          )
          .leftJoin(
            'concessao_solicitacao_scope.beneficiario',
            'cidadao_concessao_scope',
          )
          .andWhere(
            '(cidadao_solicitacao_scope.unidade_id = :unidadeId OR cidadao_concessao_scope.unidade_id = :unidadeId)',
            { unidadeId },
          );
        break;

      default:
        // Para outras entidades: usar unidade_id direto se existir
        if (this.hasColumn('unidade_id')) {
          queryBuilder.andWhere(`${alias}.unidade_id = :unidadeId`, {
            unidadeId,
          });
        }
        break;
    }
  }

  /**
   * Aplica campos de criação baseados no contexto de escopo
   */
  private applyCreationFields(
    entity: Partial<Entity>,
    context: IScopeContext,
  ): void {
    // Definir o user_id do criador (se a entidade possui esse campo)
    if (this.hasColumn('user_id')) {
      (entity as any).user_id = context.user_id;
    }

    // Para escopo UNIDADE, definir também unidade_id (se a entidade possui esse campo)
    if (
      context.tipo === ScopeType.UNIDADE &&
      context.unidade_id &&
      this.hasColumn('unidade_id')
    ) {
      (entity as any).unidade_id = context.unidade_id;
    }

    // Campos de auditoria (se a entidade possui esses campos)
    if (this.hasColumn('created_at')) {
      (entity as any).created_at = new Date();
    }
    if (this.hasColumn('updated_at')) {
      (entity as any).updated_at = new Date();
    }
  }
}
