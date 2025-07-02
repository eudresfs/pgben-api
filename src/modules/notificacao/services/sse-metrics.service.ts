import { Injectable, Logger } from '@nestjs/common';
import { EnhancedMetricsService } from '../../../shared/monitoring/enhanced-metrics.service';

/**
 * Interface para métricas de SSE
 */
export interface SseMetrics {
  activeConnections: number;
  totalConnections: number;
  connectionsPerUser: Record<string, number>;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  averageConnectionDuration: number;
  deliveryRate: number;
  errorRate: number;
  peakConnections: number;
  connectionsByUserAgent: Record<string, number>;
}

/**
 * Interface para estatísticas de conexão
 */
export interface ConnectionStats {
  userId: string;
  connectionId: string;
  connectedAt: Date;
  userAgent?: string;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  lastActivity: Date;
}

/**
 * Serviço para monitoramento e métricas específicas de SSE
 *
 * Responsabilidades:
 * - Monitorar conexões SSE ativas
 * - Calcular métricas de entrega de mensagens
 * - Rastrear performance das conexões
 * - Fornecer estatísticas detalhadas para observabilidade
 * - Integrar com o sistema de métricas global
 */
@Injectable()
export class SseMetricsService {
  private readonly logger = new Logger(SseMetricsService.name);

  // Armazenamento em memória das métricas (em produção, considerar Redis)
  private metrics: SseMetrics = {
    activeConnections: 0,
    totalConnections: 0,
    connectionsPerUser: {},
    messagesSent: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    averageConnectionDuration: 0,
    deliveryRate: 0,
    errorRate: 0,
    peakConnections: 0,
    connectionsByUserAgent: {},
  };

  private connectionStats: Map<string, ConnectionStats> = new Map();
  private connectionStartTimes: Map<string, Date> = new Map();

  constructor(private readonly enhancedMetricsService: EnhancedMetricsService) {
    // Inicializar métricas periódicas
    this.startPeriodicMetricsUpdate();
  }

  /**
   * Registra uma nova conexão SSE
   */
  recordConnection(userId: string, connectionId: string, userAgent?: string) {
    try {
      const now = new Date();

      // Atualizar métricas básicas
      this.metrics.activeConnections++;
      this.metrics.totalConnections++;

      // Atualizar conexões por usuário
      this.metrics.connectionsPerUser[userId] =
        (this.metrics.connectionsPerUser[userId] || 0) + 1;

      // Atualizar conexões por user agent
      if (userAgent) {
        this.metrics.connectionsByUserAgent[userAgent] =
          (this.metrics.connectionsByUserAgent[userAgent] || 0) + 1;
      }

      // Atualizar pico de conexões
      if (this.metrics.activeConnections > this.metrics.peakConnections) {
        this.metrics.peakConnections = this.metrics.activeConnections;
      }

      // Registrar estatísticas da conexão
      this.connectionStats.set(connectionId, {
        userId,
        connectionId,
        connectedAt: now,
        userAgent,
        messagesSent: 0,
        messagesDelivered: 0,
        messagesFailed: 0,
        lastActivity: now,
      });

      this.connectionStartTimes.set(connectionId, now);

      // Registrar no sistema de métricas global
      this.enhancedMetricsService.recordSecurityEvent(
        'sse_connection_established',
        'info',
        'notification_module',
      );

      this.enhancedMetricsService.recordLgpdDataAccess(
        'sse_connection',
        'create',
        true,
        'user',
      );

      this.logger.debug(
        `Nova conexão SSE registrada: ${connectionId} para usuário ${userId}`,
        {
          activeConnections: this.metrics.activeConnections,
          userAgent,
        },
      );
    } catch (error) {
      this.logger.error(`Erro ao registrar conexão SSE: ${error.message}`, {
        userId,
        connectionId,
        userAgent,
      });
    }
  }

  /**
   * Registra o fechamento de uma conexão SSE
   */
  recordDisconnection(connectionId: string) {
    try {
      const connectionStat = this.connectionStats.get(connectionId);
      const startTime = this.connectionStartTimes.get(connectionId);

      if (connectionStat && startTime) {
        const now = new Date();
        const duration = now.getTime() - startTime.getTime();

        // Atualizar métricas básicas
        this.metrics.activeConnections = Math.max(
          0,
          this.metrics.activeConnections - 1,
        );

        // Atualizar conexões por usuário
        const userId = connectionStat.userId;
        if (this.metrics.connectionsPerUser[userId]) {
          this.metrics.connectionsPerUser[userId] = Math.max(
            0,
            this.metrics.connectionsPerUser[userId] - 1,
          );

          if (this.metrics.connectionsPerUser[userId] === 0) {
            delete this.metrics.connectionsPerUser[userId];
          }
        }

        // Atualizar duração média das conexões
        this.updateAverageConnectionDuration(duration);

        // Limpar dados da conexão
        this.connectionStats.delete(connectionId);
        this.connectionStartTimes.delete(connectionId);

        // Registrar no sistema de métricas global
        this.enhancedMetricsService.recordSecurityEvent(
          'sse_connection_closed',
          'info',
          'notification_module',
        );

        this.enhancedMetricsService.recordSecurityEvent(
          'sse_connection_duration',
          'info',
          'notification_module',
        );

        this.logger.debug(`Conexão SSE fechada: ${connectionId}`, {
          duration,
          activeConnections: this.metrics.activeConnections,
          userId,
        });
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar desconexão SSE: ${error.message}`, {
        connectionId,
      });
    }
  }

  /**
   * Registra o envio de uma mensagem SSE
   */
  recordMessageSent(connectionId: string, messageType: string) {
    try {
      this.metrics.messagesSent++;

      const connectionStat = this.connectionStats.get(connectionId);
      if (connectionStat) {
        connectionStat.messagesSent++;
        connectionStat.lastActivity = new Date();
      }

      // Registrar no sistema de métricas global
      this.enhancedMetricsService.recordSecurityEvent(
        'sse_message_sent',
        'info',
        'notification_module',
      );

      this.enhancedMetricsService.recordSecurityEvent(
        `sse_message_type_${messageType}`,
        'info',
        'notification_module',
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar envio de mensagem SSE: ${error.message}`,
        { connectionId, messageType },
      );
    }
  }

  /**
   * Registra a entrega bem-sucedida de uma mensagem SSE
   */
  recordMessageDelivered(connectionId: string) {
    try {
      this.metrics.messagesDelivered++;

      const connectionStat = this.connectionStats.get(connectionId);
      if (connectionStat) {
        connectionStat.messagesDelivered++;
      }

      // Atualizar taxa de entrega
      this.updateDeliveryRate();

      // Registrar no sistema de métricas global
      this.enhancedMetricsService.recordSecurityEvent(
        'sse_message_delivered',
        'info',
        'notification_module',
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar entrega de mensagem SSE: ${error.message}`,
        { connectionId },
      );
    }
  }

  /**
   * Registra a falha na entrega de uma mensagem SSE
   */
  recordMessageFailed(connectionId: string, error: string) {
    try {
      this.metrics.messagesFailed++;

      const connectionStat = this.connectionStats.get(connectionId);
      if (connectionStat) {
        connectionStat.messagesFailed++;
      }

      // Atualizar taxa de erro
      this.updateErrorRate();

      // Registrar no sistema de métricas global
      this.enhancedMetricsService.recordSecurityEvent(
        'sse_message_failed',
        'error',
        'notification_module',
      );

      this.enhancedMetricsService.recordSecurityEvent(
        'sse_delivery_failure',
        'error',
        'notification_module',
      );
    } catch (metricsError) {
      this.logger.error(
        `Erro ao registrar falha de mensagem SSE: ${metricsError.message}`,
        { connectionId, originalError: error },
      );
    }
  }

  /**
   * Retorna as métricas atuais de SSE
   */
  getMetrics(): SseMetrics {
    return { ...this.metrics };
  }

  /**
   * Retorna estatísticas detalhadas de uma conexão específica
   */
  getConnectionStats(connectionId: string): ConnectionStats | undefined {
    return this.connectionStats.get(connectionId);
  }

  /**
   * Retorna estatísticas de todas as conexões ativas
   */
  getAllConnectionStats(): ConnectionStats[] {
    return Array.from(this.connectionStats.values());
  }

  /**
   * Reseta as métricas (útil para testes)
   */
  resetMetrics() {
    this.metrics = {
      activeConnections: 0,
      totalConnections: 0,
      connectionsPerUser: {},
      messagesSent: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageConnectionDuration: 0,
      deliveryRate: 0,
      errorRate: 0,
      peakConnections: 0,
      connectionsByUserAgent: {},
    };

    this.connectionStats.clear();
    this.connectionStartTimes.clear();
  }

  /**
   * Atualiza a duração média das conexões
   */
  private updateAverageConnectionDuration(newDuration: number) {
    // Implementação simples de média móvel
    const alpha = 0.1; // Fator de suavização
    this.metrics.averageConnectionDuration =
      (1 - alpha) * this.metrics.averageConnectionDuration +
      alpha * newDuration;
  }

  /**
   * Atualiza a taxa de entrega
   */
  private updateDeliveryRate() {
    const totalMessages = this.metrics.messagesSent;
    if (totalMessages > 0) {
      this.metrics.deliveryRate =
        (this.metrics.messagesDelivered / totalMessages) * 100;
    }
  }

  /**
   * Atualiza a taxa de erro
   */
  private updateErrorRate() {
    const totalMessages = this.metrics.messagesSent;
    if (totalMessages > 0) {
      this.metrics.errorRate =
        (this.metrics.messagesFailed / totalMessages) * 100;
    }
  }

  /**
   * Inicia atualizações periódicas das métricas
   */
  private startPeriodicMetricsUpdate() {
    // Atualizar métricas a cada 30 segundos
    setInterval(() => {
      try {
        this.updatePeriodicMetrics();
      } catch (error) {
        this.logger.error(
          `Erro na atualização periódica de métricas: ${error.message}`,
        );
      }
    }, 30000);
  }

  /**
   * Registra evento de circuit breaker
   */
  recordCircuitBreakerEvent(
    eventType: string,
    level: 'info' | 'warning' | 'error' = 'info',
  ) {
    try {
      this.enhancedMetricsService.recordSecurityEvent(
        eventType,
        level,
        'notification_module',
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar evento de circuit breaker: ${error.message}`,
        { eventType, level },
      );
    }
  }

  /**
   * Atualiza métricas que precisam ser calculadas periodicamente
   */
  private updatePeriodicMetrics() {
    // Atualizar métricas no sistema global usando métodos disponíveis
    // Registrar como eventos de segurança para monitoramento
    this.enhancedMetricsService.recordSecurityEvent(
      'sse_metrics_update',
      'info',
      'notification_module',
    );

    // Atualizar métricas de sistema
    this.enhancedMetricsService.updateMemoryUsage();

    // Log de métricas para debug
    this.logger.debug('Métricas SSE atualizadas', {
      activeConnections: this.metrics.activeConnections,
      deliveryRate: this.metrics.deliveryRate,
      errorRate: this.metrics.errorRate,
      totalMessages: this.metrics.messagesSent,
    });
  }
}
