import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { Request } from 'express';
import { SseConnection, SseNotification, SseConnectionStats, HeartbeatResponse, EventReplayResponse } from '../interfaces/sse-notification.interface';
import { SseRedisService } from './sse-redis.service';
import { SseEventStoreService } from './sse-event-store.service';
import { SseRetryPolicyService } from './sse-retry-policy.service';
import { SseRateLimiterService } from './sse-rate-limiter.service';
import { SseGracefulDegradationService, DegradationLevel } from './sse-graceful-degradation.service';
import { SseStructuredLoggingService, LogLevel, SseLogCategory } from './sse-structured-logging.service';
import { SseErrorBoundaryService } from './sse-error-boundary.service';
import { SseResilienceConfig } from '../config/sse-resilience.config';
import { SseConfig, SSE_CONFIG } from '../../../config/sse.config';

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  private readonly localConnections = new Map<string, Map<string, Subject<MessageEvent>>>();
  private readonly connectionMetadata = new Map<string, SseConnection>();
  private redisEnabled: boolean;

  isUserConnectedLocally(userId: string): boolean {
    const userConnections = this.localConnections.get(userId);
    return userConnections ? userConnections.size > 0 : false;
  }

  getUserLocalConnectionCount(userId: string): number {
    const userConnections = this.localConnections.get(userId);
    return userConnections ? userConnections.size : 0;
  }

  async getUserTotalConnectionCount(userId: string): Promise<number> {
    if (!this.redisEnabled) {
      return this.getUserLocalConnectionCount(userId);
    }

    try {
      const redisConnections = await this.redisService.getUserConnections(userId);
      return this.getUserLocalConnectionCount(userId) + redisConnections.length;
    } catch (error) {
      this.loggingService.logError(error as Error, {
        userId: Number(userId),
        component: 'sse-connection',
        operation: 'get-total-count',
        timestamp: new Date(),
        category: SseLogCategory.CONNECTION,
        metadata: {
          localCount: this.getUserLocalConnectionCount(userId),
          redisEnabled: this.redisEnabled,
          error: (error as Error).message,
        },
      });
      return this.getUserLocalConnectionCount(userId);
    }
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: SseRedisService,
    private readonly eventStoreService: SseEventStoreService,
    private readonly retryPolicyService: SseRetryPolicyService,
    private readonly rateLimiterService: SseRateLimiterService,
    private readonly gracefulDegradationService: SseGracefulDegradationService,
    private readonly loggingService: SseStructuredLoggingService,
    private readonly errorBoundaryService: SseErrorBoundaryService,
    @Inject(SSE_CONFIG) private readonly sseConfig: SseConfig,
  ) {
    this.redisEnabled = this.configService.get<boolean>('REDIS_ENABLED', false);

    if (this.redisEnabled) {
      this.setupRedisSubscriptions();
    } else {
      this.logger.warn('Redis desabilitado - funcionando apenas com conexões locais');
    }
  }

  async onModuleDestroy() {
    this.clearAllConnections();
    if (this.redisEnabled) {
      await this.redisService.onModuleDestroy();
    }
  }

  private async setupRedisSubscriptions() {
    if (!this.redisEnabled) return;

    try {
      await this.redisService.subscribeToBroadcast((notification) => {
        this.handleBroadcastNotification(notification);
      });
      this.logger.log('Subscriptions Redis configuradas com sucesso');
    } catch (error) {
      this.logger.error('Erro ao configurar subscriptions Redis:', error);
      // Entra em modo degradado e continua apenas com conexões locais
      this.redisEnabled = false;
      await this.gracefulDegradationService.forceDegradationLevel(
        DegradationLevel.MODERATE,
        'Falha na inscrição Redis - degradando para conexões locais',
      );
      this.loggingService.logError(error as Error, {
        component: 'sse-redis',
        operation: 'subscribe',
        timestamp: new Date(),
        category: SseLogCategory.REDIS,
      });
    }
  }

  async createConnection(
    userId: string,
    req?: Request,
  ): Promise<Observable<MessageEvent>> {
    const startTime = Date.now();

    try {
      // Verificar degradação
      const degradationStatus = await this.gracefulDegradationService.getCurrentStatus();
      if (degradationStatus.currentLevel === DegradationLevel.CRITICAL) {
        this.loggingService.logConnection(LogLevel.WARN, 'Conexão indeferida devido ao modo crítico', {
          userId: Number(userId),
          component: 'sse-connection',
          operation: 'create-connection',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
          metadata: {
            degradationLevel: degradationStatus.currentLevel,
            reason: 'critical_mode',
          },
        });
        throw new Error('Serviço em modo crítico - conexões temporariamente indisponíveis');
      }

      const clientInfo = req ? {
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || 'unknown',
        lastEventId: req.headers['last-event-id'] as string,
      } : { userAgent: 'unknown', ip: 'unknown' };

      // Verificar limites de conexão
      if (!this.localConnections.has(userId)) {
        this.localConnections.set(userId, new Map());
      }

      const userConnections = this.localConnections.get(userId)!;
      if (userConnections.size >= this.sseConfig.maxConnectionsPerUser) {
        this.loggingService.logConnection(LogLevel.WARN, 'Limite de conexões atingido', {
          userId: Number(userId),
          component: 'sse-connection',
          operation: 'create-connection',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
          metadata: {
            currentConnections: userConnections.size,
            maxConnections: this.sseConfig.maxConnectionsPerUser,
            ...clientInfo,
          },
        });
        throw new Error(`Limite de ${this.sseConfig.maxConnectionsPerUser} conexões por usuário atingido`);
      }

      const connectionId = this.generateConnectionId();
      const subject = new Subject<MessageEvent>();

      const connectionData: SseConnection = {
        connectionId,
        userId,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
        userAgent: clientInfo.userAgent,
        ipAddress: clientInfo.ip,
        instanceId: this.sseConfig.instanceId,
        lastEventId: clientInfo.lastEventId,
        lastActivity: new Date(),
        missedHeartbeats: 0,
      };

      userConnections.set(connectionId, subject);
      this.connectionMetadata.set(connectionId, connectionData);

      // Armazenar no Redis se habilitado
      if (this.redisEnabled) {
        const redisResult = await this.retryPolicyService.executeWithRetry(
          async () => {
            await this.redisService.storeConnection(connectionData);
            await this.redisService.subscribeToUser(userId, (notification) => {
              this.handleUserNotification(userId, notification);
            });
            return true;
          },
          { maxAttempts: 3, initialDelay: 1000 },
        );

        if (!redisResult.success) {
          this.loggingService.logError(new Error('Falha ao armazenar conexão no Redis'), {
            userId: Number(userId),
            component: 'sse-redis',
            operation: 'store-connection',
            timestamp: new Date(),
            category: SseLogCategory.REDIS,
            metadata: {
              connectionId,
              error: redisResult.error?.message,
            },
          });
        }
      }

      this.loggingService.logConnection(LogLevel.INFO, 'Nova conexão SSE criada', {
        userId: Number(userId),
        component: 'sse-connection',
        operation: 'create-connection',
        timestamp: new Date(),
        category: SseLogCategory.CONNECTION,
        metadata: {
          connectionId,
          duration: Date.now() - startTime,
          redisEnabled: this.redisEnabled,
          ...clientInfo,
        },
      });

      return new Observable<MessageEvent>((observer) => {
        // Enviar evento inicial de conexão
        observer.next({
          data: JSON.stringify({
            type: 'connection',
            message: 'Conexão SSE estabelecida',
            timestamp: new Date().toISOString(),
            connectionId,
          }),
          type: 'connection',
        } as MessageEvent);

        // Recuperar eventos perdidos se lastEventId fornecido
        if (clientInfo?.lastEventId) {
          this.loggingService.logConnection(LogLevel.INFO, 'Recuperando eventos perdidos', {
            userId: Number(userId),
            component: 'sse-event-recovery',
            operation: 'recover-events',
            timestamp: new Date(),
            category: SseLogCategory.CONNECTION,
          });

          this.retryPolicyService.executeWithRetry(
            async () => {
              const replayResponse = await this.eventStoreService.replayEvents({
                userId,
                lastEventId: clientInfo.lastEventId!,
                limit: 50
              });
              return replayResponse.events;
            },
            { maxAttempts: 3, initialDelay: 500 },
          )
          .then((result) => {
            if (result.success && result.result && result.result.length > 0) {
              this.loggingService.logConnection(LogLevel.INFO, 'Eventos perdidos recuperados', {
                userId: Number(userId),
                component: 'sse-event-recovery',
                operation: 'recover-events',
                timestamp: new Date(),
                category: SseLogCategory.CONNECTION,
                metadata: { eventsCount: result.result.length },
              });

              result.result.forEach((event) => {
                observer.next({
                  data: JSON.stringify({
                    ...event,
                    timestamp: event.createdAt.toISOString(),
                  }),
                  lastEventId: event.eventId,
                  type: event.notification.type,
                } as MessageEvent);
              });

              observer.next({
                data: JSON.stringify({
                  type: 'recovery-complete',
                  message: `${result.result.length} eventos recuperados`,
                  timestamp: new Date().toISOString(),
                }),
                type: 'recovery-complete',
              } as MessageEvent);
            } else {
              this.loggingService.logConnection(LogLevel.DEBUG, 'Nenhum evento perdido encontrado', {
                userId: Number(userId),
                component: 'sse-event-recovery',
                operation: 'recover-events',
                timestamp: new Date(),
                category: SseLogCategory.CONNECTION,
              });
            }
          })
          .catch((error) => {
            this.loggingService.logError(error as Error, {
              userId: Number(userId),
              component: 'sse-event-recovery',
              operation: 'recover-events',
              timestamp: new Date(),
              category: SseLogCategory.CONNECTION,
            });
          });
        }

        // Enviar heartbeat inicial
        observer.next({
          data: JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            connectionId,
          }),
          type: 'heartbeat',
        } as MessageEvent);

        // Configurar subject para receber notificações
        const subscription = subject.subscribe(observer);

        return () => {
          subscription.unsubscribe();
          this.removeConnection(userId, connectionId);
        };
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Capturar erro com error boundary
      await this.errorBoundaryService.captureError(
        error as Error,
        {
          userId: Number(userId),
          timestamp: new Date(),
          additionalData: {
            component: 'sse-connection',
            operation: 'create-connection',
            category: SseLogCategory.CONNECTION,
          },
        },
      );

      this.loggingService.logError(error as Error, {
        userId: Number(userId),
        component: 'sse-connection',
        operation: 'create-connection',
        timestamp: new Date(),
        category: SseLogCategory.CONNECTION,
        metadata: {
          duration,
          error: (error as Error).message,
        },
      });

      throw error;
    }
  }

  async sendToUser(userId: string, notification: SseNotification): Promise<void> {
    const startTime = Date.now();

    try {
      // Verificar se a funcionalidade está disponível
      if (!this.gracefulDegradationService.isFeatureAvailable('sse-notifications')) {
        const activeStrategy = this.gracefulDegradationService.getActiveStrategy('sse-notifications');

        this.loggingService.logNotification(LogLevel.WARN, 'Funcionalidade SSE indisponível', {
          userId: Number(userId),
          component: 'sse-notification',
          operation: 'send-notification',
          timestamp: new Date(),
          category: SseLogCategory.NOTIFICATION,
          metadata: { activeStrategy },
        });

        if (activeStrategy === 'simplified_notifications') {
          await this.sendSimplifiedNotification(userId, notification);
          return;
        } else if (activeStrategy === 'disable_feature') {
          throw new Error('Notificações SSE temporariamente indisponíveis');
        }
      }

      // Armazenar evento no store
      const storeResult = await this.retryPolicyService.executeWithRetry(
        async () => {
          await this.eventStoreService.storeEvent(notification);
        },
        { maxAttempts: 3, initialDelay: 500 },
      );

      if (!storeResult.success) {
        this.loggingService.logError(
          new Error('Falha ao armazenar evento'),
          {
            userId: Number(userId),
            component: 'sse-event-store',
            operation: 'store-event',
            timestamp: new Date(),
            category: SseLogCategory.DATABASE,
            metadata: {
              notificationId: notification.id,
              error: storeResult.error?.message,
            },
          },
        );
      }

      // Adicionar eventId se não existir
      const notificationWithEventId: SseNotification = {
        ...notification,
        id: notification.id || this.generateEventId(),
        timestamp: notification.timestamp || new Date(),
      };

      // Enviar localmente
      await this.sendToUserLocalWithResilience(userId, notificationWithEventId);

      // Publicar no Redis se habilitado
      if (this.redisEnabled && this.gracefulDegradationService.isFeatureAvailable('redis-operations')) {
        const redisResult = await this.retryPolicyService.executeWithRetry(
          async () => {
            await this.redisService.publishNotification(notificationWithEventId);
          },
          { maxAttempts: 3, initialDelay: 1000 },
        );

        if (!redisResult.success) {
          this.loggingService.logError(
            new Error('Falha ao publicar no Redis'),
            {
              userId: Number(userId),
              component: 'sse-redis',
              operation: 'publish-notification',
              timestamp: new Date(),
              category: SseLogCategory.REDIS,
              metadata: {
                notificationId: notificationWithEventId.id,
                error: redisResult.error?.message,
              },
            },
          );
        }
      }

      this.loggingService.logNotification(LogLevel.INFO, 'Notificação enviada com sucesso', {
        userId: Number(userId),
        component: 'sse-notification',
        operation: 'send-notification',
        timestamp: new Date(),
        category: SseLogCategory.NOTIFICATION,
        metadata: {
          notificationId: notificationWithEventId.id,
          type: notificationWithEventId.type,
          duration: Date.now() - startTime,
        },
      });

      this.loggingService.logPerformance('Notificação processada', {
        userId: Number(userId),
        component: 'sse-notification',
        operation: 'send-notification',
        timestamp: new Date(),
        category: SseLogCategory.PERFORMANCE,
        metadata: { duration: Date.now() - startTime },
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Capturar erro com error boundary
      await this.errorBoundaryService.captureError(
        error as Error,
        {
          userId: Number(userId),
          timestamp: new Date(),
          additionalData: {
            component: 'sse-notification',
            operation: 'send-notification',
            category: SseLogCategory.NOTIFICATION,
          },
        },
      );

      this.loggingService.logError(error as Error, {
        userId: Number(userId),
        component: 'sse-notification',
        operation: 'send-notification',
        timestamp: new Date(),
        category: SseLogCategory.NOTIFICATION,
        metadata: {
          duration,
          notificationId: notification.id,
          error: (error as Error).message,
        },
      });

      throw error;
    }
  }

  private async sendToUserLocalWithResilience(
    userId: string,
    notification: SseNotification,
  ): Promise<void> {
    const result = await this.retryPolicyService.executeWithRetry(
      async () => {
        this.sendToUserLocal(userId, notification);
      },
      { maxAttempts: 3, initialDelay: 100 },
    );

    if (!result.success) {
      this.loggingService.logError(
        new Error('Falha ao enviar notificação local'),
        {
          userId: Number(userId),
          component: 'sse-local',
          operation: 'send-local',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
          metadata: {
            notificationId: notification.id,
            error: result.error?.message,
          },
        },
      );
    }
  }

  private sendToUserLocal(userId: string, notification: SseNotification): void {
    const userConnections = this.localConnections.get(userId);

    if (!userConnections || userConnections.size === 0) {
      return;
    }

    const messageEvent: MessageEvent = {
      data: JSON.stringify({
        ...notification,
        timestamp: notification.timestamp.toISOString(),
      }),
      lastEventId: notification.id,
      type: notification.type,
    } as MessageEvent;

    userConnections.forEach((subject, connectionId) => {
      try {
        subject.next(messageEvent);

        // Atualizar metadata da conexão
        const connectionData = this.connectionMetadata.get(connectionId);
        if (connectionData) {
          connectionData.lastHeartbeat = new Date();

          this.loggingService.logNotification(LogLevel.DEBUG, 'Notificação enviada localmente', {
            userId: Number(userId),
            component: 'sse-local',
            operation: 'send-local',
            timestamp: new Date(),
            category: SseLogCategory.NOTIFICATION,
            metadata: { connectionId, notificationId: notification.id },
          });
        }
      } catch (error) {
        this.loggingService.logError(error as Error, {
          userId: Number(userId),
          component: 'sse-local',
          operation: 'send-local',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
          metadata: { connectionId, notificationId: notification.id },
        });
      }
    });

    this.loggingService.logNotification(LogLevel.INFO, 'Notificação enviada para conexões locais', {
      userId: Number(userId),
      component: 'sse-local',
      operation: 'send-local',
      timestamp: new Date(),
      category: SseLogCategory.NOTIFICATION,
      metadata: {
        connectionsCount: userConnections.size,
        notificationId: notification.id,
      },
    });
  }

  async sendToUsers(
    userIds: string[],
    notification: Omit<SseNotification, 'userId'>,
  ): Promise<void> {
    this.logger.log(
      `Enviando notificação para ${userIds.length} usuários: ${notification.type}`,
    );

    const promises = userIds.map((userId) =>
      this.sendToUser(userId, {
        ...notification,
        userId,
        id: notification.id || this.generateEventId(),
        timestamp: notification.timestamp || new Date(),
      }),
    );

    await Promise.allSettled(promises);
  }

  async broadcastToAll(notification: Omit<SseNotification, 'userId'>): Promise<void> {
    const localUserIds = Array.from(this.localConnections.keys());

    this.logger.log(
      `Broadcasting para ${localUserIds.length} usuários locais: ${notification.type}`,
    );

    localUserIds.forEach((userId) => {
      this.sendToUserLocal(userId, {
        ...notification,
        userId,
        id: notification.id || this.generateEventId(),
        timestamp: notification.timestamp || new Date(),
      });
    });

    if (this.redisEnabled) {
      try {
        await this.redisService.publishBroadcast(notification);
      } catch (error) {
        this.logger.error('Erro ao fazer broadcast via Redis:', error);
      }
    }
  }

  async removeConnection(userId: string, connectionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const userConnections = this.localConnections.get(userId);

      if (userConnections) {
        const subject = userConnections.get(connectionId);
        if (subject) {
          subject.complete();
          userConnections.delete(connectionId);
          this.connectionMetadata.delete(connectionId);

          // Remover mapa do usuário se não há mais conexões
          if (userConnections.size === 0) {
            this.localConnections.delete(userId);
          }

          // Remover do Redis se habilitado
          if (this.redisEnabled && this.gracefulDegradationService.isFeatureAvailable('redis-operations')) {
            const redisResult = await this.retryPolicyService.executeWithRetry(
              async () => {
                await this.redisService.removeConnection(connectionId, userId);
              },
              { maxAttempts: 3, initialDelay: 500 },
            );

            if (!redisResult.success) {
              this.loggingService.logError(
                new Error('Falha ao remover conexão do Redis'),
                {
                  userId: Number(userId),
                  component: 'sse-redis',
                  operation: 'remove-connection',
                  timestamp: new Date(),
                  category: SseLogCategory.REDIS,
                  metadata: {
                    connectionId,
                    error: redisResult.error?.message,
                  },
                },
              );
            }
          }

          // Unsubscribe do Redis se não há mais conexões locais
          if (this.redisEnabled && this.gracefulDegradationService.isFeatureAvailable('redis-operations')) {
            const redisResult = await this.retryPolicyService.executeWithRetry(
              async () => {
                await this.redisService.unsubscribeFromUser(userId);
              },
              { maxAttempts: 3, initialDelay: 500 },
            );

            if (!redisResult.success) {
              this.loggingService.logError(
                new Error('Falha ao fazer unsubscribe do Redis'),
                {
                  userId: Number(userId),
                  component: 'sse-redis',
                  operation: 'unsubscribe-user',
                  timestamp: new Date(),
                  category: SseLogCategory.REDIS,
                  metadata: {
                    connectionId,
                    error: redisResult.error?.message,
                  },
                },
              );
            }
          }

          this.loggingService.logConnection(LogLevel.INFO, 'Conexão removida', {
            userId: Number(userId),
            component: 'sse-connection',
            operation: 'remove-connection',
            timestamp: new Date(),
            category: SseLogCategory.CONNECTION,
            metadata: {
              connectionId,
              duration: Date.now() - startTime,
            },
          });
        } else {
          this.loggingService.logConnection(LogLevel.WARN, 'Tentativa de remover conexão inexistente', {
            userId: Number(userId),
            component: 'sse-connection',
            operation: 'remove-connection',
            timestamp: new Date(),
            category: SseLogCategory.CONNECTION,
            metadata: { connectionId },
          });
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Capturar erro com error boundary
      await this.errorBoundaryService.captureError(
        error as Error,
        {
          userId: Number(userId),
          timestamp: new Date(),
          additionalData: {
            component: 'sse-connection',
            operation: 'remove-connection',
            category: SseLogCategory.CONNECTION,
          },
        },
      );

      this.loggingService.logError(error as Error, {
        userId: Number(userId),
        component: 'sse-connection',
        operation: 'remove-connection',
        timestamp: new Date(),
        category: SseLogCategory.CONNECTION,
        metadata: {
          connectionId,
          duration,
          error: (error as Error).message,
        },
      });

      throw error;
    }
  }

  async removeUserConnections(userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const userConnections = this.localConnections.get(userId);
      if (userConnections) {
        const connectionIds = Array.from(userConnections.keys());

        userConnections.forEach((subject, connectionId) => {
          subject.complete();
          this.connectionMetadata.delete(connectionId);

          this.loggingService.logConnection(LogLevel.DEBUG, 'Conexão individual removida', {
            userId: Number(userId),
            component: 'sse-connection',
            operation: 'remove-user-connections',
            timestamp: new Date(),
            category: SseLogCategory.CONNECTION,
            metadata: { connectionId },
          });
        });

        this.localConnections.delete(userId);

        // Remover do Redis se habilitado
        if (this.redisEnabled && this.gracefulDegradationService.isFeatureAvailable('redis-operations')) {
          // Unsubscribe primeiro
          const unsubscribeResult = await this.retryPolicyService.executeWithRetry(
            async () => {
              await this.redisService.unsubscribeFromUser(userId);
            },
            { maxAttempts: 3, initialDelay: 500 },
          );

          if (!unsubscribeResult.success) {
            this.loggingService.logError(
              new Error('Falha ao fazer unsubscribe do usuário'),
              {
                userId: Number(userId),
                component: 'sse-redis',
                operation: 'unsubscribe-user',
                timestamp: new Date(),
                category: SseLogCategory.REDIS,
                metadata: { error: unsubscribeResult.error?.message },
              },
            );
          }

          // Remover todas as conexões do Redis
          const removePromises = connectionIds.map(async (connectionId) => {
            const removeResult = await this.retryPolicyService.executeWithRetry(
              async () => {
                await this.redisService.removeConnection(connectionId, userId);
              },
              { maxAttempts: 3, initialDelay: 500 },
            );

            if (!removeResult.success) {
              this.loggingService.logError(
                new Error('Falha ao remover conexão individual do Redis'),
                {
                  userId: Number(userId),
                  component: 'sse-redis',
                  operation: 'remove-connection',
                  timestamp: new Date(),
                  category: SseLogCategory.REDIS,
                  metadata: {
                    connectionId,
                    error: removeResult.error?.message,
                  },
                },
              );
            }
          });

          await Promise.allSettled(removePromises);
        }

        this.loggingService.logConnection(LogLevel.INFO, 'Todas as conexões do usuário removidas', {
          userId: Number(userId),
          component: 'sse-connection',
          operation: 'remove-user-connections',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
          metadata: {
            connectionsRemoved: connectionIds.length,
            duration: Date.now() - startTime,
          },
        });
      } else {
        this.loggingService.logConnection(LogLevel.WARN, 'Tentativa de remover conexões de usuário sem conexões', {
          userId: Number(userId),
          component: 'sse-connection',
          operation: 'remove-user-connections',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Capturar erro com error boundary
      await this.errorBoundaryService.captureError(
        error as Error,
        {
          userId: Number(userId),
          timestamp: new Date(),
          additionalData: {
            operation: 'remove-user-connections',
            category: SseLogCategory.CONNECTION,
            duration,
            error: (error as Error).message,
          },
        },
      );

      this.loggingService.logError(error as Error, {
        userId: Number(userId),
        component: 'sse-connection',
        operation: 'remove-user-connections',
        timestamp: new Date(),
        category: SseLogCategory.CONNECTION,
        metadata: {
          duration,
          error: (error as Error).message,
        },
      });

      throw error;
    }
  }

  async hasActiveConnections(userId: string): Promise<boolean> {
    const hasLocal = this.isUserConnectedLocally(userId);

    if (hasLocal) {
      return true;
    }

    if (this.redisEnabled) {
      try {
        const redisConnections = await this.redisService.getUserConnections(userId);
        return redisConnections.length > 0;
      } catch (error) {
        this.logger.error('Erro ao verificar conexões no Redis:', error);
        return false;
      }
    }

    return false;
  }

  getLocalConnectionStats(): SseConnectionStats {
    let totalConnections = 0;
    const userCounts: Record<string, number> = {};

    this.localConnections.forEach((userConns, userId) => {
      const count = userConns.size;
      totalConnections += count;
      userCounts[userId] = count;
    });

    return {
        totalConnections,
        totalUsers: this.localConnections.size,
        connectionsPerUser: userCounts,
        lastUpdated: new Date(),
      };
  }

  async getGlobalConnectionStats(): Promise<SseConnectionStats> {
    if (!this.redisEnabled) {
      return this.getLocalConnectionStats();
    }

    try {
      const globalStats = await this.redisService.getGlobalStats();
      return {
          totalConnections: globalStats.totalConnections,
          totalUsers: globalStats.connectedUsers,
          connectionsPerUser: globalStats.connectionsByUser,
          lastUpdated: new Date(),
        };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas globais:', error);
      return this.getLocalConnectionStats();
    }
  }

  getLocalConnectedUsers(): string[] {
    return Array.from(this.localConnections.keys());
  }

  async getGlobalConnectedUsers(): Promise<string[]> {
    if (!this.redisEnabled) {
      return this.getLocalConnectedUsers();
    }

    try {
      const globalStats = await this.redisService.getGlobalStats();
    return Object.keys(globalStats.connectionsByUser);
    } catch (error) {
      this.logger.error('Erro ao obter usuários globais conectados:', error);
      return this.getLocalConnectedUsers();
    }
  }

  clearAllConnections(): void {
    this.logger.log('Limpando todas as conexões SSE');

    this.localConnections.forEach((userConns, userId) => {
      userConns.forEach((subject, connectionId) => {
        try {
          subject.complete();
          this.connectionMetadata.delete(connectionId);
        } catch (error) {
          this.logger.error(`Erro ao fechar conexão ${connectionId}:`, error);
        }
      });
    });

    this.localConnections.clear();
    this.connectionMetadata.clear();
  }

  async updateHeartbeat(connectionId: string): Promise<void> {
    const metadata = this.connectionMetadata.get(connectionId);
    if (metadata) {
      metadata.lastHeartbeat = new Date();
    }

    if (this.redisEnabled) {
      try {
        // Atualizar heartbeat no Redis se necessário
      } catch (error) {
        this.logger.error('Erro ao atualizar heartbeat no Redis:', error);
      }
    }
  }

  handleRedisNotification(notification: SseNotification): void {
    // Processar notificação recebida do Redis
    this.sendToUserLocal(notification.userId, notification);
  }

  handleRedisBroadcast(notification: Omit<SseNotification, 'userId'>): void {
    const localUserIds = this.getLocalConnectedUsers();

    localUserIds.forEach((userId) => {
      this.sendToUserLocal(userId, {
        ...notification,
        userId,
        id: notification.id || this.generateEventId(),
        timestamp: notification.timestamp || new Date(),
      });
    });
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    localConnections: number;
    redisHealthy: boolean;
    details: any;
  }> {
    const localStats = this.getLocalConnectionStats();
    let redisHealthy = true;

    if (this.redisEnabled) {
      try {
        await this.redisService.healthCheck();
      } catch (error) {
        redisHealthy = false;
        this.logger.error('Redis health check failed:', error);
      }
    }

    const status = this.redisEnabled && !redisHealthy ? 'degraded' : 'healthy';

    return {
      status,
      localConnections: localStats.totalConnections,
      redisHealthy,
      details: {
        localStats,
        redisEnabled: this.redisEnabled,
      },
    };
  }

  async processHeartbeatResponse(connectionId: string, response: HeartbeatResponse): Promise<void> {
    const connection = this.connectionMetadata.get(connectionId);
    if (!connection) {
      return;
    }

    // Processar resposta do heartbeat
    connection.lastHeartbeat = new Date();
    if (response.timestamp) {
        const latency = Date.now() - new Date(response.timestamp).getTime();
        // TODO: Implementar metadata se necessário
         // if (connection.metadata) {
         //   connection.metadata.latency = latency;
         // }
      }
  }

  getHeartbeatStats(connectionId: string) {
    const connection = this.connectionMetadata.get(connectionId);
    if (!connection) {
      return null;
    }

    return {
      lastHeartbeat: connection.lastHeartbeat,
      latency: undefined, // TODO: Implementar latency se necessário
    };
  }

  getActiveConnections(): SseConnection[] {
    return Array.from(this.connectionMetadata.values());
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToConnectionWithResilience(
    connectionId: string,
    notification: SseNotification,
  ): Promise<void> {
    const result = await this.retryPolicyService.executeWithRetry(
      async () => {
        await this.sendToConnection(connectionId, notification);
      },
      { maxAttempts: 3, initialDelay: 100 },
    );

    if (!result.success) {
      this.loggingService.logError(
        new Error('Falha ao enviar para conexão específica'),
        {
          component: 'sse-connection',
          operation: 'send-to-connection',
          timestamp: new Date(),
          category: SseLogCategory.CONNECTION,
          metadata: {
            connectionId,
            notificationId: notification.id,
            error: result.error?.message,
          },
        },
      );
    }
  }

  private async sendToConnection(connectionId: string, notification: SseNotification): Promise<void> {
    const metadata = this.connectionMetadata.get(connectionId);
    if (!metadata) {
      throw new Error(`Metadata para conexão ${connectionId} não encontrada`);
    }

    const userConnections = this.localConnections.get(metadata.userId);
    if (!userConnections) {
      throw new Error(`Conexões do usuário ${metadata.userId} não encontradas`);
    }

    const subject = userConnections.get(connectionId);
    if (!subject) {
      throw new Error(`Subject para conexão ${connectionId} não encontrado`);
    }

    const messageEvent: MessageEvent = {
      data: JSON.stringify({
        ...notification,
        timestamp: notification.timestamp.toISOString(),
      }),
      lastEventId: notification.lastEventId || notification.id,
      type: notification.type,
    } as MessageEvent;

    subject.next(messageEvent);
  }

  /**
   * Obtém eventos armazenados a partir de um lastEventId
   */
  async getStoredEvents(lastEventId?: string, userId?: string): Promise<EventReplayResponse> {
    try {
      const replayResponse = await this.eventStoreService.replayEvents({
        userId: userId || 'system',
        lastEventId,
        limit: 50
      });
      
      return replayResponse;
    } catch (error) {
      this.loggingService.logError(
        error as Error,
        {
          timestamp: new Date(),
          operation: 'get-stored-events'
        }
      );
      return {
        events: [],
        totalEvents: 0,
        hasMore: false,
        timestamp: new Date()
      };
    }
  }

  /**
   * Envia notificação simplificada como fallback
   */
  private async sendSimplifiedNotification(
    userId: string,
    notification: Omit<SseNotification, 'id' | 'timestamp'>,
  ): Promise<void> {
    try {
      const simplifiedNotification: SseNotification = {
        id: this.generateEventId(),
        timestamp: new Date(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        userId: String(userId),
        priority: 'low',
      };

      this.sendToUserLocal(userId, simplifiedNotification);

      this.loggingService.logNotification(LogLevel.INFO, 'Notificação simplificada enviada', {
        userId: Number(userId),
        category: SseLogCategory.NOTIFICATION,
        timestamp: new Date(),
        notificationType: notification.type,
        notificationId: parseInt(simplifiedNotification.id) || 0
      });
    } catch (error) {
      this.loggingService.logError(
        error as Error,
        {
          timestamp: new Date(),
          operation: 'send-simplified-notification'
        }
      );
    }
  }

  /**
   * Manipula notificações broadcast recebidas do Redis
   */
  private handleBroadcastNotification(notification: SseNotification): void {
    try {
      // Enviar para todas as conexões locais
      this.localConnections.forEach((userConnections, userId) => {
        this.sendToUserLocal(userId, notification);
      });
      
      this.loggingService.logNotification(LogLevel.INFO, 'Notificação broadcast processada', {
        userId: 0, // broadcast não tem usuário específico
        category: SseLogCategory.NOTIFICATION,
        timestamp: new Date(),
        notificationType: notification.type,
        notificationId: parseInt(notification.id) || 0
      });
    } catch (error) {
      this.loggingService.logError(error as Error, {
        timestamp: new Date(),
        operation: 'handle-broadcast-notification'
      });
    }
  }

  /**
   * Manipula notificações de usuário específico recebidas do Redis
   */
  private handleUserNotification(userId: string, notification: SseNotification): void {
    try {
      this.sendToUserLocal(userId, notification);
      
      this.loggingService.logNotification(LogLevel.INFO, 'Notificação de usuário processada', {
        userId: Number(userId),
        category: SseLogCategory.NOTIFICATION,
        timestamp: new Date(),
        notificationType: notification.type,
        notificationId: parseInt(notification.id) || 0
      });
    } catch (error) {
      this.loggingService.logError(error as Error, {
        timestamp: new Date(),
        operation: 'handle-user-notification',
        metadata: { userId }
      });
    }
  }

}
