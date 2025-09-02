import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Solicitacao,
  Pagamento,
  Cidadao,
  TipoBeneficio,
  Endereco,
  ComposicaoFamiliar,
} from '../../../entities';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { SolicitacaoRepository } from '../../solicitacao/repositories/solicitacao.repository';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { ScopeViolationException } from '../../../common/exceptions/scope.exceptions';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { MetricasConstants } from '../constants/metricas.constants';
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
import { MetricasFiltrosAvancadosDto, PeriodoPredefinido } from '../dto/metricas-filtros-avancados.dto';
import { FiltrosQueryHelper } from '../helpers/filtros-query.helper';

/**
 * Serviço especializado em métricas de impacto social
 * 
 * @description
 * Responsável por calcular e fornecer métricas relacionadas ao impacto social
 * dos benefícios concedidos, incluindo famílias beneficiadas, pessoas impactadas,
 * investimento social e distribuição geográfica dos recursos.
 * 
 * Utiliza ScopedRepository para garantir que os dados sejam filtrados
 * adequadamente baseado no contexto de escopo do usuário autenticado.
 */
@Injectable()
export class ImpactoSocialService {
  private readonly logger = new Logger(ImpactoSocialService.name);
  
  // Repositórios com escopo aplicado automaticamente
  private readonly solicitacaoScopedRepository: ScopedRepository<Solicitacao>;
  private readonly pagamentoScopedRepository: ScopedRepository<Pagamento>;
  private readonly cidadaoScopedRepository: ScopedRepository<Cidadao>;
  private readonly enderecoScopedRepository: ScopedRepository<Endereco>;
  private readonly composicaoFamiliarScopedRepository: ScopedRepository<ComposicaoFamiliar>;

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
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
    private readonly solicitacaoCustomRepository: SolicitacaoRepository,
  ) {
    // Inicializar repositórios com escopo usando ScopedRepository
    this.solicitacaoScopedRepository = new ScopedRepository(
      Solicitacao,
      this.solicitacaoRepository.manager,
      this.solicitacaoRepository.queryRunner,
      { strictMode: true, allowGlobalScope: false }
    );
    
    this.pagamentoScopedRepository = new ScopedRepository(
      Pagamento,
      this.pagamentoRepository.manager,
      this.pagamentoRepository.queryRunner,
      { strictMode: true, allowGlobalScope: false }
    );
    
    this.cidadaoScopedRepository = new ScopedRepository(
      Cidadao,
      this.cidadaoRepository.manager,
      this.cidadaoRepository.queryRunner,
      { strictMode: true, allowGlobalScope: false }
    );
    
    this.enderecoScopedRepository = new ScopedRepository(
      Endereco,
      this.enderecoRepository.manager,
      this.enderecoRepository.queryRunner,
      { strictMode: true, allowGlobalScope: false }
    );
    
    this.composicaoFamiliarScopedRepository = new ScopedRepository(
      ComposicaoFamiliar,
      this.composicaoFamiliarRepository.manager,
      this.composicaoFamiliarRepository.queryRunner,
      { strictMode: true, allowGlobalScope: false }
    );
  }

  /**
   * Obtém métricas completas de impacto social
   * 
   * @param filtros Filtros avançados opcionais para refinar os dados
   * @returns Dados completos de impacto social incluindo métricas, indicadores e gráficos
   */
  async getImpactoSocial(filtros?: MetricasFiltrosAvancadosDto): Promise<ImpactoSocialData> {
    const context = RequestContextHolder.get();
    
    // Garantir que o contexto seja preservado durante todas as operações assíncronas
    return RequestContextHolder.runAsync(context, async () => {
      // Normalizar e validar filtros
      const filtrosAtivos = this.normalizarFiltros(filtros);
      this.validarFiltros(filtrosAtivos);
      const dataLimite = this.calcularDataLimite(filtrosAtivos.periodo);

      // Calcular métricas principais
      const metricas = await this.calcularMetricasImpactoSocial(dataLimite, filtrosAtivos);

      // Calcular indicadores derivados
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
   * Calcula as métricas principais de impacto social
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Métricas principais de impacto social
   */
  private async calcularMetricasImpactoSocial(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ImpactoSocialMetricas> {
    const context = RequestContextHolder.get();

    // Contar famílias beneficiadas com escopo aplicado
    const familiasBeneficiadasQuery = this.solicitacaoScopedRepository
      .createScopedQueryBuilder('solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA });
    
    // Aplicar filtros dinâmicos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(familiasBeneficiadasQuery, filtros);
    } else {
      // Se não há filtros, aplica filtro padrão de data
      familiasBeneficiadasQuery.andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite });
    }
    
    // Contar pessoas impactadas através da composição familiar
    const pessoasImpactadasQuery = this.solicitacaoScopedRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoin('solicitacao.beneficiario', 'beneficiario')
      .leftJoin('beneficiario.composicao_familiar', 'composicao_familiar')
      .select('COUNT(DISTINCT composicao_familiar.id)', 'count')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA });
    
    // Aplicar filtros dinâmicos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosSolicitacao(pessoasImpactadasQuery, filtros);
    } else {
      pessoasImpactadasQuery.andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite });
    }
    
    // Executar queries de contagem
    const familiasBeneficiadas = await familiasBeneficiadasQuery.getCount();
    const pessoasImpactadasResult = await pessoasImpactadasQuery.getRawOne();
    const pessoasImpactadas = parseInt(pessoasImpactadasResult?.count) || 0;

    // Contar bairros impactados com escopo aplicado
    const bairrosResult = await this.executarQueryComTratamento(
      async () => {
        const bairrosQuery = this.solicitacaoScopedRepository
          .createScopedQueryBuilder('solicitacao');
        
        // Aplicar joins baseado no escopo
        if (context?.tipo === ScopeType.GLOBAL) {
          bairrosQuery.innerJoin('solicitacao.beneficiario', 'beneficiario');
        }
        bairrosQuery.innerJoin('beneficiario.enderecos', 'endereco');
        
        bairrosQuery
          .where('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
          .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
          .select('COUNT(DISTINCT endereco.bairro)', 'count');
        
        // Aplicar filtros padronizados
        this.aplicarFiltrosPadrao(bairrosQuery, filtros, 'solicitacao');
        
        return bairrosQuery.getRawOne();
      },
      'contagem de bairros impactados'
    );
    
    const bairrosImpactados = parseInt(bairrosResult?.count) || 0;

    // Calcular investimento total com escopo aplicado
    const investimentoResult = await this.createScopedPagamentoQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
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
    
    this.logger.debug('[IMPACTO-SOCIAL-DEBUG] Métricas de impacto social calculadas:', {
      resultado,
      contextType: context?.tipo,
      contextUnidadeId: context?.unidade_id
    });

    return resultado;
  }

  /**
   * Calcula os indicadores derivados de impacto social
   * 
   * @param metricas Métricas principais já calculadas
   * @param dataLimite Data limite para cálculos adicionais
   * @returns Indicadores calculados de impacto social
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

    // Taxa de cobertura social baseada na população configurada
    const taxaCoberturaSocial =
      (metricas.pessoas_impactadas / MetricasConstants.POPULACAO_BASE_DEFAULT) * 
      MetricasConstants.MULTIPLICADOR_PERCENTUAL;

    return {
      valor_medio_por_familia: Math.round(
        valorMedioPorFamilia * MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_MONETARIO
      ) / MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_MONETARIO,
      taxa_cobertura_social: Math.round(
        taxaCoberturaSocial * MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL
      ) / MetricasConstants.MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL,
    };
  }

  /**
   * Gera dados para todos os gráficos de impacto social
   * 
   * @param dataLimite Data limite para filtrar os dados
   * @param filtros Filtros avançados aplicados
   * @returns Dados estruturados para gráficos
   */
  private async gerarGraficosImpactoSocial(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ImpactoSocialGraficos> {
    // Executar todas as queries de gráficos em paralelo para melhor performance
    const [evolucaoMensal, distribuicaoBeneficios, recursosFaixaEtaria, recursosTipoBeneficio, recursosImpactoTipo, recursosBairros] = await Promise.all([
      this.gerarEvolucaoMensal(dataLimite, filtros),
      this.gerarDistribuicaoBeneficios(dataLimite, filtros),
      this.gerarRecursosFaixaEtaria(dataLimite, filtros),
      this.gerarRecursosTipoBeneficio(dataLimite, filtros),
      this.gerarRecursosImpactoTipo(dataLimite, filtros),
      this.gerarRecursosBairros(dataLimite, filtros),
    ]);

    return {
      evolucao_mensal: evolucaoMensal,
      distribuicao_beneficios: distribuicaoBeneficios,
      recursos_faixa_etaria: recursosFaixaEtaria,
      recursos_tipo_beneficio: recursosTipoBeneficio,
      recursos_impacto_tipo: recursosImpactoTipo,
      recursos_bairros: recursosBairros,
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
      'usuario', 'usuarios', 'dataInicioPersonalizada', 'dataFimPersonalizada'
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

  /**
   * Aplica filtros de forma padronizada em queries
   */
  private aplicarFiltrosPadrao<T>(
    query: SelectQueryBuilder<T>,
    filtros?: MetricasFiltrosAvancadosDto,
    tipoEntidade: 'solicitacao' | 'pagamento' | 'concessao' = 'solicitacao',
  ): SelectQueryBuilder<T> {
    // Se há filtros válidos, aplica através do helper
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      switch (tipoEntidade) {
        case 'solicitacao':
          return FiltrosQueryHelper.aplicarFiltrosSolicitacao(
            query as SelectQueryBuilder<Solicitacao>,
            filtros,
          ) as SelectQueryBuilder<T>;
        case 'pagamento':
          return FiltrosQueryHelper.aplicarFiltrosPagamento(
            query as SelectQueryBuilder<Pagamento>,
            filtros,
          ) as SelectQueryBuilder<T>;
      }
    }
    
    // Se não há filtros, aplica filtros padrão baseado no tipo de entidade
    return this.aplicarFiltrosPadraoParaEntidade(query, tipoEntidade);
  }

  /**
   * Aplica filtros padrão quando não há filtros específicos
   */
  private aplicarFiltrosPadraoParaEntidade<T>(
    query: SelectQueryBuilder<T>,
    tipoEntidade: 'solicitacao' | 'pagamento' | 'concessao',
  ): SelectQueryBuilder<T> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - MetricasConstants.PERIODO_PADRAO_DIAS);

    switch (tipoEntidade) {
      case 'solicitacao':
        return query
          .andWhere('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
          .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite });
      case 'pagamento':
        return query
          .andWhere('pagamento.status IN (:...status)', {
            status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
          })
          .andWhere('pagamento.created_at >= :dataLimite', { dataLimite });
      default:
        return query;
    }
  }

  /**
   * Cria QueryBuilder com escopo aplicado para pagamentos
   */
  private createScopedPagamentoQueryBuilder(
    alias: string = 'pagamento',
  ): SelectQueryBuilder<Pagamento> {
    const queryBuilder = this.pagamentoScopedRepository.createQueryBuilder(alias);
    this.applyScopeToPagamentoQuery(queryBuilder, alias);
    return queryBuilder;
  }

  /**
   * Aplica filtros de escopo ao QueryBuilder para pagamentos
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

  // ========== MÉTODOS DE GERAÇÃO DE GRÁFICOS ==========
  // Nota: Os métodos específicos de geração de gráficos serão implementados
  // em uma próxima etapa para manter o arquivo em tamanho gerenciável

  private async gerarEvolucaoMensal(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<EvolucaoMensalItem[]> {
    const query = this.pagamentoScopedRepository
      .createScopedQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.beneficiario', 'cidadao')
      .leftJoin('cidadao.composicao_familiar', 'composicao')
      .select([
        "TO_CHAR(COALESCE(pagamento.data_liberacao, pagamento.created_at), 'YYYY-MM') as mes",
        'COUNT(DISTINCT solicitacao.beneficiario_id) as familias',
        'COUNT(DISTINCT cidadao.id) + COALESCE(COUNT(DISTINCT composicao.id), 0) as pessoas',
        'SUM(pagamento.valor) as investimento',
      ])
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
      })
      .andWhere('COALESCE(pagamento.data_liberacao, pagamento.created_at) >= :dataLimite', { dataLimite })
      .groupBy("TO_CHAR(COALESCE(pagamento.data_liberacao, pagamento.created_at), 'YYYY-MM')")
      .orderBy("TO_CHAR(COALESCE(pagamento.data_liberacao, pagamento.created_at), 'YYYY-MM')", 'ASC');

    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(query, filtros);
    }

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarEvolucaoMensal',
    );

    return resultados.map((resultado) => ({
      mes: resultado.mes,
      familias: parseInt(resultado.familias, 10),
      pessoas: parseInt(resultado.pessoas, 10),
      investimento: parseFloat(resultado.investimento) || 0,
    }));
  }

  private async gerarDistribuicaoBeneficios(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<DistribuicaoBeneficiosItem[]> {
    const query = this.pagamentoScopedRepository
      .createScopedQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .select([
        'tipo_beneficio.nome as tipo',
        'COUNT(*) as quantidade',
      ])
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
          StatusPagamentoEnum.RECEBIDO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .orderBy('COUNT(*)', 'DESC');

    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(query, filtros);
    }

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarDistribuicaoBeneficios',
    );

    // Calcular total para percentuais
    const totalQuantidade = resultados.reduce((total, item) => total + parseInt(item.quantidade, 10), 0);

    return resultados.map((resultado) => {
      const quantidade = parseInt(resultado.quantidade, 10);
      
      return {
        tipo: resultado.tipo,
        quantidade: quantidade,
        percentual: totalQuantidade > 0 ? (quantidade / totalQuantidade) * 100 : 0,
      };
    });
  }

  private async gerarRecursosFaixaEtaria(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosFaixaEtariaItem[]> {
    const query = this.pagamentoScopedRepository
      .createScopedQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.beneficiario', 'cidadao')
      .select([
        `CASE 
          WHEN EXTRACT(YEAR FROM AGE(cidadao.data_nascimento)) < 18 THEN 'Menor de 18'
          WHEN EXTRACT(YEAR FROM AGE(cidadao.data_nascimento)) BETWEEN 18 AND 30 THEN '18-30'
          WHEN EXTRACT(YEAR FROM AGE(cidadao.data_nascimento)) BETWEEN 31 AND 50 THEN '31-50'
          WHEN EXTRACT(YEAR FROM AGE(cidadao.data_nascimento)) BETWEEN 51 AND 65 THEN '51-65'
          ELSE 'Acima de 65'
        END as faixa_etaria`,
        'SUM(pagamento.valor) as recursos',
        'COUNT(*) as quantidade',
      ])
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('faixa_etaria')
      .orderBy('faixa_etaria', 'ASC');

    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(query, filtros);
    }

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarRecursosFaixaEtaria',
    );

    const totalRecursos = resultados.reduce((total, item) => total + parseFloat(item.recursos), 0);

    return resultados.map((resultado) => ({
      faixa_etaria: resultado.faixa_etaria,
      recursos: parseFloat(resultado.recursos) || 0,
      percentual: totalRecursos > 0 ? (parseFloat(resultado.recursos) / totalRecursos) * 100 : 0,
    }));
  }

  private async gerarRecursosTipoBeneficio(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosTipoBeneficioItem[]> {
    const query = this.pagamentoScopedRepository
      .createScopedQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .select([
        'tipo_beneficio.nome as tipo_beneficio',
        'SUM(pagamento.valor) as recursos',
        'COUNT(*) as quantidade',
      ])
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .orderBy('SUM(pagamento.valor)', 'DESC');

    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(query, filtros);
    }

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarRecursosTipoBeneficio',
    );

    const totalRecursos = resultados.reduce((total, item) => total + parseFloat(item.recursos), 0);

    return resultados.map((resultado) => ({
      tipo_beneficio: resultado.tipo_beneficio,
      recursos: parseFloat(resultado.recursos) || 0,
      percentual: totalRecursos > 0 ? (parseFloat(resultado.recursos) / totalRecursos) * 100 : 0,
    }));
  }

  private async gerarRecursosImpactoTipo(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosImpactoTipoItem[]> {
    const query = this.pagamentoScopedRepository
      .createScopedQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .innerJoin('solicitacao.beneficiario', 'cidadao')
      .leftJoin('cidadao.composicao_familiar', 'composicao')
      .select([
        'tipo_beneficio.nome as tipo_beneficio',
        'SUM(pagamento.valor) as recursos',
        'COUNT(DISTINCT solicitacao.beneficiario_id) as familias',
        'COUNT(DISTINCT cidadao.id) + COALESCE(COUNT(DISTINCT composicao.id), 0) as pessoas',
      ])
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .groupBy('tipo_beneficio.nome')
      .orderBy('COUNT(DISTINCT solicitacao.beneficiario_id)', 'DESC');

    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(query, filtros);
    }

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarRecursosImpactoTipo',
    );

    return resultados.map((resultado) => ({
      tipo_beneficio: resultado.tipo_beneficio,
      recursos: parseFloat(resultado.recursos) || 0,
      familias: parseInt(resultado.familias, 10),
      pessoas: parseInt(resultado.pessoas, 10),
    }));
  }

  private async gerarRecursosBairros(
    dataLimite: Date,
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<RecursosBairrosItem[]> {
    const query = this.pagamentoScopedRepository
      .createScopedQueryBuilder('pagamento')
      .innerJoin('pagamento.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.beneficiario', 'cidadao')
      .innerJoin('cidadao.enderecos', 'endereco')
      .select([
        'endereco.bairro as bairro',
        'SUM(pagamento.valor) as recursos',
        'COUNT(DISTINCT solicitacao.beneficiario_id) as familias_atendidas',
      ])
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PAGO,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.CONFIRMADO,
        ],
      })
      .andWhere('solicitacao.data_abertura >= :dataLimite', { dataLimite })
      .andWhere('endereco.bairro IS NOT NULL')
      .groupBy('endereco.bairro')
      .orderBy('SUM(pagamento.valor)', 'DESC');

    // Aplicar filtros dinâmicos se fornecidos
    if (filtros && !this.filtrosEstaoVazios(filtros)) {
      FiltrosQueryHelper.aplicarFiltrosPagamento(query, filtros);
    }

    const resultados = await this.executarQueryComTratamento(
      () => query.getRawMany(),
      'gerarRecursosBairros',
    );

    const totalRecursos = resultados.reduce((total, item) => total + parseFloat(item.recursos), 0);

    return resultados.map((resultado) => ({
      bairro: resultado.bairro,
      recursos: parseFloat(resultado.recursos) || 0,
      percentual: totalRecursos > 0 ? (parseFloat(resultado.recursos) / totalRecursos) * 100 : 0,
    }));
  }
}