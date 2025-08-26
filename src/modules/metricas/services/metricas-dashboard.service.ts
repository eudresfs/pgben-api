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
  async getImpactoSocial(periodo?: string): Promise<ImpactoSocialData> {
    const dataLimite = this.calcularDataLimite(periodo);

    // Calcular métricas principais
    const metricas = await this.calcularMetricasImpactoSocial(dataLimite);

    // Calcular indicadores
    const indicadores = await this.calcularIndicadoresImpactoSocial(
      metricas,
      dataLimite,
    );

    // Gerar dados para gráficos
    const graficos = await this.gerarGraficosImpactoSocial(dataLimite);

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
  async getGestaoOperacional(periodo?: string): Promise<GestaoOperacionalData> {
    const dataLimite = this.calcularDataLimite(periodo);

    // Calcular métricas gerais
    const metricas_gerais = await this.calcularMetricasGeraisOperacional(
      dataLimite,
    );

    // Calcular status de tramitação
    const solicitacoes_tramitacao = await this.calcularSolicitacoesTramitacao(
      dataLimite,
    );

    // Calcular performance
    const performance = await this.calcularPerformanceOperacional(dataLimite);

    // Calcular taxa de concessão
    const taxa_concessao = await this.calcularTaxaConcessao(dataLimite);

    // Gerar dados para gráficos
    const graficos = await this.gerarGraficosGestaoOperacional(dataLimite);

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
  private calcularDataLimite(periodo?: string): Date {
    const agora = new Date();
    const dataLimite = new Date(agora);

    switch (periodo) {
      case '90d':
        dataLimite.setDate(agora.getDate() - 90);
        break;
      case '1y':
        dataLimite.setFullYear(agora.getFullYear() - 1);
        break;
      case '30d':
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
  ): Promise<ImpactoSocialMetricas> {
    // Contar famílias beneficiadas (solicitações aprovadas)
    const familiasBeneficiadas = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

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
  ): Promise<ImpactoSocialGraficos> {
    // Evolução mensal - últimos 6 meses
    const evolucaoMensal = await this.gerarEvolucaoMensal(dataLimite);

    // Distribuição de benefícios
    const distribuicaoBeneficios = await this.gerarDistribuicaoBeneficios(
      dataLimite,
    );

    // Recursos por faixa etária
    const recursosFaixaEtaria = await this.gerarRecursosFaixaEtaria(
      dataLimite,
    );

    // Recursos por tipo de benefício
    const recursosTipoBeneficio = await this.gerarRecursosTipoBeneficio(
      dataLimite,
    );

    // Recursos e impacto por tipo
    const recursosImpactoTipo = await this.gerarRecursosImpactoTipo(
      dataLimite,
    );

    // Recursos por bairros
    const recursosBairros = await this.gerarRecursosBairros(dataLimite);

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
  ): Promise<DistribuicaoBeneficiosItem[]> {
    const distribuicao = await this.solicitacaoRepository
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
      ])
      .getRawMany();

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
  ): Promise<RecursosTipoBeneficioItem[]> {
    const recursos = await this.pagamentoRepository
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
      ])
      .getRawMany();

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
  ): Promise<GestaoOperacionalGraficos> {
    // Evolução de concessões
    const evolucaoConcessoes = await this.gerarEvolucaoConcessoes(dataLimite);

    // Solicitações por dia da semana
    const solicitacoesDiaSemana = await this.gerarSolicitacoesDiaSemana(
      dataLimite,
    );

    // Concessões por tipo de benefício
    const concessoesTipoBeneficio = await this.gerarConcessoesTipoBeneficio(
      dataLimite,
    );

    // Solicitações por unidade
    const solicitacoesUnidade = await this.gerarSolicitacoesUnidade(
      dataLimite,
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
  ): Promise<ConcessoesTipoBeneficioItem[]> {
    // Reutilizar a lógica de distribuição de benefícios
    const distribuicao = await this.gerarDistribuicaoBeneficios(dataLimite);
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
  ): Promise<SolicitacoesUnidadeItem[]> {
    const resultado = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .innerJoin('solicitacao.unidade', 'unidade')
      .select('unidade.nome', 'unidade')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('unidade.id, unidade.nome')
      .orderBy('COUNT(solicitacao.id)', 'DESC')
      .getRawMany();

    const total = resultado.reduce((sum, item) => sum + parseInt(item.quantidade), 0);

    return resultado.map(item => ({
      unidade: item.unidade,
      quantidade: parseInt(item.quantidade),
      percentual: total > 0 ? Math.round((parseInt(item.quantidade) / total) * 1000) / 10 : 0,
    }));
  }
}