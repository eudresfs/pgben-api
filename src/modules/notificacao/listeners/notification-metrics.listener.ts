import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EnhancedMetricsService } from '../../../shared/monitoring/enhanced-metrics.service';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { NOTIFICATION_CREATED, NOTIFICATION_READ, NOTIFICATION_ARCHIVED } from '../events/notification.events';

/**
 * Listener para capturar métricas de eventos de notificação
 * 
 * Responsabilidades:
 * - Monitorar eventos de criação, leitura e arquivamento de notificações
 * - Registrar métricas de performance dos listeners
 * - Capturar estatísticas de entrega de notificações
 * - Monitorar taxa de sucesso/falha dos eventos
 */
@Injectable()
export class NotificationMetricsListener {
  private readonly logger = new Logger(NotificationMetricsListener.name);

  constructor(private readonly metricsService: EnhancedMetricsService) {}

  /**
   * Captura métricas quando uma notificação é criada
   */
  @OnEvent(NOTIFICATION_CREATED)
  async handleNotificationCreated(event: NotificationCreatedEvent) {
    const startTime = Date.now();
    
    try {
      const notification = event.notification;
      
      // Registrar evento de criação de notificação
      this.metricsService.recordSecurityEvent(
        'notification_created',
        'info',
        'notification_module'
      );

      // Registrar métricas por tipo de notificação
      this.recordNotificationTypeMetrics(notification.template?.tipo || 'sistema', 'created');

      // Registrar acesso a dados para compliance LGPD
      if (notification.destinatario_id) {
        this.metricsService.recordLgpdDataAccess(
          'notification',
          'create',
          true,
          'user'
        );
      }

      // Registrar métricas de performance do listener
      const duration = Date.now() - startTime;
      this.metricsService.recordSecurityEvent(
        'notification_metrics_listener_performance',
        'info',
        'notification_module'
      );

      this.logger.debug(
        `Métricas registradas para notificação criada: ${notification.id}`,
        {
          tipo: notification.template?.tipo || 'sistema',
          destinatario: notification.destinatario_id,
          duration
        }
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Registrar erro nas métricas
      this.metricsService.recordSecurityEvent(
        'notification_metrics_listener_error',
        'error',
        'notification_module'
      );

      this.logger.error(
        `Erro ao registrar métricas para notificação criada: ${error.message}`,
        {
          error: error.stack,
          event: event.notification,
          duration
        }
      );
    }
  }

  /**
   * Captura métricas quando uma notificação é lida
   */
  @OnEvent(NOTIFICATION_READ)
  async handleNotificationRead(payload: { notificationId: string; userId: string }) {
    const startTime = Date.now();
    
    try {
      // Registrar evento de leitura de notificação
      this.metricsService.recordSecurityEvent(
        'notification_read',
        'info',
        'notification_module'
      );

      // Registrar acesso a dados para compliance LGPD
      this.metricsService.recordLgpdDataAccess(
        'notification',
        'read',
        true,
        'user'
      );

      // Calcular tempo de resposta (tempo entre criação e leitura)
      // Nota: Para implementação completa, seria necessário buscar a notificação
      // e calcular a diferença entre created_at e agora
      this.recordNotificationEngagementMetrics('read');

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Métricas registradas para notificação lida: ${payload.notificationId}`,
        {
          userId: payload.userId,
          duration
        }
      );

    } catch (error) {
      this.metricsService.recordSecurityEvent(
        'notification_metrics_listener_error',
        'error',
        'notification_module'
      );

      this.logger.error(
        `Erro ao registrar métricas para notificação lida: ${error.message}`,
        {
          error: error.stack,
          payload,
          duration: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Captura métricas quando uma notificação é arquivada
   */
  @OnEvent(NOTIFICATION_ARCHIVED)
  async handleNotificationArchived(payload: { notificationId: string; userId: string }) {
    const startTime = Date.now();
    
    try {
      // Registrar evento de arquivamento de notificação
      this.metricsService.recordSecurityEvent(
        'notification_archived',
        'info',
        'notification_module'
      );

      // Registrar acesso a dados para compliance LGPD
      this.metricsService.recordLgpdDataAccess(
        'notification',
        'update',
        true,
        'user'
      );

      // Registrar métricas de engajamento
      this.recordNotificationEngagementMetrics('archived');

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Métricas registradas para notificação arquivada: ${payload.notificationId}`,
        {
          userId: payload.userId,
          duration
        }
      );

    } catch (error) {
      this.metricsService.recordSecurityEvent(
        'notification_metrics_listener_error',
        'error',
        'notification_module'
      );

      this.logger.error(
        `Erro ao registrar métricas para notificação arquivada: ${error.message}`,
        {
          error: error.stack,
          payload,
          duration: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Registra métricas específicas por tipo de notificação
   */
  private recordNotificationTypeMetrics(tipo: string, action: string) {
    try {
      // Usar o sistema de eventos do EnhancedMetricsService
      this.metricsService.recordSecurityEvent(
        `notification_${tipo.toLowerCase()}_${action}`,
        'info',
        'notification_module'
      );

      // Registrar métricas de distribuição por tipo
      this.metricsService.recordSecurityEvent(
        'notification_type_distribution',
        'info',
        'notification_module'
      );

    } catch (error) {
      this.logger.warn(
        `Erro ao registrar métricas por tipo de notificação: ${error.message}`,
        { tipo, action }
      );
    }
  }

  /**
   * Registra métricas de engajamento do usuário
   */
  private recordNotificationEngagementMetrics(action: 'read' | 'archived') {
    try {
      // Registrar taxa de engajamento
      this.metricsService.recordSecurityEvent(
        `notification_engagement_${action}`,
        'info',
        'notification_module'
      );

      // Registrar métricas de comportamento do usuário
      this.metricsService.recordSecurityEvent(
        'user_notification_interaction',
        'info',
        'notification_module'
      );

    } catch (error) {
      this.logger.warn(
        `Erro ao registrar métricas de engajamento: ${error.message}`,
        { action }
      );
    }
  }

  /**
   * Método para registrar métricas customizadas de notificação
   * Pode ser usado por outros serviços do módulo
   */
  recordCustomNotificationMetric(metricName: string, value: string | number, labels?: Record<string, string>) {
    try {
      // Para valores numéricos, podemos usar como duração
      if (typeof value === 'number') {
        this.metricsService.recordSecurityEvent(
          metricName,
          'info',
          'notification_module'
        );
      } else {
        this.metricsService.recordSecurityEvent(
          metricName,
          'info',
          'notification_module'
        );
      }

      this.logger.debug(
        `Métrica customizada registrada: ${metricName}`,
        { value, labels }
      );

    } catch (error) {
      this.logger.warn(
        `Erro ao registrar métrica customizada: ${error.message}`,
        { metricName, value, labels }
      );
    }
  }
}