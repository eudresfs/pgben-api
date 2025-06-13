import { NotificacaoSistema } from '../../../entities/notification.entity';

export class NotificationCreatedEvent {
  constructor(public readonly notification: NotificacaoSistema) {}
}
