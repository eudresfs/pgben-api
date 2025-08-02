import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Repository, FindManyOptions, DeepPartial } from 'typeorm';
import { WorkflowSolicitacaoService } from '../../../solicitacao/services/workflow-solicitacao.service';
import { StatusSolicitacao } from '@/enums/status-solicitacao.enum';
import { SubStatusSolicitacao } from '@/enums/sub-status-solicitacao.enum';
import { Solicitacao } from '../../../../entities/solicitacao.entity';
import { PaginationParamsDto } from '../../../../shared/dtos/pagination-params.dto';
import { PaginatedResult } from '../../../../common/interfaces/paginated-result.interface';

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
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    protected readonly workflowService?: WorkflowSolicitacaoService,
  ) {}

  /**
   * Métodos abstratos que devem ser implementados pelas classes filhas
   */
  protected abstract validateCreateData(data: TCreateDto): Promise<void>;
  protected abstract validateUpdateData(
    data: TUpdateDto,
    entity: TEntity,
  ): Promise<void>;

  /**
   * Criar ou atualizar dados de benefício (upsert)
   * Se já existirem dados para a solicitação, eles serão atualizados
   * Caso contrário, novos dados serão criados
   */
  async create(createDto: TCreateDto): Promise<TEntity> {
    // Validação específica do benefício
    await this.validateCreateData(createDto);

    // Verificar se já existem dados para esta solicitação
    const existingData = await this.repository.findOne({
      where: { solicitacao_id: createDto.solicitacao_id } as any,
    });

    // Extrair usuarioId do createDto, se disponível
    const usuarioId = createDto.usuario_id || null;
    let savedEntity: TEntity;
    let isUpdate = false;

    if (existingData) {
      // Atualizar dados existentes (upsert)
      isUpdate = true;

      // Validar dados para atualização
      await this.validateUpdateData(createDto as any, existingData);

      // Atualizar entidade existente
      Object.assign(existingData, createDto, {
        updated_at: new Date(),
      });

      savedEntity = await this.repository.save(existingData);

      this.logger.log(
        `Dados de ${this.entityName} atualizados com sucesso para solicitação ${createDto.solicitacao_id}`,
      );
    } else {
      // Criar nova entidade
      const entity = this.repository.create(createDto as any);
      savedEntity = (await this.repository.save(entity)) as unknown as TEntity;

      this.logger.log(
        `Dados de ${this.entityName} criados com sucesso para solicitação ${createDto.solicitacao_id}`,
      );
    }

    // Atualizar status e substatus da solicitação apenas se for criação (não atualização)
    if (!isUpdate) {
      await this.atualizarStatusSolicitacao(
        createDto.solicitacao_id,
        usuarioId,
      );
    }

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
      throw new NotFoundException(`${this.entityName} não encontrado`);
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
        `${this.entityName} não encontrado para esta solicitação`,
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
    paginationDto: PaginationParamsDto,
  ): Promise<PaginatedResult<TEntity>> {
    const { limit = 10, offset = 0 } = paginationDto;
    const page = Math.floor(offset / limit) + 1;

    const [data, total] = await this.repository.findAndCount({
      skip: offset,
      take: limit,
      order: { created_at: 'DESC' } as any,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Atualizar status e substatus da solicitação após cadastro dos dados específicos
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que realizou a operação
   */
  protected async atualizarStatusSolicitacao(
    solicitacaoId: string,
    usuarioId?: string,
  ): Promise<void> {
    if (!this.workflowService) {
      this.logger.warn(
        'WorkflowService não disponível para atualização de status',
      );
      return;
    }

    try {
      // Buscar a solicitação atual
      // Usar a API correta do TypeORM para evitar erros de tipagem
      const solicitacao = await this.repository.manager
        .createQueryBuilder(Solicitacao, 'solicitacao')
        .select([
          'solicitacao.id',
          'solicitacao.status',
          'solicitacao.sub_status',
        ])
        .where('solicitacao.id = :id', { id: solicitacaoId })
        .getOne();

      if (!solicitacao) {
        this.logger.warn(
          `Solicitação ${solicitacaoId} não encontrada para atualização de status`,
        );
        return;
      }

      // Só atualizar se o status for 'rascunho' ou se o substatus não for 'aguardando_documentos'
      const needsStatusUpdate =
        solicitacao.status === StatusSolicitacao.RASCUNHO;
      const needsSubstatusUpdate =
        solicitacao.sub_status !== SubStatusSolicitacao.AGUARDANDO_DOCUMENTOS;

      if (needsStatusUpdate || needsSubstatusUpdate) {
        // Atualizar status para 'aberta' se necessário
        if (needsStatusUpdate && usuarioId) {
          // Só atualiza status se tiver um usuarioId válido para evitar erro de UUID inválido
          await this.workflowService.atualizarStatus(
            solicitacaoId,
            StatusSolicitacao.ABERTA,
            usuarioId,
            {
              observacao: `Status atualizado automaticamente após cadastro dos dados específicos de ${this.entityName}`,
            },
          );
        } else if (needsStatusUpdate) {
          this.logger.warn(
            `Não foi possível atualizar status para solicitação ${solicitacaoId} - usuário não informado`,
          );
        }

        // Atualizar substatus para 'aguardando_documentos'
        if (needsSubstatusUpdate) {
          await this.repository.manager.update(
            'Solicitacao',
            { id: solicitacaoId },
            {
              sub_status: SubStatusSolicitacao.AGUARDANDO_DOCUMENTOS,
              updated_at: new Date(),
            },
          );
        }

        this.logger.log(
          `Status da solicitação ${solicitacaoId} atualizado para 'aberta' com substatus 'aguardando_documentos' após cadastro de dados de ${this.entityName}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status da solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      // Não propagar o erro para não afetar a criação dos dados de benefício
    }
  }
}
