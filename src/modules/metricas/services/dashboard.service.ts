import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { Recurso, StatusRecurso } from '../../../entities/recurso.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { Unidade } from '../../../entities/unidade.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { ScopeViolationException } from '../../../common/exceptions/scope.exceptions';

/**
 * Interface para o resumo do dashboard
 */
export interface ResumoDashboard {
  solicitacoes: {
    total: number;
    pendentes: number;
    emAnalise: number;
    aprovadas: number;
    reprovadas: number;
    liberadas: number;
    canceladas: number;
  };
  recursos: {
    total: number;
    pendentes: number;
    emAnalise: number;
    deferidos: number;
    indeferidos: number;
  };
  beneficios: {
    total: number;
    porTipo: Array<{
      tipo: string;
      quantidade: number;
    }>;
  };
  unidades: {
    total: number;
    maisAtivas: Array<{
      nome: string;
      solicitacoes: number;
    }>;
  };
}

/**
 * Interface para os KPIs do dashboard
 */
export interface KpisDashboard {
  tempoMedioAnalise: number;
  taxaAprovacao: number;
  taxaRecurso: number;
  taxaDeferimento: number;
  solicitacoesPorDia: number;
  beneficiosPorDia: number;
}

/**
 * Interface para os gráficos do dashboard
 */
export interface GraficosDashboard {
  solicitacoesPorPeriodo: Array<{
    data: string;
    quantidade: number;
  }>;
  solicitacoesPorStatus: Array<{
    status: string;
    quantidade: number;
  }>;
  solicitacoesPorUnidade: Array<{
    unidade: string;
    quantidade: number;
  }>;
  solicitacoesPorBeneficio: Array<{
    beneficio: string;
    quantidade: number;
  }>;
}

/**
 * Serviço responsável por fornecer dados para o dashboard
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,

    @InjectRepository(Recurso)
    private recursoRepository: Repository<Recurso>,

    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,

    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
  ) {
    this.logger.log('Serviço de Dashboard inicializado');
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder para solicitações
   * @param queryBuilder QueryBuilder da entidade Solicitacao
   * @param alias Alias da tabela principal
   */
  private applyScopeToSolicitacaoQuery(
    queryBuilder: SelectQueryBuilder<Solicitacao>,
    alias: string = 'solicitacao',
  ): void {
    const context = RequestContextHolder.get();

    if (!context) {
      // Se não há contexto, não aplicar filtros (para rotas públicas)
      return;
    }

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Escopo global: sem filtros adicionais
        break;

      case ScopeType.UNIDADE:
        // Escopo de unidade: filtrar por unidade_id
        if (context.unidade_id) {
          queryBuilder.andWhere(`${alias}.unidade_id = :unidadeId`, {
            unidadeId: context.unidade_id,
          });
        }
        break;

      case ScopeType.PROPRIO:
        // Escopo próprio: filtrar por user_id do criador
        if (context.user_id) {
          queryBuilder.andWhere(`${alias}.criado_por = :userId`, {
            userId: context.user_id,
          });
        }
        break;

      default:
        throw new ScopeViolationException(
          `Tipo de escopo não suportado: ${context.tipo}`,
        );
    }
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder para recursos
   * @param queryBuilder QueryBuilder da entidade Recurso
   * @param alias Alias da tabela principal
   */
  private applyScopeToRecursoQuery(
    queryBuilder: SelectQueryBuilder<Recurso>,
    alias: string = 'recurso',
  ): void {
    const context = RequestContextHolder.get();

    if (!context) {
      return;
    }

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        break;

      case ScopeType.UNIDADE:
        // Recursos são filtrados através da relação com solicitação
        if (context.unidade_id) {
          const hasJoin = queryBuilder.expressionMap.joinAttributes.some(
            (join) =>
              join.alias?.name === 'solicitacao' ||
              (join.relation && join.relation.propertyName === 'solicitacao'),
          );

          if (!hasJoin) {
            queryBuilder.leftJoin(`${alias}.solicitacao`, 'solicitacao_scope');
            queryBuilder.andWhere('solicitacao_scope.unidade_id = :unidadeId', {
              unidadeId: context.unidade_id,
            });
          } else {
            const existingJoin = queryBuilder.expressionMap.joinAttributes.find(
              (join) =>
                join.alias?.name === 'solicitacao' ||
                (join.relation && join.relation.propertyName === 'solicitacao'),
            );
            const joinAlias = existingJoin?.alias?.name || 'solicitacao';
            queryBuilder.andWhere(`${joinAlias}.unidade_id = :unidadeId`, {
              unidadeId: context.unidade_id,
            });
          }
        }
        break;

      case ScopeType.PROPRIO:
        if (context.user_id) {
          queryBuilder.andWhere(`${alias}.criado_por = :userId`, {
            userId: context.user_id,
          });
        }
        break;

      default:
        throw new ScopeViolationException(
          `Tipo de escopo não suportado: ${context.tipo}`,
        );
    }
  }

  /**
   * Cria QueryBuilder com escopo aplicado para solicitações
   * @param alias Alias da tabela
   * @returns QueryBuilder com filtros de escopo aplicados
   */
  private createScopedSolicitacaoQueryBuilder(
    alias: string = 'solicitacao',
  ): SelectQueryBuilder<Solicitacao> {
    const queryBuilder = this.solicitacaoRepository.createQueryBuilder(alias);
    this.applyScopeToSolicitacaoQuery(queryBuilder, alias);
    return queryBuilder;
  }

  /**
   * Cria QueryBuilder com escopo aplicado para recursos
   * @param alias Alias da tabela
   * @returns QueryBuilder com filtros de escopo aplicados
   */
  private createScopedRecursoQueryBuilder(
    alias: string = 'recurso',
  ): SelectQueryBuilder<Recurso> {
    const queryBuilder = this.recursoRepository.createQueryBuilder(alias);
    this.applyScopeToRecursoQuery(queryBuilder, alias);
    return queryBuilder;
  }

  /**
   * Obtém o total de unidades considerando o escopo do usuário
   * @returns Número total de unidades acessíveis
   */
  private async obterTotalUnidadesComEscopo(): Promise<number> {
    const context = RequestContextHolder.get();

    if (!context) {
      return this.unidadeRepository.count();
    }

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Escopo global: todas as unidades
        return this.unidadeRepository.count();

      case ScopeType.UNIDADE:
        // Escopo de unidade: apenas a unidade do usuário
        if (context.unidade_id) {
          return this.unidadeRepository.count({
            where: { id: context.unidade_id },
          });
        }
        return 0;

      case ScopeType.PROPRIO:
        // Escopo próprio: unidades onde o usuário tem solicitações
        const unidadesComSolicitacoes = await this.unidadeRepository
          .createQueryBuilder('unidade')
          .innerJoin('unidade.solicitacoes', 'solicitacao')
          .where('solicitacao.criado_por = :userId', {
            userId: context.user_id,
          })
          .getCount();
        return unidadesComSolicitacoes;

      default:
        return 0;
    }
  }

  /**
   * Obtém o resumo para o dashboard
   * @returns Resumo do dashboard
   */
  async obterResumo(): Promise<ResumoDashboard> {
    // Contagem de solicitações por status com escopo aplicado
    const solicitacoesTotal =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao').getCount();

    const solicitacoesPendentes =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.PENDENTE,
        })
        .getCount();

    const solicitacoesEmAnalise =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.EM_ANALISE,
        })
        .getCount();

    const solicitacoesAprovadas =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.APROVADA,
        })
        .getCount();

    const solicitacoesReprovadas =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.INDEFERIDA,
        })
        .getCount();

    const solicitacoesCanceladas =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.CANCELADA,
        })
        .getCount();

    // Contagem de recursos por status com escopo aplicado
    const recursosTotal =
      await this.createScopedRecursoQueryBuilder('recurso').getCount();

    const recursosPendentes = await this.createScopedRecursoQueryBuilder(
      'recurso',
    )
      .where('recurso.status = :status', { status: StatusRecurso.PENDENTE })
      .getCount();

    const recursosEmAnalise = await this.createScopedRecursoQueryBuilder(
      'recurso',
    )
      .where('recurso.status = :status', { status: StatusRecurso.EM_ANALISE })
      .getCount();

    const recursosDeferidos = await this.createScopedRecursoQueryBuilder(
      'recurso',
    )
      .where('recurso.status = :status', { status: StatusRecurso.DEFERIDO })
      .getCount();

    const recursosIndeferidos = await this.createScopedRecursoQueryBuilder(
      'recurso',
    )
      .where('recurso.status = :status', { status: StatusRecurso.INDEFERIDO })
      .getCount();

    // Contagem de benefícios por tipo com escopo aplicado
    const beneficiosPorTipo = await this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .leftJoin('solicitacao.tipo_beneficio', 'tipo')
      .select('tipo.nome', 'tipo')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .groupBy('tipo.id')
      .orderBy('quantidade', 'DESC')
      .limit(5)
      .getRawMany();

    // Unidades mais ativas com escopo aplicado
    const unidadesMaisAtivasQuery = this.unidadeRepository
      .createQueryBuilder('unidade')
      .select('unidade.nome', 'nome')
      .addSelect('COUNT(solicitacao.id)', 'solicitacoes')
      .leftJoin('unidade.solicitacoes', 'solicitacao');

    // Aplicar filtro de escopo às solicitações relacionadas
    const context = RequestContextHolder.get();
    if (context) {
      switch (context.tipo) {
        case ScopeType.UNIDADE:
          if (context.unidade_id) {
            unidadesMaisAtivasQuery.andWhere(
              'solicitacao.unidade_id = :unidadeId',
              {
                unidadeId: context.unidade_id,
              },
            );
          }
          break;
        case ScopeType.PROPRIO:
          if (context.user_id) {
            unidadesMaisAtivasQuery.andWhere(
              'solicitacao.criado_por = :userId',
              {
                userId: context.user_id,
              },
            );
          }
          break;
        // GLOBAL não precisa de filtros adicionais
      }
    }

    const unidadesMaisAtivas = await unidadesMaisAtivasQuery
      .groupBy('unidade.id')
      .orderBy('solicitacoes', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      solicitacoes: {
        total: solicitacoesTotal,
        pendentes: solicitacoesPendentes,
        emAnalise: solicitacoesEmAnalise,
        aprovadas: solicitacoesAprovadas,
        reprovadas: solicitacoesReprovadas,
        liberadas: solicitacoesAprovadas,
        canceladas: solicitacoesCanceladas,
      },
      recursos: {
        total: recursosTotal,
        pendentes: recursosPendentes,
        emAnalise: recursosEmAnalise,
        deferidos: recursosDeferidos,
        indeferidos: recursosIndeferidos,
      },
      beneficios: {
        total: solicitacoesAprovadas,
        porTipo: beneficiosPorTipo,
      },
      unidades: {
        total: await this.obterTotalUnidadesComEscopo(),
        maisAtivas: unidadesMaisAtivas,
      },
    };
  }

  /**
   * Obtém os KPIs para o dashboard
   * @returns KPIs do dashboard
   */
  async obterKPIs(): Promise<KpisDashboard> {
    // Tempo médio de análise (em dias) com escopo aplicado
    const tempoMedioAnaliseResult =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .select(
          'AVG(EXTRACT(EPOCH FROM (solicitacao.data_aprovacao - solicitacao.data_abertura)) / 86400)',
          'media',
        )
        .where('solicitacao.status IN (:...status)', {
          status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
        })
        .andWhere('solicitacao.data_aprovacao IS NOT NULL')
        .getRawOne();

    const tempoMedioAnalise = tempoMedioAnaliseResult?.media || 0;

    // Taxa de aprovação com escopo aplicado
    const totalAnalisadas = await this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .where('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .getCount();

    const totalAprovadas = await this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .getCount();

    const taxaAprovacao =
      totalAnalisadas > 0 ? (totalAprovadas / totalAnalisadas) * 100 : 0;

    // Taxa de recurso com escopo aplicado
    const totalReprovadas = await this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.INDEFERIDA,
      })
      .getCount();

    const totalRecursos =
      await this.createScopedRecursoQueryBuilder('recurso').getCount();

    const taxaRecurso =
      totalReprovadas > 0 ? (totalRecursos / totalReprovadas) * 100 : 0;

    // Taxa de deferimento com escopo aplicado
    const totalRecursosAnalisados = await this.createScopedRecursoQueryBuilder(
      'recurso',
    )
      .where('recurso.status IN (:...status)', {
        status: [StatusRecurso.DEFERIDO, StatusRecurso.INDEFERIDO],
      })
      .getCount();

    const totalDeferidos = await this.createScopedRecursoQueryBuilder('recurso')
      .where('recurso.status = :status', { status: StatusRecurso.DEFERIDO })
      .getCount();

    const taxaDeferimento =
      totalRecursosAnalisados > 0
        ? (totalDeferidos / totalRecursosAnalisados) * 100
        : 0;

    // Solicitações por dia (últimos 30 dias) com escopo aplicado
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);

    const totalSolicitacoes30Dias =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.data_abertura BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim: new Date(),
        })
        .getCount();

    const solicitacoesPorDia = totalSolicitacoes30Dias / 30;

    // Benefícios por dia (últimos 30 dias) com escopo aplicado
    const totalBeneficios30Dias =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.APROVADA,
        })
        .andWhere(
          'solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim',
          {
            dataInicio,
            dataFim: new Date(),
          },
        )
        .getCount();

    const beneficiosPorDia = totalBeneficios30Dias / 30;

    return {
      tempoMedioAnalise,
      taxaAprovacao,
      taxaRecurso,
      taxaDeferimento,
      solicitacoesPorDia,
      beneficiosPorDia,
    };
  }

  /**
   * Obtém dados para gráficos do dashboard
   * @param periodo Período para filtrar os dados (em dias)
   * @returns Dados para gráficos
   */
  async obterGraficos(periodo: number = 30): Promise<GraficosDashboard> {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    // Solicitações por período (agrupadas por dia) com escopo aplicado
    const solicitacoesPorPeriodo =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .select("TO_CHAR(solicitacao.data_abertura, 'YYYY-MM-DD')", 'data')
        .addSelect('COUNT(solicitacao.id)', 'quantidade')
        .where('solicitacao.data_abertura >= :dataInicio', { dataInicio })
        .groupBy('data')
        .orderBy('data', 'ASC')
        .getRawMany();

    // Solicitações por status com escopo aplicado
    const solicitacoesPorStatus =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .select('solicitacao.status', 'status')
        .addSelect('COUNT(solicitacao.id)', 'quantidade')
        .groupBy('solicitacao.status')
        .orderBy('quantidade', 'DESC')
        .getRawMany();

    // Solicitações por unidade com escopo aplicado
    const solicitacoesPorUnidade =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .select('unidade.nome', 'unidade')
        .addSelect('COUNT(solicitacao.id)', 'quantidade')
        .leftJoin('solicitacao.unidade', 'unidade')
        .groupBy('unidade.id')
        .orderBy('quantidade', 'DESC')
        .limit(10)
        .getRawMany();

    // Solicitações por tipo de benefício com escopo aplicado
    const solicitacoesPorBeneficio =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .select('tipo.nome', 'beneficio')
        .addSelect('COUNT(solicitacao.id)', 'quantidade')
        .leftJoin('solicitacao.tipo_beneficio', 'tipo')
        .groupBy('tipo.id')
        .orderBy('quantidade', 'DESC')
        .getRawMany();

    return {
      solicitacoesPorPeriodo,
      solicitacoesPorStatus,
      solicitacoesPorUnidade,
      solicitacoesPorBeneficio,
    };
  }

  /**
   * Obtém contagem de solicitações agrupadas por status
   * @returns Contagem de solicitações por status com percentuais
   */
  async obterContagemSolicitacoesPorStatus(): Promise<{
    total: number;
    porStatus: Array<{
      status: StatusSolicitacao;
      quantidade: number;
      percentual: number;
    }>;
  }> {
    try {
      // Obter total de solicitações com escopo aplicado
      const total =
        await this.createScopedSolicitacaoQueryBuilder(
          'solicitacao',
        ).getCount();

      // Obter contagem por status com escopo aplicado
      const contagemPorStatus = await this.createScopedSolicitacaoQueryBuilder(
        'solicitacao',
      )
        .select('solicitacao.status', 'status')
        .addSelect('COUNT(solicitacao.id)', 'quantidade')
        .groupBy('solicitacao.status')
        .orderBy('quantidade', 'DESC')
        .getRawMany();

      // Calcular percentuais e formatar resposta
      const porStatus = contagemPorStatus.map((item) => ({
        status: item.status,
        quantidade: parseInt(item.quantidade, 10),
        percentual:
          total > 0
            ? Math.round((parseInt(item.quantidade, 10) / total) * 100 * 100) /
              100
            : 0,
      }));

      return {
        total,
        porStatus,
      };
    } catch (error) {
      this.logger.error(
        'Erro ao obter contagem de solicitações por status:',
        error,
      );
      throw error;
    }
  }
}
