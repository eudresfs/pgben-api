import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Solicitacao,
  Pagamento,
  Concessao,
  Cidadao,
  TipoBeneficio,
  Unidade,
} from '../../../entities';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { SolicitacaoRepository } from '../../solicitacao/repositories/solicitacao.repository';
import { PagamentoRepository } from '../../pagamento/repositories/pagamento.repository';
import { CidadaoRepository } from '../../cidadao/repositories/cidadao.repository';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { MetricasConstants } from '../constants/metricas.constants';
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
 * Serviço especializado em métricas de gestão operacional
 * 
 * @description
 * Responsável por calcular e fornecer métricas relacionadas à gestão operacional
 * do sistema, incluindo novos beneficiários, solicitações em tramitação,
 * performance de análise e distribuição de trabalho entre unidades.
 * 
 * Utiliza ScopedRepository para garantir que os dados sejam filtrados
 * adequadamente baseado no contexto de escopo do usuário autenticado.
 */
@Injectable()
export class GestaoOperacionalService {
  private readonly logger = new Logger(GestaoOperacionalService.name);

  // Repositórios com escopo aplicado automaticamente
  private readonly concessaoScopedRepository: ScopedRepository<Concessao>;

  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    private readonly solicitacaoRepository: SolicitacaoRepository,
    private readonly cidadaoRepository: CidadaoRepository,
  ) {
    // Inicializar repositório com escopo usando ScopedRepository apenas para Concessao
    // (não possui repositório customizado)
    this.concessaoScopedRepository = new ScopedRepository(
      Concessao,
      this.concessaoRepository.manager,
      this.concessaoRepository.queryRunner,
      { strictMode: true, allowGlobalScope: false }
    );
  }

  /**
   * Obtém métricas completas de gestão operacional
   * 
   * @param filtros Filtros avançados opcionais para refinar os dados
   * @returns Dados completos de gestão operacional incluindo métricas, status e gráficos
   */
  async getGestaoOperacional(filtros?: MetricasFiltrosAvancadosDto): Promise<GestaoOperacionalData> {
    const context = RequestContextHolder.get();

    // Garantir que o contexto seja preservado durante todas as operações assíncronas
    return RequestContextHolder.runAsync(context, async () => {
      // Normalizar e validar filtros
      const filtrosAtivos = this.normalizarFiltros(filtros);
      this.validarFiltros(filtrosAtivos);
      const dataLimite = this.calcularDataLimite(filtrosAtivos.periodo);

      // Calcular métricas principais em paralelo para melhor performance
      const [metricas, statusTramitacao, metricsPerformance, taxaConcessao] = await Promise.all([
        this.calcularMetricasGestaoOperacional(dataLimite, filtrosAtivos),
        this.calcularStatusSolicitacoesTramitacao(dataLimite, filtrosAtivos),
        this.calcularMetricasPerformance(dataLimite, filtrosAtivos),
        this.calcularTaxaConcessao(dataLimite, filtrosAtivos),
      ]);

      // Gerar dados para gráficos
      const graficos = await this.gerarGraficosGestaoOperacional(dataLimite, filtrosAtivos);

      return {
        metricas_gerais: metricas,
        solicitacoes_tramitacao: statusTramitacao,
        performance: metricsPerformance,
        taxa_concessao: taxaConcessao,
        graficos,
      };
    });
  }

  /**
   * Calcula as métricas principais de gestão operacional
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Métricas principais de gestão operacional
   */
  private async calcularMetricasGestaoOperacional(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalMetricasGerais> {
    const context = RequestContextHolder.get();
    return RequestContextHolder.runAsync(context, async () => {
      // Contar novos beneficiários com escopo aplicado
      const novosBeneficiariosQuery = this.cidadaoRepository
        .createScopedQueryBuilder('cidadao')
        .where('cidadao.created_at >= :dataLimite', { dataLimite });

      // Aplicar filtros dinâmicos
      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltrosCidadao(novosBeneficiariosQuery, filtros);
      }

      // Contar solicitações iniciadas com escopo aplicado
      const solicitacoesIniciadasQuery = this.solicitacaoRepository
        .createScopedQueryBuilder('solicitacao')
        .where('solicitacao.data_abertura >= :dataLimite', { dataLimite });

      // Aplicar filtros dinâmicos
      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltrosSolicitacao(solicitacoesIniciadasQuery, filtros);
      }

      // Contar concessões realizadas com escopo aplicado
      const concessoesQuery = this.concessaoScopedRepository
        .createScopedQueryBuilder('concessao')
        .where('concessao.data_inicio >= :dataLimite', { dataLimite });

      // Aplicar filtros dinâmicos
      if (filtros && !this.filtrosEstaoVazios(filtros)) {
        FiltrosQueryHelper.aplicarFiltrosConcessao(concessoesQuery, filtros);
      }

      // Query para contar concessões judicializadas
      const concessoesJudicializadasQuery = this.concessaoScopedRepository
        .createScopedQueryBuilder('concessao')
        .innerJoin('concessao.solicitacao', 'solicitacao')
        .where('concessao.data_inicio >= :dataLimite', { dataLimite })
        .andWhere('solicitacao.determinacao_judicial_flag = :origemJudicial', { origemJudicial: true });

      // Aplicar escopo automático
      // Aplicar escopo automático através do ScopedRepository

      // Executar queries de contagem em paralelo
      const [novosBeneficiarios, solicitacoesIniciadas, concessoes, concessoesJudicializadas] = await Promise.all([
        novosBeneficiariosQuery.getCount(),
        solicitacoesIniciadasQuery.getCount(),
        concessoesQuery.getCount(),
        concessoesJudicializadasQuery.getCount(),
      ]);

      const resultado = {
        novos_beneficiarios: novosBeneficiarios,
        solicitacoes_iniciadas: solicitacoesIniciadas,
        concessoes: concessoes,
        concessoes_judicializadas: concessoesJudicializadas,
      };

      return resultado;
    });
  }

  /**
   * Calcula o status das solicitações em tramitação
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Status das solicitações em tramitação
   */
  private async calcularStatusSolicitacoesTramitacao(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesTramitacao> {
    // Query base para solicitações em tramitação
    const baseQuery = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite });

    // Aplicar filtros se disponíveis
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(baseQuery, filtros);
    }

    // Executar queries para cada status em paralelo
    const [emAnalise, pendentes, aprovadas, indeferidas] = await Promise.all([
      this.clonarQueryEContarPorStatus(baseQuery, StatusSolicitacao.EM_ANALISE),
      this.clonarQueryEContarPorStatus(baseQuery, StatusSolicitacao.PENDENTE),
      this.clonarQueryEContarPorStatus(baseQuery, StatusSolicitacao.APROVADA),
      this.clonarQueryEContarPorStatus(baseQuery, StatusSolicitacao.INDEFERIDA),
    ]);

    return {
      em_analise: emAnalise,
      pendentes: pendentes,
      aprovadas: aprovadas,
      indeferidas: indeferidas,
    };
  }

  /**
   * Calcula métricas de performance do sistema
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Métricas de performance
   */
  private async calcularMetricasPerformance(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalPerformance> {
    // Calcular tempo médio de solicitação
    const tempoMedioSolicitacaoQuery = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .select('AVG(EXTRACT(EPOCH FROM (solicitacao.data_aprovacao - solicitacao.data_abertura)) / 86400)', 'tempo_medio')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      });

    // Aplicar filtros se disponíveis
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(tempoMedioSolicitacaoQuery, filtros);
    }

    // Calcular tempo médio de análise
    const tempoMedioAnaliseQuery = this.concessaoScopedRepository
      .createScopedQueryBuilder('concessao')
      .leftJoin('concessao.solicitacao', 'solicitacao')
      .select(
        `AVG(EXTRACT(EPOCH FROM (concessao.data_inicio - solicitacao.data_abertura)) / 86400)`,
        'tempo_medio',
      )
      .where('concessao.data_inicio >= :dataLimite', { dataLimite });

    // Aplicar filtros se disponíveis
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosConcessao(tempoMedioAnaliseQuery, filtros);
    }

    // Calcular solicitações por dia
    const solicitacoesPorDiaQuery = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .select('COUNT(*) / (CURRENT_DATE - :dataLimite)', 'media_diaria')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite });

    // Aplicar filtros se disponíveis
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(solicitacoesPorDiaQuery, filtros);
    }

    // Calcular concessões por dia
    const concessoesPorDiaQuery = this.concessaoScopedRepository
      .createScopedQueryBuilder('concessao')
      .select('COUNT(*) / (CURRENT_DATE - :dataLimite)', 'media_diaria')
      .where('concessao.data_inicio >= :dataLimite', { dataLimite });

    // Aplicar filtros se disponíveis
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosConcessao(concessoesPorDiaQuery, filtros);
    }

    // Executar todas as queries em paralelo
    const [tempoMedioSolicitacaoResult, tempoMedioAnaliseResult, solicitacoesPorDiaResult, concessoesPorDiaResult] = await Promise.all([
      tempoMedioSolicitacaoQuery.getRawOne(),
      tempoMedioAnaliseQuery.getRawOne(),
      solicitacoesPorDiaQuery.getRawOne(),
      concessoesPorDiaQuery.getRawOne(),
    ]);

    return {
      tempo_medio_solicitacao: Math.round((parseFloat(tempoMedioSolicitacaoResult?.tempo_medio) || 0) * 100) / 100,
      tempo_medio_analise: Math.round((parseFloat(tempoMedioAnaliseResult?.tempo_medio) || 0) * 100) / 100,
      solicitacoes_por_dia: Math.round((parseFloat(solicitacoesPorDiaResult?.media_diaria) || 0) * 100) / 100,
      concessoes_por_dia: Math.round((parseFloat(concessoesPorDiaResult?.media_diaria) || 0) * 100) / 100,
    };
  }

  /**
   * Calcula a taxa de concessão
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Taxa de concessão
   */
  private async calcularTaxaConcessao(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<TaxaConcessao> {
    // Contar total de solicitações finalizadas
    const totalSolicitacoesQuery = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('solicitacao.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
      });

    // Contar solicitações aprovadas
    const solicitacoesAprovadasQuery = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .where('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA });

    // Aplicar filtros se disponíveis
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(totalSolicitacoesQuery, filtros);
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(solicitacoesAprovadasQuery, filtros);
    }

    // Executar queries em paralelo
    const [totalSolicitacoes, solicitacoesAprovadas] = await Promise.all([
      totalSolicitacoesQuery.getCount(),
      solicitacoesAprovadasQuery.getCount(),
    ]);

    // Calcular taxa de concessão
    const taxa = totalSolicitacoes > 0
      ? (solicitacoesAprovadas / totalSolicitacoes) * MetricasConstants.MULTIPLICADOR_PERCENTUAL
      : 0;

    return {
      percentual_aprovacao: Math.round(taxa * MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL) / MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL,
      percentual_indeferimento: Math.round((100 - taxa) * MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL) / MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL,
    };
  }

  /**
   * Gera dados para todos os gráficos de gestão operacional
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Dados estruturados para gráficos
   */
  private async gerarGraficosGestaoOperacional(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalGraficos> {
    // Executar todas as queries de gráficos em paralelo para melhor performance
    const [evolucaoConcessoes, solicitacoesDiaSemana, concessoesTipoBeneficio, solicitacoesUnidade] = await Promise.all([
      this.gerarEvolucaoConcessoes(dataLimite, filtros),
      this.gerarSolicitacoesDiaSemana(dataLimite, filtros),
      this.gerarConcessoesTipoBeneficio(dataLimite, filtros),
      this.gerarSolicitacoesUnidade(dataLimite, filtros),
    ]);

    return {
      evolucao_concessoes: evolucaoConcessoes,
      solicitacoes_dia_semana: solicitacoesDiaSemana,
      concessoes_tipo_beneficio: concessoesTipoBeneficio,
      solicitacoes_unidade: solicitacoesUnidade,
    };
  }

  // ========== MÉTODOS AUXILIARES ==========

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
      'usuario', 'usuarios', 'data_inicio', 'data_fim'
    ];

    return campos.every(campo => {
      const valor = filtros[campo];
      return valor === undefined || valor === null ||
        (Array.isArray(valor) && valor.length === 0) ||
        (typeof valor === 'string' && valor.trim() === '');
    });
  }

  /**
   * Valida os filtros de entrada para garantir consistência dos dados
   */
  private validarFiltros(filtros: MetricasFiltrosAvancadosDto): void {
    if (!filtros) return;

    // Validar datas personalizadas
    if (filtros.data_inicio && filtros.data_fim) {
      const dataInicio = new Date(filtros.data_inicio);
      const dataFim = new Date(filtros.data_fim);

      if (dataInicio > dataFim) {
        throw new Error('Data de início não pode ser posterior à data de fim');
      }

      const hoje = new Date();
      if (dataInicio > hoje) {
        throw new Error('Data de início não pode ser futura');
      }
    }

    // Validar arrays de IDs
    if (filtros.unidades && Array.isArray(filtros.unidades)) {
      filtros.unidades.forEach(id => {
        if (isNaN(Number(id)) || Number(id) <= 0) {
          throw new Error('IDs das unidades devem ser números positivos');
        }
      });
    }

    if (filtros.beneficios && Array.isArray(filtros.beneficios)) {
      filtros.beneficios.forEach(id => {
        if (isNaN(Number(id)) || Number(id) <= 0) {
          throw new Error('IDs dos benefícios devem ser números positivos');
        }
      });
    }

    // Validar bairros (não deve conter caracteres especiais perigosos)
    if (filtros.bairros && Array.isArray(filtros.bairros)) {
      filtros.bairros.forEach(bairro => {
        if (typeof bairro === 'string' && /[<>"'%;()&+]/.test(bairro)) {
          throw new Error('Nome do bairro contém caracteres inválidos');
        }
      });
    }
  }

  /**
   * Calcula a data limite baseada no período informado
   */
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
        dataLimite.setDate(agora.getDate() - MetricasConstants.PERIODO_PADRAO_DIAS);
        break;
    }

    return dataLimite;
  }

  /**
   * Clona uma query e adiciona filtro por status específico
   */
  private async clonarQueryEContarPorStatus(
    baseQuery: SelectQueryBuilder<Solicitacao>,
    status: StatusSolicitacao,
  ): Promise<number> {
    const query = baseQuery.clone();
    query.andWhere('solicitacao.status = :status', { status });
    return query.getCount();
  }

  /**
   * Executa query com tratamento consistente de erros
   */
  private async executarQueryComTratamento<T>(
    queryFn: () => Promise<T>,
    operacao: string,
  ): Promise<T> {
    try {
      return await queryFn();
    } catch (error) {
      this.logger.error(`Erro na operação ${operacao}:`, {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Falha ao executar ${operacao}: ${error.message}`);
    }
  }

  // ========== MÉTODOS DE GERAÇÃO DE GRÁFICOS ==========
  // Nota: Os métodos específicos de geração de gráficos serão implementados
  // em uma próxima etapa para manter o arquivo em tamanho gerenciável

  private async gerarEvolucaoConcessoes(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<EvolucaoConcessoesItem[]> {
    const query = this.concessaoScopedRepository
      .createScopedQueryBuilder('concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .select([
        "DATE_TRUNC('month', concessao.created_at) as mes",
        'tipo_beneficio.nome as tipo_beneficio',
        'COUNT(*) as quantidade',
      ])
      .where('concessao.created_at >= :dataLimite', { dataLimite })
      .groupBy("DATE_TRUNC('month', concessao.created_at), tipo_beneficio.nome")
      .orderBy("DATE_TRUNC('month', concessao.created_at)", 'ASC');

    // Filtros são aplicados automaticamente pelo ScopedRepository

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarEvolucaoConcessoes',
    );

    // Agrupar por mês e organizar por tipo de benefício
    const evolucaoMap = new Map<string, EvolucaoConcessoesItem>();

    resultados.forEach((resultado) => {
      const mesFormatado = new Date(resultado.mes).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
      });

      if (!evolucaoMap.has(mesFormatado)) {
        evolucaoMap.set(mesFormatado, {
          mes: mesFormatado,
          aluguel_social: 0,
          cesta_basica: 0,
          beneficio_por_morte: 0,
          beneficio_natalidade: 0,
        });
      }

      const item = evolucaoMap.get(mesFormatado)!;
      const quantidade = parseInt(resultado.quantidade, 10);

      switch (resultado.tipo_beneficio?.toLowerCase()) {
        case 'aluguel social':
          item.aluguel_social = quantidade;
          break;
        case 'cesta básica':
          item.cesta_basica = quantidade;
          break;
        case 'benefício por morte':
          item.beneficio_por_morte = quantidade;
          break;
        case 'benefício natalidade':
          item.beneficio_natalidade = quantidade;
          break;
      }
    });

    return Array.from(evolucaoMap.values());
  }

  private async gerarSolicitacoesDiaSemana(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesDiaSemanaItem[]> {
    const query = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .select([
        'EXTRACT(DOW FROM solicitacao.created_at) as dia_semana',
        'COUNT(*) as quantidade',
      ])
      .where('solicitacao.created_at >= :dataLimite', { dataLimite })
      .groupBy('EXTRACT(DOW FROM solicitacao.created_at)')
      .orderBy('EXTRACT(DOW FROM solicitacao.created_at)', 'ASC');

    // Filtros são aplicados automaticamente pelo ScopedRepository

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarSolicitacoesDiaSemana',
    );

    // Mapear números dos dias para nomes em português
    const diasSemana = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];

    return resultados.map((resultado) => ({
      dia: diasSemana[parseInt(resultado.dia_semana, 10)],
      quantidade: parseInt(resultado.quantidade, 10),
    }));
  }

  private async gerarConcessoesTipoBeneficio(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ConcessoesTipoBeneficioItem[]> {
    const query = this.concessaoScopedRepository
      .createScopedQueryBuilder('concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .select([
        'tipo_beneficio.nome as tipo',
        'COUNT(*) as quantidade',
      ])
      .where('concessao.created_at >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .orderBy('COUNT(*)', 'DESC');

    // Filtros são aplicados automaticamente pelo ScopedRepository

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarConcessoesTipoBeneficio',
    );

    // Calcular total para percentuais
    const total = resultados.reduce((acc, resultado) => acc + parseInt(resultado.quantidade, 10), 0);

    return resultados.map((resultado) => {
      const quantidade = parseInt(resultado.quantidade, 10);
      return {
        tipo: resultado.tipo,
        quantidade,
        percentual: total > 0 ? Math.round((quantidade / total) * 100 * 100) / 100 : 0,
      };
    });
  }

  private async gerarSolicitacoesUnidade(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<SolicitacoesUnidadeItem[]> {
    const query = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .innerJoin('solicitacao.unidade', 'unidade')
      .select([
        'unidade.nome as unidade',
        'COUNT(*) as quantidade',
      ])
      .where('solicitacao.created_at >= :dataLimite', { dataLimite })
      .groupBy('unidade.nome')
      .orderBy('COUNT(*)', 'DESC');

    // Filtros são aplicados automaticamente pelo ScopedRepository

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarSolicitacoesUnidade',
    );

    // Calcular total para percentuais
    const total = resultados.reduce((acc, resultado) => acc + parseInt(resultado.quantidade, 10), 0);

    return resultados.map((resultado) => {
      const quantidade = parseInt(resultado.quantidade, 10);
      return {
        unidade: resultado.unidade,
        quantidade,
        percentual: total > 0 ? Math.round((quantidade / total) * 100 * 100) / 100 : 0,
      };
    });
  }

  /**
   * Obtém solicitações agrupadas por status para debug
   * 
   * @returns Dados de solicitações agrupadas por status
   */
  async obterSolicitacoesPorStatus(): Promise<{
    total: number;
    porStatus: { status: string; quantidade: number }[];
  }> {
    const context = RequestContextHolder.get();

    return RequestContextHolder.runAsync(context, async () => {
      // Query base para contar todas as solicitações
      const totalQuery = this.solicitacaoRepository
        .createScopedQueryBuilder('solicitacao');

      const total = await totalQuery.getCount();

      // Query para agrupar por status
      const statusQuery = this.solicitacaoRepository
        .createScopedQueryBuilder('solicitacao')
        .select('solicitacao.status', 'status')
        .addSelect('COUNT(solicitacao.id)', 'quantidade')
        .groupBy('solicitacao.status');

      const resultados = await statusQuery.getRawMany();

      const porStatus = resultados.map(resultado => ({
        status: resultado.status,
        quantidade: parseInt(resultado.quantidade, 10),
      }));

      return {
        total,
        porStatus,
      };
    });
  }
}