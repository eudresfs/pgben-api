import {
  Injectable,
  Inject,
  forwardRef,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UseInterceptors } from '@nestjs/common';
import { WorkflowInterceptor } from '../../../interceptors/workflow.interceptor';
import { CacheInterceptor } from '../../../shared/interceptors/cache.interceptor';
import { WorkflowSolicitacaoService } from '../../solicitacao/services/workflow-solicitacao.service';
import { DadosAtaude } from '../../../entities/dados-ataude.entity';
import {
  CreateDadosAtaudeDto,
  UpdateDadosAtaudeDto,
} from '../dto/create-dados-ataude.dto';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { TipoUrnaEnum } from '../../../enums/tipo-urna.enum';
import { TransladoEnum } from '@/enums/translado.enum';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';
import { AppError } from '@/shared/exceptions';
import { EnderecoDto } from '../../../shared/dtos/endereco.dto';
import { TipoBeneficio } from '@/enums';

/**
 * Serviço para gerenciar dados específicos de Auxílio Ataude
 */
@Injectable()
@UseInterceptors(WorkflowInterceptor, CacheInterceptor)
export class DadosAtaudeService extends AbstractDadosBeneficioService<
  DadosAtaude,
  CreateDadosAtaudeDto,
  UpdateDadosAtaudeDto
> {
  constructor(
    @InjectRepository(DadosAtaude)
    private readonly dadosAtaudeRepository: Repository<DadosAtaude>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    private readonly workflowSolicitacaoService: WorkflowSolicitacaoService,
  ) {
    super(dadosAtaudeRepository, 'DadosAtaude', workflowSolicitacaoService);
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
    data: DadosAtaude[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosAtaudeRepository.findAndCount({
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
    data: DadosAtaude[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosAtaudeRepository.findAndCount({
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
   * Construir contexto de erro específico para Ataude
   */
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        beneficioId: data.id,
        tipo: TipoBeneficio.ATAUDE,
        cidadaoId: data.cidadao_id,
      },
      operationalContext: {
        module: 'beneficio',
        operation: 'dados-ataude',
        entityId: data.id,
        entityType: 'DadosAtaude',
      },
      metadata: {
        nome_falecido: data.nome_falecido,
        data_obito: data.data_obito,
        solicitacao_id: data.solicitacao_id,
      },
    };
  }

  /**
   * Validação específica para criação de dados de Ataude
   */
  protected async validateCreateData(
    data: CreateDadosAtaudeDto,
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.ATAUDE;

    try {
      // Validação de campos obrigatórios
      if (!data.solicitacao_id?.trim()) {
        errorBuilder.add(
          'solicitacao_id',
          BENEFICIO_TECH_MESSAGES.ATAUDE.SOLICITACAO_ID_REQUIRED,
        );
      }

      if (!data.nome_completo_falecido?.trim()) {
        errorBuilder.add(
          'nome_completo_falecido',
          BENEFICIO_TECH_MESSAGES.ATAUDE.NOME_FALECIDO_REQUIRED,
        );
      } else if (data.nome_completo_falecido.trim().length < 3) {
        errorBuilder.add(
          'nome_completo_falecido',
          'Nome do falecido deve ter pelo menos 3 caracteres.',
        );
      }

      if (!data.data_obito) {
        errorBuilder.add(
          'data_obito',
          BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_OBITO_REQUIRED,
        );
      }

      if (!data.local_obito?.trim()) {
        errorBuilder.add('local_obito', 'Campo local_obito é obrigatório.');
      }

      if (!data.grau_parentesco_requerente?.trim()) {
        errorBuilder.add(
          'grau_parentesco_requerente',
          'Campo grau_parentesco_requerente é obrigatório.',
        );
      }

      if (!data.tipo_urna_necessaria?.trim()) {
        errorBuilder.add(
          'tipo_urna_necessaria',
          'Campo tipo_urna_necessaria é obrigatório.',
        );
      }

      // Validação de declaração de óbito (se fornecida)
      if (
        data.declaracao_obito !== undefined &&
        !data.declaracao_obito?.trim()
      ) {
        errorBuilder.add(
          'declaracao_obito',
          'Declaração de óbito não pode estar vazia quando fornecida.',
        );
      }

      // Validação de cartório emissor (se fornecido)
      // if (data.cartorio_emissor !== undefined && !data.cartorio_emissor?.trim()) {
      //   errorBuilder.add(
      //     'cartorio_emissor',
      //     'Cartório emissor não pode estar vazio quando fornecido.',
      //   );
      // }

      // Validação de regras de negócio
      if (data.data_obito) {
        const hoje = new Date();
        const dataObito = new Date(data.data_obito);

        // Verificar se a data é válida
        if (isNaN(dataObito.getTime())) {
          errorBuilder.add(
            'data_obito',
            'Data de óbito inválida. Validação de formato falhou.',
          );
        } else {
          const diasAposObito = Math.floor(
            (hoje.getTime() - dataObito.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (diasAposObito > rules.MAX_DIAS_APOS_OBITO) {
            errorBuilder.add(
              'data_obito',
              BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_OBITO_LIMITE_EXCEDIDO,
            );
          }

          if (dataObito > hoje) {
            errorBuilder.add(
              'data_obito',
              BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_OBITO_FUTURA,
            );
          }
        }
      }

      // Validação de data de autorização (se fornecida)
      if (data.data_autorizacao) {
        const dataAutorizacao = new Date(data.data_autorizacao);

        if (isNaN(dataAutorizacao.getTime())) {
          errorBuilder.add(
            'data_autorizacao',
            BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_AUTORIZACAO_INVALIDA,
          );
        } else {
          const hoje = new Date();
          if (dataAutorizacao > hoje) {
            errorBuilder.add(
              'data_autorizacao',
              BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_AUTORIZACAO_FUTURA,
            );
          }

          if (data.data_obito) {
            const dataObito = new Date(data.data_obito);
            if (!isNaN(dataObito.getTime()) && dataAutorizacao < dataObito) {
              errorBuilder.add(
                'data_autorizacao',
                BENEFICIO_TECH_MESSAGES.ATAUDE
                  .DATA_OBITO_POSTERIOR_AUTORIZACAO,
              );
            }
          }
        }
      }

      // Validação de observações especiais (se fornecidas)
      if (
        data.observacoes &&
        data.observacoes.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES
      ) {
        errorBuilder.add(
          'observacoes',
          `Campo observacoes excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres.`,
        );
      }

      // Validação de translado (se fornecido)
      if (
        data.translado &&
        !Object.values(TransladoEnum).includes(data.translado)
      ) {
        errorBuilder.add('translado', 'Tipo de translado inválido.');
      }

      // Validação de endereço do velório (se fornecido)
      if (
        data.endereco_velorio &&
        !this.isValidEndereco(data.endereco_velorio)
      ) {
        errorBuilder.add(
          'endereco_velorio',
          'Endereço do velório incompleto ou inválido.',
        );
      }

      // Validação de endereço do cemitério (se fornecido)
      if (
        data.endereco_cemiterio &&
        !this.isValidEndereco(data.endereco_cemiterio)
      ) {
        errorBuilder.add(
          'endereco_cemiterio',
          'Endereço do cemitério incompleto ou inválido.',
        );
      }

      // Nota: Removida validação de duplicação para permitir comportamento de upsert
      // A lógica de upsert é tratada no método create() da classe base

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        'Erro inesperado durante validação do benefício por morte',
        {
          error: error.message,
          stack: error.stack,
          solicitacao_id: data.solicitacao_id,
        },
      );
      throw new InternalServerErrorException(
        'Erro interno durante validação dos dados do benefício por morte',
      );
    }
  }

  /**
   * Validação específica para atualização de dados de Ataude
   */
  protected async validateUpdateData(
    data: UpdateDadosAtaudeDto,
    entity: DadosAtaude,
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.ATAUDE;

    try {
      // Validação de nome do falecido (se fornecido)
      if (data.nome_completo_falecido !== undefined) {
        if (!data.nome_completo_falecido?.trim()) {
          errorBuilder.add(
            'nome_completo_falecido',
            'Nome do falecido não pode estar vazio quando fornecido.',
          );
        } else if (data.nome_completo_falecido.trim().length < 3) {
          errorBuilder.add(
            'nome_completo_falecido',
            'Nome do falecido deve ter pelo menos 3 caracteres.',
          );
        }
      }

      // Validação de data de óbito
      if (data.data_obito !== undefined) {
        if (!data.data_obito) {
          errorBuilder.add(
            'data_obito',
            'Data de óbito não pode estar vazia quando fornecida.',
          );
        } else {
          const hoje = new Date();
          const dataObito = new Date(data.data_obito);

          // Verificar se a data é válida
          if (isNaN(dataObito.getTime())) {
            errorBuilder.add(
              'data_obito',
              'Data de óbito inválida. Validação de formato falhou.',
            );
          } else {
            const diasAposObito = Math.floor(
              (hoje.getTime() - dataObito.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (diasAposObito > rules.MAX_DIAS_APOS_OBITO) {
              errorBuilder.add(
                'data_obito',
                BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_OBITO_LIMITE_EXCEDIDO,
              );
            }

            if (dataObito > hoje) {
              errorBuilder.add(
                'data_obito',
                BENEFICIO_TECH_MESSAGES.ATAUDE.DATA_OBITO_FUTURA,
              );
            }
          }
        }
      }

      // Validação de local do óbito (se fornecido)
      if (data.local_obito !== undefined && !data.local_obito?.trim()) {
        errorBuilder.add(
          'local_obito',
          'Local do óbito não pode estar vazio quando fornecido.',
        );
      }

      // Validação de grau de parentesco (se fornecido)
      if (
        data.grau_parentesco_requerente !== undefined &&
        !data.grau_parentesco_requerente?.trim()
      ) {
        errorBuilder.add(
          'grau_parentesco_requerente',
          'Grau de parentesco não pode estar vazio quando fornecido.',
        );
      }

      // Validação de tipo de urna (se fornecido)
      if (
        data.tipo_urna_necessaria !== undefined &&
        !data.tipo_urna_necessaria?.trim()
      ) {
        errorBuilder.add(
          'tipo_urna_necessaria',
          'Tipo de urna não pode estar vazio quando fornecido.',
        );
      }

      // Validação de declaração de óbito (se fornecido)
      if (
        data.declaracao_obito !== undefined &&
        !data.declaracao_obito?.trim()
      ) {
        errorBuilder.add(
          'declaracao_obito',
          'Declaração de óbito não pode estar vazia quando fornecida.',
        );
      }

      // Validação de translado (se fornecido)
      if (
        data.translado !== undefined &&
        !Object.values(TransladoEnum).includes(data.translado)
      ) {
        errorBuilder.add('translado', 'Tipo de translado inválido.');
      }

      // Validação de endereço do velório (se fornecido)
      if (data.endereco_velorio !== undefined) {
        if (
          data.endereco_velorio &&
          !this.isValidEndereco(data.endereco_velorio)
        ) {
          errorBuilder.add(
            'endereco_velorio',
            'Endereço do velório incompleto ou inválido.',
          );
        }
      }

      // Validação de endereço do cemitério (se fornecido)
      if (data.endereco_cemiterio !== undefined) {
        if (
          data.endereco_cemiterio &&
          !this.isValidEndereco(data.endereco_cemiterio)
        ) {
          errorBuilder.add(
            'endereco_cemiterio',
            'Endereço do cemitério incompleto ou inválido.',
          );
        }
      }

      // Validação de cartório emissor (se fornecido)
      if (
        data.cartorio_emissor !== undefined &&
        !data.cartorio_emissor?.trim()
      ) {
        errorBuilder.add(
          'cartorio_emissor',
          'Cartório emissor não pode estar vazio quando fornecido.',
        );
      }

      // Validação de data de autorização (se fornecida)
      if (data.data_autorizacao !== undefined) {
        if (data.data_autorizacao) {
          const dataAutorizacao = new Date(data.data_autorizacao);
          if (isNaN(dataAutorizacao.getTime())) {
            errorBuilder.add(
              'data_autorizacao',
              'Data de autorização inválida.',
            );
          } else {
            const hoje = new Date();
            if (dataAutorizacao > hoje) {
              errorBuilder.add(
                'data_autorizacao',
                'Data de autorização não pode ser futura.',
              );
            }
          }
        }
      }

      // Validação de observações especiais (se fornecidas)
      if (
        data.observacoes !== undefined &&
        data.observacoes &&
        data.observacoes.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES
      ) {
        errorBuilder.add(
          'observacoes',
          `Campo observacoes excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres.`,
        );
      }

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        'Erro inesperado durante validação de atualização do benefício por morte.',
        {
          error: error.message,
          stack: error.stack,
          entity_id: entity.id,
        },
      );
      throw new InternalServerErrorException(
        'Erro interno durante validação dos dados do benefício por morte',
      );
    }
  }

  /**
   * Validar estrutura de endereço
   */
  private isValidEndereco(endereco: EnderecoDto): boolean {
    if (!endereco) return false;

    return !!(
      endereco.logradouro?.trim() &&
      endereco.numero?.trim() &&
      endereco.bairro?.trim() &&
      endereco.cidade?.trim() &&
      endereco.estado?.trim() &&
      endereco.cep?.trim()
    );
  }
}
