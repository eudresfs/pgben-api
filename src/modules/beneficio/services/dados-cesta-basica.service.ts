import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';
import { CreateDadosCestaBasicaDto, UpdateDadosCestaBasicaDto } from '../dto/create-dados-cesta-basica.dto';
import { AbstractDadosBeneficioService } from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';

/**
 * Serviço para gerenciar dados específicos de Cesta Básica
 */
@Injectable()
export class DadosCestaBasicaService extends AbstractDadosBeneficioService<
  DadosCestaBasica,
  CreateDadosCestaBasicaDto,
  UpdateDadosCestaBasicaDto
> {
  constructor(
    @InjectRepository(DadosCestaBasica)
    private readonly dadosCestaBasicaRepository: Repository<DadosCestaBasica>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(dadosCestaBasicaRepository, 'DadosCestaBasica', CreateDadosCestaBasicaDto, cacheManager);
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

    // Validação de campos obrigatórios
    if (!data.solicitacao_id) {
      errorBuilder.add('solicitacao_id', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.SOLICITACAO_ID_REQUIRED);
    }

    if (!data.quantidade_cestas_solicitadas || data.quantidade_cestas_solicitadas <= 0) {
      errorBuilder.add('quantidade_cestas_solicitadas', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.QUANTIDADE_REQUIRED);
    }

    if (!data.numero_pessoas_familia || data.numero_pessoas_familia <= 0) {
      errorBuilder.add('numero_pessoas_familia', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.TAMANHO_FAMILIA_REQUIRED);
    }

    // Validação de regras de negócio
    if (data.quantidade_cestas_solicitadas && data.numero_pessoas_familia) {
      const quantidadeRecomendada = this.calcularQuantidadeRecomendada(data.numero_pessoas_familia);
      
      if (data.quantidade_cestas_solicitadas > quantidadeRecomendada) {
        if (!data.justificativa_quantidade || data.justificativa_quantidade.length < rules.MIN_JUSTIFICATIVA_LENGTH) {
          errorBuilder.add('justificativa_quantidade', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.JUSTIFICATIVA_REQUIRED);
        }
      }

      if (data.quantidade_cestas_solicitadas > rules.MAX_QUANTIDADE_ABSOLUTA) {
        errorBuilder.add('quantidade_cestas_solicitadas', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.QUANTIDADE_EXCEDIDA);
      }
    }

    errorBuilder.throwIfHasErrors();
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

    // Validação de quantidade solicitada
    if (data.quantidade_cestas_solicitadas !== undefined && data.quantidade_cestas_solicitadas <= 0) {
      errorBuilder.add('quantidade_cestas_solicitadas', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.QUANTIDADE_REQUIRED);
    }

    // Validação de tamanho da família
    if (data.numero_pessoas_familia !== undefined && data.numero_pessoas_familia <= 0) {
      errorBuilder.add('numero_pessoas_familia', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.TAMANHO_FAMILIA_REQUIRED);
    }

    // Validação de regras de negócio
    const quantidadeFinal = data.quantidade_cestas_solicitadas ?? entity.quantidade;
    const tamanhoFamiliaFinal = data.numero_pessoas_familia ?? entity.numero_pessoas_familia;
    
    if (quantidadeFinal && tamanhoFamiliaFinal) {
      const quantidadeRecomendada = this.calcularQuantidadeRecomendada(tamanhoFamiliaFinal);
      
      if (quantidadeFinal > quantidadeRecomendada) {
        const justificativaFinal = data.justificativa_quantidade ?? entity.justificativa_quantidade;
        if (!justificativaFinal || justificativaFinal.length < rules.MIN_JUSTIFICATIVA_LENGTH) {
          errorBuilder.add('justificativa_quantidade', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.JUSTIFICATIVA_REQUIRED);
        }
      }

      if (quantidadeFinal > rules.MAX_QUANTIDADE_ABSOLUTA) {
        errorBuilder.add('quantidade_cestas_solicitadas', BENEFICIO_TECH_MESSAGES.CESTA_BASICA.QUANTIDADE_EXCEDIDA);
      }
    }

    errorBuilder.throwIfHasErrors();
  }

  /**
   * Calcula a quantidade recomendada de cestas básicas baseada no tamanho da família
   */
  private calcularQuantidadeRecomendada(tamanhoFamilia: number): number {
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.CESTA_BASICA;
    return Math.ceil(tamanhoFamilia / rules.PESSOAS_POR_CESTA);
  }


}
