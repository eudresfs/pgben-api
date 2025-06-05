import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  throwBeneficioNotFound,
  throwBeneficioAlreadyExists,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
  BeneficioErrorContext,
} from '../../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../../shared/constants/beneficio.constants';

/**
 * Interface para entidades de dados de benefício
 */
export interface IDadosBeneficioEntity {
  id: string;
  solicitacao_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para DTOs de criação
 */
export interface ICreateDadosBeneficioDto {
  solicitacao_id: string;
  [key: string]: any;
}

/**
 * Interface para DTOs de atualização
 */
export interface IUpdateDadosBeneficioDto {
  [key: string]: any;
}

/**
 * Interface para resultado paginado
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Classe base abstrata para serviços de dados de benefício
 * Implementa operações CRUD comuns seguindo princípios SOLID e DRY
 */
@Injectable()
export abstract class AbstractDadosBeneficioService<
  TEntity extends IDadosBeneficioEntity,
  TCreateDto extends ICreateDadosBeneficioDto,
  TUpdateDto extends IUpdateDadosBeneficioDto,
> {
  protected readonly entityName: string;
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly dtoClass: new () => TCreateDto;

  constructor(
    protected readonly repository: Repository<TEntity>,
    entityName: string,
    dtoClass: new () => TCreateDto,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
  ) {
    this.entityName = entityName;
    this.dtoClass = dtoClass;
  }

  /**
   * Métodos abstratos que devem ser implementados pelos serviços específicos
   */
  protected abstract validateCreateData(data: TCreateDto): Promise<void>;
  protected abstract validateUpdateData(data: TUpdateDto, entity: TEntity): Promise<void>;
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        beneficioId: data.id,
        tipo: this.entityName
      },
      operationalContext: {
        module: 'beneficio',
        operation: this.entityName,
        entityId: data.id || 'unknown',
        entityType: this.entityName
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...data
      }
    };
  }

  /**
   * Gera chave de cache para uma entidade específica
   */
  protected getCacheKey(id: string): string {
    return `${this.entityName}:${id}`;
  }

  /**
   * Gera chave de cache para listagem
   */
  protected getListCacheKey(filters?: any): string {
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    return `${this.entityName}:list:${filterKey}`;
  }

  /**
   * Invalida cache relacionado à entidade
   */
  protected async invalidateCache(id?: string): Promise<void> {
    try {
      if (id) {
        await this.cacheManager.del(this.getCacheKey(id));
      }
      // Invalida todas as listas em cache
      // Note: cache-manager não tem método keys direto, então invalidamos manualmente
      await this.cacheManager.del(`${this.entityName}:list`);
      await this.cacheManager.del(`${this.entityName}:list:all`);
    } catch (error) {
      this.logger.warn(`Erro ao invalidar cache: ${error.message}`);
    }
  }

  /**
   * Verifica se uma entidade existe
   */
  protected async checkExists(id: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(id);
    
    // Verifica no cache primeiro
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return true;
    }

    // Verifica no banco de dados
    const count = await this.repository.count({ where: { id } as any });
    return count > 0;
  }

  /**
   * Criar dados de benefício
   */
  async create(createDto: TCreateDto): Promise<TEntity> {
    const startTime = Date.now();
    const operationId = `create-${this.entityName}-${Date.now()}`;
    
    this.logger.debug(`[${operationId}] Iniciando criação de ${this.entityName}`, {
      solicitacao_id: createDto.solicitacao_id
    });

    try {
      // Converter objeto plain para instância da classe DTO
      const dtoInstance = plainToInstance(this.dtoClass, createDto);

      // Validação usando class-validator
      const errors = await validate(dtoInstance);
      if (errors.length > 0) {
        const errorBuilder = new BeneficioValidationErrorBuilder();
        
        errors.forEach(error => {
          const field = error.property;
          const constraints = Object.values(error.constraints || {});
          constraints.forEach(message => {
            errorBuilder.add(field, message);
          });
        });
        
        this.logger.warn(`[${operationId}] Falha na validação class-validator`, {
          errors_count: errors.length,
          fields: errors.map(e => e.property)
        });
        
        errorBuilder.throwIfHasErrors();
      }

      // Validação específica do benefício
      await this.validateCreateData(createDto);

      // Verificar se já existem dados para esta solicitação
      const existingData = await this.repository.findOne({
        where: { solicitacao_id: createDto.solicitacao_id } as any,
      });

      if (existingData) {
        this.logger.warn(`[${operationId}] Dados já existem para solicitação`, {
          solicitacao_id: createDto.solicitacao_id,
          existing_id: (existingData as any).id
        });
        throwBeneficioAlreadyExists(this.buildErrorContext(createDto));
      }

      // Criar e salvar entidade
      const entity = this.repository.create(createDto as any);
      const savedEntity = await this.repository.save(entity);
      
      // Cache da entidade criada (operação assíncrona não bloqueante)
      const cacheKey = this.getCacheKey((savedEntity as any).id);
      this.cacheManager.set(
        cacheKey, 
        savedEntity, 
        BENEFICIO_CONSTANTS.CACHE.TTL_SECONDS
      ).catch(cacheError => {
        this.logger.warn(`[${operationId}] Falha ao cachear entidade criada`, {
          error: cacheError.message,
          entity_id: (savedEntity as any).id
        });
      });
      
      // Invalida cache de listas (operação assíncrona não bloqueante)
      this.invalidateCache().catch(invalidateError => {
        this.logger.warn(`[${operationId}] Falha ao invalidar cache`, {
          error: invalidateError.message
        });
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] ${this.entityName} criado com sucesso`, {
        entity_id: (savedEntity as any).id,
        duration_ms: duration,
        solicitacao_id: createDto.solicitacao_id
      });
      
      return savedEntity as unknown as TEntity;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Tratamento específico para erros de validação de benefício
      if (error.code?.startsWith('BENEFICIO_')) {
        this.logger.warn(`[${operationId}] Erro de validação de benefício`, {
          error_code: error.code,
          duration_ms: duration,
          solicitacao_id: createDto.solicitacao_id
        });
        throw error;
      }
      
      // Tratamento para violação de constraint de unicidade
      if (error.code === '23505') {
        this.logger.warn(`[${operationId}] Tentativa de criação duplicada`, {
          duration_ms: duration,
          solicitacao_id: createDto.solicitacao_id
        });
        throwBeneficioAlreadyExists(this.buildErrorContext(createDto));
      }
      
      // Log de erro genérico
      this.logger.error(`[${operationId}] Erro inesperado ao criar ${this.entityName}`, {
        error: error.message,
        error_code: error.code,
        duration_ms: duration,
        solicitacao_id: createDto.solicitacao_id,
        stack: error.stack
      });
      
      throw new InternalServerErrorException(
        `Erro interno ao criar dados de ${this.entityName.toLowerCase()}. Tente novamente em alguns instantes.`
      );
    }
  }

  /**
   * Buscar dados por ID
   */
  async findOne(id: string): Promise<TEntity> {
    this.validateId(id);

    const cacheKey = this.getCacheKey(id);
    
    // Verifica no cache primeiro
    let entity = await this.cacheManager.get<TEntity>(cacheKey);
    
    if (!entity) {
      // Busca no banco de dados
      entity = await this.repository.findOne({
        where: { id } as any,
        relations: ['solicitacao'],
      });
      
      if (entity) {
        // Armazena no cache
        await this.cacheManager.set(
          cacheKey, 
          entity, 
          BENEFICIO_CONSTANTS.CACHE.TTL_SECONDS
        );
      }
    }

    if (!entity) {
      throwBeneficioNotFound(
        id,
        this.buildErrorContext({ beneficioId: id }),
      );
    }

    return entity;
  }

  /**
   * Buscar dados por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<TEntity> {
    this.validateId(solicitacaoId, 'ID da solicitação');

    const entity = await this.repository.findOne({
      where: { solicitacao_id: solicitacaoId } as any,
      relations: ['solicitacao'],
    });

    if (!entity) {
      throwBeneficioNotFound(
        solicitacaoId,
        this.buildErrorContext({ solicitacaoId }),
      );
    }

    return entity;
  }

  /**
   * Atualizar dados de benefício
   */
  async update(id: string, data: TUpdateDto): Promise<TEntity> {
    this.logger.debug(`Atualizando ${this.entityName}`, { id, data });

    // Validação usando class-validator
    const errors = await validate(data as object);
    if (errors.length > 0) {
      const errorBuilder = new BeneficioValidationErrorBuilder();
      errors.forEach(error => {
        const field = error.property;
        const constraints = Object.values(error.constraints || {});
        constraints.forEach(message => {
          errorBuilder.add(field, message);
        });
      });
      errorBuilder.throwIfHasErrors();
    }

    const entity = await this.findOne(id);
    
    // Validação específica do benefício
    await this.validateUpdateData(data, entity);

    try {
      Object.assign(entity, data);
      const updatedEntity = await this.repository.save(entity);
      
      // Atualiza cache
      const cacheKey = this.getCacheKey(id);
      await this.cacheManager.set(
        cacheKey, 
        updatedEntity, 
        BENEFICIO_CONSTANTS.CACHE.TTL_SECONDS
      );
      
      // Invalida cache de listas
      await this.invalidateCache();
      
      this.logger.debug(`${this.entityName} atualizado com sucesso`, { id });
      return updatedEntity;
    } catch (error) {
      this.logger.error(`Erro ao atualizar ${this.entityName}`, { error: error.message, id, data });
      
      if (error.code === '23505') {
        throwBeneficioAlreadyExists(this.buildErrorContext({ id, ...data }));
      }
      throw error;
    }
  }

  /**
   * Remover dados de benefício
   */
  async delete(id: string): Promise<void> {
    this.logger.debug(`Removendo ${this.entityName}`, { id });
    
    const entity = await this.findOne(id);
    
    try {
      await this.repository.remove(entity);
      
      // Invalida cache
      await this.invalidateCache(id);
      
      this.logger.debug(`${this.entityName} removido com sucesso`, { id });
    } catch (error) {
      this.logger.error(`Erro ao remover ${this.entityName}`, { error: error.message, id });
      throw error;
    }
  }

  /**
   * Verificar se existem dados para uma solicitação
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { solicitacao_id: solicitacaoId } as any,
    });
    return count > 0;
  }

  /**
   * Buscar todos os dados com paginação
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: any,
  ): Promise<IPaginatedResult<TEntity>> {
    const cacheKey = this.getListCacheKey({ page, limit, filters });
    
    // Verifica no cache primeiro
    let result = await this.cacheManager.get<IPaginatedResult<TEntity>>(cacheKey);
    
    if (!result) {
      const [data, total] = await this.repository.findAndCount({
        relations: ['solicitacao'],
        skip: (page - 1) * limit,
        take: limit,
        where: filters,
        order: { created_at: 'DESC' } as any,
      });

      result = {
        data,
        total,
        page,
        limit,
      };
      
      // Armazena no cache
      await this.cacheManager.set(
        cacheKey, 
        result, 
        BENEFICIO_CONSTANTS.CACHE.TTL_SECONDS
      );
    }

    return result;
  }

  // ========================================
  // MÉTODOS PROTEGIDOS E ABSTRATOS
  // ========================================



  /**
   * Validar ID
   */
  protected validateId(id: string, fieldName: string = 'ID'): void {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException(
        `${fieldName} inválido. Por favor, forneça um ${fieldName.toLowerCase()} válido.`,
      );
    }
  }

  /**
   * Obter campos para atualização
   */
  protected getFieldsToUpdate(updateDto: TUpdateDto): string[] {
    return Object.keys(updateDto).filter(
      key => updateDto[key] !== undefined && updateDto[key] !== null
    );
  }

  /**
   * Validar usando class-validator
   */
  protected async validateWithClassValidator(
    dto: any,
    operation: 'criação' | 'atualização',
  ): Promise<void> {
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        const constraints = Object.values(error.constraints || {});
        return constraints.join(', ');
      }).join('; ');
      
      throw new BadRequestException(
        `Dados inválidos para ${operation}: ${errorMessages}. Por favor, corrija os campos indicados e tente novamente.`,
      );
    }
  }

  /**
   * Validar campo obrigatório
   */
  protected validateRequiredField(
    value: any,
    fieldName: string,
    customMessage?: string,
  ): void {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      throw new BadRequestException(
        customMessage || `${fieldName} é obrigatório.`,
      );
    }
  }

  /**
   * Validar campo de texto com tamanho mínimo
   */
  protected validateTextFieldMinLength(
    value: string,
    fieldName: string,
    minLength: number,
    customMessage?: string,
  ): void {
    if (value && value.trim().length < minLength) {
      throw new BadRequestException(
        customMessage || `${fieldName} deve ter pelo menos ${minLength} caracteres.`,
      );
    }
  }

  /**
   * Validar campo numérico positivo
   */
  protected validatePositiveNumber(
    value: number,
    fieldName: string,
    customMessage?: string,
  ): void {
    if (value !== undefined && value <= 0) {
      throw new BadRequestException(
        customMessage || `${fieldName} deve ser um número maior que zero.`,
      );
    }
  }

  /**
   * Lançar erro de validação com contexto
   */
  protected throwValidationError(
    errors: string[],
    context: BeneficioErrorContext,
  ): void {
    const errorMessage = errors.join('; ');
    throw new BadRequestException(
      `Dados inválidos: ${errorMessage}. Por favor, corrija os campos indicados e tente novamente.`,
    );
  }
}