import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AblyService } from './ably.service';
import { AblyChannelService } from './ably-channel.service';
import { AblyAuthService } from './ably-auth.service';
import {
  IAblyNotificationData,
  IAblyOperationResult,
  IAblyFallbackConfig,
  NotificationType,
  NotificationPriority,
} from '../interfaces/ably.interface';

/**
 * Orquestrador de notificações que integra Ably com o sistema SSE existente
 *
 * Este serviço é responsável por:
 * - Coordenar entre Ably e SSE baseado na disponibilidade
 * - Implementar fallback automático
 * - Gerenciar estratégias de entrega de notificações
 * - Monitorar saúde dos sistemas de notificação
 * - Implementar retry e circuit breaker patterns
 */
@Injectable()
export class NotificationOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(NotificationOrchestratorService.name);
  private isAblyHealthy = false;
  private isSseHealthy = true; // Assume SSE como padrão saudável
  private fallbackConfig: IAblyFallbackConfig;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly ablyService: AblyService,
    private readonly ablyChannelService: AblyChannelService,
    private readonly ablyAuthService: AblyAuthService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeFallbackConfig();
  }

  /**
   * Inicializa o orquestrador de forma assíncrona
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Inicializando orquestrador de notificações...');

    // Inicialização assíncrona sem bloqueio
    setImmediate(async () => {
      try {
        // Verifica saúde inicial dos sistemas
        await this.checkSystemsHealth();

        // Inicia monitoramento contínuo
        this.startHealthMonitoring();

        // Configura listeners de eventos
        this.setupEventListeners();

        this.logger.log('Orquestrador de notificações inicializado');
      } catch (error) {
        this.logger.error('Erro ao inicializar orquestrador:', error);
        // Não propagar o erro para não quebrar a aplicação
      }
    });
  }

  /**
   * Inicializa configuração de fallback
   */
  private initializeFallbackConfig(): void {
    this.fallbackConfig = {
      enabled:
        this.configService.get<string>('ABLY_ENABLE_FALLBACK', 'true') ===
        'true',
      type: 'sse',
      timeout: this.configService.get<number>('ABLY_FALLBACK_TIMEOUT', 5000),
      maxRetries: this.configService.get<number>(
        'ABLY_FALLBACK_MAX_RETRIES',
        3,
      ),
    };
  }

  /**
   * Publica notificação usando a melhor estratégia disponível
   */
  async publishNotification(
    userId: string,
    notification: IAblyNotificationData,
    options?: {
      forceMethod?: 'ably' | 'sse';
      retryOnFailure?: boolean;
      priority?: 'high' | 'normal' | 'low';
    },
  ): Promise<IAblyOperationResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Publicando notificação para usuário ${userId}:`,
        notification.id,
      );

      // Determina método de entrega
      const deliveryMethod = this.determineDeliveryMethod(options?.forceMethod);

      let result: IAblyOperationResult;

      if (deliveryMethod === 'ably') {
        result = await this.publishViaAbly(userId, notification);
      } else {
        result = await this.publishViaSSE(userId, notification);
      }

      // Se falhou e retry está habilitado, tenta método alternativo
      if (!result.success && options?.retryOnFailure !== false) {
        this.logger.warn(
          `Falha na entrega via ${deliveryMethod}, tentando método alternativo`,
        );

        if (deliveryMethod === 'ably') {
          result = await this.publishViaSSE(userId, notification);
        } else {
          result = await this.publishViaAbly(userId, notification);
        }
      }

      // Atualiza circuit breaker
      this.updateCircuitBreaker(result.success);

      // Emite evento de resultado
      this.emitDeliveryEvent(userId, notification, result, deliveryMethod);

      const executionTime = Date.now() - startTime;
      result.executionTime = executionTime;

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Erro ao publicar notificação para usuário ${userId}:`,
        error,
      );

      return {
        success: false,
        error: error.message,
        errorCode: 'NOTIFICATION_DELIVERY_FAILED',
        timestamp: new Date(),
        executionTime,
      };
    }
  }

  /**
   * Publica notificação via Ably
   */
  private async publishViaAbly(
    userId: string,
    notification: IAblyNotificationData,
  ): Promise<IAblyOperationResult> {
    try {
      if (!this.isAblyHealthy || this.circuitBreakerState === 'open') {
        throw new Error('Ably não está disponível');
      }

      const result = await this.ablyChannelService.publishToUserChannel(
        userId,
        notification,
      );

      if (result.success) {
        this.logger.debug(
          `Notificação entregue via Ably para usuário ${userId}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao entregar via Ably para usuário ${userId}:`,
        error,
      );

      return {
        success: false,
        error: error.message,
        errorCode: 'ABLY_DELIVERY_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Publica notificação via SSE (fallback)
   */
  private async publishViaSSE(
    userId: string,
    notification: IAblyNotificationData,
  ): Promise<IAblyOperationResult> {
    try {
      if (!this.isSseHealthy) {
        throw new Error('SSE não está disponível');
      }

      // Emite evento para o sistema SSE existente
      this.eventEmitter.emit('notification.send', {
        userId,
        notification,
        method: 'sse',
      });

      this.logger.debug(`Notificação entregue via SSE para usuário ${userId}`);

      return {
        success: true,
        data: notification,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao entregar via SSE para usuário ${userId}:`,
        error,
      );

      return {
        success: false,
        error: error.message,
        errorCode: 'SSE_DELIVERY_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Publica notificação de broadcast
   */
  async publishBroadcast(
    notification: IAblyNotificationData,
    target: {
      type: 'all' | 'unit' | 'role' | 'region';
      value?: string;
    },
    options?: {
      forceMethod?: 'ably' | 'sse';
      excludeUsers?: string[];
    },
  ): Promise<IAblyOperationResult> {
    try {
      this.logger.debug(`Publicando broadcast:`, notification.id);

      const deliveryMethod = this.determineDeliveryMethod(options?.forceMethod);

      if (deliveryMethod === 'ably') {
        const result = await this.publishBroadcastViaAbly(notification, target);

        // Fallback automático se falhar
        if (!result.success && this.fallbackConfig.enabled) {
          this.logger.warn(
            'Broadcast via Ably falhou, executando fallback para SSE',
          );
          return await this.publishBroadcastViaSSE(
            notification,
            target,
            options?.excludeUsers,
          );
        }
        return result;
      }

      // Método determinado foi SSE ou fallback já está habilitado
      return await this.publishBroadcastViaSSE(
        notification,
        target,
        options?.excludeUsers,
      );
    } catch (error) {
      this.logger.error('Erro ao publicar broadcast:', error);

      return {
        success: false,
        error: error.message,
        errorCode: 'BROADCAST_DELIVERY_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Publica broadcast via Ably
   */
  private async publishBroadcastViaAbly(
    notification: IAblyNotificationData,
    target: { type: string; value?: string },
  ): Promise<IAblyOperationResult> {
    try {
      if (target.type === 'all') {
        // Publica no canal geral
        return await this.ablyService.publishNotification(
          'notifications',
          notification,
        );
      } else {
        // Publica no canal específico do grupo
        return await this.ablyChannelService.publishToBroadcastChannel(
          target.value || 'default',
          notification,
          target.type as any,
        );
      }
    } catch (error) {
      this.logger.error('Erro no broadcast via Ably:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'ABLY_BROADCAST_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Publica broadcast via SSE
   */
  private async publishBroadcastViaSSE(
    notification: IAblyNotificationData,
    target: { type: string; value?: string },
    excludeUsers?: string[],
  ): Promise<IAblyOperationResult> {
    try {
      // Emite evento para o sistema SSE
      this.eventEmitter.emit('notification.broadcast', {
        notification,
        target,
        excludeUsers,
        method: 'sse',
      });

      return {
        success: true,
        data: notification,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro no broadcast via SSE:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'SSE_BROADCAST_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Determina o melhor método de entrega
   */
  private determineDeliveryMethod(
    forceMethod?: 'ably' | 'sse',
  ): 'ably' | 'sse' {
    if (forceMethod) {
      return forceMethod;
    }

    // Se circuit breaker está aberto, usa SSE
    if (this.circuitBreakerState === 'open') {
      return 'sse';
    }

    // Se Ably está saudável, usa Ably
    if (this.isAblyHealthy) {
      return 'ably';
    }

    // Fallback para SSE
    return 'sse';
  }

  /**
   * Verifica saúde dos sistemas
   */
  private async checkSystemsHealth(): Promise<void> {
    try {
      // Verifica Ably
      this.isAblyHealthy = this.ablyService.isHealthy();

      // Verifica SSE (assume saudável por padrão)
      // Aqui você pode implementar verificação real do SSE
      this.isSseHealthy = true;

      this.logger.debug(
        `Status dos sistemas - Ably: ${this.isAblyHealthy}, SSE: ${this.isSseHealthy}`,
      );
    } catch (error) {
      this.logger.error('Erro ao verificar saúde dos sistemas:', error);
    }
  }

  /**
   * Inicia monitoramento contínuo de saúde
   */
  private startHealthMonitoring(): void {
    const interval = this.configService.get<number>(
      'NOTIFICATION_HEALTH_CHECK_INTERVAL',
      30000,
    );

    this.healthCheckInterval = setInterval(async () => {
      await this.checkSystemsHealth();
      this.checkCircuitBreaker();
    }, interval);
  }

  /**
   * Atualiza estado do circuit breaker
   */
  private updateCircuitBreaker(success: boolean): void {
    if (success) {
      this.failureCount = 0;
      if (this.circuitBreakerState === 'half-open') {
        this.circuitBreakerState = 'closed';
        this.logger.log('Circuit breaker fechado - sistema recuperado');
      }
    } else {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (
        this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD &&
        this.circuitBreakerState === 'closed'
      ) {
        this.circuitBreakerState = 'open';
        this.logger.warn('Circuit breaker aberto - muitas falhas detectadas');
      }
    }
  }

  /**
   * Verifica se circuit breaker deve mudar de estado
   */
  private checkCircuitBreaker(): void {
    if (this.circuitBreakerState === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure >= this.CIRCUIT_BREAKER_TIMEOUT) {
        this.circuitBreakerState = 'half-open';
        this.logger.log('Circuit breaker em half-open - testando recuperação');
      }
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Escuta eventos do sistema SSE existente
    this.eventEmitter.on('sse.connection.established', (data) => {
      this.logger.debug('Conexão SSE estabelecida:', data.userId);
    });

    this.eventEmitter.on('sse.connection.lost', (data) => {
      this.logger.debug('Conexão SSE perdida:', data.userId);
    });

    // Escuta eventos do Ably
    this.eventEmitter.on('ably.connection.established', (data) => {
      this.logger.debug('Conexão Ably estabelecida:', data.clientId);
    });

    this.eventEmitter.on('ably.connection.lost', (data) => {
      this.logger.debug('Conexão Ably perdida:', data.clientId);
    });
  }

  /**
   * Emite evento de entrega de notificação
   */
  private emitDeliveryEvent(
    userId: string,
    notification: IAblyNotificationData,
    result: IAblyOperationResult,
    method: 'ably' | 'sse',
  ): void {
    this.eventEmitter.emit('notification.delivered', {
      userId,
      notificationId: notification.id,
      success: result.success,
      method,
      timestamp: new Date(),
      executionTime: result.executionTime,
    });
  }

  /**
   * Gera token de autenticação para cliente
   */
  async generateClientToken(
    userId: string,
    isAdmin: boolean = false,
  ): Promise<IAblyOperationResult<any>> {
    try {
      if (isAdmin) {
        return await this.ablyAuthService.generateAdminToken(userId);
      } else {
        return await this.ablyAuthService.generateUserToken(userId);
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar token para usuário ${userId}:`, error);

      return {
        success: false,
        error: error.message,
        errorCode: 'TOKEN_GENERATION_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Obtém estatísticas do orquestrador
   */
  getOrchestratorStats(): any {
    return {
      ablyHealthy: this.isAblyHealthy,
      sseHealthy: this.isSseHealthy,
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      fallbackEnabled: this.fallbackConfig.enabled,
      ablyMetrics: this.ablyService.getMetrics(),
      channelStats: this.ablyChannelService.getAllChannelStats(),
    };
  }

  /**
   * Força mudança de método de entrega
   */
  async switchDeliveryMethod(
    method: 'ably' | 'sse',
    reason?: string,
  ): Promise<void> {
    this.logger.log(
      `Forçando mudança para método ${method}. Motivo: ${reason || 'Manual'}`,
    );

    if (method === 'sse') {
      this.isAblyHealthy = false;
      this.circuitBreakerState = 'open';
    } else {
      this.isAblyHealthy = true;
      this.circuitBreakerState = 'closed';
      this.failureCount = 0;
    }
  }

  /**
   * Limpa recursos ao destruir/**
   * Finaliza o orquestrador
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log(
        'Iniciando finalização do orquestrador de notificações...',
      );

      // Para monitoramento de saúde
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
        this.logger.debug('Health check interval finalizado');
      }

      // Aguarda um pouco para finalizar operações pendentes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log('✅ Orquestrador de notificações finalizado com sucesso');
    } catch (error) {
      this.logger.error(
        '❌ Erro ao finalizar orquestrador de notificações:',
        error,
      );
      throw error;
    }
  }
}
