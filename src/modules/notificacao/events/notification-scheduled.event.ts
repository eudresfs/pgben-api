import { NotificacaoSistema } from '../../../entities/notification.entity';

/**
 * Evento emitido quando uma notificação precisa ser agendada
 * 
 * Este evento permite desacoplar o NotificationManagerService do ScheduleAdapterService,
 * resolvendo a dependência circular através de uma arquitetura event-driven
 */
export class NotificationScheduledEvent {
  constructor(
    public readonly notificacao: NotificacaoSistema,
    public readonly dataAgendamento: Date,
    public readonly tentativa: number = 1,
  ) {}

  /**
   * Identificador único do evento
   */
  get eventId(): string {
    return `notification-scheduled-${this.notificacao.id}-${this.tentativa}`;
  }

  /**
   * Dados do evento para logging e auditoria
   */
  get eventData() {
    return {
      notificacaoId: this.notificacao.id,
      destinatarioId: this.notificacao.destinatario_id,
      dataAgendamento: this.dataAgendamento,
      tentativa: this.tentativa,
      templateId: this.notificacao.template_id,
    };
  }

  /**
   * Verifica se o agendamento ainda é válido (não expirou)
   */
  get isValid(): boolean {
    return this.dataAgendamento > new Date();
  }

  /**
   * Calcula o delay em milissegundos até a data de agendamento
   */
  get delayMs(): number {
    const now = new Date().getTime();
    const scheduled = this.dataAgendamento.getTime();
    return Math.max(0, scheduled - now);
  }
}