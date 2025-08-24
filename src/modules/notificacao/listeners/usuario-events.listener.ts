import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  INotificationManagerService,
  NOTIFICATION_MANAGER_SERVICE,
} from '../interfaces/notification-manager.interface';
import { CanalNotificacao } from '../../../entities/notification-template.entity';

/**
 * Listener para eventos relacionados a usuários
 * Processa eventos emitidos pelo módulo de usuário e envia notificações apropriadas
 */
@Injectable()
export class UsuarioEventsListener {
  private readonly logger = new Logger(UsuarioEventsListener.name);

  constructor(
    @Inject(NOTIFICATION_MANAGER_SERVICE)
    private readonly notificationManager: INotificationManagerService,
  ) {}

  /**
   * Processa evento de criação de usuário para primeiro acesso
   * Envia email com credenciais de acesso
   */
  @OnEvent('user.created.first-access')
  async handleUserCreatedFirstAccess(payload: {
    userId: string;
    email: string;
    nome: string;
    senha: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `Processando evento de criação de usuário para primeiro acesso: ${payload.userId}`,
    );

    try {
      await this.notificationManager.criarNotificacao({
        destinatario_id: payload.userId,
        canal: CanalNotificacao.EMAIL,
        dados_contexto: {
          nome: payload.nome,
          email: payload.email,
          senha: payload.senha,
          data_criacao: new Date().toLocaleDateString('pt-BR'),
          url_sistema: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      });

      this.logger.log(
        `Notificação de primeiro acesso enviada para usuário: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de primeiro acesso para usuário ${payload.userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de criação de usuário para validação de email
   * Envia email de boas-vindas e confirmação de cadastro
   */
  @OnEvent('user.created.email-validation')
  async handleUserCreatedEmailValidation(payload: {
    userId: string;
    email: string;
    nome: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `Processando evento de criação de usuário para validação de email: ${payload.userId}`,
    );

    try {
      await this.notificationManager.criarNotificacao({
        destinatario_id: payload.userId,
        canal: CanalNotificacao.EMAIL,
        dados_contexto: {
          nome: payload.nome,
          email: payload.email,
          data_criacao: new Date().toLocaleDateString('pt-BR'),
          url_sistema: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      });

      this.logger.log(
        `Notificação de validação de email enviada para usuário: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de validação de email para usuário ${payload.userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de recuperação de senha
   * Envia email com nova senha temporária
   */
  @OnEvent('user.password.reset')
  async handleUserPasswordReset(payload: {
    userId: string;
    email: string;
    nome: string;
    senhaTemporaria: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `Processando evento de recuperação de senha para usuário: ${payload.userId}`,
    );

    try {
      await this.notificationManager.criarNotificacao({
        destinatario_id: payload.userId,
        canal: CanalNotificacao.EMAIL,
        dados_contexto: {
          nome: payload.nome,
          email: payload.email,
          senha_temporaria: payload.senhaTemporaria,
          data_solicitacao: new Date().toLocaleDateString('pt-BR'),
          hora_solicitacao: new Date().toLocaleTimeString('pt-BR'),
          url_sistema: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      });

      this.logger.log(
        `Notificação de recuperação de senha enviada para usuário: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de recuperação de senha para usuário ${payload.userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
