import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { AcaoCritica } from '../entities/acao-critica.entity';
import { Aprovador } from '../entities/aprovador.entity';
import { StatusSolicitacao, TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * Interface para métricas de performance
 */
interface MetricasPerformance {
  tempo_medio_aprovacao: number;
  tempo_mediano_aprovacao: number;
  tempo_maximo_aprovacao: number;
  tempo_minimo_aprovacao: number;
  percentil_95_aprovacao: number;
}

/**
 * Interface para métricas de volume
 */
interface MetricasVolume {
  total_solicitacoes: number;
  solicitacoes_pendentes: number;
  solicitacoes_aprovadas: number;
  solicitacoes_rejeitadas: number;
  solicitacoes_canceladas: number;
  solicitacoes_expiradas: number;
  taxa_aprovacao: number;
  taxa_rejeicao: number;
}

/**
 * Interface para métricas por ação
 */
interface MetricasPorAcao {
  acao: TipoAcaoCritica;
  total: number;
  aprovadas: number;
  rejeitadas: number;
  pendentes: number;
  tempo_medio: number;
  taxa_aprovacao: number;
}

/**
 * Interface para métricas por aprovador
 */
interface MetricasPorAprovador {
  aprovador_id: string;
  nome_aprovador: string;
  total_aprovacoes: number;
  total_rejeicoes: number;
  tempo_medio_resposta: number;
  eficiencia: number;
  carga_trabalho_atual: number;
}

/**
 * Interface para métricas de SLA
 */
interface MetricasSLA {
  dentro_prazo: number;
  fora_prazo: number;
  percentual_cumprimento_sla: number;
  tempo_medio_excesso: number;
  acoes_criticas_problematicas: TipoAcaoCritica[];
}

/**
 * Interface para dashboard de métricas
 */
export interface DashboardMetricas {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  performance: MetricasPerformance;
  volume: MetricasVolume;
  sla: MetricasSLA;
  por_acao: MetricasPorAcao[];
  por_aprovador: MetricasPorAprovador[];
  tendencias: {
    volume_diario: Array<{ data: string; total: number }>;
    tempo_medio_diario: Array<{ data: string; tempo_medio: number }>;
    taxa_aprovacao_diaria: Array<{ data: string; taxa: number }>;
  };
  alertas: Array<{
    tipo: string;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    mensagem: string;
    valor_atual: number;
    valor_limite: number;
  }>;
}

/**
 * Serviço para coleta e análise de métricas do sistema de aprovação
 * 
 * Este serviço é responsável por:
 * - Coletar métricas de performance e volume
 * - Calcular indicadores de SLA
 * - Gerar relatórios de eficiência
 * - Identificar gargalos e problemas
 * - Fornecer dados para dashboards
 */
@Injectable()
export class AprovacaoMetricsService {
  private readonly logger = new Logger(AprovacaoMetricsService.name);

  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    @InjectRepository(AcaoCritica)
    private readonly acaoCriticaRepository: Repository<AcaoCritica>,
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
  ) {}

  /**
   * Gera dashboard completo de métricas para um período
   */
  async gerarDashboardMetricas(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<DashboardMetricas> {
    this.logger.debug(
      `Gerando dashboard de métricas para período: ${dataInicio.toISOString()} - ${dataFim.toISOString()}`,
    );

    const [performance, volume, sla, porAcao, porAprovador, tendencias] =
      await Promise.all([
        this.calcularMetricasPerformance(dataInicio, dataFim),
        this.calcularMetricasVolume(dataInicio, dataFim),
        this.calcularMetricasSLA(dataInicio, dataFim),
        this.calcularMetricasPorAcao(dataInicio, dataFim),
        this.calcularMetricasPorAprovador(dataInicio, dataFim),
        this.calcularTendencias(dataInicio, dataFim),
      ]);

    const alertas = await this.gerarAlertas({
      performance,
      volume,
      sla,
      porAcao,
      porAprovador,
    });

    return {
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
      performance,
      volume,
      sla,
      por_acao: porAcao,
      por_aprovador: porAprovador,
      tendencias,
      alertas,
    };
  }

  /**
   * Calcula métricas de performance (tempos de aprovação)
   */
  async calcularMetricasPerformance(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<MetricasPerformance> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('s')
      .select([
        'EXTRACT(EPOCH FROM (s.data_aprovacao - s.created_at)) / 3600 as tempo_horas',
      ])
      .where('s.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .andWhere('s.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.REJEITADA],
      })
      .andWhere('s.data_aprovacao IS NOT NULL');

    const resultados = await query.getRawMany();
    const tempos = resultados
      .map((r) => parseFloat(r.tempo_horas))
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);

    if (tempos.length === 0) {
      return {
        tempo_medio_aprovacao: 0,
        tempo_mediano_aprovacao: 0,
        tempo_maximo_aprovacao: 0,
        tempo_minimo_aprovacao: 0,
        percentil_95_aprovacao: 0,
      };
    }

    const soma = tempos.reduce((acc, tempo) => acc + tempo, 0);
    const meio = Math.floor(tempos.length / 2);
    const percentil95Index = Math.floor(tempos.length * 0.95);

    return {
      tempo_medio_aprovacao: soma / tempos.length,
      tempo_mediano_aprovacao:
        tempos.length % 2 === 0
          ? (tempos[meio - 1] + tempos[meio]) / 2
          : tempos[meio],
      tempo_maximo_aprovacao: tempos[tempos.length - 1],
      tempo_minimo_aprovacao: tempos[0],
      percentil_95_aprovacao: tempos[percentil95Index],
    };
  }

  /**
   * Calcula métricas de volume de solicitações
   */
  async calcularMetricasVolume(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<MetricasVolume> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('s')
      .select([
        'COUNT(*) as total',
        'SUM(CASE WHEN s.status = :pendente THEN 1 ELSE 0 END) as pendentes',
        'SUM(CASE WHEN s.status = :aprovada THEN 1 ELSE 0 END) as aprovadas',
        'SUM(CASE WHEN s.status = :rejeitada THEN 1 ELSE 0 END) as rejeitadas',
        'SUM(CASE WHEN s.status = :cancelada THEN 1 ELSE 0 END) as canceladas',
        'SUM(CASE WHEN s.status = :expirada THEN 1 ELSE 0 END) as expiradas',
      ])
      .where('s.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .setParameters({
        pendente: StatusSolicitacao.PENDENTE,
        aprovada: StatusSolicitacao.APROVADA,
        rejeitada: StatusSolicitacao.REJEITADA,
        cancelada: StatusSolicitacao.CANCELADA,
        expirada: StatusSolicitacao.EXPIRADA,
      });

    const resultado = await query.getRawOne();

    const total = parseInt(resultado.total) || 0;
    const aprovadas = parseInt(resultado.aprovadas) || 0;
    const rejeitadas = parseInt(resultado.rejeitadas) || 0;
    const processadas = aprovadas + rejeitadas;

    return {
      total_solicitacoes: total,
      solicitacoes_pendentes: parseInt(resultado.pendentes) || 0,
      solicitacoes_aprovadas: aprovadas,
      solicitacoes_rejeitadas: rejeitadas,
      solicitacoes_canceladas: parseInt(resultado.canceladas) || 0,
      solicitacoes_expiradas: parseInt(resultado.expiradas) || 0,
      taxa_aprovacao: processadas > 0 ? (aprovadas / processadas) * 100 : 0,
      taxa_rejeicao: processadas > 0 ? (rejeitadas / processadas) * 100 : 0,
    };
  }

  /**
   * Calcula métricas de SLA
   */
  async calcularMetricasSLA(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<MetricasSLA> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('s')
      .leftJoin('s.acao_critica', 'ac')
      .select([
        'ac.tipo as acao',
        'CASE WHEN s.data_aprovacao <= s.prazo_limite THEN 1 ELSE 0 END as dentro_prazo',
        'EXTRACT(EPOCH FROM (s.data_aprovacao - s.prazo_limite)) / 3600 as excesso_horas',
      ])
      .where('s.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .andWhere('s.status IN (:...status)', {
        status: [StatusSolicitacao.APROVADA, StatusSolicitacao.REJEITADA],
      })
      .andWhere('s.data_aprovacao IS NOT NULL');

    const resultados = await query.getRawMany();

    if (resultados.length === 0) {
      return {
        dentro_prazo: 0,
        fora_prazo: 0,
        percentual_cumprimento_sla: 0,
        tempo_medio_excesso: 0,
        acoes_criticas_problematicas: [],
      };
    }

    const dentroPrazo = resultados.filter((r) => r.dentro_prazo === 1).length;
    const foraPrazo = resultados.length - dentroPrazo;
    const excessos = resultados
      .filter((r) => r.dentro_prazo === 0 && r.excesso_horas > 0)
      .map((r) => parseFloat(r.excesso_horas));

    // Identificar ações críticas problemáticas (com mais de 30% fora do prazo)
    const acoesProblematicas = this.identificarAcoesProblematicas(resultados);

    return {
      dentro_prazo: dentroPrazo,
      fora_prazo: foraPrazo,
      percentual_cumprimento_sla: (dentroPrazo / resultados.length) * 100,
      tempo_medio_excesso:
        excessos.length > 0
          ? excessos.reduce((acc, exc) => acc + exc, 0) / excessos.length
          : 0,
      acoes_criticas_problematicas: acoesProblematicas,
    };
  }

  /**
   * Calcula métricas por tipo de ação crítica
   */
  async calcularMetricasPorAcao(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<MetricasPorAcao[]> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('s')
      .leftJoin('s.acao_critica', 'ac')
      .select([
        'ac.tipo as acao',
        'COUNT(*) as total',
        'SUM(CASE WHEN s.status = :aprovada THEN 1 ELSE 0 END) as aprovadas',
        'SUM(CASE WHEN s.status = :rejeitada THEN 1 ELSE 0 END) as rejeitadas',
        'SUM(CASE WHEN s.status = :pendente THEN 1 ELSE 0 END) as pendentes',
        'AVG(EXTRACT(EPOCH FROM (s.data_aprovacao - s.created_at)) / 3600) as tempo_medio',
      ])
      .where('s.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .groupBy('ac.tipo')
      .setParameters({
        aprovada: StatusSolicitacao.APROVADA,
        rejeitada: StatusSolicitacao.REJEITADA,
        pendente: StatusSolicitacao.PENDENTE,
      });

    const resultados = await query.getRawMany();

    return resultados.map((resultado) => {
      const total = parseInt(resultado.total);
      const aprovadas = parseInt(resultado.aprovadas) || 0;
      const rejeitadas = parseInt(resultado.rejeitadas) || 0;
      const processadas = aprovadas + rejeitadas;

      return {
        acao: resultado.acao,
        total,
        aprovadas,
        rejeitadas,
        pendentes: parseInt(resultado.pendentes) || 0,
        tempo_medio: parseFloat(resultado.tempo_medio) || 0,
        taxa_aprovacao: processadas > 0 ? (aprovadas / processadas) * 100 : 0,
      };
    });
  }

  /**
   * Calcula métricas por aprovador
   */
  async calcularMetricasPorAprovador(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<MetricasPorAprovador[]> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('s')
      .leftJoin('s.aprovador', 'a')
      .leftJoin('a.usuario', 'u')
      .select([
        'a.id as aprovador_id',
        'u.nome as nome_aprovador',
        'SUM(CASE WHEN s.status = :aprovada THEN 1 ELSE 0 END) as total_aprovacoes',
        'SUM(CASE WHEN s.status = :rejeitada THEN 1 ELSE 0 END) as total_rejeicoes',
        'AVG(EXTRACT(EPOCH FROM (s.data_aprovacao - s.created_at)) / 3600) as tempo_medio_resposta',
      ])
      .where('s.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .andWhere('s.aprovador_id IS NOT NULL')
      .groupBy('a.id, u.nome')
      .setParameters({
        aprovada: StatusSolicitacao.APROVADA,
        rejeitada: StatusSolicitacao.REJEITADA,
      });

    const resultados = await query.getRawMany();

    // Calcular carga de trabalho atual para cada aprovador
    const cargasTrabalho = await this.calcularCargaTrabalhoAtual();

    return resultados.map((resultado) => {
      const totalAprovacoes = parseInt(resultado.total_aprovacoes) || 0;
      const totalRejeicoes = parseInt(resultado.total_rejeicoes) || 0;
      const totalProcessadas = totalAprovacoes + totalRejeicoes;
      const tempoMedioResposta = parseFloat(resultado.tempo_medio_resposta) || 0;

      // Calcular eficiência baseada em tempo de resposta e volume
      const eficiencia = this.calcularEficienciaAprovador(
        totalProcessadas,
        tempoMedioResposta,
      );

      return {
        aprovador_id: resultado.aprovador_id,
        nome_aprovador: resultado.nome_aprovador,
        total_aprovacoes: totalAprovacoes,
        total_rejeicoes: totalRejeicoes,
        tempo_medio_resposta: tempoMedioResposta,
        eficiencia,
        carga_trabalho_atual: cargasTrabalho[resultado.aprovador_id] || 0,
      };
    });
  }

  /**
   * Calcula tendências temporais
   */
  async calcularTendencias(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<DashboardMetricas['tendencias']> {
    // Implementar cálculo de tendências diárias
    const volumeDiario = await this.calcularVolumeDiario(dataInicio, dataFim);
    const tempoMedioDiario = await this.calcularTempoMedioDiario(
      dataInicio,
      dataFim,
    );
    const taxaAprovacaoDiaria = await this.calcularTaxaAprovacaoDiaria(
      dataInicio,
      dataFim,
    );

    return {
      volume_diario: volumeDiario,
      tempo_medio_diario: tempoMedioDiario,
      taxa_aprovacao_diaria: taxaAprovacaoDiaria,
    };
  }

  /**
   * Gera alertas baseados nas métricas
   */
  private async gerarAlertas(metricas: any): Promise<DashboardMetricas['alertas']> {
    const alertas: DashboardMetricas['alertas'] = [];

    // Alerta de SLA baixo
    if (metricas.sla.percentual_cumprimento_sla < 80) {
      alertas.push({
        tipo: 'SLA_BAIXO',
        severidade: 'alta',
        mensagem: 'Percentual de cumprimento de SLA abaixo do esperado',
        valor_atual: metricas.sla.percentual_cumprimento_sla,
        valor_limite: 80,
      });
    }

    // Alerta de tempo médio alto
    if (metricas.performance.tempo_medio_aprovacao > 24) {
      alertas.push({
        tipo: 'TEMPO_MEDIO_ALTO',
        severidade: 'media',
        mensagem: 'Tempo médio de aprovação acima de 24 horas',
        valor_atual: metricas.performance.tempo_medio_aprovacao,
        valor_limite: 24,
      });
    }

    // Alerta de volume alto de pendências
    const taxaPendencia = (metricas.volume.solicitacoes_pendentes / metricas.volume.total_solicitacoes) * 100;
    if (taxaPendencia > 30) {
      alertas.push({
        tipo: 'VOLUME_PENDENCIAS_ALTO',
        severidade: 'alta',
        mensagem: 'Volume de solicitações pendentes muito alto',
        valor_atual: taxaPendencia,
        valor_limite: 30,
      });
    }

    return alertas;
  }

  /**
   * Métodos auxiliares privados
   */
  private identificarAcoesProblematicas(resultados: any[]): TipoAcaoCritica[] {
    const acoesStats = new Map<string, { total: number; foraPrazo: number }>();

    resultados.forEach((resultado) => {
      const acao = resultado.acao;
      if (!acoesStats.has(acao)) {
        acoesStats.set(acao, { total: 0, foraPrazo: 0 });
      }
      const stats = acoesStats.get(acao)!;
      stats.total++;
      if (resultado.dentro_prazo === 0) {
        stats.foraPrazo++;
      }
    });

    const problematicas: TipoAcaoCritica[] = [];
    acoesStats.forEach((stats, acao) => {
      const percentualForaPrazo = (stats.foraPrazo / stats.total) * 100;
      if (percentualForaPrazo > 30) {
        problematicas.push(acao as TipoAcaoCritica);
      }
    });

    return problematicas;
  }

  private async calcularCargaTrabalhoAtual(): Promise<Record<string, number>> {
    const query = this.solicitacaoRepository
      .createQueryBuilder('s')
      .select(['s.aprovador_id', 'COUNT(*) as pendentes'])
      .where('s.status = :status', { status: StatusSolicitacao.PENDENTE })
      .groupBy('s.aprovador_id');

    const resultados = await query.getRawMany();
    const cargas: Record<string, number> = {};

    resultados.forEach((resultado) => {
      if (resultado.aprovador_id) {
        cargas[resultado.aprovador_id] = parseInt(resultado.pendentes);
      }
    });

    return cargas;
  }

  private calcularEficienciaAprovador(
    totalProcessadas: number,
    tempoMedioResposta: number,
  ): number {
    if (totalProcessadas === 0 || tempoMedioResposta === 0) {
      return 0;
    }

    // Fórmula de eficiência: volume processado / tempo médio
    // Normalizado para escala de 0-100
    const eficienciaBruta = totalProcessadas / tempoMedioResposta;
    return Math.min(100, eficienciaBruta * 10); // Ajustar multiplicador conforme necessário
  }

  private async calcularVolumeDiario(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<Array<{ data: string; total: number }>> {
    // Implementar cálculo de volume diário
    return [];
  }

  private async calcularTempoMedioDiario(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<Array<{ data: string; tempo_medio: number }>> {
    // Implementar cálculo de tempo médio diário
    return [];
  }

  private async calcularTaxaAprovacaoDiaria(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<Array<{ data: string; taxa: number }>> {
    // Implementar cálculo de taxa de aprovação diária
    return [];
  }
}