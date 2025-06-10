import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, FindManyOptions } from 'typeorm';
import {
  throwBeneficioNotFound,
  throwBeneficioAlreadyExists,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
  BeneficioErrorContext,
} from '../../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../../shared/constants/beneficio.constants';

/**
 * Interface para entidade de dados de benefício
 */
export interface IDadosBeneficioEntity {
  id: string;
  solicitacao_id: string;
  created_at: Date;
  updated_at: Date;
  removed_at?: Date;
}

/**
 * Interface para DTO de criação
 */
export interface ICreateDadosBeneficioDto {
  solicitacao_id: string;
  [key: string]: any;
}

/**
 * Interface para DTO de atualização
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
  totalPages: number;
}

/**
 * Classe abstrata base simplificada para serviços de dados de benefício
 * Fornece apenas funcionalidades essenciais de CRUD com validações de negócio
 */
@Injectable()
export abstract class AbstractDadosBeneficioService<
  TEntity extends IDadosBeneficioEntity,
  TCreateDto extends ICreateDadosBeneficioDto,
  TUpdateDto extends IUpdateDadosBeneficioDto,
> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly repository: Repository<TEntity>,
    protected readonly entityName: string,
  ) {}

  /**
   * Métodos abstratos que devem ser implementados pelas classes filhas
   */
  protected abstract validateCreateData(data: TCreateDto): Promise<void>;
  protected abstract validateUpdateData(data: TUpdateDto, entity: TEntity): Promise<void>;



  /**
   * Criar dados de benefício
   */
  async create(createDto: TCreateDto): Promise<TEntity> {
    // Validação específica do benefício
    await this.validateCreateData(createDto);

    // Verificar se já existem dados para esta solicitação
    const existingData = await this.repository.findOne({
      where: { solicitacao_id: createDto.solicitacao_id } as any,
    });

    if (existingData) {
      throw new ConflictException(
        `Dados de ${this.entityName} já existem para esta solicitação`
      );
    }

    // Criar e salvar entidade
    const entity = this.repository.create(createDto as any);
    const savedEntity = await this.repository.save(entity);
    
    return savedEntity as unknown as TEntity;
  }

  /**
   * Buscar dados por ID
   */
  async findOne(id: string): Promise<TEntity> {
    if (!id) {
      throw new BadRequestException('ID é obrigatório');
    }

    const entity = await this.repository.findOne({
      where: { id } as any,
      relations: ['solicitacao'],
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.entityName} não encontrado`
      );
    }

    return entity;
  }

  /**
   * Buscar dados por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<TEntity> {
    if (!solicitacaoId) {
      throw new BadRequestException('ID da solicitação é obrigatório');
    }

    const entity = await this.repository.findOne({
      where: { solicitacao_id: solicitacaoId } as any,
      relations: ['solicitacao'],
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.entityName} não encontrado para esta solicitação`
      );
    }

    return entity;
  }

  /**
   * Atualizar dados de benefício
   */
  async update(id: string, data: TUpdateDto): Promise<TEntity> {
    const entity = await this.findOne(id);
    
    // Validação específica do benefício
    await this.validateUpdateData(data, entity);

    Object.assign(entity, data);
    const updatedEntity = await this.repository.save(entity);
    
    return updatedEntity;
  }

  /**
   * Remover dados de benefício (soft delete)
   */
  async delete(id: string): Promise<void> {
    const entity = await this.findOne(id);
    
    // Soft delete
    (entity as any).removed_at = new Date();
    await this.repository.save(entity);
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
    const [data, total] = await this.repository.findAndCount({
      relations: ['solicitacao'],
      skip: (page - 1) * limit,
      take: limit,
      where: filters,
      order: { created_at: 'DESC' } as any,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}