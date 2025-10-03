import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Raw,
  Not,
  IsNull,
  MoreThanOrEqual,
} from 'typeorm';
import { LogAuditoria } from '../../../entities/log-auditoria.entity';
import { ConfigService } from '@nestjs/config';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { ScheduleAdapterService } from '../../../shared/schedule/schedule-adapter.service';

/**
 * Interface para estatísticas de auditoria
 */
export interface EstatisticasAuditoria {
  /**
   * Total de logs
   */
  totalLogs: number;

  /**
   * Total de logs por tipo de operação
   */
  logsPorTipoOperacao: Record<string, number>;

  /**
   * Total de logs por entidade
   */
  logsPorEntidade: Record<string, number>;

  /**
   * Total de logs com dados sensíveis
   */
  logsComDadosSensiveis: number;

  /**
   * Total de logs por período (últimas 24h, 7 dias, 30 dias)
   */
  logsPorPeriodo: {
    ultimas24h: number;
    ultimos7dias: number;
    ultimos30dias: number;
  };

  /**
   * Tamanho estimado do banco de dados de auditoria
   */
  tamanhoEstimadoBD: {
    tamanhoTotal: string;
    tamanhoIndices: string;
    tamanhoTabelas: string;
  };

  /**
   * Métricas de performance
   */
  metricas: {
    tempoMedioInsercao: number;
    tempoMedioConsulta: number;
    taxaErros: number;
  };

  /**
   * Data da última atualização
   */
  dataAtualizacao: Date;
}

/**
 * Serviço para monitoramento do módulo de auditoria
 */
@Injectable()
export class AuditoriaMonitoramentoService implements OnModuleInit {
  private readonly logger = new Logger(AuditoriaMonitoramentoService.name);
  private estatisticas: EstatisticasAuditoria;
  private metricas: {
    temposInsercao: number[];
    temposConsulta: number[];
    erros: number;
    totalOperacoes: number;
  };

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logAuditoriaRepository: Repository<LogAuditoria>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly scheduleAdapter: ScheduleAdapterService,
  ) {
    // Inicializar métricas
    this.metricas = {
      temposInsercao: [],
      temposConsulta: [],
      erros: 0,
      totalOperacoes: 0,
    };

    // Inicializar estatísticas
    this.estatisticas = {
      totalLogs: 0,
      logsPorTipoOperacao: {},
      logsPorEntidade: {},
      logsComDadosSensiveis: 0,
      logsPorPeriodo: {
        ultimas24h: 0,
        ultimos7dias: 0,
        ultimos30dias: 0,
      },
      tamanhoEstimadoBD: {
        tamanhoTotal: '0 KB',
        tamanhoIndices: '0 KB',
        tamanhoTabelas: '0 KB',
      },
      metricas: {
        tempoMedioInsercao: 0,
        tempoMedioConsulta: 0,
        taxaErros: 0,
      },
      dataAtualizacao: new Date(),
    };

    // Estatísticas serão atualizadas pelo agendamento configurado no onModuleInit
  }

  /**
   * Registra tempo de inserção
   *
   * @param tempoMs Tempo em milissegundos
   */
  registrarTempoInsercao(tempoMs: number): void {
    this.metricas.temposInsercao.push(tempoMs);
    this.metricas.totalOperacoes++;

    // Limitar o tamanho do array para evitar consumo excessivo de memória
    if (this.metricas.temposInsercao.length > 1000) {
      this.metricas.temposInsercao.shift();
    }
  }

  /**
   * Registra tempo de consulta
   *
   * @param tempoMs Tempo em milissegundos
   */
  registrarTempoConsulta(tempoMs: number): void {
    this.metricas.temposConsulta.push(tempoMs);
    this.metricas.totalOperacoes++;

    // Limitar o tamanho do array para evitar consumo excessivo de memória
    if (this.metricas.temposConsulta.length > 1000) {
      this.metricas.temposConsulta.shift();
    }
  }

  /**
   * Registra erro
   */
  registrarErro(): void {
    this.metricas.erros++;
    this.metricas.totalOperacoes++;
  }

  /**
   * Obtém estatísticas atualizadas
   *
   * @returns Estatísticas de auditoria
   */
  getEstatisticas(): EstatisticasAuditoria {
    return this.estatisticas;
  }

/**
 * Configura o agendamento quando o módulo é inicializado de forma assíncrona
 * CORREÇÃO: Não bloquear a inicialização do servidor
 */
async onModuleInit(): Promise<void> {
  this.logger.log('⏩ AuditoriaMonitoramentoService inicializado (configuração em background)');
  
  // CRÍTICO: Retornar IMEDIATAMENTE sem await
  // A configuração acontece em background
  Promise.resolve().then(async () => {
    try {
      this.logger.log('🔄 Configurando agendamento de estatísticas em background...');
      
      // Aguardar 30 segundos após o boot antes de coletar estatísticas
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Configurar a atualização de estatísticas a cada 15 minutos
      this.scheduleAdapter.scheduleInterval(
        'atualizar_estatisticas_auditoria',
        15 * 60 * 1000, // 15 minutos
        () => this.atualizarEstatisticas(),
      );

      this.logger.log('✅ Agendamento de estatísticas configurado com sucesso');
      
      // Executar primeira atualização após 1 minuto
      setTimeout(() => {
        this.atualizarEstatisticas().catch(error => {
          this.logger.error(`Erro na atualização inicial de estatísticas: ${error.message}`);
        });
      }, 60000);
      
    } catch (error) {
      this.logger.error(
        `Erro ao configurar agendamento de estatísticas: ${error.message}`,
      );
    }
  });
}

  /**
   * Atualiza estatísticas periodicamente
   */
  async atualizarEstatisticas(): Promise<void> {
    try {
      this.logger.debug('Atualizando estatísticas de auditoria...');

      // Atualizar totais
      this.estatisticas.totalLogs = await this.logAuditoriaRepository.count();

      // Atualizar logs por tipo de operação
      const tiposOperacao = Object.values(TipoOperacao);
      for (const tipo of tiposOperacao) {
        const count = await this.logAuditoriaRepository.count({
          where: { tipo_operacao: tipo as TipoOperacao },
        });
        this.estatisticas.logsPorTipoOperacao[tipo] = count;
      }

      // Atualizar logs por entidade (top 10)
      const entidadesResult: Array<{
        entidade_afetada: string;
        total: string;
      }> = await this.dataSource.query(`
          SELECT entidade_afetada, COUNT(*) as total
          FROM logs_auditoria
          GROUP BY entidade_afetada
          ORDER BY total DESC
          LIMIT 10
        `);

      this.estatisticas.logsPorEntidade = {};
      for (const row of entidadesResult) {
        if (row.entidade_afetada) {
          this.estatisticas.logsPorEntidade[row.entidade_afetada] =
            parseInt(row.total, 10) || 0;
        }
      }

      // Atualizar logs com dados sensíveis
      try {
        this.estatisticas.logsComDadosSensiveis =
          await this.logAuditoriaRepository.count({
            where: {
              dados_sensiveis_acessados: Not(IsNull()),
            },
          });
      } catch (error) {
        this.logger.warn(
          `Erro ao contar logs com dados sensíveis: ${error.message}`,
        );
        this.estatisticas.logsComDadosSensiveis = 0;
      }

      // Atualizar logs por período
      const agora = new Date();

      try {
        // Últimas 24 horas
        const ultimas24h = new Date(agora);
        ultimas24h.setHours(agora.getHours() - 24);

        this.estatisticas.logsPorPeriodo.ultimas24h =
          await this.logAuditoriaRepository.count({
            where: {
              created_at: MoreThanOrEqual(ultimas24h),
            },
          });

        // Últimos 7 dias
        const ultimos7dias = new Date(agora);
        ultimos7dias.setDate(agora.getDate() - 7);

        this.estatisticas.logsPorPeriodo.ultimos7dias =
          await this.logAuditoriaRepository.count({
            where: {
              created_at: MoreThanOrEqual(ultimos7dias),
            },
          });

        // Últimos 30 dias
        const ultimos30dias = new Date(agora);
        ultimos30dias.setDate(agora.getDate() - 30);

        this.estatisticas.logsPorPeriodo.ultimos30dias =
          await this.logAuditoriaRepository.count({
            where: {
              created_at: MoreThanOrEqual(ultimos30dias),
            },
          });
      } catch (error) {
        this.logger.warn(`Erro ao contar logs por período: ${error.message}`);
        this.estatisticas.logsPorPeriodo = {
          ultimas24h: 0,
          ultimos7dias: 0,
          ultimos30dias: 0,
        };
      }

      // Atualizar tamanho estimado do banco de dados
      const tamanhoResult = await this.dataSource.query(`
        SELECT
          pg_size_pretty(pg_total_relation_size('logs_auditoria')) as tamanho_total,
          pg_size_pretty(pg_indexes_size('logs_auditoria')) as tamanho_indices,
          pg_size_pretty(pg_relation_size('logs_auditoria')) as tamanho_tabela
      `);

      if (tamanhoResult.length > 0) {
        this.estatisticas.tamanhoEstimadoBD = {
          tamanhoTotal: tamanhoResult[0].tamanho_total,
          tamanhoIndices: tamanhoResult[0].tamanho_indices,
          tamanhoTabelas: tamanhoResult[0].tamanho_tabela,
        };
      }

      // Atualizar métricas
      const tempoMedioInsercao =
        this.metricas.temposInsercao.length > 0
          ? this.metricas.temposInsercao.reduce((a, b) => a + b, 0) /
            this.metricas.temposInsercao.length
          : 0;

      const tempoMedioConsulta =
        this.metricas.temposConsulta.length > 0
          ? this.metricas.temposConsulta.reduce((a, b) => a + b, 0) /
            this.metricas.temposConsulta.length
          : 0;

      const taxaErros =
        this.metricas.totalOperacoes > 0
          ? (this.metricas.erros / this.metricas.totalOperacoes) * 100
          : 0;

      this.estatisticas.metricas = {
        tempoMedioInsercao,
        tempoMedioConsulta,
        taxaErros,
      };

      // Atualizar data de atualização
      this.estatisticas.dataAtualizacao = new Date();

      this.logger.log('Estatísticas de auditoria atualizadas com sucesso');

      // Verificar alertas
      this.verificarAlertas();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Erro ao atualizar estatísticas: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Verifica condições para alertas
   */
  private verificarAlertas(): void {
    try {
      // Verificar taxa de erros
      const limiteErros = this.configService.get<number>(
        'AUDITORIA_LIMITE_TAXA_ERROS',
        5,
      );

      if (this.estatisticas.metricas.taxaErros > limiteErros) {
        this.logger.warn(
          `ALERTA: Taxa de erros acima do limite (${this.estatisticas.metricas.taxaErros.toFixed(2)}%)`,
        );
      }

      // Verificar tempo médio de inserção
      const limiteTempoInsercao = this.configService.get<number>(
        'AUDITORIA_LIMITE_TEMPO_INSERCAO',
        500,
      );

      if (this.estatisticas.metricas.tempoMedioInsercao > limiteTempoInsercao) {
        this.logger.warn(
          `ALERTA: Tempo médio de inserção acima do limite (${this.estatisticas.metricas.tempoMedioInsercao.toFixed(2)}ms)`,
        );
      }

      // Verificar tempo médio de consulta
      const limiteTempoConsulta = this.configService.get<number>(
        'AUDITORIA_LIMITE_TEMPO_CONSULTA',
        1000,
      );

      if (this.estatisticas.metricas.tempoMedioConsulta > limiteTempoConsulta) {
        this.logger.warn(
          `ALERTA: Tempo médio de consulta acima do limite (${this.estatisticas.metricas.tempoMedioConsulta.toFixed(2)}ms)`,
        );
      }

      // Verificar crescimento rápido
      const crescimentoDiario = this.estatisticas.logsPorPeriodo.ultimas24h;
      const limiteCrescimentoDiario = this.configService.get<number>(
        'AUDITORIA_LIMITE_CRESCIMENTO_DIARIO',
        10000,
      );

    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Erro ao verificar alertas: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Gera relatório de saúde do módulo de auditoria
   *
   * @returns Relatório de saúde
   */
  async gerarRelatorioSaude(): Promise<any> {
    try {
      // Atualizar estatísticas para garantir dados recentes
      await this.atualizarEstatisticas();

      // Verificar partições
      const particoesResult = await this.dataSource.query(`
        SELECT
          child.relname AS nome_particao,
          pg_size_pretty(pg_relation_size(child.oid)) AS tamanho,
          pg_stat_get_numscans(child.oid) AS num_scans
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
        WHERE parent.relname = 'logs_auditoria'
        ORDER BY child.relname
      `);

      // Verificar índices
      const indicesResult = await this.dataSource.query(`
        SELECT
          indexname AS nome_indice,
          indexdef AS definicao,
          idx_scan AS num_scans,
          idx_tup_read AS tuplas_lidas,
          idx_tup_fetch AS tuplas_buscadas
        FROM pg_stat_user_indexes
        JOIN pg_indexes ON pg_stat_user_indexes.indexrelname = pg_indexes.indexname
        WHERE tablename = 'logs_auditoria'
        ORDER BY idx_scan DESC
      `);

      // Verificar operações lentas
      const operacoesLentasResult = await this.dataSource.query(`
        SELECT
          query,
          calls,
          total_time / calls AS avg_time,
          rows
        FROM pg_stat_statements
        WHERE query ILIKE '%logs_auditoria%'
        ORDER BY avg_time DESC
        LIMIT 5
      `);

      // Calcular saúde geral (0-100%)
      let saudeGeral = 100;

      // Penalizar por alta taxa de erros
      if (this.estatisticas.metricas.taxaErros > 0) {
        saudeGeral -= Math.min(50, this.estatisticas.metricas.taxaErros * 5);
      }

      // Penalizar por tempos de resposta altos
      const tempoInsercaoIdeal = 100; // ms
      const tempoConsultaIdeal = 200; // ms

      if (this.estatisticas.metricas.tempoMedioInsercao > tempoInsercaoIdeal) {
        const penalidade = Math.min(
          25,
          ((this.estatisticas.metricas.tempoMedioInsercao -
            tempoInsercaoIdeal) /
            tempoInsercaoIdeal) *
            10,
        );
        saudeGeral -= penalidade;
      }

      if (this.estatisticas.metricas.tempoMedioConsulta > tempoConsultaIdeal) {
        const penalidade = Math.min(
          25,
          ((this.estatisticas.metricas.tempoMedioConsulta -
            tempoConsultaIdeal) /
            tempoConsultaIdeal) *
            10,
        );
        saudeGeral -= penalidade;
      }

      // Garantir que a saúde não seja negativa
      saudeGeral = Math.max(0, saudeGeral);

      // Determinar status com base na saúde
      let status = 'Ótimo';

      if (saudeGeral < 60) {
        status = 'Crítico';
      } else if (saudeGeral < 80) {
        status = 'Alerta';
      } else if (saudeGeral < 90) {
        status = 'Bom';
      }

      // Gerar recomendações
      const recomendacoes: string[] = [];

      if (this.estatisticas.metricas.taxaErros > 5) {
        recomendacoes.push(
          'Investigar e corrigir erros frequentes no módulo de auditoria',
        );
      }

      if (this.estatisticas.metricas.tempoMedioInsercao > 500) {
        recomendacoes.push('Otimizar processo de inserção de logs');
      }

      if (this.estatisticas.metricas.tempoMedioConsulta > 1000) {
        recomendacoes.push('Revisar índices e otimizar consultas');
      }

      // Verificar índices não utilizados
      const indicesNaoUtilizados = (
        indicesResult as Array<{ num_scans: string; nome_indice: string }>
      ).filter((indice) => indice.num_scans === '0');

      if (indicesNaoUtilizados.length > 0) {
        recomendacoes.push(
          `Considerar remover índices não utilizados: ${indicesNaoUtilizados.map((i) => i.nome_indice).join(', ')}`,
        );
      }

      return {
        saudeGeral: {
          pontuacao: Math.round(saudeGeral),
          status,
          dataAvaliacao: new Date(),
        },
        estatisticas: this.estatisticas,
        detalhes: {
          particoes: particoesResult,
          indices: indicesResult,
          operacoesLentas: operacoesLentasResult,
        },
        recomendacoes,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Erro ao gerar relatório de saúde: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
