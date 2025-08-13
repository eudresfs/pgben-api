import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ScheduleAdapterService } from '../../../shared/schedule/schedule-adapter.service';
import { NotificationScheduledEvent } from '../events/notification-scheduled.event';
import {
  INotificationManagerService,
  NOTIFICATION_MANAGER_SERVICE,
} from '../interfaces/notification-manager.interface';

/**
 * Listener responsável por processar eventos de agendamento de notificações
 *
 * Este listener resolve a dependência circular entre NotificationManagerService
 * e ScheduleAdapterService através de uma arquitetura event-driven
 */
@Injectable()
export class NotificationSchedulerListener {
  private readonly logger = new Logger(NotificationSchedulerListener.name);

  constructor(
    @Inject(forwardRef(() => ScheduleAdapterService))
    private readonly scheduleAdapter: ScheduleAdapterService,
    @Inject(NOTIFICATION_MANAGER_SERVICE)
    private readonly notificationManager: INotificationManagerService,
  ) {}

  /**
   * Processa evento de agendamento de notificação
   *
   * @param event Evento contendo dados da notificação a ser agendada
   */
  @OnEvent('notification.scheduled')
  async handleNotificationScheduled(event: NotificationScheduledEvent) {
    this.logger.log(
      `Processando agendamento de notificação: ${event.notificacao.id} para ${event.dataAgendamento.toISOString()}`,
    );

    try {
      // Verificar se o agendamento ainda é válido
      if (!event.isValid) {
        this.logger.warn(
          `Agendamento inválido para notificação ${event.notificacao.id}: data no passado`,
        );
        // Processar imediatamente se a data já passou
        await this.processarNotificacaoImediata(event.notificacao.id);
        return;
      }

      // Criar job agendado usando o ScheduleAdapterService
      const jobId = `notification-${event.notificacao.id}-${event.tentativa}`;

      this.scheduleAdapter.scheduleOnce(jobId, event.dataAgendamento, () =>
        this.processarNotificacaoAgendada(event.notificacao.id),
      );

      this.logger.log(
        `Notificação ${event.notificacao.id} agendada com sucesso para ${event.dataAgendamento.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao agendar notificação ${event.notificacao.id}: ${error.message}`,
        error.stack,
      );

      // Fallback: processar imediatamente em caso de erro no agendamento
      await this.processarNotificacaoImediata(event.notificacao.id);
    }
  }

  /**
   * Processa uma notificação agendada quando o job é executado
   *
   * @param notificacaoId ID da notificação a ser processada
   */
  private async processarNotificacaoAgendada(notificacaoId: string) {
    this.logger.log(
      `Executando processamento agendado da notificação: ${notificacaoId}`,
    );

    try {
      // Delegar o processamento para o NotificationManagerService
      await this.notificationManager.processarNotificacao(notificacaoId);

      this.logger.log(
        `Notificação agendada ${notificacaoId} processada com sucesso`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificação agendada ${notificacaoId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw para ativar o sistema de retry
    }
  }

  /**
   * Processa uma notificação imediatamente (fallback)
   *
   * @param notificacaoId ID da notificação a ser processada
   */
  private async processarNotificacaoImediata(notificacaoId: string) {
    this.logger.log(`Processando notificação imediatamente: ${notificacaoId}`);

    try {
      await this.notificationManager.processarNotificacao(notificacaoId);
      this.logger.log(`Notificação ${notificacaoId} processada imediatamente`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificação imediatamente ${notificacaoId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cancela um agendamento de notificação
   *
   * @param notificacaoId ID da notificação
   * @param tentativa Número da tentativa (opcional)
   */
  async cancelarAgendamento(notificacaoId: string, tentativa: number = 1) {
    const jobId = `notification-${notificacaoId}-${tentativa}`;

    try {
      this.scheduleAdapter.cancelTimeout(jobId);
      this.logger.log(
        `Agendamento cancelado para notificação: ${notificacaoId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Erro ao cancelar agendamento da notificação ${notificacaoId}: ${error.message}`,
      );
    }
  }
}
