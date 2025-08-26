import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Solicitacao,
  Concessao,
  Pagamento,
  Cidadao,
  TipoBeneficio,
  Endereco,
  ComposicaoFamiliar,
  Unidade,
} from '../../../entities';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import {
  ImpactoSocialData,
  ImpactoSocialMetricas,
  ImpactoSocialIndicadores,
  ImpactoSocialGraficos,
  EvolucaoMensalItem,
  DistribuicaoBeneficiosItem,
  RecursosFaixaEtariaItem,
  RecursosTipoBeneficioItem,
  RecursosImpactoTipoItem,
  RecursosBairrosItem,
} from '../interfaces/impacto-social.interface';
import {
  GestaoOperacionalData,
  GestaoOperacionalMetricasGerais,
  SolicitacoesTramitacao,
  GestaoOperacionalPerformance,
  TaxaConcessao,
  GestaoOperacionalGraficos,
  EvolucaoConcessoesItem,
  SolicitacoesDiaSemanaItem,
  ConcessoesTipoBeneficioItem,
  SolicitacoesUnidadeItem,
} from '../interfaces/gestao-operacional.interface';
import { MetricasFiltrosAvancadosDto, PeriodoPredefinido } from '../dto/metricas-filtros-avancados.dto';
import { FiltrosQueryHelper } from '../helpers/filtros-query.helper';

/**
 * Serviço responsável por calcular e fornecer métricas para o dashboard
 * Foca em impacto social e gestão operacional do sistema de benefícios
 */
@Injectable()
export class MetricasDashboardService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepository: Repository<TipoBeneficio>,
    @InjectRepository(Endereco)
    private readonly enderecoRepository: Repository<Endereco>,
    @InjectRepository(ComposicaoFamiliar)
    private readonly composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,
    @InjectRepository(Unidade)
    private readonly unidadeRepository: Repository<Unidade>,
  ) {}

  /**
   * Obtém métricas de impacto social
   * Calcula dados sobre famílias beneficiadas, pessoas impactadas e investimento social
   */
  async getImpactoSocial(filtros?: MetricasFiltrosAvancadosDto): Promise<ImpactoSocialData> {
    // Se não há filtros ou filtros estão vazios, usar comportamento padrão (últimos 30 dias)
    const filtrosAtivos = this.normalizarFiltros(filtros);
    const dataLimite = this.calcularDataLimite(filtrosAtivos.periodo);

    // Calcular métricas principais
    const metricas = await this.calcularMetricasImpactoSocial(dataLimite, filtrosAtivos);

    // Calcular indicadores
    const indicadores = await this.calcularIndicadoresImpactoSocial(
      metricas,
      dataLimite,
    );

    // Gerar dados para gráficos
    const graficos = await this.gerarGraficosImpactoSocial(dataLimite, filtrosAtivos);

    return {
      metricas,
      indicadores,
      graficos,
    };
  }

  /**
   * Obtém métricas de gestão operacional
   * Calcula dados sobre eficiência dos processos e performance operacional
   */
  async getGestaoOperacional(filtros?: MetricasFiltrosAvancadosDto): Promise<GestaoOperacionalData> {
    // Se não há filtros ou filtros estão vazios, usar comportamento padrão (últimos 30 dias)
    const filtrosAtivos = this.normalizarFiltros(filtros);
    const dataLimite = this.calcularDataLimite(filtrosAtivos.periodo);

    // Calcular métricas gerais
    const metricas_gerais = await this.calcularMetricasGeraisOperacional(
      dataLimite,
      filtrosAtivos,
    );

    // Calcular status de tramitação
    const solicitacoes_tramitacao = await this.calcularSolicitacoesTramitacao(
      dataLimite,
      filtrosAtivos,
    );

    // Calcular performance
    const performance = await this.calcularPerformanceOperacional(dataLimite, filtrosAtivos);

    // Calcular taxa de concessão
    const taxa_concessao = await this.calcularTaxaConcessao(dataLimite, filtrosAtivos);

    // Gerar dados para gráficos
    const graficos = await this.gerarGraficosGestaoOperacional(dataLimite, filtrosAtivos);

    return {
      metricas_gerais,
      solicitacoes_tramitacao,
      performance,
      taxa_concessao,
      graficos,
    };
  }

  /**
   * Calcula a data limite baseada no período informado
   */
  /**
   * Normaliza os filtros para garantir que sempre tenhamos valores válidos
   */
  private normalizarFiltros(filtros?: MetricasFiltrosAvancadosDto): MetricasFiltrosAvancadosDto {
    // Se não há filtros ou todos os campos estão vazios/undefined
    if (!filtros || this.filtrosEstaoVazios(filtros)) {
      return { periodo: PeriodoPredefinido.ULTIMOS_30_DIAS };
    }
    
    // Se há filtros mas não há período definido, usar padrão
    if (!filtros.periodo) {
      return { ...filtros, periodo: PeriodoPredefinido.ULTIMOS_30_DIAS };
    }
    
    return filtros;
  }

  /**
   * Verifica se os filtros estão vazios ou contêm apenas valores undefined/null
   */
  private filtrosEstaoVazios(filtros: MetricasFiltrosAvancadosDto): boolean {
    const campos = [
      'periodo', 'unidades', 'beneficios', 'bairros', 'statusList', 
      'usuario', 'usuarios', 'dataInicioPersonalizada', 'dataFimPersonalizada'
    ];
    
    return campos.every(campo => {
      const valor = filtros[campo];
      return valor === undefined || valor === null || 
             (Array.isArray(valor) && valor.length === 0) ||
             (typeof valor === 'string' && valor.trim() === '');
    });
  }

  private calcularDataLimite(periodo?: PeriodoPredefinido): Date {
    const agora = new Date();
    const dataLimite = new Date(agora);

    switch (periodo) {
      case PeriodoPredefinido.ULTIMOS_90_DIAS:
        dataLimite.setDate(agora.getDate() - 90);
        break;
      case PeriodoPredefinido.ANO_ATUAL:
        dataLimite.setMonth(0, 1);
        break;
      case PeriodoPredefinido.ULTIMOS_30_DIAS:
      default:
        dataLimite.setDate(agora.getDate() - 30);
        break;
    }

    return dataLimite;
  }

  /**
   * Calcula as métricas principais de impacto social
   */
  private async calcularMetricasImpactoSocial(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ImpactoSocialMetricas> {
    // Contar famílias beneficiadas (solicitações aprovadas)
    const familiasBeneficiadasQuery = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite });
    
    // Aplicar filtros apenas se não estão vazios
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(familiasBeneficiadasQuery, filtros);
    }
    
    const familiasBeneficiadas = await familiasBeneficiadasQuery.getCount();

    // Calcular pessoas impactadas (assumindo média de 3 pessoas por família)
    const pessoasImpactadas = familiasBeneficiadas * 3;

    // Contar bairros impactados
    const bairrosResult = await this.enderecoRepository
      .createQueryBuilder('endereco')
      .innerJoin('endereco.cidadao', 'cidadao')
      .innerJoin('cidadao.solicitacoes', 'solicitacao')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .select('COUNT(DISTINCT endereco.bairro)', 'count')
      .getRawOne();
    
    const bairrosImpactados = parseInt(bairrosResult?.count) || 0;

    // Calcular investimento total
    const investimentoResult = await this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .select('SUM(pagamento.valor)', 'total')
      .getRawOne();
    
    const investimentoTotal = parseFloat(investimentoResult?.total) || 0;

    return {
      familias_beneficiadas: familiasBeneficiadas,
      pessoas_impactadas: pessoasImpactadas,
      bairros_impactados: bairrosImpactados,
      investimento_total: investimentoTotal,
    };
  }

  /**
   * Calcula os indicadores de impacto social
   */
  private async calcularIndicadoresImpactoSocial(
    metricas: ImpactoSocialMetricas,
    dataLimite: Date,
  ): Promise<ImpactoSocialIndicadores> {
    // Valor médio por família
    const valorMedioPorFamilia =
      metricas.familias_beneficiadas > 0
        ? metricas.investimento_total / metricas.familias_beneficiadas
        : 0;

    // Taxa de cobertura social (assumindo uma população base)
    const populacaoBase = 50000; // Valor estimado - deve ser configurável
    const taxaCoberturaSocial =
      (metricas.pessoas_impactadas / populacaoBase) * 100;

    return {
      valor_medio_por_familia: Math.round(valorMedioPorFamilia * 100) / 100,
      taxa_cobertura_social: Math.round(taxaCoberturaSocial * 10) / 10,
    };
  }

  /**
   * Gera dados para os gráficos de impacto social
   */
  private async gerarGraficosImpactoSocial(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ImpactoSocialGraficos> {
    // Evolução mensal - últimos 6 meses
    const evolucaoMensal = await this.gerarEvolucaoMensal(dataLimite, filtros);

    // Distribuição de benefícios
    const distribuicaoBeneficios = await this.gerarDistribuicaoBeneficios(
      dataLimite,
      filtros,
    );

    // Recursos por faixa etária
    const recursosFaixaEtaria = await this.gerarRecursosFaixaEtaria(
      dataLimite,
      filtros,
    );

    // Recursos por tipo de benefício
    const recursosTipoBeneficio = await this.gerarRecursosTipoBeneficio(
      dataLimite,
      filtros,
    );

    // Recursos e impacto por tipo
    const recursosImpactoTipo = await this.gerarRecursosImpactoTipo(
      dataLimite,
      filtros,
    );

    // Recursos por bairros
    const recursosBairros = await this.gerarRecursosBairros(dataLimite, filtros);

    return {
      evolucao_mensal: evolucaoMensal,
      distribuicao_beneficios: distribuicaoBeneficios,
      recursos_faixa_etaria: recursosFaixaEtaria,
      recursos_tipo_beneficio: recursosTipoBeneficio,
      recursos_impacto_tipo: recursosImpactoTipo,
      recursos_bairros: recursosBairros,
    };
  }

  /**
   * Gera dados de evolução mensal
   */
  private async gerarEvolucaoMensal(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<EvolucaoMensalItem[]> {
    const meses = [
      'Jan/2024',
      'Fev/2024',
      'Mar/2024',
      'Abr/2024',
      'Mai/2024',
      'Jun/2024',
    ];

    // Por enquanto, retornando dados mock - implementar consulta real
    return [
      { mes: 'Jan/2024', familias: 120, pessoas: 380, investimento: 180000 },
      { mes: 'Fev/2024', familias: 135, pessoas: 420, investimento: 202500 },
      { mes: 'Mar/2024', familias: 142, pessoas: 445, investimento: 213000 },
      { mes: 'Abr/2024', familias: 158, pessoas: 490, investimento: 237000 },
      { mes: 'Mai/2024', familias: 165, pessoas: 515, investimento: 247500 },
      { mes: 'Jun/2024', familias: 180, pessoas: 560, investimento: 270000 },
    ];
  }

  /**
   * Gera dados de distribuição de benefícios
   */
  private async gerarDistribuicaoBeneficios(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<DistribuicaoBeneficiosItem[]> {
    const distribuicaoQuery = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .select([
        'tipo_beneficio.nome as tipo',
        'COUNT(solicitacao.id) as quantidade',
      ]);
    
    if (filtros) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(distribuicaoQuery, filtros);
    }
    
    const distribuicao = await distribuicaoQuery.getRawMany();

    const total = distribuicao.reduce(
      (acc, item) => acc + parseInt(item.quantidade),
      0,
    );

    return distribuicao.map((item) => ({
      tipo: item.tipo,
      quantidade: parseInt(item.quantidade),
      percentual: Math.round((parseInt(item.quantidade) / total) * 1000) / 10,
    }));
  }

  /**
   * Gera dados de recursos por faixa etária
   */
  private async gerarRecursosFaixaEtaria(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosFaixaEtariaItem[]> {
    // Implementação mock - deve ser substituída por consulta real
    return [
      { faixa_etaria: 'Crianças (0-12)', recursos: 450000, percentual: 36.0 },
      {
        faixa_etaria: 'Adolescentes (13-17)',
        recursos: 280000,
        percentual: 22.4,
      },
      { faixa_etaria: 'Jovens (18-29)', recursos: 250000, percentual: 20.0 },
      { faixa_etaria: 'Adultos (30-59)', recursos: 200000, percentual: 16.0 },
      { faixa_etaria: 'Seniors (60+)', recursos: 70000, percentual: 5.6 },
    ];
  }

  /**
   * Gera dados de recursos por tipo de benefício
   */
  private async gerarRecursosTipoBeneficio(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosTipoBeneficioItem[]> {
    const recursosQuery = this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('pagamento.status = :status', {
        status: StatusPagamentoEnum.PAGO,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .select([
        'tipo_beneficio.nome as tipo_beneficio',
        'SUM(pagamento.valor) as recursos',
      ]);
    
    if (filtros) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(recursosQuery, filtros);
    }
    
    const recursos = await recursosQuery.getRawMany();

    const total = recursos.reduce(
      (acc, item) => acc + parseFloat(item.recursos),
      0,
    );

    return recursos.map((item) => ({
      tipo_beneficio: item.tipo_beneficio,
      recursos: parseFloat(item.recursos),
      percentual: Math.round((parseFloat(item.recursos) / total) * 1000) / 10,
    }));
  }

  /**
   * Gera dados de recursos e impacto por tipo
   */
  private async gerarRecursosImpactoTipo(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosImpactoTipoItem[]> {
    // Implementação mock - deve ser substituída por consulta real
    return [
      {
        tipo_beneficio: 'Aluguel Social',
        recursos: 720000,
        familias: 720,
        pessoas: 2160,
      },
      {
        tipo_beneficio: 'Cesta Básica',
        recursos: 380000,
        familias: 380,
        pessoas: 1140,
      },
      {
        tipo_beneficio: 'Benefício Funeral',
        recursos: 120000,
        familias: 120,
        pessoas: 360,
      },
      {
        tipo_beneficio: 'Benefício Natalidade',
        recursos: 30000,
        familias: 30,
        pessoas: 90,
      },
    ];
  }

  /**
   * Gera dados de recursos por bairros
   */
  private async gerarRecursosBairros(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosBairrosItem[]> {
    // Implementação mock - deve ser substituída por consulta real
    return [
      { bairro: 'Centro', recursos: 300000, percentual: 24.0 },
      { bairro: 'Norte', recursos: 250000, percentual: 20.0 },
      { bairro: 'Sul', recursos: 200000, percentual: 16.0 },
      { bairro: 'Leste', recursos: 180000, percentual: 14.4 },
      { bairro: 'Oeste', recursos: 150000, percentual: 12.0 },
      { bairro: 'Zona Rural', recursos: 170000, percentual: 13.6 },
    ];
  }

  /**
   * Calcula métricas gerais operacionais
   */
  private async calcularMetricasGeraisOperacional(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalMetricasGerais> {
    // Novos beneficiários (cidadãos com primeira solicitação aprovada)
    const novosBeneficiarios = await this.cidadaoRepository
      .createQueryBuilder('cidadao')
      .innerJoin('cidadao.solicitacoes', 'solicitacao')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('cidadao.id')
      .having('COUNT(solicitacao.id) = 1')
      .getCount();

    // Solicitações iniciadas
    const solicitacoesIniciadas = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    // Concessões
    const concessoes = await this.concessaoRepository
      .createQueryBuilder('concessao')
      .where('concessao.status = :status', { status: StatusConcessao.ATIVO })
      .andWhere('concessao.dataInicio >= :dataLimite', { dataLimite })
      .getCount();

    // Concessões judicializadas (assumindo campo específico)
    const concessoesJudicializadas = 8; // Mock - implementar consulta real

    return {
      novos_beneficiarios: novosBeneficiarios,
      solicitacoes_iniciadas: solicitacoesIniciadas,
      concessoes: concessoes,
      concessoes_judicializadas: concessoesJudicializadas,
    };
  }

  /**
   * Calcula status de solicitações em tramitação
   */
  private async calcularSolicitacoesTramitacao(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesTramitacao> {
    const emAnalise = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.EM_ANALISE })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const pendentes = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.PENDENTE })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const aprovadas = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const indeferidas = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.INDEFERIDA })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    return {
      em_analise: emAnalise,
      pendentes: pendentes,
      aprovadas: aprovadas,
      indeferidas: indeferidas,
    };
  }

  /**
   * Calcula métricas de performance operacional
   */
  private async calcularPerformanceOperacional(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalPerformance> {
    // Implementação mock - deve ser substituída por consultas reais
    return {
      tempo_medio_solicitacao: 5.2,
      tempo_medio_analise: 3.5,
      solicitacoes_por_dia: 45,
      concessoes_por_dia: 38,
    };
  }

  /**
   * Calcula taxa de concessão
   */
  private async calcularTaxaConcessao(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<TaxaConcessao> {
    const totalSolicitacoes = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .getCount();

    const aprovadas = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const percentualAprovacao =
      totalSolicitacoes > 0 ? (aprovadas / totalSolicitacoes) * 100 : 0;

    return {
      percentual_aprovacao: Math.round(percentualAprovacao * 10) / 10,
      percentual_indeferimento: Math.round((100 - percentualAprovacao) * 10) / 10,
    };
  }

  /**
   * Gera dados para gráficos de gestão operacional
   */
  private async gerarGraficosGestaoOperacional(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalGraficos> {
    // Evolução de concessões
    const evolucaoConcessoes = await this.gerarEvolucaoConcessoes(dataLimite, filtros);

    // Solicitações por dia da semana
    const solicitacoesDiaSemana = await this.gerarSolicitacoesDiaSemana(
      dataLimite,
      filtros,
    );

    // Concessões por tipo de benefício
    const concessoesTipoBeneficio = await this.gerarConcessoesTipoBeneficio(
      dataLimite,
      filtros,
    );

    // Solicitações por unidade
    const solicitacoesUnidade = await this.gerarSolicitacoesUnidade(
      dataLimite,
      filtros,
    );

    return {
      evolucao_concessoes: evolucaoConcessoes,
      solicitacoes_dia_semana: solicitacoesDiaSemana,
      concessoes_tipo_beneficio: concessoesTipoBeneficio,
      solicitacoes_unidade: solicitacoesUnidade,
    };
  }

  /**
   * Gera dados de evolução de concessões
   */
  private async gerarEvolucaoConcessoes(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<EvolucaoConcessoesItem[]> {
    // Implementação mock - deve ser substituída por consulta real
    return [
      {
        mes: 'Jan/2024',
        aluguel_social: 25,
        cesta_basica: 18,
        beneficio_funeral: 3,
        beneficio_natalidade: 1,
      },
      {
        mes: 'Fev/2024',
        aluguel_social: 28,
        cesta_basica: 20,
        beneficio_funeral: 4,
        beneficio_natalidade: 1,
      },
      {
        mes: 'Mar/2024',
        aluguel_social: 30,
        cesta_basica: 22,
        beneficio_funeral: 3,
        beneficio_natalidade: 2,
      },
      {
        mes: 'Abr/2024',
        aluguel_social: 32,
        cesta_basica: 24,
        beneficio_funeral: 4,
        beneficio_natalidade: 1,
      },
      {
        mes: 'Mai/2024',
        aluguel_social: 35,
        cesta_basica: 26,
        beneficio_funeral: 3,
        beneficio_natalidade: 2,
      },
      {
        mes: 'Jun/2024',
        aluguel_social: 38,
        cesta_basica: 28,
        beneficio_funeral: 4,
        beneficio_natalidade: 1,
      },
    ];
  }

  /**
   * Gera dados de solicitações por dia da semana
   */
  private async gerarSolicitacoesDiaSemana(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesDiaSemanaItem[]> {
    // Implementação mock - deve ser substituída por consulta real
    return [
      { dia: 'Segunda', quantidade: 45 },
      { dia: 'Terça', quantidade: 52 },
      { dia: 'Quarta', quantidade: 48 },
      { dia: 'Quinta', quantidade: 55 },
      { dia: 'Sexta', quantidade: 50 },
      { dia: 'Sábado', quantidade: 25 },
      { dia: 'Domingo', quantidade: 12 },
    ];
  }

  /**
   * Gera dados de concessões por tipo de benefício
   */
  private async gerarConcessoesTipoBeneficio(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ConcessoesTipoBeneficioItem[]> {
    // Reutilizar a lógica de distribuição de benefícios
    const distribuicao = await this.gerarDistribuicaoBeneficios(dataLimite, filtros);
    return distribuicao.map((item) => ({
      tipo: item.tipo,
      quantidade: item.quantidade,
      percentual: item.percentual,
    }));
  }

  /**
   * Gera dados de solicitações por unidade
   */
  private async gerarSolicitacoesUnidade(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesUnidadeItem[]> {
    const resultadoQuery = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .innerJoin('solicitacao.unidade', 'unidade')
      .select('unidade.nome', 'unidade')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('unidade.id, unidade.nome')
      .orderBy('COUNT(solicitacao.id)', 'DESC');
    
    if (filtros) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(resultadoQuery, filtros);
    }
    
    const resultado = await resultadoQuery.getRawMany();

    const total = resultado.reduce((sum, item) => sum + parseInt(item.quantidade), 0);

    return resultado.map(item => ({
      unidade: item.unidade,
      quantidade: parseInt(item.quantidade),
      percentual: total > 0 ? Math.round((parseInt(item.quantidade) / total) * 1000) / 10 : 0,
    }));
  }
}