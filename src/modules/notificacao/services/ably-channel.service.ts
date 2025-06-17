import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as Ably from 'ably';
import { AblyConfig } from '../../../config/ably.config';
import { AblyService } from './ably.service';
import {
  IAblyChannelConfig,
  IAblyChannelStats,
  IAblyPresenceEvent,
  IAblyOperationResult,
  IAblyNotificationData,
  NotificationType,
  NotificationPriority
} from '../interfaces/ably.interface';

/**
 * Serviço de gerenciamento de canais do Ably
 * 
 * Este serviço é responsável por:
 * - Criar e configurar canais específicos
 * - Gerenciar subscrições e publicações
 * - Controlar presença de usuários
 * - Implementar padrões de canal (user-specific, broadcast, etc.)
 * - Coletar estatísticas de uso dos canais
 */
@Injectable()
export class AblyChannelService {
  private readonly logger = new Logger(AblyChannelService.name);
  private readonly channelConfigs = new Map<string, IAblyChannelConfig>();
  private readonly channelStats = new Map<string, IAblyChannelStats>();
  private readonly presenceEvents: IAblyPresenceEvent[] = [];
  private readonly MAX_PRESENCE_EVENTS = 1000;

  constructor(
    @Inject('ABLY_CONFIG') private readonly ablyConfig: AblyConfig,
    private readonly ablyService: AblyService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.initializeDefaultChannels();
  }

  /**
   * Inicializa canais padrão do sistema
   */
  private initializeDefaultChannels(): void {
    // Canal de notificações gerais
    this.channelConfigs.set(this.ablyConfig.channelNotifications, {
      name: this.ablyConfig.channelNotifications,
      private: false,
      presence: true,
      persist: true,
      messageTtl: 3600 // 1 hora
    });

    // Canal do sistema
    this.channelConfigs.set(this.ablyConfig.channelSystem, {
      name: this.ablyConfig.channelSystem,
      private: false,
      presence: false,
      persist: true,
      messageTtl: 86400 // 24 horas
    });

    // Canal de auditoria
    this.channelConfigs.set(this.ablyConfig.channelAudit, {
      name: this.ablyConfig.channelAudit,
      private: true,
      presence: false,
      persist: true,
      messageTtl: 604800 // 7 dias
    });

    this.logger.debug('Canais padrão inicializados');
  }

  /**
   * Cria um canal de usuário específico
   */
  async createUserChannel(
    userId: string,
    channelType: 'notifications' | 'private' | 'status' = 'notifications'
  ): Promise<IAblyOperationResult<Ably.RealtimeChannel>> {
    const startTime = Date.now();
    
    try {
      const channelName = `user-${userId}-${channelType}`;
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      
      const config: IAblyChannelConfig = {
        name: channelName,
        private: true,
        presence: channelType === 'status',
        persist: true,
        messageTtl: 3600
      };
      
      const channel = await this.ablyService.getChannel(channelName, config);
      
      // Armazena configuração
      this.channelConfigs.set(fullChannelName, config);
      
      // Inicializa estatísticas
      this.initializeChannelStats(fullChannelName);
      
      // Configura listeners
      this.setupChannelListeners(channel, fullChannelName);
      
      const executionTime = Date.now() - startTime;
      
      this.logger.debug(`Canal de usuário criado: ${fullChannelName}`);
      
      return {
        success: true,
        data: channel,
        timestamp: new Date(),
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Erro ao criar canal de usuário para ${userId}:`, error);
      
      return {
        success: false,
        error: error.message,
        errorCode: 'USER_CHANNEL_CREATION_FAILED',
        timestamp: new Date(),
        executionTime
      };
    }
  }

  /**
   * Cria um canal de broadcast para um grupo
   */
  async createBroadcastChannel(
    groupId: string,
    scope: 'unit' | 'role' | 'region' = 'unit'
  ): Promise<IAblyOperationResult<Ably.RealtimeChannel>> {
    const startTime = Date.now();
    
    try {
      const channelName = `broadcast-${scope}-${groupId}`;
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      
      const config: IAblyChannelConfig = {
        name: channelName,
        private: false,
        presence: true,
        persist: true,
        messageTtl: 7200 // 2 horas
      };
      
      const channel = await this.ablyService.getChannel(channelName, config);
      
      // Armazena configuração
      this.channelConfigs.set(fullChannelName, config);
      
      // Inicializa estatísticas
      this.initializeChannelStats(fullChannelName);
      
      // Configura listeners
      this.setupChannelListeners(channel, fullChannelName);
      
      const executionTime = Date.now() - startTime;
      
      this.logger.debug(`Canal de broadcast criado: ${fullChannelName}`);
      
      return {
        success: true,
        data: channel,
        timestamp: new Date(),
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Erro ao criar canal de broadcast para ${scope} ${groupId}:`, error);
      
      return {
        success: false,
        error: error.message,
        errorCode: 'BROADCAST_CHANNEL_CREATION_FAILED',
        timestamp: new Date(),
        executionTime
      };
    }
  }

  /**
   * Publica notificação em canal de usuário
   */
  async publishToUserChannel(
    userId: string,
    notification: IAblyNotificationData,
    channelType: 'notifications' | 'private' | 'status' = 'notifications'
  ): Promise<IAblyOperationResult> {
    try {
      const channelName = `user-${userId}-${channelType}`;
      
      // Garante que o canal existe
      await this.createUserChannel(userId, channelType);
      
      // Publica a notificação
      const result = await this.ablyService.publishNotification(channelName, notification);
      
      // Atualiza estatísticas
      this.updateChannelStats(this.ablyConfig.getChannelName(channelName), 'message_sent');
      
      return result;
    } catch (error) {
      this.logger.error(`Erro ao publicar no canal do usuário ${userId}:`, error);
      
      return {
        success: false,
        error: error.message,
        errorCode: 'USER_CHANNEL_PUBLISH_FAILED',
        timestamp: new Date()
      };
    }
  }

  /**
   * Publica notificação em canal de broadcast
   */
  async publishToBroadcastChannel(
    groupId: string,
    notification: IAblyNotificationData,
    scope: 'unit' | 'role' | 'region' = 'unit'
  ): Promise<IAblyOperationResult> {
    try {
      const channelName = `broadcast-${scope}-${groupId}`;
      
      // Garante que o canal existe
      await this.createBroadcastChannel(groupId, scope);
      
      // Publica a notificação
      const result = await this.ablyService.publishNotification(channelName, notification);
      
      // Atualiza estatísticas
      this.updateChannelStats(this.ablyConfig.getChannelName(channelName), 'message_sent');
      
      return result;
    } catch (error) {
      this.logger.error(`Erro ao publicar no canal de broadcast ${scope} ${groupId}:`, error);
      
      return {
        success: false,
        error: error.message,
        errorCode: 'BROADCAST_CHANNEL_PUBLISH_FAILED',
        timestamp: new Date()
      };
    }
  }

  /**
   * Publica notificação de benefício aprovado
   */
  async publishBeneficioAprovado(
    userId: string,
    beneficioId: string,
    tipoBeneficio: string,
    valor?: number
  ): Promise<IAblyOperationResult> {
    const notification: IAblyNotificationData = {
      id: `beneficio-aprovado-${beneficioId}`,
      type: NotificationType.BENEFICIO_APROVADO,
      title: 'Benefício Aprovado',
      message: `Seu benefício ${tipoBeneficio} foi aprovado!`,
      data: {
        beneficioId,
        tipoBeneficio,
        valor,
        actionUrl: `/beneficios/${beneficioId}`
      },
      timestamp: new Date(),
      userId,
      priority: NotificationPriority.HIGH,
      requiresAction: true,
      actionUrl: `/beneficios/${beneficioId}`
    };

    return this.publishToUserChannel(userId, notification);
  }

  /**
   * Publica notificação de benefício rejeitado
   */
  async publishBeneficioRejeitado(
    userId: string,
    beneficioId: string,
    tipoBeneficio: string,
    motivo: string
  ): Promise<IAblyOperationResult> {
    const notification: IAblyNotificationData = {
      id: `beneficio-rejeitado-${beneficioId}`,
      type: NotificationType.BENEFICIO_REJEITADO,
      title: 'Benefício Rejeitado',
      message: `Seu benefício ${tipoBeneficio} foi rejeitado.`,
      data: {
        beneficioId,
        tipoBeneficio,
        motivo,
        actionUrl: `/beneficios/${beneficioId}`
      },
      timestamp: new Date(),
      userId,
      priority: NotificationPriority.HIGH,
      requiresAction: true,
      actionUrl: `/beneficios/${beneficioId}`
    };

    return this.publishToUserChannel(userId, notification);
  }

  /**
   * Publica notificação de documento solicitado
   */
  async publishDocumentoSolicitado(
    userId: string,
    beneficioId: string,
    documentos: string[],
    prazo: Date
  ): Promise<IAblyOperationResult> {
    const notification: IAblyNotificationData = {
      id: `documento-solicitado-${beneficioId}`,
      type: NotificationType.DOCUMENTO_SOLICITADO,
      title: 'Documentos Solicitados',
      message: `Novos documentos foram solicitados para seu benefício.`,
      data: {
        beneficioId,
        documentos,
        prazo: prazo.toISOString(),
        actionUrl: `/beneficios/${beneficioId}/documentos`
      },
      timestamp: new Date(),
      userId,
      priority: NotificationPriority.HIGH,
      requiresAction: true,
      actionUrl: `/beneficios/${beneficioId}/documentos`
    };

    return this.publishToUserChannel(userId, notification);
  }

  /**
   * Configura listeners para um canal
   */
  private setupChannelListeners(channel: Ably.RealtimeChannel, channelName: string): void {
    // Listener para mensagens
    channel.subscribe('notification', (message) => {
      this.updateChannelStats(channelName, 'message_received');
      this.logger.debug(`Mensagem recebida no canal ${channelName}:`, message.data?.id);
    });

    // Listener para presença (se habilitado)
    const config = this.channelConfigs.get(channelName);
    if (config?.presence) {
      channel.presence.subscribe('enter', (presenceMessage) => {
        this.handlePresenceEvent('enter', presenceMessage, channelName);
      });

      channel.presence.subscribe('leave', (presenceMessage) => {
        this.handlePresenceEvent('leave', presenceMessage, channelName);
      });

      channel.presence.subscribe('update', (presenceMessage) => {
        this.handlePresenceEvent('update', presenceMessage, channelName);
      });
    }

    // Listener para eventos de canal
    channel.on('attached', () => {
      this.logger.debug(`Canal ${channelName} conectado`);
      this.updateChannelStats(channelName, 'connection');
    });

    channel.on('detached', () => {
      this.logger.debug(`Canal ${channelName} desconectado`);
      this.updateChannelStats(channelName, 'disconnection');
    });
  }

  /**
   * Manipula eventos de presença
   */
  private handlePresenceEvent(
    action: 'enter' | 'leave' | 'update',
    presenceMessage: any,
    channelName: string
  ): void {
    const event: IAblyPresenceEvent = {
      action,
      clientId: presenceMessage.clientId,
      data: presenceMessage.data,
      timestamp: new Date(),
      channelName
    };

    // Armazena evento (limitado)
    this.presenceEvents.push(event);
    if (this.presenceEvents.length > this.MAX_PRESENCE_EVENTS) {
      this.presenceEvents.shift();
    }

    // Atualiza estatísticas
    this.updateChannelStats(channelName, `presence_${action}`);

    this.logger.debug(`Evento de presença ${action} no canal ${channelName}:`, presenceMessage.clientId);
  }

  /**
   * Inicializa estatísticas de um canal
   */
  private initializeChannelStats(channelName: string): void {
    if (!this.channelStats.has(channelName)) {
      this.channelStats.set(channelName, {
        channelName,
        activeConnections: 0,
        messagesSent: 0,
        messagesReceived: 0,
        lastActivity: new Date(),
        averageMessageSize: 0
      });
    }
  }

  /**
   * Atualiza estatísticas de um canal
   */
  private updateChannelStats(channelName: string, eventType: string): void {
    const stats = this.channelStats.get(channelName);
    if (!stats) return;

    stats.lastActivity = new Date();

    switch (eventType) {
      case 'message_sent':
        stats.messagesSent++;
        break;
      case 'message_received':
        stats.messagesReceived++;
        break;
      case 'connection':
        stats.activeConnections++;
        break;
      case 'disconnection':
        stats.activeConnections = Math.max(0, stats.activeConnections - 1);
        break;
    }

    this.channelStats.set(channelName, stats);
  }

  /**
   * Obtém estatísticas de um canal
   */
  getChannelStats(channelName: string): IAblyChannelStats | null {
    const fullChannelName = this.ablyConfig.getChannelName(channelName);
    return this.channelStats.get(fullChannelName) || null;
  }

  /**
   * Obtém estatísticas de todos os canais
   */
  getAllChannelStats(): IAblyChannelStats[] {
    return Array.from(this.channelStats.values());
  }

  /**
   * Obtém eventos de presença recentes
   */
  getRecentPresenceEvents(channelName?: string, limit: number = 50): IAblyPresenceEvent[] {
    let events = this.presenceEvents;
    
    if (channelName) {
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      events = events.filter(event => event.channelName === fullChannelName);
    }
    
    return events.slice(-limit).reverse();
  }

  /**
   * Remove um canal e suas estatísticas
   */
  async removeChannel(channelName: string): Promise<IAblyOperationResult> {
    try {
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      
      // Remove do serviço Ably
      await this.ablyService.removeChannel(channelName);
      
      // Remove configuração e estatísticas
      this.channelConfigs.delete(fullChannelName);
      this.channelStats.delete(fullChannelName);
      
      this.logger.debug(`Canal ${fullChannelName} removido`);
      
      return {
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Erro ao remover canal ${channelName}:`, error);
      
      return {
        success: false,
        error: error.message,
        errorCode: 'CHANNEL_REMOVAL_FAILED',
        timestamp: new Date()
      };
    }
  }

  /**
   * Lista todos os canais configurados
   */
  listChannels(): string[] {
    return Array.from(this.channelConfigs.keys());
  }

  /**
   * Obtém configuração de um canal
   */
  getChannelConfig(channelName: string): IAblyChannelConfig | null {
    const fullChannelName = this.ablyConfig.getChannelName(channelName);
    return this.channelConfigs.get(fullChannelName) || null;
  }
}