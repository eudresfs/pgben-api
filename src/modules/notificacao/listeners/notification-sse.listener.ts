import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { NOTIFICATION_CREATED } from '../events/notification.events';
import { SseService } from '../services/sse.service';
import { SseNotification } from '../interfaces/sse-notification.interface';
import { TipoNotificacao } from '../../../entities/notification.entity';

/**
 * Listener responsável por converter eventos de criação de notificação
 * em mensagens SSE para o usuário conectado.
 */
@Injectable()
export class NotificationSseListener {
  private readonly logger = new Logger(NotificationSseListener.name);

  constructor(private readonly sseService: SseService) {}

  @OnEvent(NOTIFICATION_CREATED, { async: true })
  handleNotificationCreated(event: NotificationCreatedEvent) {
    const n = event.notification;

    const ssePayload: SseNotification = {
      id: n.id,
      userId: n.destinatario_id,
      type: 'sistema' as TipoNotificacao,
      title: n.template?.assunto || 'Notificação',
      message: n.template?.corpo || 'Nova notificação disponível',
      data: n.dados_contexto,
      timestamp: n.created_at,
      priority: 'medium',
    };

    this.logger.debug(
      `Enviando SSE da notificação ${n.id} para usuário ${n.destinatario_id}`,
    );

    this.sseService.sendToUser(n.destinatario_id, ssePayload);
  }
}
