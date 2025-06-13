import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_CREATED } from '../events/notification.events';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class NotificationEmailListener {
  private readonly logger = new Logger(NotificationEmailListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent(NOTIFICATION_CREATED, { async: true })
  async handleNotificationCreated(event: NotificationCreatedEvent) {
    const n = event.notification;
    // Exemplo simples: enviar e-mail ao destinatário
    try {
      await this.emailService.sendEmail({
        to: n.destinatario_id, // ou buscar e-mail pelo id
        subject: `[Notificação] ${n.template?.assunto || 'Nova notificação'}`,
        template: 'notificacao-basica',
        context: {
          titulo: n.template?.assunto || 'Notificação',
          conteudo: n.template?.corpo || 'Nova notificação disponível',
          dados: n.dados_contexto,
        },
      });
      this.logger.log(`E-mail enviado para ${n.destinatario_id}`);
    } catch (err) {
      this.logger.error(`Erro ao enviar e-mail: ${err}`);
    }
  }
}
