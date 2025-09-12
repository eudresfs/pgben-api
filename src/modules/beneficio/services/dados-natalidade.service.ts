import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  forwardRef,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UseInterceptors } from '@nestjs/common';
import { WorkflowInterceptor } from '../../../interceptors/workflow.interceptor';
import { CacheInterceptor } from '../../../shared/interceptors/cache.interceptor';
import { WorkflowSolicitacaoService } from '../../solicitacao/services/workflow-solicitacao.service';
import {
  CreateDadosNatalidadeDto,
  UpdateDadosNatalidadeDto,
} from '../dto/create-dados-natalidade.dto';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';
import { DadosNatalidadeRepository } from '../repositories/dados-natalidade.repository';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import {
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
  BeneficioErrorContext,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { AppError } from '../../../shared/exceptions/error-catalog/AppError';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';

/**
 * Serviço para gerenciar dados específicos de Auxílio Natalidade
 */
@Injectable()
@UseInterceptors(WorkflowInterceptor, CacheInterceptor)
export class DadosNatalidadeService extends AbstractDadosBeneficioService<
  DadosNatalidade,
  CreateDadosNatalidadeDto,
  UpdateDadosNatalidadeDto
> {
  constructor(
    private readonly dadosNatalidadeRepository: DadosNatalidadeRepository,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    private readonly workflowSolicitacaoService: WorkflowSolicitacaoService,
  ) {
    super(
      dadosNatalidadeRepository,
      'DadosNatalidade',
      workflowSolicitacaoService,
    );
  }

  // Métodos CRUD básicos herdados da classe base AbstractDadosBeneficioService
  // create, findOne, findBySolicitacao, update, remove, existsBySolicitacao, findAll

  /**
   * Construir contexto de erro específico para Natalidade
   */
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        tipoBeneficio: 'NATALIDADE',
        beneficioId: data.id,
        solicitacao_id: data.solicitacao_id,
        data_provavel_parto: data.data_provavel_parto,
        realiza_pre_natal: data.realiza_pre_natal,
        gravidez_risco: data.gravidez_risco,
        gemeos_trigemeos: data.gemeos_trigemeos,
        ja_tem_filhos: data.ja_tem_filhos,
        quantidade_filhos: data.quantidade_filhos,
      },
    };
  }

  /**
   * Validação específica para criação de dados de Natalidade
   */
  protected async validateCreateData(
    data: CreateDadosNatalidadeDto,
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.NATALIDADE;

    try {
      // Validação de campos obrigatórios
      if (!data.solicitacao_id?.trim()) {
        errorBuilder.add(
          'solicitacao_id',
          BENEFICIO_TECH_MESSAGES.NATALIDADE.SOLICITACAO_ID_REQUIRED,
        );
      }

      // Validação de campos booleanos obrigatórios
      if (
        data.realiza_pre_natal === undefined ||
        data.realiza_pre_natal === null
      ) {
        errorBuilder.add(
          'realiza_pre_natal',
          'Campo realiza_pre_natal é obrigatório. Validação de campo obrigatório falhou.',
        );
      }

      if (
        data.atendida_psf_ubs === undefined ||
        data.atendida_psf_ubs === null
      ) {
        errorBuilder.add(
          'atendida_psf_ubs',
          'Campo Atendida PSF/UBS é obrigatório. Validação de campo obrigatório falhou.',
        );
      }

      if (data.gravidez_risco === undefined || data.gravidez_risco === null) {
        errorBuilder.add(
          'gravidez_risco',
          'Campo Gravidez de risco é obrigatório.',
        );
      }

      if (
        data.gemeos_trigemeos === undefined ||
        data.gemeos_trigemeos === null
      ) {
        errorBuilder.add(
          'gemeos_trigemeos',
          'Campo Gêmeos/Trigêmeos é obrigatório.',
        );
      }

      if (data.ja_tem_filhos === undefined || data.ja_tem_filhos === null) {
        errorBuilder.add(
          'ja_tem_filhos',
          'É obrigatório informar se o beneficiário já possui filhos.',
        );
      }

      // Validação de data provável do parto
      if (!data.data_provavel_parto) {
        errorBuilder.add(
          'data_provavel_parto',
          'Campo data provável do parto é obrigatório.',
        );
      } else {
        const hoje = new Date();
        const dataProvavel = new Date(data.data_provavel_parto);

        // Verificar se a data é válida
        if (isNaN(dataProvavel.getTime())) {
          errorBuilder.add(
            'data_provavel_parto',
            'Data provável do parto inválida.',
          );
        } else {
          const diasDiferenca = Math.floor(
            (dataProvavel.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Não pode ser anterior a 30 dias atrás
          if (diasDiferenca < -30) {
            errorBuilder.add(
              'data_provavel_parto',
              BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_MUITO_ANTIGA,
            );
          }

          // Não pode ser superior a 280 dias (gestação máxima)
          if (diasDiferenca > rules.MAX_DIAS_GESTACAO) {
            errorBuilder.add(
              'data_provavel_parto',
              BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_MUITO_FUTURA,
            );
          }
        }
      }

      // Validação de quantidade de filhos
      if (data.ja_tem_filhos) {
        if (!data.quantidade_filhos || data.quantidade_filhos <= 0) {
          errorBuilder.add(
            'quantidade_filhos',
            'É obrigatório informar a quantidade de filhos.',
          );
        } else if (data.quantidade_filhos > rules.MAX_FILHOS) {
          errorBuilder.add(
            'quantidade_filhos',
            BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_EXCEDIDA,
          );
        }
      } else if (data.quantidade_filhos && data.quantidade_filhos > 0) {
        errorBuilder.add(
          'quantidade_filhos',
          'Campo quantidade_filhos deve ser zero ou nulo quando ja_tem_filhos é falso.',
        );
      }

      // Validação de observações adicionais (se fornecidas)
      if (
        data.observacoes &&
        data.observacoes.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES
      ) {
        errorBuilder.add(
          'observacoes',
          `Campo observacoes excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`,
        );
      }

      // Nota: Removida validação de duplicação para permitir comportamento de upsert
      // A lógica de upsert é tratada no método create() da classe base

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('Erro inesperado durante validação de natalidade', {
        error: error.message,
        stack: error.stack,
        solicitacao_id: data.solicitacao_id,
      });
      throw new InternalServerErrorException(
        'Erro interno durante validação dos dados de natalidade',
      );
    }
  }

  /**
   * Validação específica da data provável do parto
   * Permite datas de até 30 dias atrás no timezone de Brasília
   */
  private validateDataProvavelParto(
    dataProvavelParto: string,
    errorBuilder: BeneficioValidationErrorBuilder,
  ): void {
    try {
      const dataParto = new Date(dataProvavelParto);

      // Verificar se a data é válida
      if (isNaN(dataParto.getTime())) {
        errorBuilder.add(
          'data_provavel_parto',
          'Data provável do parto inválida',
        );
        return;
      }

      // Obter data atual no timezone de Brasília (UTC-3)
      const agora = new Date();
      const offsetBrasilia = -3 * 60; // UTC-3 em minutos
      const agoraBrasilia = new Date(
        agora.getTime() + offsetBrasilia * 60 * 1000,
      );

      // Normalizar datas para comparação (apenas data, sem horário)
      const dataPartoNormalizada = new Date(
        dataParto.getFullYear(),
        dataParto.getMonth(),
        dataParto.getDate(),
      );

      const hojeBrasilia = new Date(
        agoraBrasilia.getFullYear(),
        agoraBrasilia.getMonth(),
        agoraBrasilia.getDate(),
      );

      // Calcular data limite (30 dias atrás)
      const dataLimite = new Date(hojeBrasilia);
      dataLimite.setDate(dataLimite.getDate() - 30);

      // Validar se a data não é anterior a 30 dias atrás
      if (dataPartoNormalizada < dataLimite) {
        errorBuilder.add(
          'data_provavel_parto',
          'Data provável do parto não pode ser anterior a 30 dias da data atual',
        );
        return;
      }

      // Validar prazo máximo de gestação (40 semanas = 280 dias a partir de hoje)
      const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.NATALIDADE;
      const dataMaxima = new Date(hojeBrasilia);
      dataMaxima.setDate(dataMaxima.getDate() + rules.PRAZO_GESTACAO_DIAS);

      if (dataPartoNormalizada > dataMaxima) {
        errorBuilder.add(
          'data_provavel_parto',
          `Data provável do parto não pode ser superior a ${rules.PRAZO_GESTACAO_DIAS} dias da data atual`,
        );
      }
    } catch (error) {
      this.logger.error('Erro ao validar data provável do parto', {
        error: error.message,
        data_recebida: dataProvavelParto,
      });
      errorBuilder.add(
        'data_provavel_parto',
        'Erro ao processar data provável do parto',
      );
    }
  }

  /**
   * Validação específica para atualização de dados de Natalidade
   */
  protected async validateUpdateData(
    data: UpdateDadosNatalidadeDto,
    entity: DadosNatalidade,
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.NATALIDADE;

    try {
      // Validação de data provável do parto
      if (data.data_provavel_parto !== undefined) {
        if (!data.data_provavel_parto) {
          errorBuilder.add(
            'data_provavel_parto',
            'Data provável do parto não pode estar vazia quando fornecida. Validação de conteúdo falhou.',
          );
        } else {
          const hoje = new Date();
          const dataProvavel = new Date(data.data_provavel_parto);

          // Verificar se a data é válida
          if (isNaN(dataProvavel.getTime())) {
            errorBuilder.add(
              'data_provavel_parto',
              'Data provável do parto inválida. Validação de formato falhou.',
            );
          } else {
            const diasDiferenca = Math.floor(
              (dataProvavel.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (diasDiferenca < -30) {
              errorBuilder.add(
                'data_provavel_parto',
                BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_MUITO_ANTIGA,
              );
            }

            if (diasDiferenca > rules.MAX_DIAS_GESTACAO) {
              errorBuilder.add(
                'data_provavel_parto',
                BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_MUITO_FUTURA,
              );
            }
          }
        }
      }

      // Validação de quantidade de filhos
      const jaTemFilhos = data.ja_tem_filhos ?? entity.ja_tem_filhos;
      const quantidadeFilhos =
        data.quantidade_filhos ?? entity.quantidade_filhos;

      if (
        data.ja_tem_filhos !== undefined ||
        data.quantidade_filhos !== undefined
      ) {
        if (jaTemFilhos) {
          if (!quantidadeFilhos || quantidadeFilhos <= 0) {
            errorBuilder.add(
              'quantidade_filhos',
              'Campo quantidade_filhos é obrigatório quando ja_tem_filhos é verdadeiro. Validação de campo obrigatório falhou.',
            );
          } else if (quantidadeFilhos > rules.MAX_FILHOS) {
            errorBuilder.add(
              'quantidade_filhos',
              BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_EXCEDIDA,
            );
          }
        } else if (quantidadeFilhos && quantidadeFilhos > 0) {
          errorBuilder.add(
            'quantidade_filhos',
            'Campo quantidade_filhos deve ser zero ou nulo quando ja_tem_filhos é falso. Validação de consistência falhou.',
          );
        }
      }

      // Validação de observações adicionais (se fornecidas)
      if (
        data.observacoes !== undefined &&
        data.observacoes &&
        data.observacoes.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES
      ) {
        errorBuilder.add(
          'observacoes',
          `Campo observacoes excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`,
        );
      }

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        'Erro inesperado durante validação de atualização de natalidade',
        {
          error: error.message,
          stack: error.stack,
          entity_id: entity.id,
        },
      );
      throw new InternalServerErrorException(
        'Erro interno durante validação dos dados de natalidade',
      );
    }
  }
}
