import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import {
  AgendamentoVisita,
  VisitaDomiciliar,
  AvaliacaoVisita,
  HistoricoMonitoramento,
} from '../../../entities';
import {
  StatusAgendamento,
  ResultadoVisita,
  TipoVisita,
  PrioridadeVisita,
} from '../../../enums';
import {
  TipoAcaoHistorico,
  CategoriaHistorico,
  TipoAvaliacao,
  ResultadoAvaliacao,
} from '../enums';

/**
 * Interface para métricas gerais do dashboard
 */
export interface MetricasGerais {
  total_agendamentos: number;
  agendamentos_pendentes: number;
  agendamentos_confirmados: number;
  agendamentos_em_atraso: number;
  total_visitas: number;
  visitas_realizadas: number;
  visitas_canceladas: number;
  taxa_conclusao: number;
  tempo_medio_visita: number;
  avaliacoes_criadas: number;
  avaliacoes_adequadas: number;
  taxa_adequacao: number;
}

/**
 * Interface para métricas por período
 */
export interface MetricasPeriodo {
  periodo: string;
  agendamentos: number;
  visitas_realizadas: number;
  visitas_canceladas: number;
  avaliacoes: number;
  tempo_medio: number;
}

/**
 * Interface para ranking de técnicos
 */
export interface RankingTecnico {
  tecnico_id: string;
  tecnico_nome: string;
  total_visitas: number;
  visitas_realizadas: number;
  visitas_canceladas: number;
  tempo_medio_visita: number;
  avaliacoes_adequadas: number;
  taxa_adequacao: number;
  pontuacao: number;
}

/**
 * Interface para análise de problemas
 */
export interface AnaliseProblemas {
  tipo_problema: string;
  quantidade: number;
  percentual: number;
  impacto: 'baixo' | 'medio' | 'alto';
  recomendacoes: string[];
}

/**
 * Interface para filtros de relatório
 */
export interface FiltrosRelatorio {
  data_inicio?: Date;
  data_fim?: Date;
  tecnico_id?: string;
  unidade_id?: string;
  tipo_visita?: TipoVisita;
  status_agendamento?: StatusAgendamento;
  resultado_visita?: ResultadoVisita;
  prioridade?: PrioridadeVisita;
}

/**
 * Service responsável por gerar relatórios e métricas do módulo de monitoramento
 */
@Injectable()
export class RelatorioMonitoramentoService {
  private readonly logger = new Logger(RelatorioMonitoramentoService.name);

  constructor(
    @InjectRepository(AgendamentoVisita)
    private readonly agendamentoRepository: Repository<AgendamentoVisita>,
    @InjectRepository(VisitaDomiciliar)
    private readonly visitaRepository: Repository<VisitaDomiciliar>,
    @InjectRepository(AvaliacaoVisita)
    private readonly avaliacaoRepository: Repository<AvaliacaoVisita>,
    @InjectRepository(HistoricoMonitoramento)
    private readonly historicoRepository: Repository<HistoricoMonitoramento>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Obtém métricas gerais do dashboard
   */
  async getMetricasGerais(filtros?: FiltrosRelatorio): Promise<MetricasGerais> {
    try {
      const whereClause = this.buildWhereClause(filtros);

      // Métricas de agendamentos
      const totalAgendamentos = await this.agendamentoRepository.count({
        where: whereClause.agendamento,
      });

      const agendamentosPendentes = await this.agendamentoRepository.count({
        where: {
          ...whereClause.agendamento,
          status: StatusAgendamento.PENDENTE,
        },
      });

      const agendamentosConfirmados = await this.agendamentoRepository.count({
        where: {
          ...whereClause.agendamento,
          status: StatusAgendamento.CONFIRMADO,
        },
      });

      // Agendamentos em atraso
      const agendamentosEmAtraso = await this.agendamentoRepository.count({
        where: {
          ...whereClause.agendamento,
          status: StatusAgendamento.CONFIRMADO,
          data_agendamento: LessThan(new Date()),
        },
      });

      // Métricas de visitas
      const totalVisitas = await this.visitaRepository.count({
        where: whereClause.visita,
      });

      const visitasRealizadas = await this.visitaRepository.count({
        where: {
          ...whereClause.visita,
          resultado: ResultadoVisita.CONFORME,
        },
      });

      const visitasCanceladas = await this.visitaRepository.count({
        where: {
          ...whereClause.visita,
          resultado: ResultadoVisita.VISITA_CANCELADA,
        },
      });

      // Taxa de conclusão
      const taxaConclusao = totalAgendamentos > 0 
        ? (visitasRealizadas / totalAgendamentos) * 100 
        : 0;

      // Tempo médio de visita
      const tempoMedioResult = await this.visitaRepository
        .createQueryBuilder('visita')
        .select('AVG(EXTRACT(EPOCH FROM (visita.data_conclusao - visita.data_inicio)))', 'tempo_medio')
        .where('visita.data_inicio IS NOT NULL')
        .andWhere('visita.data_conclusao IS NOT NULL')
        .getRawOne();

      const tempoMedioVisita = tempoMedioResult?.tempo_medio || 0;

      // Métricas de avaliações
      const avaliacoesCriadas = await this.avaliacaoRepository.count({
        where: whereClause.avaliacao,
      });

      const avaliacoesAdequadas = await this.avaliacaoRepository.count({
        where: {
          ...whereClause.avaliacao,
          resultadoAvaliacao: ResultadoAvaliacao.ADEQUADO,
        },
      });

      const taxaAdequacao = avaliacoesCriadas > 0 
        ? (avaliacoesAdequadas / avaliacoesCriadas) * 100 
        : 0;

      return {
        total_agendamentos: totalAgendamentos,
        agendamentos_pendentes: agendamentosPendentes,
        agendamentos_confirmados: agendamentosConfirmados,
        agendamentos_em_atraso: agendamentosEmAtraso,
        total_visitas: totalVisitas,
        visitas_realizadas: visitasRealizadas,
        visitas_canceladas: visitasCanceladas,
        taxa_conclusao: Math.round(taxaConclusao * 100) / 100,
        tempo_medio_visita: Math.round(tempoMedioVisita),
        avaliacoes_criadas: avaliacoesCriadas,
        avaliacoes_adequadas: avaliacoesAdequadas,
        taxa_adequacao: Math.round(taxaAdequacao * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Erro ao obter métricas gerais', error);
      throw error;
    }
  }

  /**
   * Obtém métricas por período (diário, semanal, mensal)
   */
  async getMetricasPorPeriodo(
    periodo: 'dia' | 'semana' | 'mes',
    filtros?: FiltrosRelatorio,
  ): Promise<MetricasPeriodo[]> {
    try {
      const formatoPeriodo = this.getFormatoPeriodo(periodo);
      
      const query = this.visitaRepository
        .createQueryBuilder('visita')
        .select([
          `TO_CHAR(visita.data_inicio, '${formatoPeriodo}') as periodo`,
          'COUNT(CASE WHEN visita.resultado = :realizada THEN 1 END) as visitas_realizadas',
          'COUNT(CASE WHEN visita.resultado = :cancelada THEN 1 END) as visitas_canceladas',
          'COUNT(visita.id) as total_visitas',
          'AVG(EXTRACT(EPOCH FROM (visita.data_conclusao - visita.data_inicio))) as tempo_medio',
        ])
        .setParameters({
          realizada: ResultadoVisita.CONFORME,
          cancelada: ResultadoVisita.VISITA_CANCELADA,
        })
        .groupBy('periodo')
        .orderBy('periodo', 'DESC')
        .limit(30);

      if (filtros?.data_inicio) {
        query.andWhere('visita.data_inicio >= :dataInicio', {
          dataInicio: filtros.data_inicio,
        });
      }

      if (filtros?.data_fim) {
        query.andWhere('visita.data_inicio <= :dataFim', {
          dataFim: filtros.data_fim,
        });
      }

      const resultados = await query.getRawMany();

      return resultados.map((resultado) => ({
        periodo: resultado.periodo,
        agendamentos: 0, // Seria necessário uma query adicional
        visitas_realizadas: parseInt(resultado.visitas_realizadas) || 0,
        visitas_canceladas: parseInt(resultado.visitas_canceladas) || 0,
        avaliacoes: 0, // Seria necessário uma query adicional
        tempo_medio: Math.round(resultado.tempo_medio) || 0,
      }));
    } catch (error) {
      this.logger.error('Erro ao obter métricas por período', error);
      throw error;
    }
  }

  /**
   * Obtém ranking de técnicos por performance
   */
  async getRankingTecnicos(filtros?: FiltrosRelatorio): Promise<RankingTecnico[]> {
    try {
      const query = this.visitaRepository
        .createQueryBuilder('visita')
        .leftJoin('visita.tecnico_responsavel', 'tecnico')
        .leftJoin('visita.avaliacoes', 'avaliacao')
        .select([
          'tecnico.id as tecnico_id',
          'tecnico.nome as tecnico_nome',
          'COUNT(visita.id) as total_visitas',
          'COUNT(CASE WHEN visita.resultado = :realizada THEN 1 END) as visitas_realizadas',
          'COUNT(CASE WHEN visita.resultado = :cancelada THEN 1 END) as visitas_canceladas',
          'AVG(EXTRACT(EPOCH FROM (visita.data_conclusao - visita.data_inicio))) as tempo_medio_visita',
          'COUNT(CASE WHEN avaliacao.resultado_avaliacao = :adequado THEN 1 END) as avaliacoes_adequadas',
          'COUNT(avaliacao.id) as total_avaliacoes',
        ])
        .setParameters({
          realizada: ResultadoVisita.CONFORME,
          cancelada: ResultadoVisita.VISITA_CANCELADA,
          adequado: ResultadoAvaliacao.ADEQUADO,
        })
        .groupBy('tecnico.id, tecnico.nome')
        .having('COUNT(visita.id) > 0')
        .orderBy('visitas_realizadas', 'DESC');

      if (filtros?.data_inicio) {
        query.andWhere('visita.data_inicio >= :dataInicio', {
          dataInicio: filtros.data_inicio,
        });
      }

      if (filtros?.data_fim) {
        query.andWhere('visita.data_inicio <= :dataFim', {
          dataFim: filtros.data_fim,
        });
      }

      const resultados = await query.getRawMany();

      return resultados.map((resultado) => {
        const totalVisitas = parseInt(resultado.total_visitas) || 0;
        const visitasRealizadas = parseInt(resultado.visitas_realizadas) || 0;
        const visitasCanceladas = parseInt(resultado.visitas_canceladas) || 0;
        const avaliacoesAdequadas = parseInt(resultado.avaliacoes_adequadas) || 0;
        const totalAvaliacoes = parseInt(resultado.total_avaliacoes) || 0;
        
        const taxaAdequacao = totalAvaliacoes > 0 
          ? (avaliacoesAdequadas / totalAvaliacoes) * 100 
          : 0;
        
        // Cálculo de pontuação baseado em múltiplos fatores
        const pontuacao = this.calcularPontuacaoTecnico({
          visitasRealizadas,
          totalVisitas,
          taxaAdequacao,
          tempoMedio: resultado.tempo_medio_visita || 0,
        });

        return {
          tecnico_id: resultado.tecnico_id,
          tecnico_nome: resultado.tecnico_nome,
          total_visitas: totalVisitas,
          visitas_realizadas: visitasRealizadas,
          visitas_canceladas: visitasCanceladas,
          tempo_medio_visita: Math.round(resultado.tempo_medio_visita) || 0,
          avaliacoes_adequadas: avaliacoesAdequadas,
          taxa_adequacao: Math.round(taxaAdequacao * 100) / 100,
          pontuacao: Math.round(pontuacao * 100) / 100,
        };
      });
    } catch (error) {
      this.logger.error('Erro ao obter ranking de técnicos', error);
      throw error;
    }
  }

  /**
   * Analisa problemas recorrentes e fornece recomendações
   */
  async getAnaliseProblemas(filtros?: FiltrosRelatorio): Promise<AnaliseProblemas[]> {
    try {
      // Análise de cancelamentos
      const cancelamentos = await this.visitaRepository.count({
        where: {
          resultado: ResultadoVisita.VISITA_CANCELADA,
          ...this.buildWhereClause(filtros).visita,
        },
      });

      // Análise de atrasos
      const atrasos = await this.agendamentoRepository.count({
        where: {
          status: StatusAgendamento.CONFIRMADO,
          data_agendamento: LessThan(new Date()),
          ...this.buildWhereClause(filtros).agendamento,
        },
      });

      // Análise de avaliações inadequadas
      const avaliacoesInadequadas = await this.avaliacaoRepository.count({
        where: {
          resultadoAvaliacao: ResultadoAvaliacao.INADEQUADO,
          ...this.buildWhereClause(filtros).avaliacao,
        },
      });

      const totalVisitas = await this.visitaRepository.count({
        where: this.buildWhereClause(filtros).visita,
      });

      const problemas: AnaliseProblemas[] = [];

      if (cancelamentos > 0) {
        problemas.push({
          tipo_problema: 'Cancelamentos de Visitas',
          quantidade: cancelamentos,
          percentual: totalVisitas > 0 ? (cancelamentos / totalVisitas) * 100 : 0,
          impacto: cancelamentos > totalVisitas * 0.2 ? 'alto' : cancelamentos > totalVisitas * 0.1 ? 'medio' : 'baixo',
          recomendacoes: [
            'Revisar processo de confirmação de agendamentos',
            'Implementar lembretes automáticos',
            'Analisar motivos de cancelamento',
          ],
        });
      }

      if (atrasos > 0) {
        problemas.push({
          tipo_problema: 'Agendamentos em Atraso',
          quantidade: atrasos,
          percentual: totalVisitas > 0 ? (atrasos / totalVisitas) * 100 : 0,
          impacto: atrasos > totalVisitas * 0.15 ? 'alto' : atrasos > totalVisitas * 0.05 ? 'medio' : 'baixo',
          recomendacoes: [
            'Otimizar agenda dos técnicos',
            'Implementar sistema de priorização',
            'Revisar capacidade da equipe',
          ],
        });
      }

      if (avaliacoesInadequadas > 0) {
        const totalAvaliacoes = await this.avaliacaoRepository.count({
          where: this.buildWhereClause(filtros).avaliacao,
        });

        problemas.push({
          tipo_problema: 'Avaliações Inadequadas',
          quantidade: avaliacoesInadequadas,
          percentual: totalAvaliacoes > 0 ? (avaliacoesInadequadas / totalAvaliacoes) * 100 : 0,
          impacto: avaliacoesInadequadas > totalAvaliacoes * 0.3 ? 'alto' : avaliacoesInadequadas > totalAvaliacoes * 0.15 ? 'medio' : 'baixo',
          recomendacoes: [
            'Revisar critérios de avaliação',
            'Capacitar equipe técnica',
            'Implementar planos de ação corretiva',
          ],
        });
      }

      return problemas;
    } catch (error) {
      this.logger.error('Erro ao analisar problemas', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de ações para auditoria
   */
  async getHistoricoAuditoria(
    filtros?: FiltrosRelatorio & {
      tipo_acao?: TipoAcaoHistorico;
      categoria?: CategoriaHistorico;
      usuario_id?: string;
    },
  ): Promise<HistoricoMonitoramento[]> {
    try {
      const query = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .leftJoinAndSelect('historico.cidadao', 'cidadao')
        .orderBy('historico.created_at', 'DESC')
        .limit(100);

      if (filtros?.data_inicio) {
        query.andWhere('historico.created_at >= :dataInicio', {
          dataInicio: filtros.data_inicio,
        });
      }

      if (filtros?.data_fim) {
        query.andWhere('historico.created_at <= :dataFim', {
          dataFim: filtros.data_fim,
        });
      }

      if (filtros?.tipo_acao) {
        query.andWhere('historico.tipo_acao = :tipoAcao', {
          tipoAcao: filtros.tipo_acao,
        });
      }

      if (filtros?.categoria) {
        query.andWhere('historico.categoria = :categoria', {
          categoria: filtros.categoria,
        });
      }

      if (filtros?.usuario_id) {
        query.andWhere('historico.usuario_id = :usuarioId', {
          usuarioId: filtros.usuario_id,
        });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Erro ao obter histórico de auditoria', error);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private buildWhereClause(filtros?: FiltrosRelatorio) {
    const where: any = {
      agendamento: {},
      visita: {},
      avaliacao: {},
    };

    if (filtros?.data_inicio) {
      where.agendamento.data_agendamento = MoreThanOrEqual(filtros.data_inicio);
      where.visita.data_inicio = MoreThanOrEqual(filtros.data_inicio);
      where.avaliacao.created_at = MoreThanOrEqual(filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      // Para combinar condições de data, usar Between quando ambas as datas estão presentes
      if (filtros?.data_inicio) {
        // Se já existe uma condição de data_inicio, usar Between
        where.agendamento.data_agendamento = Between(filtros.data_inicio, filtros.data_fim);
        where.visita.data_inicio = Between(filtros.data_inicio, filtros.data_fim);
        where.avaliacao.created_at = Between(filtros.data_inicio, filtros.data_fim);
      } else {
        // Se só existe data_fim, usar LessThanOrEqual
        where.agendamento.data_agendamento = LessThanOrEqual(filtros.data_fim);
        where.visita.data_inicio = LessThanOrEqual(filtros.data_fim);
        where.avaliacao.created_at = LessThanOrEqual(filtros.data_fim);
      }
    }

    if (filtros?.tecnico_id) {
      where.agendamento.tecnico_id = filtros.tecnico_id;
      where.visita.tecnico_id = filtros.tecnico_id;
    }

    if (filtros?.unidade_id) {
      where.agendamento.unidade_id = filtros.unidade_id;
      where.visita.unidade_id = filtros.unidade_id;
    }

    if (filtros?.tipo_visita) {
      where.agendamento.tipo_visita = filtros.tipo_visita;
      where.visita.tipo_visita = filtros.tipo_visita;
    }

    if (filtros?.status_agendamento) {
      where.agendamento.status = filtros.status_agendamento;
    }

    if (filtros?.resultado_visita) {
      where.visita.resultado = filtros.resultado_visita;
    }

    if (filtros?.prioridade) {
      where.agendamento.prioridade = filtros.prioridade;
    }

    return where;
  }

  private getFormatoPeriodo(periodo: 'dia' | 'semana' | 'mes'): string {
    switch (periodo) {
      case 'dia':
        return 'YYYY-MM-DD';
      case 'semana':
        return 'YYYY-"W"WW';
      case 'mes':
        return 'YYYY-MM';
      default:
        return 'YYYY-MM-DD';
    }
  }

  private calcularPontuacaoTecnico(dados: {
    visitasRealizadas: number;
    totalVisitas: number;
    taxaAdequacao: number;
    tempoMedio: number;
  }): number {
    const { visitasRealizadas, totalVisitas, taxaAdequacao, tempoMedio } = dados;
    
    // Taxa de conclusão (peso 40%)
    const taxaConclusao = totalVisitas > 0 ? (visitasRealizadas / totalVisitas) * 100 : 0;
    const pontuacaoConclusao = (taxaConclusao / 100) * 40;
    
    // Taxa de adequação (peso 35%)
    const pontuacaoAdequacao = (taxaAdequacao / 100) * 35;
    
    // Eficiência de tempo (peso 25%) - tempo ideal: 60-90 minutos
    const tempoIdeal = 75 * 60; // 75 minutos em segundos
    const desvioTempo = Math.abs(tempoMedio - tempoIdeal) / tempoIdeal;
    const pontuacaoTempo = Math.max(0, (1 - desvioTempo)) * 25;
    
    return pontuacaoConclusao + pontuacaoAdequacao + pontuacaoTempo;
  }
}