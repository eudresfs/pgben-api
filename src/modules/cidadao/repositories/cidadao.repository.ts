import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository, DataSource, SelectQueryBuilder, EntityManager, ObjectLiteral } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cidadao } from '../../../entities/cidadao.entity';
import { ComposicaoFamiliar } from '../../../entities/composicao-familiar.entity';
import { CacheService } from '../../../shared/services/cache.service';
import { LoggingService } from '../../../shared/logging/logging.service';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { ParentescoEnum } from '../../../enums/parentesco.enum';
import { TipoPapel } from '../../../enums/tipo-papel.enum';
import { Sexo } from '../../../enums/sexo.enum';

// ========== INTERFACES E TIPOS ==========

export interface ComposicaoFamiliarDTO {
  nome: string;
  cpf?: string;
  nis?: string;
  idade?: number;
  ocupacao?: string;
  escolaridade?: EscolaridadeEnum;
  parentesco?: ParentescoEnum;
  renda?: number;
  observacoes?: string;
}

export interface FindAllOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  order?: Record<string, 'ASC' | 'DESC'>;
  includeRelations?: boolean;
  specificFields?: string[];
  useCache?: boolean;
}

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, unknown>;
  includeRelations?: boolean;
  specificFields?: string[];
}

export interface CursorPaginationResult<T> {
  items: T[];
  count: number;
  nextCursor?: string;
  hasNextPage: boolean;
}

// ========== DECORATORS ==========

/**
 * Decorator para invalidar cache após operações de escrita
 */
function InvalidateCache(patterns: string[] = ['*']) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      for (const pattern of patterns) {
        await this.cacheService.deletePattern(`cidadao:${pattern}`);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator para adicionar cache a métodos de leitura
 */
function Cacheable(keyGenerator: (...args: unknown[]) => string, ttl?: number) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const lastArg = args[args.length - 1] as { useCache?: boolean } | undefined;
      const useCache = lastArg?.useCache !== false;

      if (!useCache) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = keyGenerator.apply(this, args);
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return cached;
      }

      const result = await originalMethod.apply(this, args);

      if (result) {
        const cacheTtl = ttl || this.cacheTtl;
        await this.cacheService.set(cacheKey, result, cacheTtl);
      }

      return result;
    };

    return descriptor;
  };
}

// ========== CONSTANTES E CONFIGURAÇÕES ==========

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const MAX_PAGINATION_LIMIT = 100;
const MIN_SEARCH_LENGTH = 3; // Para busca com trigram

// ========== REPOSITORY BASE ==========

/**
 * Classe base para funcionalidades comuns de repositório
 */
abstract class BaseRepository<T extends ObjectLiteral> {
  protected abstract repository: Repository<T>;

  /**
   * Normaliza string removendo caracteres não numéricos
   */
  protected normalizeNumericString(value?: string): string | undefined {
    return value?.replace(/\D/g, '');
  }

  /**
   * Cria query builder com campos específicos
   */
  protected createQueryWithFields(
    alias: string,
    fields?: string[]
  ): SelectQueryBuilder<T> {
    const query = this.repository.createQueryBuilder(alias);

    if (fields && fields.length > 0) {
      const qualifiedFields = fields.map(field => `${alias}.${field}`);
      query.select(qualifiedFields);
    }

    return query;
  }
}

// ========== REPOSITÓRIO PRINCIPAL ==========

/**
 * Repositório de cidadãos com otimizações de performance e cache
 */
@Injectable()
export class CidadaoRepository extends BaseRepository<Cidadao> {
  protected repository: Repository<Cidadao>;
  private readonly cacheTtl: number;
  private readonly maxPaginationLimit: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: LoggingService,
  ) {
    super();
    this.repository = this.dataSource.getRepository(Cidadao);
    this.cacheTtl = this.configService.get('CACHE_TTL', DEFAULT_CACHE_TTL);
    this.maxPaginationLimit = this.configService.get('MAX_PAGINATION_LIMIT', MAX_PAGINATION_LIMIT);
  }

  // ========== MÉTODOS DE QUERY BUILDING ==========

  /**
   * Adiciona relacionamentos otimizados à query
   */
  private addOptimizedRelations(
    query: SelectQueryBuilder<Cidadao>,
    relations: string[] | boolean = false
  ): SelectQueryBuilder<Cidadao> {
    if (!relations || (Array.isArray(relations) && relations.length === 0)) {
      return query;
    }

    const relationsToLoad = Array.isArray(relations)
      ? relations
      : this.getDefaultRelations();

    // Adicionar apenas relações solicitadas
    relationsToLoad.forEach(relation => {
      switch (relation) {
        case 'papeis':
          query.leftJoinAndSelect(
            'cidadao.papeis',
            'papeis',
            'papeis.ativo = :papelAtivo',
            { papelAtivo: true }
          );
          break;

        case 'composicao_familiar':
          query.leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar');
          break;

        case 'unidade':
          query.leftJoinAndSelect('cidadao.unidade', 'unidade');
          break;

        case 'dados_sociais':
          query.leftJoinAndSelect('cidadao.dados_sociais', 'dados_sociais');
          break;

        case 'solicitacoes':
          query.leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes')
            .leftJoinAndSelect('solicitacoes.tipo_beneficio', 'tipo_beneficio')
            .leftJoinAndSelect('solicitacoes.documentos', 'solicitacao_documentos')
            .leftJoinAndSelect('solicitacoes.pagamentos', 'pagamentos');
          break;

        case 'documentos':
          query.leftJoinAndSelect('cidadao.documentos', 'documentos');
          break;

        case 'info_bancaria':
          query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria')
            .addSelect([
              'info_bancaria.id',
              'info_bancaria.banco',
              'info_bancaria.agencia',
              'info_bancaria.conta',
              'info_bancaria.tipo_conta',
              'info_bancaria.ativo'
            ]);
          break;
      }
    });

    return query;
  }

  /**
   * Retorna lista de relações padrão
   */
  private getDefaultRelations(): string[] {
    return [
      'papeis',
      'composicao_familiar',
      'unidade',
      'dados_sociais',
      'solicitacoes',
      'documentos',
      'info_bancaria'
    ];
  }

  /**
   * Otimiza condições de busca usando índices
   */
  private applySearchConditions(
    query: SelectQueryBuilder<Cidadao>,
    searchTerm: string,
    searchFields: string[] = ['nome', 'cpf', 'nis']
  ): void {
    if (!searchTerm || searchTerm.length === 0) { return; }

    const conditions: string[] = [];
    const params: Record<string, string> = {};

    searchFields.forEach((field, index) => {
      const paramKey = `search_${field}_${index}`;

      switch (field) {
        case 'nome':
          if (searchTerm.length >= MIN_SEARCH_LENGTH) {
            // Usar índice trigram para performance
            conditions.push(`cidadao.nome % :${paramKey}`);
            params[paramKey] = searchTerm;
          } else {
            conditions.push(`cidadao.nome ILIKE :${paramKey}`);
            params[paramKey] = `%${searchTerm}%`;
          }
          break;

        case 'cpf': {
          const cpfNormalized = this.normalizeNumericString(searchTerm);
          if (cpfNormalized) {
            conditions.push(`cidadao.cpf LIKE :${paramKey}`);
            params[paramKey] = `%${cpfNormalized}%`;
          }
          break;
        }

        case 'nis':
          conditions.push(`cidadao.nis LIKE :${paramKey}`);
          params[paramKey] = `%${searchTerm}%`;
          break;
      }
    });

    if (conditions.length > 0) {
      query.andWhere(`(${conditions.join(' OR ')})`);
      Object.entries(params).forEach(([key, value]) => {
        query.setParameter(key, value);
      });
    }
  }

  /**
   * Aplica filtros de forma otimizada
   */
  private applyFilters(
    query: SelectQueryBuilder<Cidadao>,
    filters: Record<string, unknown>
  ): void {
    // Contador para gerar nomes de parâmetros únicos e seguros
    let paramCounter = 0;
  
    // Extrair filtros especiais
    const { _filters = {}, search, ...standardFilters } = filters as any;
  
    // Processar filtros padrão
    Object.entries(standardFilters).forEach(([key, value]) => {
      if (value === undefined || value === null) { return; }
      
      // Gerar um nome de parâmetro seguro usando um contador
      const safeParamName = `param${paramCounter++}`;
      
      // Tratamento especial para campos JSONB (mantendo compatibilidade)
      if (key.startsWith('endereco.')) {
        const jsonField = key.split('.')[1];
        query.andWhere(`cidadao.endereco->>'${jsonField}' ILIKE :${safeParamName}`, {
          [safeParamName]: `%${value}%`
        });
      }
      // Tratamento para arrays (operador IN)
      else if (Array.isArray(value)) {
        query.andWhere(`cidadao.${key} IN (:...${safeParamName})`, { [safeParamName]: value });
      }
      // Tratamento para ranges
      else if (typeof value === 'object' && value !== null && ('min' in value || 'max' in value)) {
        const rangeValue = value as { min?: unknown; max?: unknown };
        if (rangeValue.min !== undefined) {
          const minParamName = `param${paramCounter++}`;
          query.andWhere(`cidadao.${key} >= :${minParamName}`, { [minParamName]: rangeValue.min });
        }
        if (rangeValue.max !== undefined) {
          const maxParamName = `param${paramCounter++}`;
          query.andWhere(`cidadao.${key} <= :${maxParamName}`, { [maxParamName]: rangeValue.max });
        }
      }
      // Tratamento padrão para campos comuns
      else {
        query.andWhere(`cidadao.${key} = :${safeParamName}`, { [safeParamName]: value });
      }
    });
  
    // Processamento de filtros especiais
    if (_filters) {
      // Tratamento para filtro de bairro
      if (_filters.bairro) {
        const bairroParamName = `param${paramCounter++}`;
        query.andWhere(`cidadao.endereco->>'bairro' ILIKE :${bairroParamName}`, {
          [bairroParamName]: `%${_filters.bairro}%`
        });
      }
      
      // Tratamento para busca numérica (CPF/NIS)
      if (_filters.numericSearch) {
        const numericSearch = _filters.numericSearch as string;
        const cpfParamName = `param${paramCounter++}`;
        const nisParamName = `param${paramCounter++}`;
        
        query.andWhere(`(cidadao.cpf LIKE :${cpfParamName} OR cidadao.nis LIKE :${nisParamName})`, {
          [cpfParamName]: `%${numericSearch}%`,
          [nisParamName]: `%${numericSearch}%`
        });
      }
    }
  }

  // ========== MÉTODOS DE BUSCA ==========

  /**
   * Busca todos os cidadãos com filtros e paginação
   */
  @Cacheable(
    function (options: FindAllOptions) {
      return `cidadao:findAll:${JSON.stringify(options)}`;
    }
  )
  async findAll(options: FindAllOptions = {}): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
      includeRelations = false,
      specificFields = [],
    } = options;

    // Validar limite de paginação
    const limit = Math.min(take, this.maxPaginationLimit);

    // Criar query base
    let query = this.createQueryWithFields('cidadao', specificFields);

    // Aplicar busca se houver termo
    const { search, ...filters } = where;
    if (search && typeof search === 'string') {
      this.applySearchConditions(query, search);
    }

    // Aplicar filtros
    this.applyFilters(query, filters);

    // Adicionar relacionamentos
    query = this.addOptimizedRelations(query, includeRelations);

    // Ordenação
    Object.entries(order).forEach(([field, direction]) => {
      query.addOrderBy(`cidadao.${field}`, direction);
    });

    // Paginação
    query.skip(skip).take(limit);

    // Log em desenvolvimento
    this.logQuery(query);

    return query.getManyAndCount();
  }

  /**
   * Busca cidadão por campo genérico
   */
  private async findByField(
    field: string,
    value: string,
    includeRelations: boolean | string[] = false,
    specificFields?: string[]
  ): Promise<Cidadao | null> {
    let query = this.createQueryWithFields('cidadao', specificFields);

    // Normalizar valor se for campo numérico
    const normalizedValue = ['cpf', 'nis', 'telefone'].includes(field)
      ? this.normalizeNumericString(value)
      : value;

    query.where(`cidadao.${field} = :value`, { value: normalizedValue });

    // Adicionar relacionamentos
    query = this.addOptimizedRelations(query, includeRelations);

    this.logQuery(query);

    return query.getOne();
  }

  /**
   * Busca cidadão por ID
   */
  @Cacheable(
    function (id: string, includeRelations: boolean | string[], specificFields?: string[]) {
      const relations = Array.isArray(includeRelations) ? includeRelations.join(',') : includeRelations;
      const fields = specificFields?.join(',') || '';
      return `cidadao:id:${id}:${relations}:${fields}`;
    }
  )
  async findById(
    id: string,
    includeRelations: boolean | string[] = false,
    specificFields?: string[]
  ): Promise<Cidadao | null> {
    return this.findByField('id', id, includeRelations, specificFields);
  }

  /**
   * Busca cidadão por CPF
   */
  @Cacheable(
    function (cpf: string, includeRelations: boolean | string[], specificFields?: string[]) {
      const normalizedCpf = this.normalizeNumericString(cpf);
      const relations = Array.isArray(includeRelations) ? includeRelations.join(',') : includeRelations;
      const fields = specificFields?.join(',') || '';
      return `cidadao:cpf:${normalizedCpf}:${relations}:${fields}`;
    }
  )
  async findByCpf(
    cpf: string,
    includeRelations: boolean | string[] = false,
    specificFields?: string[]
  ): Promise<Cidadao | null> {
    return this.findByField('cpf', cpf, includeRelations, specificFields);
  }

  /**
   * Busca cidadão por NIS
   */
  @Cacheable(
    function (nis: string, includeRelations: boolean | string[], specificFields?: string[]) {
      const normalizedNis = this.normalizeNumericString(nis);
      const relations = Array.isArray(includeRelations) ? includeRelations.join(',') : includeRelations;
      const fields = specificFields?.join(',') || '';
      return `cidadao:nis:${normalizedNis}:${relations}:${fields}`;
    }
  )
  async findByNis(
    nis: string,
    includeRelations: boolean | string[] = false,
    specificFields?: string[]
  ): Promise<Cidadao | null> {
    return this.findByField('nis', nis, includeRelations, specificFields);
  }

  /**
   * Busca cidadão por telefone
   */
  @Cacheable(
    function (telefone: string, includeRelations: boolean | string[], specificFields?: string[]) {
      const normalizedTelefone = this.normalizeNumericString(telefone);
      const relations = Array.isArray(includeRelations) ? includeRelations.join(',') : includeRelations;
      const fields = specificFields?.join(',') || '';
      return `cidadao:telefone:${normalizedTelefone}:${relations}:${fields}`;
    }
  )
  async findByTelefone(
    telefone: string,
    includeRelations: boolean | string[] = false,
    specificFields?: string[]
  ): Promise<Cidadao | null> {
    return this.findByField('telefone', telefone, includeRelations, specificFields);
  }

  /**
   * Busca cidadãos por nome (busca parcial)
   */
  @Cacheable(
    function (nome: string, includeRelations: boolean | string[], specificFields?: string[]) {
      const relations = Array.isArray(includeRelations) ? includeRelations.join(',') : includeRelations;
      const fields = specificFields?.join(',') || '';
      return `cidadao:nome:${nome}:${relations}:${fields}`;
    }
  )
  async findByNome(
    nome: string,
    includeRelations: boolean | string[] = false,
    specificFields?: string[]
  ): Promise<Cidadao[]> {
    let query = this.createQueryWithFields('cidadao', specificFields);

    // Aplicar busca por nome usando trigram se disponível
    this.applySearchConditions(query, nome, ['nome']);

    // Adicionar relacionamentos
    query = this.addOptimizedRelations(query, includeRelations);

    // Ordenar por relevância
    query.orderBy('cidadao.nome', 'ASC');

    this.logQuery(query);

    return query.getMany();
  }

  /**
   * Paginação baseada em cursor (mais eficiente para grandes volumes)
   */
  async findByCursor(
    options: CursorPaginationOptions
  ): Promise<CursorPaginationResult<Cidadao>> {
    const {
      cursor,
      limit = 10,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      where = {},
      includeRelations = false,
      specificFields = [],
    } = options;

    const validLimit = Math.min(limit, this.maxPaginationLimit);

    let query = this.createQueryWithFields('cidadao', specificFields);

    // Aplicar filtros
    const { search, ...filters } = where;
    if (search && typeof search === 'string') {
      this.applySearchConditions(query, search);
    }
    this.applyFilters(query, filters);

    // Aplicar cursor
    if (cursor) {
      const operator = orderDirection === 'DESC' ? '<' : '>';
      query.andWhere(
        `(cidadao.${orderBy}, cidadao.id) ${operator} (
          SELECT ${orderBy}, id FROM cidadao WHERE id = :cursorId
        )`,
        { cursorId: cursor }
      );
    }

    // Relacionamentos
    query = this.addOptimizedRelations(query, includeRelations);

    // Ordenação composta para garantir determinismo
    query
      .orderBy(`cidadao.${orderBy}`, orderDirection)
      .addOrderBy('cidadao.id', orderDirection);

    // Buscar um item a mais para verificar próxima página
    query.take(validLimit + 1);

    this.logQuery(query);

    const items = await query.getMany();

    // Verificar próxima página
    const hasNextPage = items.length > validLimit;
    if (hasNextPage) {
      items.pop();
    }

    const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined;

    // Obter contagem total (otimizada)
    const count = await this.getOptimizedCount(where);

    return {
      items,
      count,
      nextCursor,
      hasNextPage,
    };
  }

  /**
   * Contagem otimizada usando estatísticas do PostgreSQL
   */
  private async getOptimizedCount(where: Record<string, unknown>): Promise<number> {
    // Para queries sem filtros, usar estimativa do PostgreSQL
    if (Object.keys(where).length === 0) {
      try {
        const result = await this.dataSource.query(
          `SELECT n_live_tup AS estimate 
           FROM pg_stat_user_tables 
           WHERE schemaname = current_schema() 
           AND tablename = 'cidadao'`
        );

        if (result?.[0]?.estimate) {
          return parseInt(result[0].estimate, 10);
        }
      } catch (error) {
        this.logger.warn('Falha ao obter estimativa de contagem', error);
      }
    }

    // Fallback para contagem exata
    const query = this.repository.createQueryBuilder('cidadao');
    this.applyFilters(query, where);
    return query.getCount();
  }

  // ========== MÉTODOS DE ESCRITA ==========

  /**
   * Cria novo cidadão
   */
  @InvalidateCache(['*'])
  async create(data: Partial<Cidadao>): Promise<Cidadao> {
    // Normalizar dados
    const normalizedData = this.normalizeCidadaoData(data);

    // Validar dados únicos
    await this.validateUniqueFields(normalizedData);

    const cidadao = this.repository.create(normalizedData);
    return this.repository.save(cidadao);
  }

  /**
   * Atualiza cidadão existente
   */
  @InvalidateCache(['*'])
  async update(id: string, data: Partial<Cidadao>): Promise<Cidadao> {
    // Verificar existência
    const exists = await this.repository.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Normalizar dados
    const normalizedData = this.normalizeCidadaoData(data);

    // Validar dados únicos (excluindo o próprio registro)
    await this.validateUniqueFields(normalizedData, id);

    await this.repository.update(id, normalizedData);

    const updated = await this.findById(id, true);
    if (!updated) {
      throw new InternalServerErrorException('Erro ao recuperar cidadão atualizado');
    }

    return updated;
  }

  /**
   * Remove cidadão (soft delete)
   */
  @InvalidateCache(['*'])
  async remove(id: string): Promise<void> {
    const result = await this.repository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Cidadão não encontrado');
    }
  }

  // ========== COMPOSIÇÃO FAMILIAR ==========

  /**
   * Adiciona membro à composição familiar
   */
  @InvalidateCache(['*'])
  async addComposicaoFamiliar(
    cidadaoId: string,
    membro: ComposicaoFamiliarDTO
  ): Promise<Cidadao> {
    return this.dataSource.transaction(async (manager) => {
      // Validar cidadão
      const cidadao = await manager.findOne(Cidadao, {
        where: { id: cidadaoId },
        relations: ['papeis'],
      });

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Validar regras de negócio
      await this.validateComposicaoFamiliar(cidadao, membro, manager);

      // Criar membro
      const novoMembro = manager.create(ComposicaoFamiliar, {
        cidadao: { id: cidadaoId },
        ...this.normalizeComposicaoFamiliarData(membro),
      });

      await manager.save(ComposicaoFamiliar, novoMembro);

      // Retornar cidadão atualizado
      return this.findById(cidadaoId, true) as Promise<Cidadao>;
    });
  }

  /**
   * Remove membro da composição familiar
   */
  @InvalidateCache(['*'])
  async removeComposicaoFamiliar(
    cidadaoId: string,
    membroId: string
  ): Promise<Cidadao> {
    return this.dataSource.transaction(async (manager) => {
      // Validar membro pertence ao cidadão
      const membro = await manager.findOne(ComposicaoFamiliar, {
        where: {
          id: membroId,
          cidadao_id: cidadaoId,
        },
      });

      if (!membro) {
        throw new NotFoundException('Membro não encontrado na composição familiar');
      }

      await manager.softDelete(ComposicaoFamiliar, membroId);

      return this.findById(cidadaoId, true) as Promise<Cidadao>;
    });
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Normaliza dados do cidadão
   */
  private normalizeCidadaoData(data: Partial<Cidadao>): Partial<Cidadao> {
    const normalized = { ...data };

    if (normalized.cpf) {
      normalized.cpf = this.normalizeNumericString(normalized.cpf);
    }

    if (normalized.nis) {
      normalized.nis = this.normalizeNumericString(normalized.nis);
    }

    if (normalized.telefone) {
      normalized.telefone = this.normalizeNumericString(normalized.telefone);
    }

    if (normalized.sexo) {
      normalized.sexo = normalized.sexo.toLowerCase() as Sexo;
    }

    return normalized;
  }

  /**
   * Normaliza dados da composição familiar
   */
  private normalizeComposicaoFamiliarData(
    data: ComposicaoFamiliarDTO
  ): Partial<ComposicaoFamiliar> {
    return {
      nome: data.nome,
      cpf: this.normalizeNumericString(data.cpf),
      nis: this.normalizeNumericString(data.nis),
      idade: data.idade,
      ocupacao: data.ocupacao || '',
      escolaridade: data.escolaridade,
      parentesco: data.parentesco,
      renda: data.renda || 0,
      observacoes: data.observacoes,
    };
  }

  /**
 * Valida campos únicos
 */
  private async validateUniqueFields(
    data: Partial<Cidadao>,
    excludeId?: string
  ): Promise<void> {
    // Preparar condições WHERE
    const whereConditions: string[] = [];
    const parameters: Record<string, unknown> = {};

    // Adicionar condições para CPF
    if (data.cpf) {
      whereConditions.push('cidadao.cpf = :cpf');
      parameters.cpf = data.cpf;
    }

    // Adicionar condições para NIS
    if (data.nis) {
      whereConditions.push('cidadao.nis = :nis');
      parameters.nis = data.nis;
    }

    // Se não há condições, retornar
    if (whereConditions.length === 0) {
      return;
    }

    // Construir a query base
    const query = this.repository.createQueryBuilder('cidadao');

    // Adicionar condições WHERE usando parâmetros nomeados
    query.where('(' + whereConditions.join(' OR ') + ')', parameters);

    // Adicionar condição para excluir o próprio registro em caso de atualização
    if (excludeId) {
      query.andWhere('cidadao.id != :excludeId', { excludeId });
    }

    // Adicionar log para debug
    this.logQuery(query);

    // Executar a query
    const existing = await query.getOne();

    // Verificar resultados
    if (existing) {
      if (existing.cpf === data.cpf) {
        throw new ConflictException('CPF já cadastrado');
      }
      if (existing.nis === data.nis) {
        throw new ConflictException('NIS já cadastrado');
      }
    }
  }

  /**
   * Valida regras de negócio da composição familiar
   */
  private async validateComposicaoFamiliar(
    cidadao: Cidadao,
    membro: ComposicaoFamiliarDTO,
    manager: EntityManager
  ): Promise<void> {
    // Verificar se cidadão é beneficiário
    const isBeneficiario = cidadao.papeis?.some(
      (papel) => papel.tipo_papel === TipoPapel.BENEFICIARIO && papel.ativo
    );

    if (isBeneficiario) {
      throw new ConflictException(
        'Cidadão beneficiário não pode ser adicionado à composição familiar'
      );
    }

    // Verificar duplicatas
    const existing = await manager.findOne(ComposicaoFamiliar, {
      where: [
        { cidadao: { id: cidadao.id }, nome: membro.nome },
        ...(membro.cpf ? [{ cidadao: { id: cidadao.id }, cpf: this.normalizeNumericString(membro.cpf) }] : []),
      ],
    });

    if (existing) {
      const field = existing.cpf === this.normalizeNumericString(membro.cpf) ? 'CPF' : 'nome';
      throw new ConflictException(
        `Já existe um membro com o mesmo ${field} na composição familiar`
      );
    }
  }

  /**
   * Log de queries em desenvolvimento
   */
  private logQuery(query: SelectQueryBuilder<Cidadao>): void {
    if (process.env.NODE_ENV === 'development') {
      const [sql, params] = query.getQueryAndParameters();
      this.logger.debug('SQL Query', CidadaoRepository.name, { sql, params });
    }
  }
}

// ========== MÓDULO DE CONFIGURAÇÃO ==========

/**
 * Provider factory para o repositório
 */
export const cidadaoRepositoryProviders = [
  {
    provide: CidadaoRepository,
    useFactory: (
      dataSource: DataSource,
      cacheService: CacheService,
      configService: ConfigService,
      logger: LoggingService,
    ) => {
      return new CidadaoRepository(dataSource, cacheService, configService, logger);
    },
    inject: [DataSource, CacheService, ConfigService, LoggingService],
  },
];