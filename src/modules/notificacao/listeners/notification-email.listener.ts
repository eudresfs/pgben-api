import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_CREATED } from '../events/notification.events';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { EmailService } from '../../../common/services/email.service';
import { UsuarioService } from '../../usuario/services/usuario.service';

@Injectable()
export class NotificationEmailListener {
  private readonly logger = new Logger(NotificationEmailListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly usuarioService: UsuarioService,
  ) {}

  @OnEvent(NOTIFICATION_CREATED, { async: true })
  async handleNotificationCreated(event: NotificationCreatedEvent) {
    const n = event.notification;
    
    try {
      // Buscar o email do usuário pelo ID
      const usuario = await this.usuarioService.findById(n.destinatario_id);
      
      if (!usuario?.email) {
        this.logger.warn(`Usuário ${n.destinatario_id} não possui email cadastrado`);
        return;
      }

      // Verificar se há template configurado
      if (!n.template) {
        this.logger.debug(`Notificação ${n.id} não possui template configurado, usando template padrão`);
        
        // Usar template padrão para notificações sem template específico
         const mensagemPadrao = n.dados_contexto?.mensagem || n.dados_contexto?.titulo || 'Você tem uma nova notificação.';
         const templatePadrao = {
           codigo: 'default',
           assunto: 'Nova Notificação',
           corpo: mensagemPadrao,
           corpo_html: `<p>${mensagemPadrao}</p>`,
           canais_disponiveis: ['email']
         };
        
        await this.emailService.sendEmail({
          to: usuario.email,
          subject: templatePadrao.assunto,
          html: templatePadrao.corpo_html,
          text: templatePadrao.corpo,
          context: {
            ...n.dados_contexto,
            nome_tecnico: usuario.nome,
            email_tecnico: usuario.email,
          },
        });
        
        this.logger.log(`E-mail com template padrão enviado para ${usuario.email} (usuário: ${n.destinatario_id})`);
        return;
      }

      // Verificar se o template suporta email
      if (!n.template.canais_disponiveis?.includes('email')) {
        this.logger.debug(`Template ${n.template.codigo} não suporta canal de email`);
        return;
      }

      await this.emailService.sendEmail({
        to: usuario.email,
        subject: n.template.assunto || 'Nova notificação',
        html: n.template.corpo_html || n.template.corpo,
        text: n.template.corpo,
        context: {
          ...n.dados_contexto,
          nome_tecnico: usuario.nome,
          email_tecnico: usuario.email,
        },
      });
      
      this.logger.log(`E-mail enviado para ${usuario.email} (usuário: ${n.destinatario_id})`);
    } catch (err) {
      this.logger.error(`Erro ao enviar email: ${err.message}`, err.stack);
    }
  }
}
