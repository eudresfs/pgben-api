import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationMetrics,
  ChannelResult,
  NotificationChannel,
  NotificationType,
  NotificationPriority
} from '../interfaces/base-notification.interface';
import { NotificationConfig } from '../config/notification.config';
import { NotificationLoggerService } from './notification-logger.service';

/**
 * Métricas detalhadas por canal
 */
interface ChannelMetrics {
  total_enviadas: number;
  total_sucessos: number;
  total_falhas: number;
  taxa_sucesso: number;
  tempo_medio_resposta: number;
  ultimo_envio: Date | null;
  erros_recentes: string[];
  throughput_por_minuto: number;
}

/**
 * Métricas por tipo de notificação
 */
interface TypeMetrics {
  [key: string]: {
    total: number;
    sucessos: number;
    falhas: number;
    taxa_sucesso: number;
    tempo_medio: number;
  };
}

/**
 * Métricas por prioridade
 */
interface PriorityMetrics {
  [key: string]: {
    total: number;
    tempo_medio_processamento: number;
    taxa_sucesso: number;
  };
}

/**
 * Métricas de sistema
 */
interface SystemMetrics {
  uptime: number;
  memoria_utilizada: number;
  cpu_utilizada: number;
  conexoes_ativas: number;
  fila_pendente: number;
  rate_limit_atingido: number;
}

/**
 * Snapshot completo de métricas
 */
interface MetricsSnapshot {
  timestamp: Date;
  geral: NotificationMetrics;
  por_canal: Record<NotificationChannel, ChannelMetrics>;
  por_tipo: TypeMetrics;
  por_prioridade: PriorityMetrics;
  sistema: SystemMetrics;
  periodo_coleta: number; // em minutos
}

/**
 * Serviço de métricas para notificações
 * 
 * Responsável por:
 * - Coletar métricas em tempo real
 * - Agregar dados por canal, tipo e prioridade
 * - Fornecer insights de performance
 * - Detectar anomalias e alertas
 * - Exportar métricas para sistemas externos
 * - Manter histórico de métricas
 */
@Injectable()
export class NotificationMetricsService {
  private readonly logger = new Logger(NotificationMetricsService.name);
  private readonly config: NotificationConfig;
  private readonly metricas: NotificationMetrics;
  private readonly metricasPorCanal: Record<NotificationChannel, ChannelMetrics>;
  private readonly metricasPorTipo: TypeMetrics;
  private readonly metricasPorPrioridade: PriorityMetrics;
  private readonly sistemaMetricas: SystemMetrics;
  private readonly historico: MetricsSnapshot[];
  private readonly startTime: Date;
  private readonly maxHistoricoSize: number;

  constructor(
    private readonly notificationConfig: NotificationConfig,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerService: NotificationLoggerService
  ) {
    this.config = notificationConfig;
    this.startTime = new Date();
    this.maxHistoricoSize = 1440; // 24 horas de dados (1 por minuto)
    
    // Inicializa métricas gerais
    this.metricas = {
      total_enviadas: 0,
      total_sucessos: 0,
      total_falhas: 0,
      taxa_sucesso: 0,
      tempo_medio_processamento: 0,
      metricas_por_canal: {
        [NotificationChannel.EMAIL]: [],
        [NotificationChannel.IN_APP]: [],
        [NotificationChannel.ABLY]: [],
        [NotificationChannel.SMS]: []
      }
    };

    // Inicializa métricas por canal
    this.metricasPorCanal = {
      [NotificationChannel.EMAIL]: this.criarMetricasCanal(),
      [NotificationChannel.IN_APP]: this.criarMetricasCanal(),
      [NotificationChannel.ABLY]: this.criarMetricasCanal(),
      [NotificationChannel.SMS]: this.criarMetricasCanal()
    };

    // Inicializa outras métricas
    this.metricasPorTipo = {};
    this.metricasPorPrioridade = {};
    this.sistemaMetricas = {
      uptime: 0,
      memoria_utilizada: 0,
      cpu_utilizada: 0,
      conexoes_ativas: 0,
      fila_pendente: 0,
      rate_limit_atingido: 0
    };
    
    this.historico = [];

    this.logger.log('Serviço de métricas de notificação inicializado');
  }

  /**
   * Registra o resultado de uma notificação
   * 
   * @param resultados Resultados dos canais
   * @param tipo Tipo da notificação
   * @param prioridade Prioridade da notificação
   * @param duracao Duração do processamento
   */
  registrarNotificacao(
    resultados: ChannelResult[],
    tipo: NotificationType,
    prioridade: NotificationPriority,
    duracao: number
  ): void {
    const algumSucesso = resultados.some(r => r.sucesso);
    
    // Atualiza métricas gerais
    this.metricas.total_enviadas++;
    if (algumSucesso) {
      this.metricas.total_sucessos++;
    } else {
      this.metricas.total_falhas++;
    }
    
    this.metricas.taxa_sucesso = (this.metricas.total_sucessos / this.metricas.total_enviadas) * 100;
    this.metricas.tempo_medio_processamento = this.calcularMediaMovel(
      this.metricas.tempo_medio_processamento,
      duracao,
      this.metricas.total_enviadas
    );

    // Atualiza métricas por canal
    resultados.forEach(resultado => {
      this.atualizarMetricasCanal(resultado, duracao);
      
      // Adiciona ao histórico do canal
      this.metricas.metricas_por_canal[resultado.canal].push(resultado);
      
      // Mantém apenas os últimos 100 resultados por canal
      if (this.metricas.metricas_por_canal[resultado.canal].length > 100) {
        this.metricas.metricas_por_canal[resultado.canal].shift();
      }
    });

    // Atualiza métricas por tipo
    this.atualizarMetricasTipo(tipo, algumSucesso, duracao);

    // Atualiza métricas por prioridade
    this.atualizarMetricasPrioridade(prioridade, algumSucesso, duracao);

    // Log da métrica
    this.loggerService.logMetric('notification_processed', 1, 'counter', {
      tipo,
      prioridade,
      sucesso: algumSucesso.toString(),
      canais: resultados.length.toString()
    });

    // Emite evento de métrica atualizada
    this.eventEmitter.emit('metrics.notification.updated', {
      tipo,
      prioridade,
      sucesso: algumSucesso,
      duracao,
      canais: resultados.map(r => r.canal),
      timestamp: new Date()
    });
  }

  /**
   * Registra erro de rate limiting
   * 
   * @param canal Canal que atingiu o limite
   * @param userId ID do usuário (opcional)
   */
  registrarRateLimit(canal: NotificationChannel, userId?: string): void {
    this.sistemaMetricas.rate_limit_atingido++;
    
    this.loggerService.logMetric('rate_limit_hit', 1, 'counter', {
      canal,
      user_id: userId || 'unknown'
    });

    this.eventEmitter.emit('metrics.rate_limit.hit', {
      canal,
      user_id: userId,
      timestamp: new Date()
    });
  }

  /**
   * Atualiza métricas de sistema
   * 
   * @param memoria Uso de memória em MB
   * @param cpu Uso de CPU em %
   * @param conexoes Número de conexões ativas
   * @param fila Tamanho da fila pendente
   */
  atualizarMetricasSistema(
    memoria: number,
    cpu: number,
    conexoes: number,
    fila: number
  ): void {
    this.sistemaMetricas.uptime = Date.now() - this.startTime.getTime();
    this.sistemaMetricas.memoria_utilizada = memoria;
    this.sistemaMetricas.cpu_utilizada = cpu;
    this.sistemaMetricas.conexoes_ativas = conexoes;
    this.sistemaMetricas.fila_pendente = fila;
  }

  /**
   * Obtém snapshot completo das métricas
   * 
   * @returns Snapshot das métricas
   */
  obterSnapshot(): MetricsSnapshot {
    return {
      timestamp: new Date(),
      geral: { ...this.metricas },
      por_canal: { ...this.metricasPorCanal },
      por_tipo: { ...this.metricasPorTipo },
      por_prioridade: { ...this.metricasPorPrioridade },
      sistema: { ...this.sistemaMetricas },
      periodo_coleta: this.config.metricsConfig.collection_interval / 60000
    };
  }

  /**
   * Obtém métricas de um canal específico
   * 
   * @param canal Canal desejado
   * @returns Métricas do canal
   */
  obterMetricasCanal(canal: NotificationChannel): ChannelMetrics {
    return { ...this.metricasPorCanal[canal] };
  }

  /**
   * Obtém métricas por tipo de notificação
   * 
   * @returns Métricas por tipo
   */
  obterMetricasTipo(): TypeMetrics {
    return { ...this.metricasPorTipo };
  }

  /**
   * Obtém métricas por prioridade
   * 
   * @returns Métricas por prioridade
   */
  obterMetricasPrioridade(): PriorityMetrics {
    return { ...this.metricasPorPrioridade };
  }

  /**
   * Obtém histórico de métricas
   * 
   * @param limite Número máximo de snapshots
   * @returns Array de snapshots históricos
   */
  obterHistorico(limite: number = 100): MetricsSnapshot[] {
    return this.historico.slice(-limite);
  }

  /**
   * Detecta anomalias nas métricas
   * 
   * @returns Array de anomalias detectadas
   */
  detectarAnomalias(): Array<{ tipo: string; descricao: string; severidade: 'low' | 'medium' | 'high' }> {
    const anomalias = [];

    // Taxa de sucesso muito baixa
    if (this.metricas.taxa_sucesso < 80 && this.metricas.total_enviadas > 10) {
      anomalias.push({
        tipo: 'low_success_rate',
        descricao: `Taxa de sucesso baixa: ${this.metricas.taxa_sucesso.toFixed(2)}%`,
        severidade: this.metricas.taxa_sucesso < 50 ? 'high' : 'medium' as 'high' | 'medium'
      });
    }

    // Tempo de processamento muito alto
    if (this.metricas.tempo_medio_processamento > 10000) { // 10 segundos
      anomalias.push({
        tipo: 'high_processing_time',
        descricao: `Tempo médio de processamento alto: ${this.metricas.tempo_medio_processamento}ms`,
        severidade: this.metricas.tempo_medio_processamento > 30000 ? 'high' : 'medium' as 'high' | 'medium'
      });
    }

    // Rate limiting frequente
    if (this.sistemaMetricas.rate_limit_atingido > 100) {
      anomalias.push({
        tipo: 'frequent_rate_limiting',
        descricao: `Rate limiting atingido ${this.sistemaMetricas.rate_limit_atingido} vezes`,
        severidade: 'medium'
      });
    }

    // Fila muito grande
    if (this.sistemaMetricas.fila_pendente > 1000) {
      anomalias.push({
        tipo: 'large_queue',
        descricao: `Fila pendente muito grande: ${this.sistemaMetricas.fila_pendente} itens`,
        severidade: this.sistemaMetricas.fila_pendente > 5000 ? 'high' : 'medium' as 'high' | 'medium'
      });
    }

    // Uso de memória alto
    if (this.sistemaMetricas.memoria_utilizada > 1000) { // 1GB
      anomalias.push({
        tipo: 'high_memory_usage',
        descricao: `Uso de memória alto: ${this.sistemaMetricas.memoria_utilizada}MB`,
        severidade: this.sistemaMetricas.memoria_utilizada > 2000 ? 'high' : 'medium' as 'high' | 'medium'
      });
    }

    return anomalias;
  }

  /**
   * Reseta todas as métricas
   */
  resetarMetricas(): void {
    // Reset métricas gerais
    this.metricas.total_enviadas = 0;
    this.metricas.total_sucessos = 0;
    this.metricas.total_falhas = 0;
    this.metricas.taxa_sucesso = 0;
    this.metricas.tempo_medio_processamento = 0;
    
    Object.keys(this.metricas.metricas_por_canal).forEach(canal => {
      this.metricas.metricas_por_canal[canal as NotificationChannel] = [];
    });

    // Reset métricas por canal
    Object.keys(this.metricasPorCanal).forEach(canal => {
      this.metricasPorCanal[canal as NotificationChannel] = this.criarMetricasCanal();
    });

    // Reset outras métricas
    Object.keys(this.metricasPorTipo).forEach(tipo => {
      delete this.metricasPorTipo[tipo];
    });
    
    Object.keys(this.metricasPorPrioridade).forEach(prioridade => {
      delete this.metricasPorPrioridade[prioridade];
    });

    this.sistemaMetricas.rate_limit_atingido = 0;

    this.logger.log('Métricas resetadas');
  }

  /**
   * Coleta métricas periodicamente
   */
  @Cron(CronExpression.EVERY_MINUTE)
  private async coletarMetricasPeriodicas(): Promise<void> {
    if (!this.config.metricsConfig.enabled) {
      return;
    }

    try {
      // Coleta métricas de sistema
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.atualizarMetricasSistema(
        Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        0, // CPU usage seria calculado de forma mais complexa
        0, // Conexões ativas seria obtido do servidor
        0  // Fila pendente seria obtido do sistema de filas
      );

      // Cria snapshot
      const snapshot = this.obterSnapshot();
      this.historico.push(snapshot);

      // Mantém apenas o histórico necessário
      if (this.historico.length > this.maxHistoricoSize) {
        this.historico.shift();
      }

      // Detecta anomalias
      const anomalias = this.detectarAnomalias();
      if (anomalias.length > 0) {
        this.logger.warn('Anomalias detectadas nas métricas', { anomalias });
        
        this.eventEmitter.emit('metrics.anomalies.detected', {
          anomalias,
          timestamp: new Date()
        });
      }

      // Log de métricas coletadas
      this.loggerService.logMetric('metrics_collection', 1, 'counter', {
        total_notifications: this.metricas.total_enviadas.toString(),
        success_rate: this.metricas.taxa_sucesso.toFixed(2),
        avg_processing_time: this.metricas.tempo_medio_processamento.toFixed(2)
      });

    } catch (error) {
      this.logger.error('Erro na coleta de métricas periódicas', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Cria métricas iniciais para um canal
   * 
   * @returns Métricas iniciais do canal
   */
  private criarMetricasCanal(): ChannelMetrics {
    return {
      total_enviadas: 0,
      total_sucessos: 0,
      total_falhas: 0,
      taxa_sucesso: 0,
      tempo_medio_resposta: 0,
      ultimo_envio: null,
      erros_recentes: [],
      throughput_por_minuto: 0
    };
  }

  /**
   * Atualiza métricas de um canal específico
   * 
   * @param resultado Resultado do canal
   * @param duracao Duração do processamento
   */
  private atualizarMetricasCanal(resultado: ChannelResult, duracao: number): void {
    const metricas = this.metricasPorCanal[resultado.canal];
    
    metricas.total_enviadas++;
    if (resultado.sucesso) {
      metricas.total_sucessos++;
    } else {
      metricas.total_falhas++;
      
      // Adiciona erro recente
      if (resultado.erro) {
        metricas.erros_recentes.push(resultado.erro);
        
        // Mantém apenas os últimos 10 erros
        if (metricas.erros_recentes.length > 10) {
          metricas.erros_recentes.shift();
        }
      }
    }
    
    metricas.taxa_sucesso = (metricas.total_sucessos / metricas.total_enviadas) * 100;
    metricas.tempo_medio_resposta = this.calcularMediaMovel(
      metricas.tempo_medio_resposta,
      duracao,
      metricas.total_enviadas
    );
    metricas.ultimo_envio = new Date();
  }

  /**
   * Atualiza métricas por tipo de notificação
   * 
   * @param tipo Tipo da notificação
   * @param sucesso Se foi bem-sucedida
   * @param duracao Duração do processamento
   */
  private atualizarMetricasTipo(tipo: NotificationType, sucesso: boolean, duracao: number): void {
    if (!this.metricasPorTipo[tipo]) {
      this.metricasPorTipo[tipo] = {
        total: 0,
        sucessos: 0,
        falhas: 0,
        taxa_sucesso: 0,
        tempo_medio: 0
      };
    }

    const metricas = this.metricasPorTipo[tipo];
    metricas.total++;
    
    if (sucesso) {
      metricas.sucessos++;
    } else {
      metricas.falhas++;
    }
    
    metricas.taxa_sucesso = (metricas.sucessos / metricas.total) * 100;
    metricas.tempo_medio = this.calcularMediaMovel(
      metricas.tempo_medio,
      duracao,
      metricas.total
    );
  }

  /**
   * Atualiza métricas por prioridade
   * 
   * @param prioridade Prioridade da notificação
   * @param sucesso Se foi bem-sucedida
   * @param duracao Duração do processamento
   */
  private atualizarMetricasPrioridade(prioridade: NotificationPriority, sucesso: boolean, duracao: number): void {
    if (!this.metricasPorPrioridade[prioridade]) {
      this.metricasPorPrioridade[prioridade] = {
        total: 0,
        tempo_medio_processamento: 0,
        taxa_sucesso: 0
      };
    }

    const metricas = this.metricasPorPrioridade[prioridade];
    metricas.total++;
    metricas.tempo_medio_processamento = this.calcularMediaMovel(
      metricas.tempo_medio_processamento,
      duracao,
      metricas.total
    );
    
    // Calcula taxa de sucesso (simplificado)
    if (sucesso) {
      metricas.taxa_sucesso = ((metricas.taxa_sucesso * (metricas.total - 1)) + 100) / metricas.total;
    } else {
      metricas.taxa_sucesso = (metricas.taxa_sucesso * (metricas.total - 1)) / metricas.total;
    }
  }

  /**
   * Calcula média móvel
   * 
   * @param mediaAtual Média atual
   * @param novoValor Novo valor
   * @param totalAmostras Total de amostras
   * @returns Nova média
   */
  private calcularMediaMovel(mediaAtual: number, novoValor: number, totalAmostras: number): number {
    return ((mediaAtual * (totalAmostras - 1)) + novoValor) / totalAmostras;
  }
}