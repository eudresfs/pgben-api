import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CanalNotificacao,
  ResultadoEnvio,
} from '../interfaces/notification-channel.interface';
import { NotificacaoSistema, NotificationTemplate } from '../../../entities';
import { TemplateRendererService } from '../services/template-renderer.service';

/**
 * Implementação do canal de notificação por e-mail
 *
 * Responsável pelo envio de notificações através de e-mail utilizando
 * o serviço SMTP configurado no sistema
 */
@Injectable()
export class EmailChannelService implements CanalNotificacao {
  readonly canal_id = 'email';
  private readonly logger = new Logger(EmailChannelService.name);

  constructor(
    private configService: ConfigService,
    private templateRenderer: TemplateRendererService,
  ) {}

  /**
   * Envia uma notificação por e-mail
   *
   * @param notificacao Notificação a ser enviada
   * @returns Resultado do envio
   */
  async enviar(notificacao: NotificacaoSistema): Promise<ResultadoEnvio> {
    try {
      this.logger.log(
        `Iniciando envio de email para destinatário: ${notificacao.destinatario_id}`,
      );

      // Obter template relacionado à notificação
      const template = notificacao.template;

      if (!template.canais_suportados.includes('email' as any)) {
        throw new Error(`Template ${template.id} não suporta o canal de email`);
      }

      // Renderizar template com os dados de contexto
      const { assunto, conteudo } = this.templateRenderer.renderizarNotificacao(
        template,
        notificacao.dados_contexto,
      );

      // Simula a integração com um serviço de email (como Nodemailer)
      // Na implementação real, isso se conectaria ao serviço SMTP configurado
      await this.simularEnvioEmail(
        notificacao.destinatario_id,
        assunto,
        conteudo,
      );

      const dataEnvio = new Date();

      this.logger.log(
        `Email enviado com sucesso para ${notificacao.destinatario_id}`,
      );

      return {
        sucesso: true,
        mensagem: 'Email enviado com sucesso',
        data_envio: dataEnvio,
        dados_resposta: {
          canal: 'email',
          destinatario: notificacao.destinatario_id,
          assunto,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${notificacao.destinatario_id}: ${error.message}`,
        error.stack,
      );

      return {
        sucesso: false,
        mensagem: `Falha ao enviar email: ${error.message}`,
        data_envio: new Date(),
        erro: error,
      };
    }
  }

  /**
   * Verifica se o canal de email está disponível para envio
   *
   * @returns Status de disponibilidade
   */
  async verificarDisponibilidade(): Promise<boolean> {
    try {
      // Verificar configurações SMTP e conectividade
      const smtpHost = this.configService.get<string>('EMAIL_SMTP_HOST');
      const smtpPort = this.configService.get<number>('EMAIL_SMTP_PORT');

      if (!smtpHost || !smtpPort) {
        this.logger.warn('Configurações SMTP incompletas ou ausentes');
        return false;
      }

      // Na implementação real, poderia testar conectividade ao servidor SMTP
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar disponibilidade do canal de email: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Método para simular o envio de email (apenas para demonstração)
   * Na implementação real, seria substituído pela integração com um serviço como Nodemailer
   */
  private async simularEnvioEmail(
    destinatario: string,
    assunto: string,
    conteudo: string,
  ): Promise<void> {
    // Simula latência de rede e processamento
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.debug(`
      === SIMULAÇÃO DE EMAIL ===
      Para: ${destinatario}
      Assunto: ${assunto}
      Conteúdo: ${conteudo.substring(0, 100)}${conteudo.length > 100 ? '...' : ''}
      ==========================
    `);

    // Simulação de registro para fins de auditoria
    this.registrarEnvioAuditoria(destinatario, assunto);
  }

  /**
   * Registra o envio de email no sistema de auditoria
   * Integração com o módulo de auditoria existente no sistema
   */
  private registrarEnvioAuditoria(destinatario: string, assunto: string): void {
    this.logger.debug(
      `Registrando envio de email em logs de auditoria: ${destinatario} - ${assunto}`,
    );
    // Na implementação real, integraria com o serviço de auditoria do sistema
  }
}
