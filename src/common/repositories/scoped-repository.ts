import { Repository, SelectQueryBuilder, EntityTarget, UpdateResult, DeleteResult, EntityManager, QueryRunner } from 'typeorm';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';
import { 
  ScopeViolationException, 
  ScopeContextRequiredException,
  StrictModeViolationException 
} from '../exceptions/scope.exceptions';
import { Logger } from '@nestjs/common';

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

  constructor(
    target: EntityTarget<Entity>,
    manager: EntityManager,
    queryRunner?: QueryRunner,
    options: ScopedRepositoryOptions = {}
  ) {
    super(target, manager, queryRunner);
    this.options = {
      strictMode: true, // Strict mode habilitado por padrão
      allowGlobalScope: false, // Desabilitar GLOBAL por padrão
      ...options
    };
  }
  
  /**
   * Busca todas as entidades aplicando escopo automaticamente
   */
  async findAll(options?: any): Promise<Entity[]> {
    const queryBuilder = this.createQueryBuilder('entity');
    this.applyScopeToQuery(queryBuilder);
    
    if (options?.relations) {
      options.relations.forEach(relation => {
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
      options.relations.forEach(relation => {
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
    options?: any
  ): Promise<{ data: Entity[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.createQueryBuilder('entity');
    this.applyScopeToQuery(queryBuilder);
    
    if (options?.relations) {
      options.relations.forEach(relation => {
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
      limit
    };
  }
  
  /**
   * Cria um QueryBuilder com escopo aplicado
   */
  createScopedQueryBuilder(alias: string = 'entity'): SelectQueryBuilder<Entity> {
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
  async updateWithScope(id: string | number, updateData: Partial<Entity>): Promise<Entity> {
    // Verificar se a entidade existe e está no escopo
    const existingEntity = await this.findById(id);
    
    if (!existingEntity) {
      throw new ScopeViolationException(
        `Entidade com ID ${id} não encontrada ou fora do escopo`
      );
    }
    
    // Aplicar atualização
    await this.update(id, updateData as any);
    
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
        `Entidade com ID ${id} não encontrada ou fora do escopo`
      );
    }
    
    await this.delete(id);
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
        context: RequestContextHolder.get()
      });
    }
    
    const queryBuilder = this.createQueryBuilder('entity');
    
    if (options?.relations) {
      options.relations.forEach(relation => {
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
  async findByIdGlobal(id: string | number, options?: any): Promise<Entity | null> {
    // Verificar strict mode
    this.validateGlobalAccess('findByIdGlobal');
    
    // Log de auditoria para operação global
    if (this.logger) {
      this.logger.warn(`GLOBAL ACCESS: findByIdGlobal executado para ID ${id}`, {
        entity: this.metadata.name,
        id,
        timestamp: new Date().toISOString(),
        context: RequestContextHolder.get()
      });
    }
    
    const queryBuilder = this.createQueryBuilder('entity');
    queryBuilder.where('entity.id = :id', { id });
    
    if (options?.relations) {
      options.relations.forEach(relation => {
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
        context: RequestContextHolder.get()
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
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
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
    
    if (context && context.tipo !== ScopeType.GLOBAL && !this.options?.allowGlobalScope) {
      throw new ScopeViolationException(
        `Método ${methodName} requer escopo GLOBAL ou allowGlobalScope habilitado`
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
              'Operações em massa não suportadas para entidades relacionadas em escopo UNIDADE'
            );
          }
        }
        break;
        
      case ScopeType.PROPRIO:
        if (this.hasColumn('user_id')) {
          scopedCriteria.user_id = context.user_id;
        } else {
          throw new ScopeViolationException(
            'Operações em massa não suportadas para entidades sem user_id em escopo PROPRIO'
          );
        }
        break;
        
      default:
        throw new ScopeViolationException(
          `Tipo de escopo não suportado para bulk operations: ${context.tipo}`
        );
    }
    
    return scopedCriteria;
  }
  
  /**
   * Verifica se uma coluna existe na entidade
   */
  private hasColumn(columnName: string): boolean {
    return this.metadata.columns.some(column => column.propertyName === columnName);
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder com fail-fast
   * 
   * @description
   * Método crítico que previne vazamento de dados aplicando fail-fast
   * quando contexto não está disponível, ao invés de retornar dados sem filtros
   */
  private applyScopeToQuery(
    queryBuilder: SelectQueryBuilder<Entity>, 
    alias: string = 'entity'
  ): void {
    const context = RequestContextHolder.get();
    
    // Fail-fast para prevenir vazamento de dados
    if (!context) {
      const operation = this.options?.operationName || 'query';
      
      // Log de auditoria para tentativa de acesso sem contexto
      if (this.logger) {
        this.logger.error(`SECURITY ALERT: Tentativa de ${operation} sem contexto de escopo`, {
          entity: this.metadata.name,
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack
        });
      }
      
      // Lançar exceção ao invés de retornar dados sem filtros
      throw new ScopeContextRequiredException(operation);
    }
    
    // Log de auditoria para operações com contexto válido
    if (this.logger) {
      this.logger.debug(`Aplicando escopo ${context.tipo} para ${this.metadata.name}`, {
        userId: context.user_id,
        unidadeId: context.unidade_id,
        entity: this.metadata.name
      });
    }
    
    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Escopo global: sem filtros adicionais
        break;
        
      case ScopeType.UNIDADE:
        // Escopo de unidade: aplicar filtro baseado na entidade
        if (context.unidade_id) {
          this.applyCidadaoScopeToQuery(queryBuilder, alias, context.unidade_id);
        }
        break;
        
      case ScopeType.PROPRIO:
        // Escopo próprio: filtrar por user_id (se a entidade possui esse campo)
        if (this.hasColumn('user_id')) {
          queryBuilder.andWhere(`${alias}.user_id = :userId`, {
            userId: context.user_id
          });
        }
        break;
        
      default:
        throw new ScopeViolationException(
          `Tipo de escopo não suportado: ${context.tipo}`
        );
    }
  }

  /**
   * Aplica filtro de unidade_id através do cidadão para entidades relacionadas
   */
  private applyCidadaoScopeToQuery(
    queryBuilder: SelectQueryBuilder<Entity>,
    alias: string,
    unidadeId: string
  ): void {
    const entityName = this.metadata.name;
    
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
        const hasExistingSolicitacaoJoin = existingJoins.some(join => 
          join.alias?.name === 'solicitacao' || join.entityOrProperty === `${alias}.solicitacao`
        );
        const hasExistingConcessaoJoin = existingJoins.some(join => 
          join.alias?.name === 'concessao' || join.entityOrProperty === `${alias}.concessao`
        );
        
        // Só fazer JOIN se não existir
        if (!hasExistingSolicitacaoJoin) {
          queryBuilder.leftJoin(`${alias}.solicitacao`, 'solicitacao_scope');
        }
        if (!hasExistingConcessaoJoin) {
          queryBuilder.leftJoin(`${alias}.concessao`, 'concessao_scope');
        }
        
        // Usar aliases únicos para evitar conflitos
        const solicitacaoAlias = hasExistingSolicitacaoJoin ? 'solicitacao' : 'solicitacao_scope';
        const concessaoAlias = hasExistingConcessaoJoin ? 'concessao' : 'concessao_scope';
        
        queryBuilder
          .leftJoin(`${solicitacaoAlias}.beneficiario`, 'cidadao_solicitacao_scope')
          .leftJoin(`${concessaoAlias}.solicitacao`, 'concessao_solicitacao_scope')
          .leftJoin('concessao_solicitacao_scope.beneficiario', 'cidadao_concessao_scope')
          .andWhere(
            '(cidadao_solicitacao_scope.unidade_id = :unidadeId OR cidadao_concessao_scope.unidade_id = :unidadeId)',
            { unidadeId }
          );
        break;
        
      default:
        // Para outras entidades: usar unidade_id direto se existir
        if (this.hasColumn('unidade_id')) {
          queryBuilder.andWhere(`${alias}.unidade_id = :unidadeId`, { unidadeId });
        }
        break;
    }
  }
  
  /**
   * Aplica campos de criação baseados no contexto de escopo
   */
  private applyCreationFields(entity: Partial<Entity>, context: IScopeContext): void {
    // Definir o user_id do criador (se a entidade possui esse campo)
    if (this.hasColumn('user_id')) {
      (entity as any).user_id = context.user_id;
    }
    
    // Para escopo UNIDADE, definir também unidade_id (se a entidade possui esse campo)
    if (context.tipo === ScopeType.UNIDADE && context.unidade_id && this.hasColumn('unidade_id')) {
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