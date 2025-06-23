import { Injectable, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UseInterceptors } from '@nestjs/common';
import { WorkflowInterceptor } from '../../../interceptors/workflow.interceptor';
import { CacheInterceptor } from '../../../shared/interceptors/cache.interceptor';
import { WorkflowSolicitacaoService } from '../../solicitacao/services/workflow-solicitacao.service';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';
import { CreateDadosCestaBasicaDto, UpdateDadosCestaBasicaDto } from '../dto/create-dados-cesta-basica.dto';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';
import { AppError } from '@/shared/exceptions';

/**
 * Serviço para gerenciar dados específicos de Cesta Básica
 */
@Injectable()
@UseInterceptors(WorkflowInterceptor, CacheInterceptor)
export class DadosCestaBasicaService extends AbstractDadosBeneficioService<
  DadosCestaBasica,
  CreateDadosCestaBasicaDto,
  UpdateDadosCestaBasicaDto
> {
  constructor(
    @InjectRepository(DadosCestaBasica)
    private readonly dadosCestaBasicaRepository: Repository<DadosCestaBasica>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    private readonly workflowSolicitacaoService: WorkflowSolicitacaoService,
  ) {
    super(dadosCestaBasicaRepository, 'DadosCestaBasica', workflowSolicitacaoService);
  }

  // Métodos CRUD básicos herdados da classe base
  // create(), findOne(), findBySolicitacao(), update(), remove(), existsBySolicitacao(), findAll()

  // Métodos existsBySolicitacao() e findAll() herdados da classe base

  /**
   * Buscar dados por período de concessão
   */
  async findByPeriodoConcessao(
    periodoConcessao: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosCestaBasica[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosCestaBasicaRepository.findAndCount({
      where: { periodo_concessao: periodoConcessao as any },
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
   * Buscar dados por origem do atendimento
   */
  async findByOrigemAtendimento(
    origemAtendimento: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosCestaBasica[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosCestaBasicaRepository.findAndCount({
      where: { origem_atendimento: origemAtendimento as any },
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
   * Buscar estatísticas de cestas básicas
   */
  async getEstatisticas(): Promise<{
    totalSolicitacoes: number;
    totalCestas: number;
    porPeriodo: Record<string, number>;
    porOrigem: Record<string, number>;
  }> {
    const totalSolicitacoes = await this.dadosCestaBasicaRepository.count();

    const totalCestasResult = await this.dadosCestaBasicaRepository
      .createQueryBuilder('dados')
      .select('SUM(dados.quantidade_cestas_solicitadas)', 'total')
      .getRawOne();

    const totalCestas = parseInt(totalCestasResult.total) || 0;

    // Estatísticas por período
    const porPeriodoResult = await this.dadosCestaBasicaRepository
      .createQueryBuilder('dados')
      .select('dados.periodo_concessao', 'periodo')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.periodo_concessao')
      .getRawMany();

    const porPeriodo = porPeriodoResult.reduce((acc, item) => {
      acc[item.periodo] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por origem
    const porOrigemResult = await this.dadosCestaBasicaRepository
      .createQueryBuilder('dados')
      .select('dados.origem_atendimento', 'origem')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.origem_atendimento')
      .getRawMany();

    const porOrigem = porOrigemResult.reduce((acc, item) => {
      acc[item.origem] = parseInt(item.quantidade);
      return acc;
    }, {});

    return {
      totalSolicitacoes,
      totalCestas,
      porPeriodo,
      porOrigem,
    };
  }

  /**
   * Construir contexto de erro específico para Cesta Básica
   */
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        tipoBeneficio: 'CESTA_BASICA',
        solicitacao_id: data.solicitacao_id,
        quantidade_solicitada: data.quantidade_cestas_solicitadas,
      tamanho_familia: data.numero_pessoas_familia,
        justificativa_quantidade: data.justificativa_quantidade,
      },
    };
  }

  /**
   * Validação específica para criação de dados de Cesta Básica
   */
  protected async validateCreateData(data: CreateDadosCestaBasicaDto): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.CESTA_BASICA;

    try {
      // Validação de campos obrigatórios
      if (!data.solicitacao_id?.trim()) {
        errorBuilder.add('solicitacao_id', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.SOLICITACAO_ID_REQUIRED);
      }

      if (!data.quantidade_cestas_solicitadas || data.quantidade_cestas_solicitadas <= 0) {
        errorBuilder.add('quantidade_cestas_solicitadas', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.QUANTIDADE_CESTAS_REQUIRED);
      } else if (data.quantidade_cestas_solicitadas > rules.MAX_CESTAS) {
        errorBuilder.add('quantidade_cestas_solicitadas', `Quantidade de cestas não pode exceder ${rules.MAX_CESTAS}. Validação de limite falhou.`);
      }

      if (!data.periodo_concessao?.trim()) {
        errorBuilder.add('periodo_concessao', 'Campo periodo_concessao é obrigatório. Validação de campo obrigatório falhou.');
      }

      if (!data.origem_atendimento?.trim()) {
        errorBuilder.add('origem_atendimento', 'Campo origem_atendimento é obrigatório. Validação de campo obrigatório falhou.');
      }

      if (!data.numero_pessoas_familia || data.numero_pessoas_familia <= 0) {
        errorBuilder.add('numero_pessoas_familia', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.NUMERO_PESSOAS_REQUIRED);
      } else if (data.numero_pessoas_familia > rules.MAX_PESSOAS_FAMILIA) {
        errorBuilder.add('numero_pessoas_familia', `Número de pessoas na família não pode exceder ${rules.MAX_PESSOAS_FAMILIA}. Validação de limite falhou.`);
      }

      // Validação de regras de negócio
      if (data.quantidade_cestas_solicitadas && data.numero_pessoas_familia) {
        const quantidadeRecomendada = this.calcularQuantidadeRecomendada(data.numero_pessoas_familia);
        
        if (data.quantidade_cestas_solicitadas > quantidadeRecomendada) {
          if (!data.justificativa_quantidade?.trim()) {
            errorBuilder.add('justificativa_quantidade', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.JUSTIFICATIVA_REQUIRED);
          } else if (data.justificativa_quantidade.trim().length < rules.MIN_JUSTIFICATIVA) {
            errorBuilder.add('justificativa_quantidade', `Justificativa deve ter pelo menos ${rules.MIN_JUSTIFICATIVA} caracteres. Validação de tamanho falhou.`);
          }
        }
      }

      // Validação de observações especiais (se fornecidas)
      if (data.observacoes_especiais && data.observacoes_especiais.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES) {
        errorBuilder.add('observacoes_especiais', `Campo observacoes_especiais excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`);
      }

      // Validação de técnico responsável (se fornecido)
      if (data.tecnico_responsavel && data.tecnico_responsavel.trim().length === 0) {
        errorBuilder.add('tecnico_responsavel', 'Campo tecnico_responsavel não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de unidade solicitante (se fornecida)
      if (data.unidade_solicitante && data.unidade_solicitante.trim().length === 0) {
        errorBuilder.add('unidade_solicitante', 'Campo unidade_solicitante não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
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
      this.logger.error('Erro inesperado durante validação de cesta básica', {
        error: error.message,
        stack: error.stack,
        solicitacao_id: data.solicitacao_id
      });
      throw new InternalServerErrorException('Erro interno durante validação dos dados de cesta básica');
    }
  }

  /**
   * Validação específica para atualização de dados de Cesta Básica
   */
  protected async validateUpdateData(
    data: UpdateDadosCestaBasicaDto, 
    entity: DadosCestaBasica
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.CESTA_BASICA;

    try {
      // Validação de quantidade de cestas
      if (data.quantidade_cestas_solicitadas !== undefined) {
        if (data.quantidade_cestas_solicitadas <= 0) {
          errorBuilder.add('quantidade_cestas_solicitadas', 'Quantidade de cestas deve ser maior que zero. Validação de valor falhou.');
        } else if (data.quantidade_cestas_solicitadas > rules.MAX_CESTAS) {
          errorBuilder.add('quantidade_cestas_solicitadas', `Quantidade de cestas não pode exceder ${rules.MAX_CESTAS}. Validação de limite falhou.`);
        }

        const numeroFamilia = data.numero_pessoas_familia ?? entity.numero_pessoas_familia;
        
        if (numeroFamilia) {
          const quantidadeRecomendada = this.calcularQuantidadeRecomendada(numeroFamilia);
          
          if (data.quantidade_cestas_solicitadas > quantidadeRecomendada) {
            const justificativa = data.justificativa_quantidade ?? entity.justificativa_quantidade;
            
            if (!justificativa?.trim()) {
              errorBuilder.add('justificativa_quantidade', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.JUSTIFICATIVA_REQUIRED);
            } else if (justificativa.trim().length < rules.MIN_JUSTIFICATIVA) {
              errorBuilder.add('justificativa_quantidade', `Justificativa deve ter pelo menos ${rules.MIN_JUSTIFICATIVA} caracteres. Validação de tamanho falhou.`);
            }
          }
        }
      }

      // Validação de número de pessoas na família
      if (data.numero_pessoas_familia !== undefined) {
        if (data.numero_pessoas_familia <= 0) {
          errorBuilder.add('numero_pessoas_familia', 'Número de pessoas na família deve ser maior que zero. Validação de valor falhou.');
        } else if (data.numero_pessoas_familia > rules.MAX_PESSOAS_FAMILIA) {
          errorBuilder.add('numero_pessoas_familia', `Número de pessoas na família não pode exceder ${rules.MAX_PESSOAS_FAMILIA}. Validação de limite falhou.`);
        }
      }

      // Validação de período de concessão (se fornecido)
      if (data.periodo_concessao !== undefined && !data.periodo_concessao?.trim()) {
        errorBuilder.add('periodo_concessao', 'Campo periodo_concessao não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de origem do atendimento (se fornecida)
      if (data.origem_atendimento !== undefined && !data.origem_atendimento?.trim()) {
        errorBuilder.add('origem_atendimento', 'Campo origem_atendimento não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de observações especiais (se fornecidas)
      if (data.observacoes_especiais !== undefined && data.observacoes_especiais && data.observacoes_especiais.length > BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES) {
        errorBuilder.add('observacoes_especiais', `Campo observacoes_especiais excede o limite máximo de ${BENEFICIO_CONSTANTS.VALIDATION.MAX_OBSERVACOES} caracteres. Validação de tamanho falhou.`);
      }

      // Validação de técnico responsável (se fornecido)
      if (data.tecnico_responsavel !== undefined && data.tecnico_responsavel && data.tecnico_responsavel.trim().length === 0) {
        errorBuilder.add('tecnico_responsavel', 'Campo tecnico_responsavel não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      // Validação de unidade solicitante (se fornecida)
      if (data.unidade_solicitante !== undefined && data.unidade_solicitante && data.unidade_solicitante.trim().length === 0) {
        errorBuilder.add('unidade_solicitante', 'Campo unidade_solicitante não pode estar vazio quando fornecido. Validação de conteúdo falhou.');
      }

      errorBuilder.throwIfHasErrors();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('Erro inesperado durante validação de atualização de cesta básica', {
        error: error.message,
        stack: error.stack,
        entity_id: entity.id
      });
      throw new InternalServerErrorException('Erro interno durante validação dos dados de cesta básica');
    }
  }

  /**
   * Calcula a quantidade recomendada de cestas básicas baseada no tamanho da família
   */
  private calcularQuantidadeRecomendada(tamanhoFamilia: number): number {
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.CESTA_BASICA;
    return Math.ceil(tamanhoFamilia / rules.PESSOAS_POR_CESTA);
  }


}
