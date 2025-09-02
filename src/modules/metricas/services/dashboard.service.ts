import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder, In, Not } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { Recurso, StatusRecurso } from '../../../entities/recurso.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { Unidade } from '../../../entities/unidade.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { ComposicaoFamiliar } from '../../../entities/composicao-familiar.entity';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Pendencia } from '../../../entities/pendencia.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { ScopeViolationException } from '../../../common/exceptions/scope.exceptions';
import { DashboardFiltrosDto } from '../dto/dashboard-filtros.dto';
import { DashboardFiltrosHelper } from '../helpers/dashboard-filtros.helper';
import {
  DashboardIndicadoresCompletos,
  ImpactoSocialIndicadores,
  EficienciaOperacionalIndicadores,
  GestaoOrcamentariaIndicadores,
  PerformanceUnidadesIndicadores,
  AnaliseTerritorialIndicadores,
  PerfilBeneficiariosIndicadores,
  ComunicacaoCampanhasIndicadores,
} from '../interfaces/dashboard-indicadores.interface';

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

    @InjectRepository(Concessao)
    private concessaoRepository: Repository<Concessao>,

    @InjectRepository(ComposicaoFamiliar)
    private composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,

    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,

    @InjectRepository(Pendencia)
    private pendenciaRepository: Repository<Pendencia>,
  ) {
    this.logger.log('Serviço de Dashboard inicializado');
  }

  /**
   * Aplica filtros padronizados do dashboard a uma query de solicitação
   * @param queryBuilder QueryBuilder da entidade Solicitacao
   * @param filtros Filtros do dashboard
   * @param alias Alias da tabela principal
   */
  private aplicarFiltrosDashboard(
    queryBuilder: SelectQueryBuilder<Solicitacao>,
    filtros?: DashboardFiltrosDto,
    alias: string = 'solicitacao',
  ): void {
    const context = RequestContextHolder.get();

    if (filtros) {
      DashboardFiltrosHelper.adicionarJoinsNecessarios(
        queryBuilder,
        filtros,
        alias,
      );
      DashboardFiltrosHelper.aplicarFiltros(
        queryBuilder,
        filtros,
        context,
        alias,
      );
    }
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

  /**
   * Obtém todos os indicadores organizados por segmentos
   * @param filtros Filtros opcionais para os indicadores
   * @returns Indicadores completos do dashboard
   */
  async obterIndicadoresCompletos(
    filtros?: DashboardFiltrosDto,
  ): Promise<DashboardIndicadoresCompletos> {
    try {
      this.logger.log('Iniciando cálculo dos indicadores completos');

      const [
        impactoSocial,
        eficienciaOperacional,
        gestaoOrcamentaria,
        performanceUnidades,
        analiseTerritorial,
        perfilBeneficiarios,
        comunicacaoCampanhas,
      ] = await Promise.all([
        this.obterIndicadoresImpactoSocial(filtros),
        this.obterIndicadoresEficienciaOperacional(filtros),
        this.obterIndicadoresGestaoOrcamentaria(filtros),
        this.obterIndicadoresPerformanceUnidades(filtros),
        this.obterIndicadoresAnaliseTerritorial(filtros),
        this.obterIndicadoresPerfilBeneficiarios(filtros),
        this.obterIndicadoresComunicacaoCampanhas(filtros),
      ]);

      const context = RequestContextHolder.get();
      const agora = new Date();
      const dataInicio = filtros?.dataInicio
        ? new Date(filtros.dataInicio)
        : new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : agora;

      return {
        impactoSocial,
        eficienciaOperacional,
        gestaoOrcamentaria,
        performanceUnidades,
        analiseterritorial: analiseTerritorial,
        perfilBeneficiarios,
        comunicacaoCampanhas,
        ultimaAtualizacao: agora,
        periodoReferencia: {
          inicio: dataInicio,
          fim: dataFim,
        },
        escopo: {
          tipo: context?.tipo
            ? (context.tipo.toLowerCase() as 'global' | 'unidade' | 'proprio')
            : 'global',
          unidadeId: context?.unidade_id
            ? parseInt(context.unidade_id.toString())
            : undefined,
          userId: context?.user_id
            ? parseInt(context.user_id.toString())
            : undefined,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao obter indicadores completos:', error);
      throw error;
    }
  }

  /**
   * IMPACTO SOCIAL
   * Calcula indicadores de impacto social e narrativa de sucesso
   */
  async obterIndicadoresImpactoSocial(
    filtros?: DashboardFiltrosDto,
  ): Promise<ImpactoSocialIndicadores> {
    // Validar filtros de período
    if (filtros) {
      DashboardFiltrosHelper.validarPeriodo(filtros);
    }

    const dataInicio = filtros?.dataInicio
      ? new Date(filtros.dataInicio)
      : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : new Date();

    const context = RequestContextHolder.get();

    // Famílias beneficiadas (concessões ativas - não canceladas ou aptas)
    const familiasBeneficiadasQb = this.concessaoRepository
      .createQueryBuilder('concessao')
      .select('COUNT(DISTINCT solicitacao.beneficiario_id)', 'count')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .where('concessao.status NOT IN (:...status)', {
        status: ['apto', 'cancelado'],
      })
      .andWhere('concessao.dataInicio BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    const familiasBeneficiadasResult = await familiasBeneficiadasQb.getRawOne();
    const familiasBeneficiadas = parseInt(
      familiasBeneficiadasResult?.count || '0',
    );

    // Pessoas impactadas (beneficiários + membros da composição familiar)
    const pessoasImpactadasQb = this.concessaoRepository
      .createQueryBuilder('concessao')
      .select(
        'COUNT(DISTINCT solicitacao.beneficiario_id) + COUNT(DISTINCT cf.cidadao_id)',
        'total',
      )
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .leftJoin(
        'composicao_familiar',
        'cf',
        'solicitacao.beneficiario_id = cf.cidadao_id',
      )
      .where('concessao.status NOT IN (:...status)', {
        status: ['apto', 'cancelado'],
      })
      .andWhere('concessao.dataInicio BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    const pessoasImpactadasResult = await pessoasImpactadasQb.getRawOne();
    const pessoasImpactadas = parseInt(pessoasImpactadasResult?.total || '0');

    // Investimento social total (pagamentos confirmados vinculados a concessões)
    const investimentoQb = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select('SUM(pagamento.valor)', 'total')
      .innerJoin('pagamento.concessao', 'concessao')
      .where('pagamento.status = :status', {
        status: 'pago',
      })
      .andWhere('pagamento.data_pagamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    const investimentoResult = await investimentoQb.getRawOne();
    const investimentoSocialTotal = parseFloat(
      investimentoResult?.total || '0',
    );

    // Evolução mensal (baseada em concessões e pagamentos)
    const evolucaoMensalQb = this.concessaoRepository
      .createQueryBuilder('concessao')
      .select("TO_CHAR(concessao.dataInicio, 'YYYY-MM')", 'mes')
      .addSelect('COUNT(DISTINCT solicitacao.beneficiario_id)', 'familias')
      .addSelect('COALESCE(SUM(pagamento.valor), 0)', 'investimento')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .leftJoin(
        'pagamento',
        'pagamento',
        'pagamento.concessao_id = concessao.id AND pagamento.status = :statusPago',
      )
      .where('concessao.status NOT IN (:...status)', {
        status: ['apto', 'cancelado'],
      })
      .andWhere('concessao.dataInicio BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .setParameter('statusPago', 'pago')
      .groupBy('mes')
      .orderBy('mes', 'ASC');

    const evolucaoMensal = await evolucaoMensalQb.getRawMany();

    // Distribuição por tipo de benefício (baseada em concessões)
    const distribuicaoQb = this.concessaoRepository
      .createQueryBuilder('concessao')
      .select('tipo.nome', 'tipo')
      .addSelect('COUNT(DISTINCT solicitacao.beneficiario_id)', 'quantidade')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .leftJoin('solicitacao.tipo_beneficio', 'tipo')
      .where('concessao.status NOT IN (:...status)', {
        status: ['apto', 'cancelado'],
      })
      .andWhere('concessao.dataInicio BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('tipo.id')
      .orderBy('quantidade', 'DESC');

    const distribuicaoPorTipoBeneficio = await distribuicaoQb.getRawMany();

    const totalBeneficios = distribuicaoPorTipoBeneficio.reduce(
      (acc, item) => acc + parseInt(item.quantidade),
      0,
    );
    const distribuicaoComPercentual = distribuicaoPorTipoBeneficio.map(
      (item) => ({
        tipo: item.tipo,
        quantidade: parseInt(item.quantidade),
        percentual:
          totalBeneficios > 0
            ? Math.round(
                (parseInt(item.quantidade) / totalBeneficios) * 100 * 100,
              ) / 100
            : 0,
      }),
    );

    // Valor médio por família
    const valorMedioPorFamilia =
      familiasBeneficiadas > 0
        ? investimentoSocialTotal / familiasBeneficiadas
        : 0;

    // Taxa de cobertura social (baseada na relação entre concessões ativas e solicitações totais)
    const totalSolicitacoesQb = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    const totalSolicitacoes = await totalSolicitacoesQb.getCount();
    const taxaCoberturaSocial =
      totalSolicitacoes > 0
        ? (familiasBeneficiadas / totalSolicitacoes) * 100
        : 0;

    return {
      familiasBeneficiadas,
      pessoasImpactadas,
      investimentoSocialTotal,
      evolucaoMensal: evolucaoMensal.map((item) => ({
        mes: item.mes,
        familias: parseInt(item.familias),
        investimento: parseFloat(item.investimento || '0'),
      })),
      distribuicaoPorTipoBeneficio: distribuicaoComPercentual,
      valorMedioPorFamilia,
      taxaCoberturaSocial,
    };
  }

  /**
   * EFICIÊNCIA OPERACIONAL
   * Calcula indicadores de melhoria de processos e produtividade
   */
  async obterIndicadoresEficienciaOperacional(
    filtros?: DashboardFiltrosDto,
  ): Promise<EficienciaOperacionalIndicadores> {
    // Validar filtros de período
    if (filtros) {
      DashboardFiltrosHelper.validarPeriodo(filtros);
    }

    const dataInicio = filtros?.dataInicio
      ? new Date(filtros.dataInicio)
      : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : new Date();

    // Tempo médio de processamento
    const tempoMedioQb = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .select(
        'AVG(EXTRACT(EPOCH FROM (solicitacao.data_aprovacao - solicitacao.data_abertura)) / 86400)',
        'media',
      )
      .where('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .andWhere('solicitacao.data_aprovacao IS NOT NULL')
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    this.aplicarFiltrosDashboard(tempoMedioQb, filtros);
    const tempoMedioResult = await tempoMedioQb.getRawOne();
    const tempoMedioProcessamento = parseFloat(tempoMedioResult?.media || '0');

    // Taxa de aprovação
    const totalAnalisadasQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .where('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    this.aplicarFiltrosDashboard(totalAnalisadasQb, filtros);
    const totalAnalisadas = await totalAnalisadasQb.getCount();

    const totalAprovadasQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    this.aplicarFiltrosDashboard(totalAprovadasQb, filtros);
    const totalAprovadas = await totalAprovadasQb.getCount();

    const taxaAprovacao =
      totalAnalisadas > 0 ? (totalAprovadas / totalAnalisadas) * 100 : 0;

    // Pendências ativas
    const pendenciasAtivasQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    ).where('solicitacao.status IN (:...status)', {
      status: [StatusSolicitacao.PENDENTE],
    });

    this.aplicarFiltrosDashboard(pendenciasAtivasQb, filtros);
    const pendenciasAtivas = await pendenciasAtivasQb.getCount();

    // Taxa de retrabalho (solicitações com pendências / total de solicitações)
    const taxaRetrabalhoQb = this.solicitacaoRepository
      .createQueryBuilder('s')
      .select(
        'COUNT(DISTINCT p.solicitacao_id) * 1.0 / COUNT(s.id)',
        'taxa_retrabalho',
      )
      .leftJoin('pendencias', 'p', 'p.solicitacao_id = s.id')
      .where('s.data_abertura BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    const taxaRetrabalhoResult = await taxaRetrabalhoQb.getRawOne();
    const taxaRetrabalho =
      parseFloat(taxaRetrabalhoResult?.taxa_retrabalho || '0') * 100;

    // Produtividade por usuário por dia (solicitações por dia por técnico)
    const produtividadeQb = this.solicitacaoRepository
      .createQueryBuilder('s')
      .select('u.id', 'usuario_id')
      .addSelect('u.nome', 'nome')
      .addSelect(
        "COUNT(s.id) * 1.0 / GREATEST(DATE_PART('day', MAX(CURRENT_TIMESTAMP) - MIN(s.created_at)) + 1, 1)",
        'solicitacao_por_dia',
      )
      .innerJoin('usuario', 'u', 'u.id = s.tecnico_id')
      .where('s.data_abertura BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('u.id, u.nome');

    const produtividadeResult = await produtividadeQb.getRawMany();
    const produtividadePorTecnico =
      produtividadeResult.length > 0
        ? produtividadeResult.reduce(
            (acc, item) => acc + parseFloat(item.solicitacao_por_dia),
            0,
          ) / produtividadeResult.length
        : 0;

    // Backlog de solicitações
    const backlogSolicitacoes: number =
      await this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .where('solicitacao.status NOT IN (:...status)', {
          status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
        })
        .getCount();

    return {
      tempoMedioProcessamento,
      taxaAprovacao,
      pendenciasAtivas,
      produtividadePorTecnico,
      taxaRetrabalho,
      backlogSolicitacoes,
    };
  }

  /**
   * GESTÃO ORÇAMENTÁRIA
   * Calcula indicadores de controle financeiro e execução
   */
  async obterIndicadoresGestaoOrcamentaria(
    filtros?: DashboardFiltrosDto,
  ): Promise<GestaoOrcamentariaIndicadores> {
    // Validar filtros de período
    if (filtros) {
      DashboardFiltrosHelper.validarPeriodo(filtros);
    }

    const dataInicio = filtros?.dataInicio
      ? new Date(filtros.dataInicio)
      : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : new Date();

    // Valor total investido (baseado em pagamentos efetivos)
    const valorTotalQb = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select('SUM(pagamento.valor)', 'total')
      .innerJoin('pagamento.concessao', 'concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .where('pagamento.status = :status', { status: StatusPagamentoEnum.PAGO })
      .andWhere('pagamento.data_pagamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    // Aplicar filtros se necessário
    if (filtros?.unidade) {
      valorTotalQb.andWhere('solicitacao.unidade_id = :unidade', {
        unidade: filtros.unidade,
      });
    }
    if (filtros?.beneficio) {
      valorTotalQb.andWhere('solicitacao.tipo_beneficio_id = :beneficio', {
        beneficio: filtros.beneficio,
      });
    }

    const valorTotalResult = await valorTotalQb.getRawOne();
    const valorTotalInvestido = parseFloat(valorTotalResult?.total || '0');

    // Execução orçamentária (simulada - seria necessário orçamento total)
    const orcamentoTotal = 10000000; // Placeholder - implementar com dados reais
    const execucaoOrcamentaria =
      orcamentoTotal > 0 ? (valorTotalInvestido / orcamentoTotal) * 100 : 0;

    // Custo médio por benefício (baseado em pagamentos efetivos)
    const custoMedioQb = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select('tipo.nome', 'tipo')
      .addSelect('AVG(pagamento.valor)', 'custo')
      .innerJoin('pagamento.concessao', 'concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo')
      .where('pagamento.status = :status', { status: StatusPagamentoEnum.PAGO })
      .andWhere('pagamento.data_pagamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('tipo.id, tipo.nome');

    // Aplicar filtros se necessário
    if (filtros?.unidade) {
      custoMedioQb.andWhere('solicitacao.unidade_id = :unidade', {
        unidade: filtros.unidade,
      });
    }
    if (filtros?.beneficio) {
      custoMedioQb.andWhere('solicitacao.tipo_beneficio_id = :beneficio', {
        beneficio: filtros.beneficio,
      });
    }

    const custoMedioPorBeneficio = await custoMedioQb.getRawMany();

    // Projeção vs Realizado (baseado em dados históricos)
    const projecaoVsRealizado = [];
    const mesesNoAno = 12;
    const orcamentoMensal = orcamentoTotal / mesesNoAno;

    // Buscar dados reais de pagamentos por mês
    const pagamentosMensaisQb = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select("TO_CHAR(pagamento.data_pagamento, 'YYYY-MM')", 'mes')
      .addSelect('SUM(pagamento.valor)', 'valor')
      .innerJoin('pagamento.concessao', 'concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .where('pagamento.status = :status', { status: StatusPagamentoEnum.PAGO })
      .andWhere('pagamento.data_pagamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('mes')
      .orderBy('mes', 'ASC');

    const pagamentosMensais = await pagamentosMensaisQb.getRawMany();
    const pagamentosPorMes = new Map(
      pagamentosMensais.map((p) => [p.mes, parseFloat(p.valor || '0')]),
    );

    for (let i = 0; i < mesesNoAno; i++) {
      const mes = new Date(dataInicio.getFullYear(), i, 1);
      const mesStr = mes.toISOString().substring(0, 7);
      const realizado = pagamentosPorMes.get(mesStr) || 0;

      projecaoVsRealizado.push({
        mes: mesStr,
        projetado: orcamentoMensal,
        realizado: realizado,
      });
    }

    // Distribuição orçamentária (baseada em pagamentos efetivos)
    const distribuicaoQb = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select('tipo.nome', 'tipo')
      .addSelect('SUM(pagamento.valor)', 'valor')
      .innerJoin('pagamento.concessao', 'concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo')
      .where('pagamento.status = :status', { status: StatusPagamentoEnum.PAGO })
      .andWhere('pagamento.data_pagamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('tipo.id, tipo.nome');

    // Aplicar filtros se necessário
    if (filtros?.unidade) {
      distribuicaoQb.andWhere('solicitacao.unidade_id = :unidade', {
        unidade: filtros.unidade,
      });
    }
    if (filtros?.beneficio) {
      distribuicaoQb.andWhere('solicitacao.tipo_beneficio_id = :beneficio', {
        beneficio: filtros.beneficio,
      });
    }

    const distribuicaoOrcamentaria = await distribuicaoQb.getRawMany();

    const distribuicaoComPercentual = distribuicaoOrcamentaria.map((item) => ({
      tipo: item.tipo,
      valor: parseFloat(item.valor),
      percentual:
        valorTotalInvestido > 0
          ? (parseFloat(item.valor) / valorTotalInvestido) * 100
          : 0,
    }));

    // Eficiência do gasto (baseada na relação entre valor investido e famílias beneficiadas)
    const totalFamiliasQb = this.concessaoRepository
      .createQueryBuilder('concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .where('concessao.status NOT IN (:...status)', {
        status: ['apto', 'cancelado'],
      })
      .andWhere('concessao.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    const totalFamilias = await totalFamiliasQb.getCount();
    const custoMedioPorFamilia =
      totalFamilias > 0 ? valorTotalInvestido / totalFamilias : 0;
    const eficienciaGasto =
      custoMedioPorFamilia > 0
        ? Math.min((1000 / custoMedioPorFamilia) * 100, 100)
        : 0;

    // Margem orçamentária disponível
    const margemOrcamentariaDisponivel = orcamentoTotal - valorTotalInvestido;

    // Sazonalidade dos gastos (baseada em pagamentos efetivos)
    const sazonalidadeQb = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select("TO_CHAR(pagamento.data_pagamento, 'YYYY-MM')", 'mes')
      .addSelect('SUM(pagamento.valor)', 'valor')
      .innerJoin('pagamento.concessao', 'concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .where('pagamento.status = :status', { status: StatusPagamentoEnum.PAGO })
      .andWhere('pagamento.data_pagamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('mes')
      .orderBy('mes', 'ASC');

    // Aplicar filtros se necessário
    if (filtros?.unidade) {
      sazonalidadeQb.andWhere('solicitacao.unidade_id = :unidade', {
        unidade: filtros.unidade,
      });
    }
    if (filtros?.beneficio) {
      sazonalidadeQb.andWhere('solicitacao.tipo_beneficio_id = :beneficio', {
        beneficio: filtros.beneficio,
      });
    }

    const sazonalidadeGastos = await sazonalidadeQb.getRawMany();

    return {
      execucaoOrcamentaria,
      valorTotalInvestido,
      custoMedioPorBeneficio: custoMedioPorBeneficio.map((item) => ({
        tipo: item.tipo,
        custo: parseFloat(item.custo),
      })),
      projecaoVsRealizado,
      distribuicaoOrcamentaria: distribuicaoComPercentual,
      eficienciaGasto,
      margemOrcamentariaDisponivel,
      sazonalidadeGastos: sazonalidadeGastos.map((item) => ({
        mes: item.mes,
        valor: parseFloat(item.valor || '0'),
      })),
    };
  }

  /**
   * PERFORMANCE DAS UNIDADES
   * Calcula indicadores de gestão de equipes e recursos
   */
  async obterIndicadoresPerformanceUnidades(
    filtros?: DashboardFiltrosDto,
  ): Promise<PerformanceUnidadesIndicadores> {
    // Validar e definir período
    DashboardFiltrosHelper.validarPeriodo(filtros);
    const dataInicio = filtros?.dataInicio
      ? new Date(filtros.dataInicio)
      : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : new Date();

    // Solicitações por unidade
    const solicitacoesUnidadeQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .select('unidade.nome', 'unidade')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .leftJoin('solicitacao.unidade', 'unidade')
      .where('solicitacao.data_abertura BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('unidade.id')
      .orderBy('quantidade', 'DESC');

    this.aplicarFiltrosDashboard(solicitacoesUnidadeQb, filtros);
    const solicitacoesPorUnidade = await solicitacoesUnidadeQb.getRawMany();

    // Tempo médio por unidade
    const tempoMedioUnidadeQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .select('unidade.nome', 'unidade')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (solicitacao.data_aprovacao - solicitacao.data_abertura)) / 86400)',
        'tempo',
      )
      .leftJoin('solicitacao.unidade', 'unidade')
      .where('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .andWhere('solicitacao.data_aprovacao IS NOT NULL')
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('unidade.id');

    this.aplicarFiltrosDashboard(tempoMedioUnidadeQb, filtros);
    const tempoMedioPorUnidade = await tempoMedioUnidadeQb.getRawMany();

    // Taxa de aprovação por unidade
    const taxaAprovacaoUnidadeQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .select('unidade.nome', 'unidade')
      .addSelect(
        'COUNT(CASE WHEN solicitacao.status = :aprovada THEN 1 END)',
        'aprovadas',
      )
      .addSelect(
        'COUNT(CASE WHEN solicitacao.status IN (:...analisadas) THEN 1 END)',
        'total',
      )
      .leftJoin('solicitacao.unidade', 'unidade')
      .where('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .setParameters({
        aprovada: StatusSolicitacao.APROVADA,
        analisadas: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .groupBy('unidade.id');

    this.aplicarFiltrosDashboard(taxaAprovacaoUnidadeQb, filtros);
    const taxaAprovacaoPorUnidade = await taxaAprovacaoUnidadeQb.getRawMany();

    // Utilização orçamentária (simulada)
    const utilizacaoOrcamentariaQb = this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .select('unidade.nome', 'unidade')
      .addSelect('SUM(pagamento.valor)', 'utilizado')
      .leftJoin('solicitacao.unidade', 'unidade')
      .leftJoin('solicitacao.pagamentos', 'pagamento')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('unidade.id');

    this.aplicarFiltrosDashboard(utilizacaoOrcamentariaQb, filtros);
    const utilizacaoOrcamentaria = await utilizacaoOrcamentariaQb.getRawMany();

    // Dados simulados para indicadores secundários
    const produtividadeIndividual = []; // Placeholder
    const rankingPerformance = solicitacoesPorUnidade.map((item, index) => ({
      unidade: item.unidade,
      pontuacao: 100 - index * 5,
      posicao: index + 1,
    }));
    const capacidadeInstalada = []; // Placeholder
    const distribuicaoCarga = []; // Placeholder

    return {
      solicitacoesPorUnidade: solicitacoesPorUnidade.map((item) => ({
        unidade: item.unidade,
        quantidade: parseInt(item.quantidade),
      })),
      tempoMedioPorUnidade: tempoMedioPorUnidade.map((item) => ({
        unidade: item.unidade,
        tempo: parseFloat(item.tempo || '0'),
      })),
      taxaAprovacaoPorUnidade: taxaAprovacaoPorUnidade.map((item) => ({
        unidade: item.unidade,
        taxa:
          parseInt(item.total) > 0
            ? (parseInt(item.aprovadas) / parseInt(item.total)) * 100
            : 0,
      })),
      utilizacaoOrcamentaria: utilizacaoOrcamentaria.map((item) => ({
        unidade: item.unidade,
        utilizado: parseFloat(item.utilizado || '0'),
        disponivel: 1000000, // Placeholder
      })),
      produtividadeIndividual,
      rankingPerformance,
      capacidadeInstalada,
      distribuicaoCarga,
    };
  }

  /**
   * ANÁLISE TERRITORIAL
   * Calcula indicadores de distribuição geográfica e vulnerabilidade
   */
  async obterIndicadoresAnaliseTerritorial(
    filtros?: DashboardFiltrosDto,
  ): Promise<AnaliseTerritorialIndicadores> {
    // Dados simulados para análise territorial
    // Em implementação real, seria necessário integração com dados geográficos

    const densidadeDemanda = [
      {
        bairro: 'Centro',
        densidade: 45,
        coordenadas: { lat: -23.5505, lng: -46.6333 },
      },
      {
        bairro: 'Vila Nova',
        densidade: 32,
        coordenadas: { lat: -23.5515, lng: -46.6343 },
      },
      {
        bairro: 'Jardim América',
        densidade: 28,
        coordenadas: { lat: -23.5525, lng: -46.6353 },
      },
    ];

    const mapaVulnerabilidade = [
      { regiao: 'Zona Norte', nivelRisco: 'alto' as const, quantidade: 150 },
      { regiao: 'Zona Sul', nivelRisco: 'medio' as const, quantidade: 120 },
      { regiao: 'Zona Leste', nivelRisco: 'critico' as const, quantidade: 200 },
      { regiao: 'Zona Oeste', nivelRisco: 'baixo' as const, quantidade: 80 },
    ];

    const coberturaTerritorial = {
      bairrosAtendidos: 45,
      bairrosTotal: 60,
      percentualCobertura: 75,
    };

    const acessibilidade = {
      distanciaMediaKm: 2.5,
      tempoMedioMinutos: 15,
    };

    const rankingBairros = [
      { bairro: 'Centro', atendimentos: 245, posicao: 1 },
      { bairro: 'Vila Nova', atendimentos: 198, posicao: 2 },
      { bairro: 'Jardim América', atendimentos: 156, posicao: 3 },
    ];

    const distribuicaoPerCapita = [
      {
        regiao: 'Zona Norte',
        populacao: 50000,
        atendimentos: 150,
        indicePerCapita: 3.0,
      },
      {
        regiao: 'Zona Sul',
        populacao: 40000,
        atendimentos: 120,
        indicePerCapita: 3.0,
      },
    ];

    const gapsCobertura = [
      {
        area: 'Periferia Norte',
        populacaoEstimada: 15000,
        demandaPotencial: 45,
      },
      { area: 'Zona Rural', populacaoEstimada: 8000, demandaPotencial: 24 },
    ];

    const fluxoOrigemDestino = [
      { origem: 'Centro', destino: 'CRAS Central', quantidade: 120 },
      { origem: 'Vila Nova', destino: 'CRAS Norte', quantidade: 98 },
    ];

    return {
      densidadeDemanda,
      mapaVulnerabilidade,
      coberturaTerritorial,
      acessibilidade,
      rankingBairros,
      distribuicaoPerCapita,
      gapsCobertura,
      fluxoOrigemDestino,
    };
  }

  /**
   * PERFIL DOS BENEFICIÁRIOS
   * Calcula indicadores de características socioeconômicas
   */
  async obterIndicadoresPerfilBeneficiarios(
    filtros?: DashboardFiltrosDto,
  ): Promise<PerfilBeneficiariosIndicadores> {
    // Dados simulados para perfil dos beneficiários
    // Em implementação real, seria necessário campos específicos na entidade Cidadao

    const composicaoFamiliarMedia = 3.8;
    const rendaFamiliarMedia = 1200.5;

    const faixaEtariaPredominante = [
      { faixa: '18-25 anos', quantidade: 120, percentual: 25 },
      { faixa: '26-35 anos', quantidade: 180, percentual: 37.5 },
      { faixa: '36-45 anos', quantidade: 140, percentual: 29.2 },
      { faixa: '46+ anos', quantidade: 40, percentual: 8.3 },
    ];

    const situacoesVulnerabilidade = [
      { situacao: 'Desemprego', quantidade: 200, percentual: 41.7 },
      { situacao: 'Renda insuficiente', quantidade: 150, percentual: 31.3 },
      { situacao: 'Monoparentalidade', quantidade: 80, percentual: 16.7 },
      { situacao: 'Deficiência', quantidade: 50, percentual: 10.4 },
    ];

    const taxaReincidencia = 15.5;

    const escolaridadeMedia = [
      { nivel: 'Fundamental incompleto', quantidade: 80, percentual: 16.7 },
      { nivel: 'Fundamental completo', quantidade: 120, percentual: 25 },
      { nivel: 'Médio incompleto', quantidade: 100, percentual: 20.8 },
      { nivel: 'Médio completo', quantidade: 150, percentual: 31.3 },
      { nivel: 'Superior', quantidade: 30, percentual: 6.3 },
    ];

    const vinculacaoOutrosProgramas = [
      { programa: 'CadÚnico', quantidade: 400, percentual: 83.3 },
      { programa: 'Bolsa Família', quantidade: 250, percentual: 52.1 },
      { programa: 'BPC', quantidade: 50, percentual: 10.4 },
      { programa: 'Auxílio Brasil', quantidade: 180, percentual: 37.5 },
    ];

    const perfilMoradia = [
      { tipo: 'Casa própria', quantidade: 200, percentual: 41.7 },
      { tipo: 'Casa alugada', quantidade: 180, percentual: 37.5 },
      { tipo: 'Casa cedida', quantidade: 80, percentual: 16.7 },
      { tipo: 'Situação precária', quantidade: 20, percentual: 4.2 },
    ];

    return {
      composicaoFamiliarMedia,
      rendaFamiliarMedia,
      faixaEtariaPredominante,
      situacoesVulnerabilidade,
      taxaReincidencia,
      escolaridadeMedia,
      vinculacaoOutrosProgramas,
      perfilMoradia,
    };
  }

  /**
   * COMUNICAÇÃO E CAMPANHAS
   * Calcula indicadores para narrativas de mídia e comunicação externa
   */
  async obterIndicadoresComunicacaoCampanhas(
    filtros?: DashboardFiltrosDto,
  ): Promise<ComunicacaoCampanhasIndicadores> {
    const dataInicio =
      filtros?.dataInicio || new Date(new Date().getFullYear(), 0, 1);
    const dataFim = filtros?.dataFim || new Date();

    // Obter dados para gerar mensagens
    const familiasBeneficiadas = await this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .getCount();

    const investimentoTotal = await this.createScopedSolicitacaoQueryBuilder(
      'solicitacao',
    )
      .leftJoin('solicitacao.pagamentos', 'pagamento')
      .select('SUM(pagamento.valor)', 'total')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .getRawOne();

    const valorTotal = parseFloat(investimentoTotal?.total || '0');
    
    // Calcular pessoas impactadas reais (beneficiários + familiares)
    const pessoasImpactadasResult = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .select('COUNT(DISTINCT solicitacao.beneficiario_id)', 'beneficiarios')
      .addSelect('COUNT(DISTINCT cf.cidadao_id)', 'familiares')
      .leftJoin('composicao_familiar', 'cf', 'solicitacao.beneficiario_id = cf.cidadao_id')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
      .andWhere('solicitacao.data_aprovacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .getRawOne();
    
    const beneficiarios = parseInt(pessoasImpactadasResult?.beneficiarios || '0');
    const familiares = parseInt(pessoasImpactadasResult?.familiares || '0');
    const pessoasImpactadas = beneficiarios + familiares;

    const mensagensFormatadas = {
      impactoGeral: `Em ${new Date().getFullYear()}, o programa já beneficiou ${familiasBeneficiadas.toLocaleString()} famílias, impactando diretamente ${pessoasImpactadas.toLocaleString()} pessoas com um investimento social de R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      evolucaoMensal: `O programa apresenta crescimento consistente, com média de ${Math.round(familiasBeneficiadas / 12)} famílias atendidas por mês.`,
      destaquesBeneficios: [
        {
          tipo: 'Benefício Natalidade',
          mensagem:
            'Apoiando famílias no momento mais especial: a chegada de um novo membro.',
        },
        {
          tipo: 'Aluguel Social',
          mensagem:
            'Garantindo moradia digna para famílias em situação de vulnerabilidade habitacional.',
        },
      ],
    };

    const comparativosTemporais = [
      {
        periodo: 'Último trimestre',
        crescimento: 15.5,
        destaque: 'Crescimento de 15,5% no atendimento às famílias',
      },
      {
        periodo: 'Último semestre',
        crescimento: 28.3,
        destaque: 'Expansão de 28,3% no investimento social',
      },
    ];

    const impactoConsolidado = {
      numeroImpressionate: `${pessoasImpactadas.toLocaleString()} vidas transformadas`,
      contexto: 'através de políticas públicas efetivas de assistência social',
      comparacao: `equivalente à população de uma cidade de médio porte`,
    };

    const casesSucesso = [
      {
        titulo: 'Família Silva: Nova esperança com o Auxílio Natalidade',
        historia:
          'Após perder o emprego durante a pandemia, Maria Silva encontrou no auxílio natalidade o suporte necessário para receber seu terceiro filho com dignidade.',
        impacto:
          'R$ 1.200 que fizeram toda a diferença no momento mais importante da família.',
      },
      {
        titulo: 'Dona Rosa: Moradia digna através do Aluguel Social',
        historia:
          'Aos 65 anos, Rosa conseguiu sair de uma situação de risco habitacional e hoje vive com segurança graças ao programa.',
        impacto:
          'Estabilidade habitacional que devolveu a dignidade e a paz de espírito.',
      },
    ];

    return {
      mensagensFormatadas,
      comparativosTemporais,
      impactoConsolidado,
      casesSucesso,
    };
  }
}
