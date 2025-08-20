import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as Ably from 'ably';
import { AblyConfig } from '../../../config/ably.config';
import {
  IAblyNotificationData,
  IAblyChannelConfig,
  IAblyChannelStats,
  IAblyConnectionEvent,
  IAblyMetrics,
  IAblyOperationResult,
  NotificationType,
  NotificationPriority,
} from '../interfaces/ably.interface';

/**
 * Serviço principal do Ably para gerenciamento de notificações em tempo real
 *
 * Este serviço é responsável por:
 * - Inicializar e gerenciar a conexão com o Ably
 * - Publicar mensagens em canais
 * - Gerenciar canais e suas configurações
 * - Coletar métricas e estatísticas
 * - Implementar fallback para SSE em caso de falha
 */
@Injectable()
export class AblyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AblyService.name);

  /**
   * Formata erros para string legível no log.
   */
  private formatError(err: any): string {
    if (!err) return 'undefined';
    if (err instanceof Error) return `${err.message} | ${err.stack ?? ''}`;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  private ablyClient: Ably.Realtime | null = null;
  private ablyRest: Ably.Rest | null = null;
  private channels: Map<string, Ably.RealtimeChannel> = new Map();
  private connectionStatus:
    | 'connected'
    | 'disconnected'
    | 'suspended'
    | 'failed' = 'disconnected';
  private metrics: IAblyMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    messagesPublished: 0,
    messagesReceived: 0,
    activeChannels: 0,
    connectionState: 'connected',
    lastError: null,
    uptime: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    errorRate: 0,
    bandwidthUsage: 0,
    timestamp: new Date(),
  };
  private metricsInterval: NodeJS.Timeout | null = null;
  private lastError: string | null = null;
  private startTime: number = Date.now();

  constructor(
    @Inject('ABLY_CONFIG') private readonly ablyConfig: AblyConfig,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Inicialização do módulo de forma assíncrona
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Inicializando AblyService...');

    // Inicialização assíncrona sem bloqueio
    setImmediate(async () => {
      try {
        // Validar configuração
        this.ablyConfig.validateConfig();

        // Se não há API key, desabilitar o serviço
        const apiKey = this.configService.get<string>('ABLY_API_KEY');
        if (!apiKey || apiKey === 'disabled') {
          this.logger.warn(
            '⚠️ Ably API Key não configurada. Serviço desabilitado.',
          );
          return;
        }

        // Inicializar clientes
        await this.initializeClients();

        // Configurar listeners de conexão
        this.setupConnectionListeners();

        // Iniciar coleta de métricas
        this.startMetricsCollection();

        this.logger.log('AblyService inicializado com sucesso');
      } catch (error) {
        this.logger.error(
          `❌ Erro ao inicializar AblyService: ${error.message}`,
          error.stack,
        );
        // Não propagar o erro para não quebrar a aplicação
      }
    });
  }

  /**
   * Finaliza o serviço Ably
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Iniciando finalização do serviço Ably...');

      // Para coleta de métricas
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
        this.logger.debug('Metrics interval finalizado');
      }

      // Fecha canais com timeout
      const channelClosePromises = Array.from(this.channels.entries()).map(
        async ([channelName, channel]) => {
          try {
            // Timeout de 3 segundos para cada canal
            await Promise.race([
              channel.detach(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 3000),
              ),
            ]);
            this.logger.debug(`Canal ${channelName} desconectado`);
          } catch (error) {
            this.logger.warn(
              `Erro ao desconectar canal ${channelName}:`,
              error.message,
            );
          }
        },
      );

      // Aguarda todos os canais serem fechados ou timeout
      await Promise.allSettled(channelClosePromises);
      this.channels.clear();

      // Fecha conexões com timeout
      if (this.ablyClient) {
        try {
          await Promise.race([
            new Promise<void>((resolve) => {
              this.ablyClient?.close();
              resolve();
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Timeout ao fechar cliente Ably')),
                5000,
              ),
            ),
          ]);
          this.logger.debug('Cliente Ably fechado');
        } catch (error) {
          this.logger.warn(
            'Timeout ao fechar cliente Ably, forçando finalização:',
            error.message,
          );
        }
        this.ablyClient = null;
      }

      this.ablyRest = null;
      this.connectionStatus = 'disconnected';

      this.logger.log('✅ Serviço Ably finalizado com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao finalizar serviço Ably:', error);
      // Não re-throw para não travar o shutdown
    }
  }

  /**
   * Inicializa os clientes Ably (Realtime e REST)
   */
  private async initializeClients(): Promise<void> {
    const clientOptions = this.ablyConfig.getClientOptions();

    try {
      // Cliente Realtime para conexões em tempo real
      this.ablyClient = new Ably.Realtime(clientOptions);

      // Cliente REST para operações síncronas
      this.ablyRest = new Ably.Rest(clientOptions);

      this.logger.debug('Clientes Ably inicializados');
    } catch (error) {
      this.logger.error('Erro ao inicializar clientes Ably:', error);
      throw error;
    }
  }

  /**
   * Configura listeners para eventos de conexão
   */
  private setupConnectionListeners(): void {
    if (!this.ablyClient) return;

    this.ablyClient.connection.on('connected', () => {
      this.connectionStatus = 'connected';
      this.metrics.activeConnections++;
      this.logger.log('Conectado ao Ably');
      this.emitConnectionEvent('connected');
    });

    this.ablyClient.connection.on('disconnected', () => {
      this.connectionStatus = 'disconnected';
      this.metrics.activeConnections = Math.max(
        0,
        this.metrics.activeConnections - 1,
      );
      this.logger.warn('Desconectado do Ably');
      this.emitConnectionEvent('disconnected');
    });

    this.ablyClient.connection.on('suspended', () => {
      this.connectionStatus = 'suspended';
      this.logger.warn('Conexão com Ably suspensa');
      this.emitConnectionEvent('suspended');
    });

    this.ablyClient.connection.on('failed', (stateChange) => {
      this.connectionStatus = 'failed';
      const reason = stateChange?.reason;
      this.lastError =
        reason?.message ||
        (typeof reason === 'string' ? reason : reason?.toString()) ||
        'Falha na conexão';
      this.logger.error(
        'Falha na conexão com Ably:',
        this.formatError(stateChange),
      );
      this.emitConnectionEvent('failed');
    });
  }

  /**
   * Emite evento de conexão
   */
  private emitConnectionEvent(
    type: 'connected' | 'disconnected' | 'suspended' | 'failed',
  ): void {
    const clientOptions = this.ablyConfig.getClientOptions();
    const event: IAblyConnectionEvent = {
      type,
      connectionId: this.ablyClient?.connection.id || 'unknown',
      clientId: clientOptions.clientId,
      timestamp: new Date(),
    };

    // Emite o evento para outros serviços
    this.eventEmitter.emit(`ably.connection.${type}`, event);
    this.logger.debug('Evento de conexão emitido:', event);
  }

  /**
   * Inicia a coleta de métricas
   */
  private startMetricsCollection(): void {
    const interval = this.configService.get<number>(
      'ABLY_METRICS_INTERVAL',
      60000,
    );

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);
  }

  /**
   * Coleta métricas do Ably
   */
  private collectMetrics(): void {
    try {
      this.metrics = {
        ...this.metrics,
        totalConnections: this.metrics.totalConnections,
        activeConnections: this.connectionStatus === 'connected' ? 1 : 0,
        timestamp: new Date(),
      };

      this.logger.debug('Métricas coletadas:', this.metrics);
    } catch (error) {
      this.logger.error('Erro ao coletar métricas:', error);
    }
  }

  /**
   * Obtém ou cria um canal
   */
  getChannel(
    channelName: string,
    config?: IAblyChannelConfig,
  ): Ably.RealtimeChannel {
    if (!this.ablyClient) {
      throw new Error('Cliente Ably não inicializado');
    }

    const fullChannelName = this.ablyConfig.getChannelName(channelName);

    if (this.channels.has(fullChannelName)) {
      return this.channels.get(fullChannelName)!;
    }

    try {
      const channel = this.ablyClient.channels.get(fullChannelName);

      // Configura o canal se necessário
      if (config) {
        this.configureChannel(channel, config).catch((err) =>
          this.logger.error(
            `Erro ao configurar canal ${fullChannelName}:`,
            err,
          ),
        );
      }

      this.channels.set(fullChannelName, channel);
      this.logger.debug(`Canal ${fullChannelName} criado`);

      return channel;
    } catch (error) {
      this.logger.error(`Erro ao criar canal ${fullChannelName}:`, error);
      throw error;
    }
  }

  /**
   * Configura um canal com as opções especificadas
   */
  private async configureChannel(
    channel: Ably.RealtimeChannel,
    config: IAblyChannelConfig,
  ): Promise<void> {
    try {
      // Aqui você pode adicionar configurações específicas do canal
      // Por exemplo, configurar presença, persistência, etc.

      if (config.presence) {
        // Configurar presença se necessário
      }

      this.logger.debug(`Canal ${config.name} configurado`);
    } catch (error) {
      this.logger.error(`Erro ao configurar canal ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Publica uma notificação em um canal
   */
  async publishNotification(
    channelName: string,
    notification: IAblyNotificationData,
    userId?: string,
  ): Promise<IAblyOperationResult> {
    const startTime = Date.now();

    // Validação do nome do canal
    if (!channelName || channelName.trim() === '') {
      return {
        success: false,
        error: 'Nome do canal é obrigatório',
        errorCode: 'INVALID_CHANNEL_NAME',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }

    // Verifica se o canal está permitido
    if (!this.ablyConfig.isChannelAllowed(channelName)) {
      return {
        success: false,
        error: `Canal ${channelName} não permitido pela configuração (ABLY_ALLOWED_CHANNELS)`,
        errorCode: 'CHANNEL_NOT_ALLOWED',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }

    // Validação dos dados da notificação
    if (
      !notification.id ||
      !notification.title ||
      !notification.message ||
      !notification.senderId
    ) {
      return {
        success: false,
        error: 'Dados da notificação são obrigatórios',
        errorCode: 'INVALID_NOTIFICATION_DATA',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }

    try {
      const fullChannelName = userId
        ? this.ablyConfig.getChannelName(channelName, userId)
        : this.ablyConfig.getChannelName(channelName);

      const channel = this.getChannel(fullChannelName);

      // Valida tamanho antes de enviar
      const payloadSize = Buffer.byteLength(
        JSON.stringify(notification),
        'utf8',
      );
      if (payloadSize > this.ablyConfig.maxMessageSize) {
        throw new Error(
          `Tamanho da mensagem (${payloadSize} bytes) excede o limite configurado ${this.ablyConfig.maxMessageSize}`,
        );
      }

      await channel.publish('notification', notification);

      this.metrics.totalMessages++;
      this.metrics.messagesPublished++;

      const executionTime = Date.now() - startTime;

      this.logger.debug(
        `Notificação publicada no canal ${fullChannelName}:`,
        notification.id,
      );

      return {
        success: true,
        data: notification,
        timestamp: new Date(),
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Erro ao publicar notificação:', error);

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date(),
        executionTime,
      };
    }
  }

  /**
   * Publica uma mensagem do sistema
   */
  async publishSystemMessage(
    message: string,
    data?: Record<string, any>,
  ): Promise<IAblyOperationResult> {
    const notification: IAblyNotificationData = {
      id: `system-${Date.now()}`,
      type: NotificationType.SYSTEM,
      title: 'Mensagem do Sistema',
      message,
      data,
      timestamp: new Date(),
      priority: NotificationPriority.HIGH,
      metadata: {},
    };

    return this.publishNotification(
      this.ablyConfig.channelSystem,
      notification,
    );
  }

  /**
   * Obtém estatísticas de um canal
   */
  async getChannelStats(channelName: string): Promise<IAblyChannelStats> {
    try {
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      const channel = this.channels.get(fullChannelName);

      if (!channel) {
        throw new Error(`Canal ${fullChannelName} não encontrado`);
      }

      // Aqui você implementaria a coleta de estatísticas reais
      // Por enquanto, retornamos dados mock
      return {
        channelName: fullChannelName,
        activeConnections: 0,
        messagesSent: this.metrics.totalMessages,
        messagesReceived: 0,
        lastActivity: new Date(),
        averageMessageSize: 1024,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas do canal ${channelName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtém métricas gerais do serviço
   */
  getMetrics(): IAblyMetrics {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      ...this.metrics,
      connectionState: this.connectionStatus,
      lastError: this.lastError,
      uptime,
      activeChannels: this.channels.size,
    };
  }

  /**
   * Verifica o status da conexão
   */
  getConnectionState(): string {
    return this.connectionStatus;
  }

  /** Retorno mantido para compatibilidade */
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  /**
   * Verifica se o serviço está saudável
   */
  isHealthy(): boolean {
    try {
      // Verificações mais robustas para determinar se o serviço está saudável
      const hasClient = this.ablyClient !== null;
      const isConnected = this.connectionStatus === 'connected';
      const hasValidConnection = hasClient && this.ablyClient?.connection?.state === 'connected';
      
      const healthy = hasClient && isConnected && hasValidConnection;
      
      this.logger.debug(`Verificação de saúde Ably: hasClient=${hasClient}, isConnected=${isConnected}, hasValidConnection=${hasValidConnection}, healthy=${healthy}`);
      
      return healthy;
    } catch (error) {
      this.logger.error('Erro ao verificar saúde do Ably:', error);
      return false;
    }
  }

  /**
   * Inscreve-se em um canal Ably
   */
  async subscribeToChannel(
    channelName: string,
    callback: (msg: any) => void,
  ): Promise<IAblyOperationResult> {
    const startTime = Date.now();
    try {
      const channel = this.getChannel(channelName);
      channel.subscribe('notification', callback);
      return {
        success: true,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'SUBSCRIBE_FAILED',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancela inscrição de um canal Ably
   */
  async unsubscribeFromChannel(
    channelName: string,
  ): Promise<IAblyOperationResult> {
    const startTime = Date.now();
    try {
      const channel = this.getChannel(channelName);
      channel.unsubscribe();
      return {
        success: true,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'UNSUBSCRIBE_FAILED',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Força uma reconexão com o Ably
   */
  async reconnect(): Promise<boolean> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      
      try {
        this.logger.log(`Tentativa de reconexão ${attempt}/${maxRetries} com Ably`);
        
        if (this.ablyClient) {
          // Fechar conexão atual se existir
          if (this.ablyClient.connection.state !== 'closed') {
            this.logger.debug('Fechando conexão atual antes de reconectar');
            this.ablyClient.connection.close();
            
            // Aguardar fechamento
            await new Promise((resolve) => {
              const timeout = setTimeout(resolve, 2000);
              this.ablyClient.connection.once('closed', () => {
                clearTimeout(timeout);
                resolve(void 0);
              });
            });
          }

          // Tentar conectar novamente
          this.logger.debug('Iniciando nova conexão');
          this.ablyClient.connection.connect();

          // Aguardar conexão com timeout
          const connected = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              this.logger.warn(`Timeout na tentativa ${attempt} de reconexão`);
              resolve(false);
            }, 10000); // 10 segundos de timeout

            const onConnected = () => {
              clearTimeout(timeout);
              this.ablyClient.connection.off('connected', onConnected);
              this.ablyClient.connection.off('failed', onFailed);
              this.ablyClient.connection.off('suspended', onFailed);
              resolve(true);
            };

            const onFailed = (stateChange: any) => {
              clearTimeout(timeout);
              this.ablyClient.connection.off('connected', onConnected);
              this.ablyClient.connection.off('failed', onFailed);
              this.ablyClient.connection.off('suspended', onFailed);
              this.logger.warn(`Falha na reconexão (tentativa ${attempt}):`, stateChange?.reason);
              resolve(false);
            };

            this.ablyClient.connection.on('connected', onConnected);
            this.ablyClient.connection.on('failed', onFailed);
            this.ablyClient.connection.on('suspended', onFailed);
          });

          if (connected) {
            this.connectionStatus = 'connected';
            this.lastError = null;
            this.logger.log(`Reconexão bem-sucedida na tentativa ${attempt}`);
            return true;
          }
        }

        // Se chegou aqui, a tentativa falhou
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
          this.logger.warn(`Tentativa ${attempt} falhou, aguardando ${delay}ms antes da próxima tentativa`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        this.logger.error(`Erro na tentativa ${attempt} de reconexão:`, error);
        this.lastError = error.message;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.connectionStatus = 'failed';
    this.logger.error(`Falha em todas as ${maxRetries} tentativas de reconexão`);
    return false;
  }

  /**
   * Remove um canal
   */
  async removeChannel(channelName: string): Promise<void> {
    try {
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      const channel = this.channels.get(fullChannelName);

      if (channel) {
        await channel.detach();
        this.channels.delete(fullChannelName);
        this.logger.debug(`Canal ${fullChannelName} removido`);
      }
    } catch (error) {
      this.logger.error(`Erro ao remover canal ${channelName}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se o cliente está conectado ao Ably com timeout
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.ablyClient) {
        this.logger.debug('Cliente Ably não inicializado');
        return false;
      }

      // Verificação com timeout para evitar travamento
      const connectionPromise = new Promise<boolean>((resolve) => {
        const isConnected = this.connectionStatus === 'connected' && 
                           this.ablyClient.connection.state === 'connected';
        resolve(isConnected);
      });

      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 2000); // 2 segundos de timeout
      });

      const result = await Promise.race([connectionPromise, timeoutPromise]);
      
      this.logger.debug(`Verificação de conexão Ably: ${result} (status: ${this.connectionStatus}, state: ${this.ablyClient?.connection?.state})`);
      
      return result;
    } catch (error) {
      this.logger.error('Erro ao verificar status de conexão:', error);
      return false;
    }
  }

  /**
   * Publica uma mensagem em um canal específico
   * Método compatível com o notification-manager
   */
  async publishMessage(
    channelName: string,
    eventName: string,
    data: any,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Iniciando publicação de mensagem - Canal: ${channelName}, Evento: ${eventName}`);
      
      // Verificar se está conectado
      const isConnected = await this.isConnected();
      if (!isConnected) {
        const errorMsg = `Cliente Ably não está conectado (status: ${this.connectionStatus}, state: ${this.ablyClient?.connection?.state})`;
        this.logger.warn(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Validar parâmetros
      if (!channelName || !eventName) {
        const errorMsg = 'Nome do canal e evento são obrigatórios';
        this.logger.error(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Verificar se o canal está permitido
      if (!this.ablyConfig.isChannelAllowed(channelName)) {
        const errorMsg = `Canal ${channelName} não permitido pela configuração`;
        this.logger.error(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Obter canal
      const fullChannelName = this.ablyConfig.getChannelName(channelName);
      this.logger.debug(`Nome completo do canal: ${fullChannelName}`);
      
      const channel = this.getChannel(fullChannelName);
      
      if (!channel) {
        const errorMsg = `Não foi possível obter o canal ${fullChannelName}`;
        this.logger.error(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Validar tamanho da mensagem
      const payloadSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
      if (payloadSize > this.ablyConfig.maxMessageSize) {
        const errorMsg = `Tamanho da mensagem (${payloadSize} bytes) excede o limite configurado (${this.ablyConfig.maxMessageSize} bytes)`;
        this.logger.error(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      this.logger.debug(`Publicando mensagem no canal ${fullChannelName} - Tamanho: ${payloadSize} bytes`);

      // Publicar mensagem com timeout
      const publishPromise = channel.publish(eventName, data);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao publicar mensagem')), 5000);
      });

      await Promise.race([publishPromise, timeoutPromise]);

      // Atualizar métricas
      this.metrics.totalMessages++;
      this.metrics.messagesPublished++;

      const messageId = `${fullChannelName}-${Date.now()}`;
      const executionTime = Date.now() - startTime;
      
      this.logger.log(
        `Mensagem publicada com sucesso no canal ${fullChannelName} com evento ${eventName}, ID: ${messageId}, Tempo: ${executionTime}ms`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error.message || 'Erro desconhecido ao publicar mensagem';
      
      this.logger.error(
        `Erro ao publicar mensagem no canal ${channelName} (tempo: ${executionTime}ms):`,
        error,
      );

      // Atualizar último erro
      this.lastError = errorMsg;

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Retorna o último erro ocorrido
   */
  getLastError(): string | null {
    return this.lastError;
  }
}
