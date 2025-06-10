import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UseInterceptors } from '@nestjs/common';
import { WorkflowInterceptor } from '../../../interceptors/workflow.interceptor';
import { CacheInterceptor } from '../../../shared/interceptors/cache.interceptor';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';
import { CreateDadosFuneralDto, UpdateDadosFuneralDto } from '../dto/create-dados-funeral.dto';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';
import { AppError } from '@/shared/exceptions';

/**
 * Serviço para gerenciar dados específicos de Auxílio Funeral
 */
@Injectable()
@UseInterceptors(WorkflowInterceptor, CacheInterceptor)
export class DadosFuneralService extends AbstractDadosBeneficioService<
  DadosFuneral,
  CreateDadosFuneralDto,
  UpdateDadosFuneralDto
> {
  constructor(
    @InjectRepository(DadosFuneral)
    private readonly dadosFuneralRepository: Repository<DadosFuneral>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    super(dadosFuneralRepository, 'DadosFuneral');
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

    try {
      // Validação de campos obrigatórios
      if (!data.solicitacao_id?.trim()) {
        errorBuilder.add('solicitacao_id', BENEFICIO_TECH_MESSAGES.FUNERAL.SOLICITACAO_ID_REQUIRED);
      }

      if (!data.nome_completo_falecido?.trim()) {
        errorBuilder.add('nome_completo_falecido', BENEFICIO_TECH_MESSAGES.FUNERAL.NOME_FALECIDO_REQUIRED);
      } else if (data.nome_completo_falecido.trim().length < 3) {
        errorBuilder.add('nome_completo_falecido', 'Nome do falecido deve ter pelo menos 3 caracteres. Validação de tamanho falhou.');
      }

      if (!data.data_obito) {
        errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_REQUIRED);
      }

      if (!data.local_obito?.trim()) {
        errorBuilder.add('local_obito', 'Campo local_obito é obrigatório. Validação de campo obrigatório falhou.');
      }

      if (!data.grau_parentesco_requerente?.trim()) {
        errorBuilder.add('grau_parentesco_requerente', 'Campo grau_parentesco_requerente é obrigatório. Validação de campo obrigatório falhou.');
      }

      if (!data.tipo_urna_necessaria?.trim()) {
        errorBuilder.add('tipo_urna_necessaria', 'Campo tipo_urna_necessaria é obrigatório. Validação de campo obrigatório falhou.');
      }

      if (!data.numero_certidao_obito?.trim()) {
        errorBuilder.add('numero_certidao_obito', 'Campo numero_certidao_obito é obrigatório. Validação de campo obrigatório falhou.');
      }

      if (!data.cartorio_emissor?.trim()) {
        errorBuilder.add('cartorio_emissor', 'Campo cartorio_emissor é obrigatório. Validação de campo obrigatório falhou.');
      }

      // Validação de regras de negócio
      if (data.data_obito) {
        const hoje = new Date();
        const dataObito = new Date(data.data_obito);
        
        // Verificar se a data é válida
        if (isNaN(dataObito.getTime())) {
          errorBuilder.add('data_obito', 'Data de óbito inválida. Validação de formato falhou.');
        } else {
          const diasAposObito = Math.floor((hoje.getTime() - dataObito.getTime()) / (1000 * 60 * 60 * 24));

          if (diasAposObito > rules.MAX_DIAS_APOS_OBITO) {
            errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_LIMITE_EXCEDIDO);
          }

          if (dataObito > hoje) {
            errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_FUTURA);
          }
        }
      }

      // Validação de data de autorização (se fornecida)
      if (data.data_autorizacao) {
        const dataAutorizacao = new Date(data.data_autorizacao);
        if (isNaN(dataAutorizacao.getTime())) {
          errorBuilder.add('data_autorizacao', 'Data de autorização inválida. Validação de formato falhou.');
        } else if (dataAutorizacao > new Date()) {
          errorBuilder.add('data_autorizacao', 'Data de autorização não pode ser futura. Validação de data falhou.');
        }
      }

      // Validação de observações especiais (se fornecidas)
      if (data.observacoes_especiais && data.observacoes_especiais.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES) {
        errorBuilder.add('observacoes_especiais', `Campo observacoes_especiais excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`);
      }

      // Verificar se já existe dados para esta solicitação
      if (data.solicitacao_id) {
        const existingData = await this.existsBySolicitacao(data.solicitacao_id);
        if (existingData) {
          errorBuilder.add('solicitacao_id', BENEFICIO_TECH_MESSAGES.GENERIC.JA_EXISTE);
        }
      }

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('Erro inesperado durante validação de funeral', {
        error: error.message,
        stack: error.stack,
        solicitacao_id: data.solicitacao_id
      });
      throw new InternalServerErrorException('Erro interno durante validação dos dados de funeral');
    }
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

    try {
      // Validação de nome do falecido (se fornecido)
      if (data.nome_completo_falecido !== undefined) {
        if (!data.nome_completo_falecido?.trim()) {
          errorBuilder.add('nome_completo_falecido', 'Nome do falecido não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
        } else if (data.nome_completo_falecido.trim().length < 3) {
          errorBuilder.add('nome_completo_falecido', 'Nome do falecido deve ter pelo menos 3 caracteres. Validação de tamanho falhou.');
        }
      }

      // Validação de data de óbito
      if (data.data_obito !== undefined) {
        if (!data.data_obito) {
          errorBuilder.add('data_obito', 'Data de óbito não pode estar vazia quando fornecida. Validação de conteúdo falhou.');
        } else {
          const hoje = new Date();
          const dataObito = new Date(data.data_obito);
          
          // Verificar se a data é válida
          if (isNaN(dataObito.getTime())) {
            errorBuilder.add('data_obito', 'Data de óbito inválida. Validação de formato falhou.');
          } else {
            const diasAposObito = Math.floor((hoje.getTime() - dataObito.getTime()) / (1000 * 60 * 60 * 24));

            if (diasAposObito > rules.MAX_DIAS_APOS_OBITO) {
              errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_LIMITE_EXCEDIDO);
            }

            if (dataObito > hoje) {
              errorBuilder.add('data_obito', BENEFICIO_TECH_MESSAGES.FUNERAL.DATA_OBITO_FUTURA);
            }
          }
        }
      }

      // Validação de local do óbito (se fornecido)
      if (data.local_obito !== undefined && !data.local_obito?.trim()) {
        errorBuilder.add('local_obito', 'Local do óbito não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de grau de parentesco (se fornecido)
      if (data.grau_parentesco_requerente !== undefined && !data.grau_parentesco_requerente?.trim()) {
        errorBuilder.add('grau_parentesco_requerente', 'Grau de parentesco não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de tipo de urna (se fornecido)
      if (data.tipo_urna_necessaria !== undefined && !data.tipo_urna_necessaria?.trim()) {
        errorBuilder.add('tipo_urna_necessaria', 'Tipo de urna não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de número da certidão (se fornecido)
      if (data.numero_certidao_obito !== undefined && !data.numero_certidao_obito?.trim()) {
        errorBuilder.add('numero_certidao_obito', 'Número da certidão de óbito não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de cartório emissor (se fornecido)
      if (data.cartorio_emissor !== undefined && !data.cartorio_emissor?.trim()) {
        errorBuilder.add('cartorio_emissor', 'Cartório emissor não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de data de autorização (se fornecida)
      if (data.data_autorizacao !== undefined) {
        if (data.data_autorizacao) {
          const dataAutorizacao = new Date(data.data_autorizacao);
          if (isNaN(dataAutorizacao.getTime())) {
            errorBuilder.add('data_autorizacao', 'Data de autorização inválida. Validação de formato falhou.');
          } else if (dataAutorizacao > new Date()) {
            errorBuilder.add('data_autorizacao', 'Data de autorização não pode ser futura. Validação de data falhou.');
          }
        }
      }

      // Validação de observações especiais (se fornecidas)
      if (data.observacoes_especiais !== undefined && data.observacoes_especiais && data.observacoes_especiais.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES) {
        errorBuilder.add('observacoes_especiais', `Campo observacoes_especiais excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`);
      }

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('Erro inesperado durante validação de atualização de funeral', {
        error: error.message,
        stack: error.stack,
        entity_id: entity.id
      });
      throw new InternalServerErrorException('Erro interno durante validação dos dados de funeral');
    }
  }
}
