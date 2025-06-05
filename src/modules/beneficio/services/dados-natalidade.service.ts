import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateDadosNatalidadeDto, UpdateDadosNatalidadeDto } from '../dto/create-dados-natalidade.dto';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';
import { DadosNatalidadeRepository } from '../repositories/dados-natalidade.repository';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import { BeneficioValidationErrorBuilder, BENEFICIO_TECH_MESSAGES, BeneficioErrorContext } from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { AppError } from '../../../shared/exceptions/error-catalog/AppError';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';

/**
 * Serviço para gerenciar dados específicos de Auxílio Natalidade
 */
@Injectable()
export class DadosNatalidadeService extends AbstractDadosBeneficioService<
  DadosNatalidade,
  CreateDadosNatalidadeDto,
  UpdateDadosNatalidadeDto
> {
  constructor(
    private readonly dadosNatalidadeRepository: DadosNatalidadeRepository,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
  ) {
    super(dadosNatalidadeRepository, 'DadosNatalidade', CreateDadosNatalidadeDto, cacheManager);
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
  protected async validateCreateData(data: CreateDadosNatalidadeDto): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.NATALIDADE;

    try {
      // Validação de campos obrigatórios com verificação otimizada
      const requiredFields = [
        { field: 'solicitacao_id', value: data.solicitacao_id, message: BENEFICIO_TECH_MESSAGES.GENERIC.CAMPO_OBRIGATORIO },
        { field: 'realiza_pre_natal', value: data.realiza_pre_natal, message: BENEFICIO_TECH_MESSAGES.NATALIDADE.PRE_NATAL_REQUIRED },
        { field: 'atendida_psf_ubs', value: data.atendida_psf_ubs, message: BENEFICIO_TECH_MESSAGES.NATALIDADE.PSF_UBS_REQUIRED },
        { field: 'gravidez_risco', value: data.gravidez_risco, message: BENEFICIO_TECH_MESSAGES.NATALIDADE.GRAVIDEZ_RISCO_REQUIRED },
        { field: 'gemeos_trigemeos', value: data.gemeos_trigemeos, message: BENEFICIO_TECH_MESSAGES.NATALIDADE.GEMEOS_REQUIRED },
        { field: 'ja_tem_filhos', value: data.ja_tem_filhos, message: BENEFICIO_TECH_MESSAGES.NATALIDADE.JA_TEM_FILHOS_REQUIRED }
      ];

      // Verificação otimizada de campos obrigatórios
      for (const { field, value, message } of requiredFields) {
        if (value === undefined || value === null) {
          errorBuilder.add(field, message);
        }
      }

      // Validação de data_provavel_parto
      if (!data.data_provavel_parto) {
        errorBuilder.add('data_provavel_parto', BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_REQUIRED);
      }

      // Validação de chave_pix
      if (!data.chave_pix?.trim()) {
        errorBuilder.add('chave_pix', BENEFICIO_TECH_MESSAGES.NATALIDADE.CHAVE_PIX_FORMATO);
      }

      // Validação de regras de negócio para data_provavel_parto
      if (data.data_provavel_parto) {
        this.validateDataProvavelParto(data.data_provavel_parto, errorBuilder);
      }

      // Validação de quantidade de filhos quando ja_tem_filhos é true
      if (data.ja_tem_filhos === true) {
        if (!data.quantidade_filhos || data.quantidade_filhos <= 0) {
          errorBuilder.add('quantidade_filhos', BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_OBRIGATORIA);
        } else if (data.quantidade_filhos > rules.MAX_FILHOS) {
          errorBuilder.add('quantidade_filhos', BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_EXCEDIDA);
        }
      }

      // Lançar erros se houver
      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('Erro inesperado durante validação de natalidade', {
        error: error.message,
        stack: error.stack,
        solicitacao_id: data.solicitacao_id
      });
      throw new InternalServerErrorException('Erro interno durante validação dos dados de natalidade');
    }
  }

  /**
   * Validação específica da data provável do parto
   * Permite datas de até 30 dias atrás no timezone de Brasília
   */
  private validateDataProvavelParto(dataProvavelParto: string, errorBuilder: BeneficioValidationErrorBuilder): void {
    try {
      const dataParto = new Date(dataProvavelParto);
      
      // Verificar se a data é válida
      if (isNaN(dataParto.getTime())) {
        errorBuilder.add('data_provavel_parto', 'Data provável do parto inválida');
        return;
      }

      // Obter data atual no timezone de Brasília (UTC-3)
      const agora = new Date();
      const offsetBrasilia = -3 * 60; // UTC-3 em minutos
      const agoraBrasilia = new Date(agora.getTime() + (offsetBrasilia * 60 * 1000));
      
      // Normalizar datas para comparação (apenas data, sem horário)
      const dataPartoNormalizada = new Date(
        dataParto.getFullYear(),
        dataParto.getMonth(),
        dataParto.getDate()
      );
      
      const hojeBrasilia = new Date(
        agoraBrasilia.getFullYear(),
        agoraBrasilia.getMonth(),
        agoraBrasilia.getDate()
      );

      // Calcular data limite (30 dias atrás)
      const dataLimite = new Date(hojeBrasilia);
      dataLimite.setDate(dataLimite.getDate() - 30);

      // Validar se a data não é anterior a 30 dias atrás
      if (dataPartoNormalizada < dataLimite) {
        errorBuilder.add('data_provavel_parto', 'Data provável do parto não pode ser anterior a 30 dias da data atual');
        return;
      }

      // Validar prazo máximo de gestação (40 semanas = 280 dias a partir de hoje)
      const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.NATALIDADE;
      const dataMaxima = new Date(hojeBrasilia);
      dataMaxima.setDate(dataMaxima.getDate() + rules.PRAZO_GESTACAO_DIAS);

      if (dataPartoNormalizada > dataMaxima) {
        errorBuilder.add('data_provavel_parto', `Data provável do parto não pode ser superior a ${rules.PRAZO_GESTACAO_DIAS} dias da data atual`);
      }
    } catch (error) {
      this.logger.error('Erro ao validar data provável do parto', {
        error: error.message,
        data_recebida: dataProvavelParto
      });
      errorBuilder.add('data_provavel_parto', 'Erro ao processar data provável do parto');
    }
      }

  /**
   * Validação específica para atualização de dados de Natalidade
   */
  protected async validateUpdateData(
    data: UpdateDadosNatalidadeDto, 
    entity: DadosNatalidade
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.NATALIDADE;

    // Validar data_provavel_parto se fornecida
    if (data.data_provavel_parto !== undefined) {
      if (!data.data_provavel_parto) {
        errorBuilder.add('data_provavel_parto', BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_REQUIRED);
      } else {
        const dataProvavelParto = new Date(data.data_provavel_parto);
        const hoje = new Date();
        
        // Normalizar as datas para comparação (apenas data, sem horário)
        const dataProvavelPartoNormalizada = new Date(
          dataProvavelParto.getFullYear(), 
          dataProvavelParto.getMonth(), 
          dataProvavelParto.getDate()
        );
        const hojeNormalizado = new Date(
          hoje.getFullYear(), 
          hoje.getMonth(), 
          hoje.getDate()
        );
        
        // Validar se a data não é anterior ao dia atual (permite data de hoje)
        if (dataProvavelPartoNormalizada < hojeNormalizado) {
          errorBuilder.add('data_provavel_parto', BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_PASSADA);
        }
        
        // Calcular data máxima (40 semanas = 280 dias a partir de hoje)
        const dataMaxima = new Date(hojeNormalizado);
        dataMaxima.setDate(dataMaxima.getDate() + rules.PRAZO_GESTACAO_SEMANAS * 7);
        
        // Validar se a data não excede 40 semanas
        if (dataProvavelPartoNormalizada > dataMaxima) {
          errorBuilder.add('data_provavel_parto', BENEFICIO_TECH_MESSAGES.NATALIDADE.DATA_PARTO_LIMITE_EXCEDIDO);
        }
      }
    }

    // Validar quantidade_filhos se fornecida
    if (data.quantidade_filhos !== undefined && data.quantidade_filhos <= 0) {
      errorBuilder.add('quantidade_filhos', BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_OBRIGATORIA);
    }

    // Validar quantidade máxima de filhos
    if (data.quantidade_filhos !== undefined && data.quantidade_filhos > rules.MAX_FILHOS) {
      errorBuilder.add('quantidade_filhos', BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_EXCEDIDA);
    }

    // Validar chave_pix se fornecida
    if (data.chave_pix !== undefined && (!data.chave_pix || data.chave_pix.trim().length === 0)) {
      errorBuilder.add('chave_pix', BENEFICIO_TECH_MESSAGES.NATALIDADE.CHAVE_PIX_FORMATO);
    }

    // Validar consistência entre ja_tem_filhos e quantidade_filhos
    const jaTemFilhosFinal = data.ja_tem_filhos ?? entity.ja_tem_filhos;
    const quantidadeFilhosFinal = data.quantidade_filhos ?? entity.quantidade_filhos;
    
    if (jaTemFilhosFinal && (!quantidadeFilhosFinal || quantidadeFilhosFinal <= 0)) {
      errorBuilder.add('quantidade_filhos', BENEFICIO_TECH_MESSAGES.NATALIDADE.QUANTIDADE_FILHOS_OBRIGATORIA);
    }

    errorBuilder.throwIfHasErrors();
  }
}
