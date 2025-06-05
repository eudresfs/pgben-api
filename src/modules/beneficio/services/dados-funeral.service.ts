import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';
import { CreateDadosFuneralDto, UpdateDadosFuneralDto } from '../dto/create-dados-funeral.dto';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';

/**
 * Serviço para gerenciar dados específicos de Auxílio Funeral
 */
@Injectable()
export class DadosFuneralService extends AbstractDadosBeneficioService<
  DadosFuneral,
  CreateDadosFuneralDto,
  UpdateDadosFuneralDto
> {
  constructor(
    @InjectRepository(DadosFuneral)
    private readonly dadosFuneralRepository: Repository<DadosFuneral>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(dadosFuneralRepository, 'DadosFuneral', CreateDadosFuneralDto, cacheManager);
  }

  // Métodos CRUD básicos herdados da classe base AbstractDadosBeneficioService
  // create, findOne, findBySolicitacao, update, remove, existsBySolicitacao, findAll

  /**
   * Buscar dados por grau de parentesco
   */
  async findByGrauParentesco(
    grauParentesco: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosFuneral[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosFuneralRepository.findAndCount({
      where: { grau_parentesco_requerente: grauParentesco as any },
      relations: ['solicitacao'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Buscar dados por período de óbito
   */
  async findByPeriodoObito(
    dataInicio: Date,
    dataFim: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosFuneral[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosFuneralRepository.findAndCount({
      where: {
        data_obito: {
          gte: dataInicio,
          lte: dataFim,
        } as any,
      },
      relations: ['solicitacao'],
      skip: (page - 1) * limit,
      take: limit,
      order: { data_obito: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Construir contexto de erro específico para Funeral
   */
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        beneficioId: data.id,
        tipo: 'FUNERAL',
        cidadaoId: data.cidadao_id
      },
      operationalContext: {
        module: 'beneficio',
        operation: 'dados-funeral',
        entityId: data.id,
        entityType: 'DadosFuneral'
      },
      metadata: {
        nome_falecido: data.nome_falecido,
        data_obito: data.data_obito,
        solicitacao_id: data.solicitacao_id
      }
    };
  }

  /**
   * Validação específica para criação de dados de Funeral
   */
  protected async validateCreateData(data: CreateDadosFuneralDto): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.FUNERAL;

    // Validação de campos obrigatórios
    if (!data.solicitacao_id) {
      errorBuilder.add('solicitacao_id', BENEFICIO_TECH_MESSAGES.FUNERAL.SOLICITACAO_ID_REQUIRED);
    }

    if (!data.nome_completo_falecido || data.nome_completo_falecido.trim().length < rules.MIN_NOME_LENGTH) {
      errorBuilder.add('nome_falecido', BENEFICIO_TECH_MESSAGES.FUNERAL.NOME_FALECIDO_REQUIRED);
    }

    if (!data.data_obito) {
      errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_REQUIRED);
    }



    // Validação de regras de negócio
    if (data.data_obito) {
      const dataObito = new Date(data.data_obito);
      const hoje = new Date();
      const diffDias = Math.ceil((hoje.getTime() - dataObito.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDias > rules.MAX_DIAS_APOS_OBITO) {
        errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_LIMITE_EXCEDIDO);
      }

      if (dataObito > hoje) {
        errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_FUTURA);
      }
    }



    errorBuilder.throwIfHasErrors();
  }

  /**
   * Validação específica para atualização de dados de Funeral
   */
  protected async validateUpdateData(
    data: UpdateDadosFuneralDto, 
    entity: DadosFuneral
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.FUNERAL;

    // Validação de nome do falecido
    if (data.nome_completo_falecido !== undefined && data.nome_completo_falecido.trim().length < rules.MIN_NOME_LENGTH) {
      errorBuilder.add('nome_falecido', BENEFICIO_TECH_MESSAGES.FUNERAL.NOME_FALECIDO_REQUIRED);
    }



    // Validação de data de óbito
    if (data.data_obito !== undefined) {
      const dataObito = new Date(data.data_obito);
      const hoje = new Date();
      const diffDias = Math.ceil((hoje.getTime() - dataObito.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDias > rules.MAX_DIAS_APOS_OBITO) {
        errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_LIMITE_EXCEDIDO);
      }

      if (dataObito > hoje) {
        errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_FUTURA);
      }
    }



    errorBuilder.throwIfHasErrors();
  }
}
