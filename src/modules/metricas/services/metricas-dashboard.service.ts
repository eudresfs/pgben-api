import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
import { SolicitacaoRepository } from '../../solicitacao/repositories/solicitacao.repository';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { ScopeViolationException } from '../../../common/exceptions/scope.exceptions';
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
  private readonly logger = new Logger(MetricasDashboardService.name);

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
    private readonly solicitacaoScopedRepository: SolicitacaoRepository,
  ) {}

  // Método removido - o ScopedRepository já aplica o escopo automaticamente

  /**
   * Aplica filtros de escopo ao QueryBuilder para pagamentos
   * @param queryBuilder QueryBuilder da entidade Pagamento
   * @param alias Alias da tabela principal
   */
  private applyScopeToPagamentoQuery(
    queryBuilder: SelectQueryBuilder<Pagamento>,
    alias: string = 'pagamento',
  ): void {
    const context = RequestContextHolder.get();

    if (!context) {
      return;
    }

    switch (context.tipo) {
      case ScopeType.GLOBAL:
        // Escopo global: sem filtros adicionais
        break;

      case ScopeType.UNIDADE:
        // Escopo de unidade: filtrar através da relação com solicitação
        if (context.unidade_id) {
          const existingJoins = queryBuilder.expressionMap.joinAttributes;
          const hasSolicitacaoJoin = existingJoins.some(
            (join) =>
              join.alias?.name === 'solicitacao' ||
              (join.relation && join.relation.propertyName === 'solicitacao'),
          );
          const hasBeneficiarioJoin = existingJoins.some(
            (join) =>
              join.alias?.name === 'beneficiario' ||
              (join.relation && join.relation.propertyName === 'beneficiario'),
          );

          if (!hasSolicitacaoJoin) {
            queryBuilder.leftJoin(`${alias}.solicitacao`, 'solicitacao_scope');
          }
          if (!hasBeneficiarioJoin) {
            const solicitacaoAlias = hasSolicitacaoJoin ? 'solicitacao' : 'solicitacao_scope';
            queryBuilder.leftJoin(`${solicitacaoAlias}.beneficiario`, 'beneficiario_scope');
          }

          const beneficiarioAlias = hasBeneficiarioJoin ? 'beneficiario' : 'beneficiario_scope';
          queryBuilder.andWhere(`${beneficiarioAlias}.unidade_id = :unidadeId`, {
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
   * Cria QueryBuilder com escopo aplicado para solicitações
   * @param alias Alias da tabela
   * @returns QueryBuilder com filtros de escopo aplicados
   */
  private createScopedSolicitacaoQueryBuilder(
    alias: string = 'solicitacao',
  ): SelectQueryBuilder<Solicitacao> {
    // Usar o ScopedRepository que já aplica o escopo automaticamente
    return this.solicitacaoScopedRepository.createScopedQueryBuilder(alias);
  }

  /**
   * Cria QueryBuilder com escopo aplicado para pagamentos
   * @param alias Alias da tabela
   * @returns QueryBuilder com filtros de escopo aplicados
   */
  private createScopedPagamentoQueryBuilder(
    alias: string = 'pagamento',
  ): SelectQueryBuilder<Pagamento> {
    const queryBuilder = this.pagamentoRepository.createQueryBuilder(alias);
    this.applyScopeToPagamentoQuery(queryBuilder, alias);
    return queryBuilder;
  }

  /**
   * Obtém métricas de impacto social
   * Calcula dados sobre famílias beneficiadas, pessoas impactadas e investimento social
   */
  async getImpactoSocial(filtros?: MetricasFiltrosAvancadosDto): Promise<ImpactoSocialData> {
    const context = RequestContextHolder.get();
    
    // Garantir que o contexto seja preservado durante todas as operações assíncronas
    return RequestContextHolder.runAsync(context, async () => {
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
    });
  }

  /**
   * Obtém métricas de gestão operacional
   * Calcula dados sobre eficiência dos processos e performance operacional
   */
  async getGestaoOperacional(filtros?: MetricasFiltrosAvancadosDto): Promise<GestaoOperacionalData> {
    const context = RequestContextHolder.get();
    
    // Garantir que o contexto seja preservado durante todas as operações assíncronas
    return RequestContextHolder.runAsync(context, async () => {
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
    });
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
    const context = RequestContextHolder.get();


    // Contar famílias beneficiadas com escopo aplicado
    const familiasBeneficiadasQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA });
    
    // Aplicar filtros dinâmicos, incluindo status se fornecido
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(familiasBeneficiadasQuery, filtros);
    } else {
      // Se não há filtros, aplica filtro padrão para solicitações aprovadas
      familiasBeneficiadasQuery.andWhere('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      });
    }
    
    const pessoasImpactadasQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .leftJoin('solicitacao.beneficiario', 'beneficiario')
      .leftJoin('beneficiario.composicao_familiar', 'composicao_familiar')
      .select('COUNT(DISTINCT composicao_familiar.id) as count')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA });
    
    // Aplicar filtros dinâmicos, incluindo status se fornecido
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(pessoasImpactadasQuery, filtros);
    } else {
      // Se não há filtros, aplica filtro padrão para solicitações aprovadas
      pessoasImpactadasQuery.andWhere('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      });
    }
    
    // Contar famílias beneficiadas
    const familiasBeneficiadas = await familiasBeneficiadasQuery.getCount();
    
    // Contar pessoas impactadas
    const pessoasImpactadasResult = await pessoasImpactadasQuery.getRawOne();
    
    // Calcular pessoas impactadas
    const pessoasImpactadas = parseInt(pessoasImpactadasResult?.count) || 0;

    // Contar bairros impactados com escopo aplicado
    const bairrosQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao');
    
    // Para escopo GLOBAL, precisamos fazer o join manualmente
    // Para escopo UNIDADE, o ScopedRepository já faz leftJoin com beneficiario usando alias 'cidadao'
    if (context?.tipo === ScopeType.GLOBAL) {
      bairrosQuery
        .innerJoin('solicitacao.beneficiario', 'cidadao')
        .innerJoin('cidadao.enderecos', 'endereco');
    } else {
      // Para escopo UNIDADE, o alias 'cidadao' já existe
      bairrosQuery.innerJoin('cidadao.enderecos', 'endereco');
    }
    
    bairrosQuery
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .select('COUNT(DISTINCT endereco.bairro)', 'count')
    
    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(bairrosQuery, filtros);
    }
    
    const bairrosResult = await bairrosQuery.getRawOne();
    const bairrosImpactados = parseInt(bairrosResult?.count) || 0;
    

    // Calcular investimento total com escopo aplicado
    const investimentoResult = await this.createScopedPagamentoQueryBuilder('pagamento')
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

    const resultado = {
      familias_beneficiadas: familiasBeneficiadas,
      pessoas_impactadas: pessoasImpactadas,
      bairros_impactados: bairrosImpactados,
      investimento_total: investimentoTotal,
    };
    
    this.logger.debug('[METRICS-DEBUG] Métricas de impacto social calculadas:', {
      resultado,
      contextType: context?.tipo,
      contextUnidadeId: context?.unidade_id
    });

    return resultado;
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
    // Calcular data de início (6 meses atrás)
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - 6);
    dataInicio.setDate(1); // Primeiro dia do mês

    // Query para obter dados mensais de solicitações com escopo aplicado
    const evolucaoQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .leftJoin('solicitacao.pagamentos', 'pagamento')
      .select([
        "TO_CHAR(solicitacao.data_abertura, 'Mon/YYYY') as mes",
        'COUNT(DISTINCT solicitacao.id) as familias',
        'SUM(COALESCE(pagamento.valor, 0)) as investimento',
      ])
      .where('solicitacao.data_abertura >= :dataInicio', { dataInicio })
      .andWhere('pagamento.status = :statusPagamento OR pagamento.status IS NULL', {
        statusPagamento: StatusPagamentoEnum.PAGO,
      })
      .groupBy("TO_CHAR(solicitacao.data_abertura, 'Mon/YYYY')")
      .addGroupBy("DATE_TRUNC('month', solicitacao.data_abertura)")
      .orderBy("DATE_TRUNC('month', solicitacao.data_abertura)", 'ASC');

    // Aplicar filtros dinâmicos, incluindo status se fornecido
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(evolucaoQuery, filtros);
    } else {
      // Se não há filtros, aplica filtro padrão para solicitações aprovadas
      evolucaoQuery.andWhere('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      });
    }

    const resultados = await evolucaoQuery.getRawMany();

    // Mapear resultados para o formato esperado
    return resultados.map((item) => ({
      mes: item.mes,
      familias: parseInt(item.familias),
      pessoas: parseInt(item.familias) * 3, // Assumindo média de 3 pessoas por família
      investimento: parseFloat(item.investimento || '0'),
    }));
  }

  /**
   * Gera dados de distribuição de benefícios
   */
  private async gerarDistribuicaoBeneficios(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<DistribuicaoBeneficiosItem[]> {
    const distribuicaoQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .select([
        'tipo_beneficio.nome as tipo',
        'COUNT(solicitacao.id) as quantidade',
      ]);
    
    // Aplica filtros dinâmicos, incluindo status se fornecido
    if (filtros) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(distribuicaoQuery, filtros);
    } else {
      // Se não há filtros, aplica filtro padrão para solicitações aprovadas
      distribuicaoQuery.andWhere('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      });
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
    // Query para obter recursos por faixa etária baseado na idade do beneficiário com escopo aplicado
    const recursosQuery = this.createScopedPagamentoQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.beneficiario', 'cidadao')
      .select([
        `CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, cidadao.data_nascimento)) BETWEEN 0 AND 12 THEN 'Crianças (0-12)'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, cidadao.data_nascimento)) BETWEEN 13 AND 17 THEN 'Adolescentes (13-17)'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, cidadao.data_nascimento)) BETWEEN 18 AND 29 THEN 'Jovens (18-29)'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, cidadao.data_nascimento)) BETWEEN 30 AND 59 THEN 'Adultos (30-59)'
          ELSE 'Idosos (60+)'
        END as faixa_etaria`,
        'SUM(pagamento.valor) as recursos',
      ])
      .where('pagamento.status IN (:...statusValidos)', {
        statusValidos: [
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('faixa_etaria')
      .orderBy('faixa_etaria', 'ASC');

    // Aplicar filtros se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(recursosQuery, filtros);
    }

    const resultados = await recursosQuery.getRawMany();

    // Calcular total para percentuais
    const total = resultados.reduce(
      (acc, item) => acc + parseFloat(item.recursos || '0'),
      0,
    );

    // Mapear resultados para o formato esperado
    const faixasEtarias = resultados.map((item) => ({
      faixa_etaria: item.faixa_etaria,
      recursos: parseFloat(item.recursos || '0'),
      percentual: total > 0 ? Math.round((parseFloat(item.recursos || '0') / total) * 1000) / 10 : 0,
    }));

    // Garantir que todas as faixas etárias estejam presentes, mesmo com valor 0
    const faixasCompletas = [
      'Crianças (0-12)',
      'Adolescentes (13-17)',
      'Jovens (18-29)',
      'Adultos (30-59)',
      'Idosos (60+)',
    ];

    return faixasCompletas.map((faixa) => {
      const encontrada = faixasEtarias.find((item) => item.faixa_etaria === faixa);
      return encontrada || { faixa_etaria: faixa, recursos: 0, percentual: 0 };
    });
  }

  /**
   * Gera dados de recursos por tipo de benefício
   */
  private async gerarRecursosTipoBeneficio(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosTipoBeneficioItem[]> {
    const recursosQuery = this.createScopedPagamentoQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('pagamento.status IN (:...statusValidos)', {
        statusValidos: [
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
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
    // Query para obter recursos e impacto por tipo de benefício com escopo aplicado
    const recursosQuery = this.createScopedPagamentoQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoin('solicitacao.beneficiario', 'beneficiario')
      .leftJoin('beneficiario.composicao_familiar', 'composicao_familiar')
      .select([
        'tipo_beneficio.nome as tipo_beneficio',
        'SUM(pagamento.valor) as recursos',
        'COUNT(DISTINCT solicitacao.beneficiario_id) as familias',
        'COUNT(composicao_familiar.id) as pessoas',
      ])
      .where('pagamento.status IN (:...statusValidos)', {
        statusValidos: [
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .orderBy('recursos', 'DESC');

    // Aplicar filtros se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(recursosQuery, filtros);
    }

    const resultados = await recursosQuery.getRawMany();

    // Mapear resultados para o formato esperado
    return resultados.map((item) => ({
      tipo_beneficio: item.tipo_beneficio,
      recursos: parseFloat(item.recursos || '0'),
      familias: parseInt(item.familias || '0'),
      pessoas: parseInt(item.pessoas || '0'),
    }));
  }

  /**
   * Gera dados de recursos por bairros
   */
  private async gerarRecursosBairros(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosBairrosItem[]> {
    // Query para obter recursos por bairro baseado no endereço do beneficiário com escopo aplicado
    const recursosQuery = this.createScopedPagamentoQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.beneficiario', 'cidadao')
      .innerJoin('cidadao.enderecos', 'endereco', 'endereco.data_fim_vigencia IS NULL')
      .select([
        'endereco.bairro as bairro',
        'SUM(pagamento.valor) as recursos',
      ])
      .where('pagamento.status IN (:...statusValidos)', {
        statusValidos: [
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('endereco.bairro IS NOT NULL')
      .andWhere('endereco.bairro != :empty', { empty: '' })
      .groupBy('endereco.bairro')
      .orderBy('recursos', 'DESC');

    // Aplicar filtros se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(recursosQuery, filtros);
    }

    const resultados = await recursosQuery.getRawMany();

    // Calcular total para percentuais
    const total = resultados.reduce(
      (acc, item) => acc + parseFloat(item.recursos || '0'),
      0,
    );

    // Mapear resultados para o formato esperado
    return resultados.map((item) => ({
      bairro: item.bairro || 'Não informado',
      recursos: parseFloat(item.recursos || '0'),
      percentual: total > 0 ? Math.round((parseFloat(item.recursos || '0') / total) * 1000) / 10 : 0,
    }));
  }

  /**
   * Calcula métricas gerais operacionais
   */
  private async calcularMetricasGeraisOperacional(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalMetricasGerais> {
    // Novos beneficiários (cidadãos com primeira solicitação aprovada) - aplicando escopo
    const novosBeneficiarios = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .select('COUNT(DISTINCT solicitacao.beneficiario_id)', 'count')
      .where('solicitacao.status = :status', {
        status: StatusSolicitacao.APROVADA,
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('COUNT(s2.id)')
          .from(Solicitacao, 's2')
          .where('s2.beneficiario_id = solicitacao.beneficiario_id')
          .andWhere('s2.status = :approvedStatus', { approvedStatus: StatusSolicitacao.APROVADA })
          .getQuery();
        return `(${subQuery}) = 1`;
      })
      .getRawOne()
      .then(result => parseInt(result.count) || 0);

    // Solicitações iniciadas com escopo aplicado
    const solicitacoesIniciadas = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    // Concessões - aplicando escopo através de join com solicitações
    const concessoes = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .innerJoin('solicitacao.concessao', 'concessao')
      .where('concessao.status = :status', { status: StatusConcessao.ATIVO })
      .andWhere('concessao.dataInicio >= :dataLimite', { dataLimite })
      .select('COUNT(DISTINCT concessao.id)', 'count')
      .getRawOne()
      .then(result => parseInt(result.count) || 0);

    // Concessões judicializadas - consulta real usando determinacaoJudicialFlag
    const concessoesJudicializadas = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .innerJoin('solicitacao.concessao', 'concessao')
      .where('concessao.status = :status', { status: StatusConcessao.ATIVO })
      .andWhere('concessao.dataInicio >= :dataLimite', { dataLimite })
      .andWhere('concessao.determinacaoJudicialFlag = :isJudicial', { isJudicial: true })
      .select('COUNT(DISTINCT concessao.id)', 'count')
      .getRawOne()
      .then(result => parseInt(result.count) || 0);

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
    const emAnalise = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.EM_ANALISE })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const pendentes = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.PENDENTE })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const aprovadas = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .getCount();

    const indeferidas = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
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
    try {
      // Definir período de análise (últimos 30 dias se não especificado)
      const dataFim = new Date();
      const dataInicio = new Date(dataLimite);
      const diasNoPeriodo = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

      // 1. Calcular tempo médio de solicitação (da abertura até aprovação)
      const queryTempoSolicitacao = this.createScopedSolicitacaoQueryBuilder('s')
        .select('AVG(EXTRACT(EPOCH FROM (s.data_aprovacao - s.data_abertura)) / 86400)', 'tempo_medio_dias')
        .where('s.data_aprovacao IS NOT NULL')
        .andWhere('s.data_abertura IS NOT NULL')
        .andWhere('s.data_abertura >= :dataInicio', { dataInicio })
        .andWhere('s.data_abertura <= :dataFim', { dataFim });

      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltroPeriodo(queryTempoSolicitacao, filtros, 's.created_at');
        FiltrosQueryHelper.aplicarFiltroUnidade(queryTempoSolicitacao, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroBeneficio(queryTempoSolicitacao, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroStatus(queryTempoSolicitacao, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroUsuario(queryTempoSolicitacao, filtros, 's');
      }

      const resultadoTempoSolicitacao = await queryTempoSolicitacao.getRawOne();
      const tempoMedioSolicitacao = parseFloat(resultadoTempoSolicitacao?.tempo_medio_dias || '0');

      // 2. Calcular tempo médio de análise (assumindo que temos campo data_inicio_analise)
      const queryTempoAnalise = this.createScopedSolicitacaoQueryBuilder('s')
        .select('AVG(EXTRACT(EPOCH FROM (s.data_aprovacao - s.data_abertura)) / 86400)', 'tempo_medio_analise')
        .where('s.data_aprovacao IS NOT NULL')
        .andWhere('s.data_abertura IS NOT NULL')
        .andWhere('s.status = :status', { status: StatusSolicitacao.APROVADA })
        .andWhere('s.data_abertura >= :dataInicio', { dataInicio })
        .andWhere('s.data_abertura <= :dataFim', { dataFim });

      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltroPeriodo(queryTempoAnalise, filtros, 's.created_at');
        FiltrosQueryHelper.aplicarFiltroUnidade(queryTempoAnalise, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroBeneficio(queryTempoAnalise, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroStatus(queryTempoAnalise, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroUsuario(queryTempoAnalise, filtros, 's');
      }

      const resultadoTempoAnalise = await queryTempoAnalise.getRawOne();
      const tempoMedioAnalise = parseFloat(resultadoTempoAnalise?.tempo_medio_analise || '0');

      // 3. Calcular solicitações por dia
      const querySolicitacoesPorDia = this.createScopedSolicitacaoQueryBuilder('s')
        .select('COUNT(*)', 'total_solicitacoes')
        .where('s.data_abertura >= :dataInicio', { dataInicio })
        .andWhere('s.data_abertura <= :dataFim', { dataFim });

      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltroPeriodo(querySolicitacoesPorDia, filtros, 's.created_at');
        FiltrosQueryHelper.aplicarFiltroUnidade(querySolicitacoesPorDia, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroBeneficio(querySolicitacoesPorDia, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroStatus(querySolicitacoesPorDia, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroUsuario(querySolicitacoesPorDia, filtros, 's');
      }

      const resultadoSolicitacoes = await querySolicitacoesPorDia.getRawOne();
      const totalSolicitacoes = parseInt(resultadoSolicitacoes?.total_solicitacoes || '0');
      const solicitacoesPorDia = diasNoPeriodo > 0 ? Math.round((totalSolicitacoes / diasNoPeriodo) * 100) / 100 : 0;

      // 4. Calcular concessões por dia através das solicitações aprovadas
      const queryConcessoesPorDia = this.createScopedSolicitacaoQueryBuilder('s')
        .select('COUNT(*)', 'total_concessoes')
        .where('s.status = :status', { status: StatusSolicitacao.APROVADA })
        .andWhere('s.data_aprovacao >= :dataInicio', { dataInicio })
        .andWhere('s.data_aprovacao <= :dataFim', { dataFim });

      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltroPeriodo(queryConcessoesPorDia, filtros, 's.created_at');
        FiltrosQueryHelper.aplicarFiltroUnidade(queryConcessoesPorDia, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroBeneficio(queryConcessoesPorDia, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroStatus(queryConcessoesPorDia, filtros, 's');
        FiltrosQueryHelper.aplicarFiltroUsuario(queryConcessoesPorDia, filtros, 's');
      }

      const resultadoConcessoes = await queryConcessoesPorDia.getRawOne();
      const totalConcessoes = parseInt(resultadoConcessoes?.total_concessoes || '0');
      const concessoesPorDia = diasNoPeriodo > 0 ? Math.round((totalConcessoes / diasNoPeriodo) * 100) / 100 : 0;

      return {
        tempo_medio_solicitacao: Math.round(tempoMedioSolicitacao * 100) / 100,
        tempo_medio_analise: Math.round(tempoMedioAnalise * 100) / 100,
        solicitacoes_por_dia: solicitacoesPorDia,
        concessoes_por_dia: concessoesPorDia,
      };
    } catch (error) {
      this.logger.error('Erro ao calcular performance operacional:', error);
      // Retornar valores zerados em caso de erro para evitar quebra do dashboard
      return {
        tempo_medio_solicitacao: 0,
        tempo_medio_analise: 0,
        solicitacoes_por_dia: 0,
        concessoes_por_dia: 0,
      };
    }
  }

  /**
   * Calcula taxa de concessão
   */
  private async calcularTaxaConcessao(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<TaxaConcessao> {
    const totalSolicitacoes = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      })
      .getCount();

    const aprovadas = await this.createScopedSolicitacaoQueryBuilder('solicitacao')
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
    // Consulta real para evolução de concessões por mês e tipo de benefício
    const queryBuilder = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .innerJoin('solicitacao.concessao', 'concessao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('concessao.status = :status', { status: StatusConcessao.ATIVO })
      .andWhere('concessao.dataInicio >= :dataLimite', { dataLimite })
      .select([
        "TO_CHAR(concessao.dataInicio, 'Mon/YYYY') as mes",
        'tipo_beneficio.codigo as tipo_codigo',
        'COUNT(DISTINCT concessao.id) as quantidade',
      ])
      .groupBy("TO_CHAR(concessao.dataInicio, 'Mon/YYYY'), tipo_beneficio.codigo")
      .orderBy("TO_CHAR(concessao.dataInicio, 'Mon/YYYY')");

    // Aplicar filtros avançados se fornecidos
    if (filtros) {
        FiltrosQueryHelper.aplicarFiltroPeriodo(queryBuilder, filtros, 'concessao.dataInicio');
        FiltrosQueryHelper.aplicarFiltroUnidade(queryBuilder, filtros, 'concessao');
        FiltrosQueryHelper.aplicarFiltroBeneficio(queryBuilder, filtros, 'concessao');
        FiltrosQueryHelper.aplicarFiltroStatus(queryBuilder, filtros, 'concessao');
        FiltrosQueryHelper.aplicarFiltroUsuario(queryBuilder, filtros, 'concessao');
      }

    const resultados = await queryBuilder.getRawMany();

    // Agrupar resultados por mês
    const evolucaoPorMes = new Map<string, EvolucaoConcessoesItem>();

    resultados.forEach((resultado) => {
      const mes = resultado.mes;
      const tipoCodigo = resultado.tipo_codigo;
      const quantidade = parseInt(resultado.quantidade) || 0;

      if (!evolucaoPorMes.has(mes)) {
        evolucaoPorMes.set(mes, {
          mes,
          aluguel_social: 0,
          cesta_basica: 0,
          beneficio_funeral: 0,
          beneficio_natalidade: 0,
        });
      }

      const evolucaoMes = evolucaoPorMes.get(mes)!;

      // Mapear códigos de tipo de benefício para campos da resposta
      switch (tipoCodigo) {
        case 'aluguel-social':
        case 'ALUGUEL_SOCIAL':
          evolucaoMes.aluguel_social = quantidade;
          break;
        case 'cesta-basica':
        case 'CESTA_BASICA':
          evolucaoMes.cesta_basica = quantidade;
          break;
        case 'funeral':
        case 'FUNERAL':
        case 'ataude':
        case 'ATAUDE':
        case 'BENEFICIO_FUNERAL':
          evolucaoMes.beneficio_funeral = quantidade;
          break;
        case 'natalidade':
        case 'NATALIDADE':
        case 'BENEFICIO_NATALIDADE':
          evolucaoMes.beneficio_natalidade = quantidade;
          break;
      }
    });

    return Array.from(evolucaoPorMes.values());
  }

  /**
   * Gera dados de solicitações por dia da semana
   */
  private async gerarSolicitacoesDiaSemana(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesDiaSemanaItem[]> {
    // Consulta real para solicitações por dia da semana
    const queryBuilder = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .where('solicitacao.created_at >= :dataLimite', { dataLimite })
      .select([
        "EXTRACT(DOW FROM solicitacao.created_at) as dia_numero",
        'COUNT(DISTINCT solicitacao.id) as quantidade',
      ])
      .groupBy("EXTRACT(DOW FROM solicitacao.created_at)")
      .orderBy("EXTRACT(DOW FROM solicitacao.created_at)");

    // Aplicar filtros avançados se fornecidos
    if (filtros) {
        FiltrosQueryHelper.aplicarFiltroPeriodo(queryBuilder, filtros, 'solicitacao.created_at');
        FiltrosQueryHelper.aplicarFiltroUnidade(queryBuilder, filtros, 'solicitacao');
        FiltrosQueryHelper.aplicarFiltroBeneficio(queryBuilder, filtros, 'solicitacao');
        FiltrosQueryHelper.aplicarFiltroStatus(queryBuilder, filtros, 'solicitacao');
        FiltrosQueryHelper.aplicarFiltroUsuario(queryBuilder, filtros, 'solicitacao');
      }

    const resultados = await queryBuilder.getRawMany();

    // Mapear números dos dias para nomes em português
    const diasSemana = {
      0: 'Domingo',
      1: 'Segunda',
      2: 'Terça',
      3: 'Quarta',
      4: 'Quinta',
      5: 'Sexta',
      6: 'Sábado',
    };

    // Criar array com todos os dias da semana inicializados com 0
    const solicitacoesPorDia = Object.entries(diasSemana).map(([numero, nome]) => ({
      dia: nome,
      quantidade: 0,
    }));

    // Preencher com os dados reais da consulta
    resultados.forEach((resultado) => {
      const diaNumero = parseInt(resultado.dia_numero);
      const quantidade = parseInt(resultado.quantidade) || 0;
      const diaIndex = diaNumero;
      
      if (solicitacoesPorDia[diaIndex]) {
        solicitacoesPorDia[diaIndex].quantidade = quantidade;
      }
    });

    // Reordenar para começar na segunda-feira
    const ordenado = [
      solicitacoesPorDia[1], // Segunda
      solicitacoesPorDia[2], // Terça
      solicitacoesPorDia[3], // Quarta
      solicitacoesPorDia[4], // Quinta
      solicitacoesPorDia[5], // Sexta
      solicitacoesPorDia[6], // Sábado
      solicitacoesPorDia[0], // Domingo
    ];

    return ordenado;
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
    const resultadoQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao')
      .innerJoin('solicitacao.unidade', 'unidade')
      .select('unidade.nome', 'unidade')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('unidade.id, unidade.nome')
      .orderBy('COUNT(solicitacao.id)', 'DESC');
    
    if (filtros) {
      FiltrosQueryHelper.aplicarFiltroPeriodo(resultadoQuery, filtros, 'solicitacao.created_at');
      FiltrosQueryHelper.aplicarFiltroUnidade(resultadoQuery, filtros, 'solicitacao');
      FiltrosQueryHelper.aplicarFiltroBeneficio(resultadoQuery, filtros, 'solicitacao');
      FiltrosQueryHelper.aplicarFiltroStatus(resultadoQuery, filtros, 'solicitacao');
      FiltrosQueryHelper.aplicarFiltroUsuario(resultadoQuery, filtros, 'solicitacao');
    }
    
    const resultado = await resultadoQuery.getRawMany();

    const total = resultado.reduce((sum, item) => sum + parseInt(item.quantidade), 0);

    return resultado.map(item => ({
      unidade: item.unidade,
      quantidade: parseInt(item.quantidade),
      percentual: total > 0 ? Math.round((parseInt(item.quantidade) / total) * 1000) / 10 : 0,
    }));
  }

  /**
   * Obtém a contagem de solicitações agrupadas por status
   * Utiliza o repositório com escopo para respeitar permissões e filtros
   * @returns Objeto com total e array de status com contagens
   */
  async obterSolicitacoesPorStatus(): Promise<{ total: number; porStatus: { status: string; quantidade: number }[] }> {
    try {
      // Utiliza o método contarPorStatus do repositório com escopo
      const contagemPorStatus = await this.solicitacaoScopedRepository.contarPorStatus();
      
      // Converte o objeto Record<StatusSolicitacao, number> para o formato esperado
      const porStatus = Object.entries(contagemPorStatus).map(([status, quantidade]) => ({
        status,
        quantidade,
      }));
      
      // Calcula o total somando todas as contagens
      const total = porStatus.reduce((acc, item) => acc + item.quantidade, 0);
      
      return {
        total,
        porStatus,
      };
    } catch (error) {
      throw new Error(`Erro ao obter contagem de solicitações por status: ${error.message}`);
    }
  }

  /**
   * Método de debug para validação do sistema de escopo
   * Retorna informações detalhadas sobre dados visíveis no contexto atual
   */
  async debugEscopo(): Promise<{
    totalSolicitacoes: number;
    distribuicaoPorUnidade: Array<{
      unidadeId: string;
      nomeUnidade: string;
      quantidade: number;
    }>;
  }> {
    try {
      const contexto = RequestContextHolder.get();
      this.logger.debug(`[debugEscopo] Contexto atual: ${JSON.stringify(contexto)}`);
      
      // Obter total de solicitações visíveis no escopo atual
      const totalQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao');
      const totalSolicitacoes = await totalQuery.getCount();
      
      this.logger.debug(`[debugEscopo] Total de solicitações no escopo: ${totalSolicitacoes}`);
      
      // Obter distribuição por unidade (sempre visível para debug)
      const distribuicaoQuery = this.createScopedSolicitacaoQueryBuilder('solicitacao')
        .innerJoin('solicitacao.unidade', 'unidade')
        .select([
          'unidade.id as unidadeId',
          'unidade.nome as nomeUnidade',
          'COUNT(solicitacao.id) as quantidade'
        ])
        .groupBy('unidade.id')
        .addGroupBy('unidade.nome')
        .orderBy('quantidade', 'DESC');
      
      const [sql, params] = distribuicaoQuery.getQueryAndParameters();
      this.logger.debug(`[debugEscopo] Query distribuição: ${sql}`);
      this.logger.debug(`[debugEscopo] Parâmetros: ${JSON.stringify(params)}`);
      
      const distribuicaoPorUnidade = await distribuicaoQuery.getRawMany();
      
      // Converter quantidade para número
      const distribuicaoFormatada = distribuicaoPorUnidade.map(item => ({
        unidadeId: item.unidadeId,
        nomeUnidade: item.nomeUnidade,
        quantidade: parseInt(item.quantidade, 10)
      }));
      
      this.logger.debug(`[debugEscopo] Distribuição por unidade: ${JSON.stringify(distribuicaoFormatada)}`);
      
      return {
        totalSolicitacoes,
        distribuicaoPorUnidade: distribuicaoFormatada
      };
    } catch (error) {
      this.logger.error('[debugEscopo] Erro ao executar debug do escopo:', error);
      throw error;
    }
  }
}