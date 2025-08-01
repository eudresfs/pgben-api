import { Repository, SelectQueryBuilder, EntityTarget } from 'typeorm';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';
import { ScopeViolationException } from '../exceptions/scope.exceptions';

/**
 * Repository base com aplicação automática de escopo
 * 
 * @description
 * Estende o Repository do TypeORM para aplicar automaticamente
 * filtros de escopo baseados no contexto da requisição
 */
export class ScopedRepository<Entity> extends Repository<Entity> {
  
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
   */
  async findAllGlobal(options?: any): Promise<Entity[]> {
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
    return this.createQueryBuilder('entity').getCount();
  }
  
  // ========== MÉTODOS PRIVADOS ==========
  
  /**
   * Verifica se uma coluna existe na entidade
   */
  private hasColumn(columnName: string): boolean {
    return this.metadata.columns.some(column => column.propertyName === columnName);
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder
   */
  private applyScopeToQuery(
    queryBuilder: SelectQueryBuilder<Entity>, 
    alias: string = 'entity'
  ): void {
    const context = RequestContextHolder.get();
    
    if (!context) {
      // Se não há contexto, não aplicar filtros (para rotas públicas)
      return;
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