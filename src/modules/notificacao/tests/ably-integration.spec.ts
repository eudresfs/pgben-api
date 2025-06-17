import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { AblyService } from '../services/ably.service';
import { AblyAuthService } from '../services/ably-auth.service';
import { AblyChannelService } from '../services/ably-channel.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { SseService } from '../services/sse.service';
import { NotificationType, NotificationPriority, NotificationData } from '../interfaces/ably.interface';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { BroadcastNotificationDto } from '../dto/broadcast-notification.dto';

describe('Ably Integration Tests', () => {
  let module: TestingModule;
  let ablyService: AblyService;
  let ablyAuthService: AblyAuthService;
  let ablyChannelService: AblyChannelService;
  let notificationOrchestrator: NotificationOrchestratorService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  const mockConfig = {
    ABLY_API_KEY: 'test-api-key',
    ABLY_APP_ID: 'test-app-id',
    ABLY_ENVIRONMENT: 'test',
    ABLY_CLIENT_ID: 'test-client',
    ABLY_TOKEN_TTL: 3600,
    ABLY_ENABLE_FALLBACK: true,
    ABLY_FALLBACK_THRESHOLD: 3,
    ABLY_CIRCUIT_BREAKER_THRESHOLD: 5,
    ABLY_CIRCUIT_BREAKER_TIMEOUT: 60000,
    ABLY_RETRY_MAX_ATTEMPTS: 3,
    ABLY_RETRY_DELAY: 1000
  };

  const mockNotificationData: NotificationData = {
    id: 'notif-integration-123',
    type: 'system' as NotificationType,
    title: 'Teste de Integração',
    message: 'Mensagem de teste de integração',
    priority: 'normal' as NotificationPriority,
    senderId: 'sender-integration-123',
    timestamp: new Date(),
    data: { integrationTest: true }
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => mockConfig]
        }),
        EventEmitterModule.forRoot()
      ],
      providers: [
        AblyService,
        AblyAuthService,
        AblyChannelService,
        NotificationOrchestratorService,
        {
          provide: SseService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({ success: true }),
            broadcastNotification: jest.fn().mockResolvedValue({ success: true }),
            isHealthy: jest.fn().mockReturnValue(true),
            getActiveConnections: jest.fn().mockReturnValue(10),
            getMetrics: jest.fn().mockReturnValue({})
          }
        },
        {
          provide: 'ABLY_CONFIG',
          useFactory: (config: ConfigService) => ({
            key: config.get('ABLY_API_KEY'),
            environment: config.get('ABLY_ENVIRONMENT'),
            clientId: config.get('ABLY_CLIENT_ID'),
            autoConnect: false // Para testes
          }),
          inject: [ConfigService]
        }
      ]
    }).compile();

    ablyService = module.get<AblyService>(AblyService);
    ablyAuthService = module.get<AblyAuthService>(AblyAuthService);
    ablyChannelService = module.get<AblyChannelService>(AblyChannelService);
    notificationOrchestrator = module.get<NotificationOrchestratorService>(NotificationOrchestratorService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Mock do Ably para testes
    jest.spyOn(ablyService as any, 'ably', 'get').mockReturnValue({
      connection: {
        state: 'connected',
        on: jest.fn(),
        off: jest.fn(),
        close: jest.fn()
      },
      channels: {
        get: jest.fn().mockReturnValue({
          publish: jest.fn().mockResolvedValue(true),
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
          presence: {
            enter: jest.fn(),
            leave: jest.fn(),
            get: jest.fn().mockResolvedValue([])
          },
          history: jest.fn().mockResolvedValue({ items: [] })
        })
      },
      auth: {
        createTokenRequest: jest.fn().mockResolvedValue({
          keyName: 'test-key',
          ttl: 3600000,
          timestamp: Date.now(),
          nonce: 'test-nonce',
          mac: 'test-mac'
        })
      },
      stats: jest.fn().mockResolvedValue([{
        inbound: { all: { all: { count: 10 } } },
        outbound: { all: { all: { count: 15 } } }
      }])
    });
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integração de Serviços', () => {
    it('deve inicializar todos os serviços corretamente', () => {
      expect(ablyService).toBeDefined();
      expect(ablyAuthService).toBeDefined();
      expect(ablyChannelService).toBeDefined();
      expect(notificationOrchestrator).toBeDefined();
    });

    it('deve ter configurações carregadas', () => {
      expect(configService.get('ABLY_API_KEY')).toBe('test-api-key');
      expect(configService.get('ABLY_APP_ID')).toBe('test-app-id');
    });
  });

  describe('Fluxo Completo de Autenticação', () => {
    it('deve gerar token de autenticação', async () => {
      const userId = 'integration-user-123';
      const userProfile = 'ADMIN';

      const result = await ablyAuthService.generateToken(userId, userProfile);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token?.clientId).toBe(userId);
    });

    it('deve validar token gerado', async () => {
      const userId = 'integration-user-123';
      const userProfile = 'ADMIN';

      const tokenResult = await ablyAuthService.generateToken(userId, userProfile);
      expect(tokenResult.success).toBe(true);

      if (tokenResult.token) {
        const validationResult = await ablyAuthService.validateToken(
          tokenResult.token.token,
          userId
        );
        expect(validationResult.valid).toBe(true);
      }
    });

    it('deve revogar token', async () => {
      const userId = 'integration-user-123';
      const userProfile = 'ADMIN';

      await ablyAuthService.generateToken(userId, userProfile);
      const revokeResult = await ablyAuthService.revokeToken(userId);

      expect(revokeResult.success).toBe(true);
    });
  });

  describe('Fluxo Completo de Canais', () => {
    it('deve criar canal de usuário', async () => {
      const userId = 'integration-user-123';
      const channelName = `user:${userId}:notifications`;

      const channel = await ablyChannelService.createUserChannel(userId);

      expect(channel).toBeDefined();
      expect(channel.name).toBe(channelName);
    });

    it('deve publicar mensagem no canal', async () => {
      const userId = 'integration-user-123';
      const channelName = `user:${userId}:notifications`;

      await ablyChannelService.createUserChannel(userId);
      const result = await ablyChannelService.publishToChannel(
        channelName,
        'notification',
        mockNotificationData
      );

      expect(result.success).toBe(true);
    });

    it('deve obter estatísticas do canal', async () => {
      const userId = 'integration-user-123';
      const channelName = `user:${userId}:notifications`;

      await ablyChannelService.createUserChannel(userId);
      await ablyChannelService.publishToChannel(
        channelName,
        'notification',
        mockNotificationData
      );

      const stats = ablyChannelService.getChannelStats(channelName);

      expect(stats).toBeDefined();
      expect(stats.channelName).toBe(channelName);
    });
  });

  describe('Fluxo Completo de Notificações', () => {
    it('deve enviar notificação individual via orquestrador', async () => {
      const userId = 'integration-user-123';

      const result = await notificationOrchestrator.sendNotification(
        userId,
        mockNotificationData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('ably');
    });

    it('deve fazer broadcast de notificação', async () => {
      const broadcastData: BroadcastNotificationDto = {
        type: 'announcement' as NotificationType,
        title: 'Anúncio de Integração',
        message: 'Mensagem de broadcast de integração',
        priority: 'normal' as NotificationPriority,
        target: {
          type: 'all',
          value: undefined
        },
        data: { integrationBroadcast: true }
      };

      const result = await notificationOrchestrator.broadcastNotification(broadcastData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('ably');
    });

    it('deve forçar método de entrega específico', async () => {
      const userId = 'integration-user-123';

      const result = await notificationOrchestrator.forceDeliveryMethod(
        'sse',
        userId,
        mockNotificationData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('sse');
      expect(result.forced).toBe(true);
    });
  });

  describe('Monitoramento e Métricas', () => {
    it('deve obter status de saúde do sistema', () => {
      const healthStatus = notificationOrchestrator.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('ably');
      expect(healthStatus).toHaveProperty('sse');
      expect(healthStatus).toHaveProperty('circuitBreaker');
    });

    it('deve obter métricas do sistema', async () => {
      const userId = 'integration-user-123';

      // Enviar algumas notificações para gerar métricas
      await notificationOrchestrator.sendNotification(userId, mockNotificationData);
      await notificationOrchestrator.sendNotification(userId, {
        ...mockNotificationData,
        id: 'notif-integration-124'
      });

      const metrics = notificationOrchestrator.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalSent).toBeGreaterThan(0);
      expect(metrics.ablySent).toBeGreaterThan(0);
    });

    it('deve obter estatísticas de todos os canais', () => {
      const userId1 = 'integration-user-123';
      const userId2 = 'integration-user-124';

      // Criar alguns canais
      ablyChannelService.createUserChannel(userId1);
      ablyChannelService.createUserChannel(userId2);

      const allStats = ablyChannelService.getAllChannelStats();

      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats.length).toBeGreaterThan(0);
    });
  });

  describe('Tratamento de Erros Integrado', () => {
    it('deve lidar com falha do Ably e usar fallback SSE', async () => {
      const userId = 'integration-user-123';

      // Mock falha do Ably
      jest.spyOn(ablyService, 'publishNotification').mockResolvedValueOnce({
        success: false,
        error: 'Ably connection failed',
        errorCode: 'CONNECTION_FAILED'
      });

      const result = await notificationOrchestrator.sendNotification(
        userId,
        mockNotificationData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('sse');
      expect(result.fallbackUsed).toBe(true);
    });

    it('deve validar dados de entrada em todo o fluxo', async () => {
      const invalidNotification = {
        ...mockNotificationData,
        type: '' as NotificationType,
        title: '',
        message: ''
      };

      const result = await notificationOrchestrator.sendNotification(
        'user-123',
        invalidNotification
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('inválidos');
    });
  });

  describe('Eventos e Listeners', () => {
    it('deve emitir eventos durante o fluxo de notificação', async () => {
      const userId = 'integration-user-123';
      const eventSpy = jest.spyOn(eventEmitter, 'emit');

      await notificationOrchestrator.sendNotification(userId, mockNotificationData);

      expect(eventSpy).toHaveBeenCalledWith(
        'notification.sent',
        expect.objectContaining({
          userId,
          method: 'ably',
          success: true
        })
      );
    });

    it('deve emitir eventos de falha quando apropriado', async () => {
      const userId = 'integration-user-123';
      const eventSpy = jest.spyOn(eventEmitter, 'emit');

      // Mock falha em ambos os serviços
      jest.spyOn(ablyService, 'publishNotification').mockResolvedValueOnce({
        success: false,
        error: 'Ably failed'
      });
      
      const sseService = module.get<SseService>(SseService);
      jest.spyOn(sseService, 'sendNotification').mockResolvedValueOnce({
        success: false,
        error: 'SSE failed'
      });

      await notificationOrchestrator.sendNotification(userId, mockNotificationData);

      expect(eventSpy).toHaveBeenCalledWith(
        'notification.failed',
        expect.objectContaining({
          userId,
          error: expect.any(String)
        })
      );
    });
  });

  describe('Limpeza e Recursos', () => {
    it('deve limpar recursos adequadamente', async () => {
      const userId = 'integration-user-123';
      const channelName = `user:${userId}:notifications`;

      // Criar recursos
      await ablyChannelService.createUserChannel(userId);
      await notificationOrchestrator.sendNotification(userId, mockNotificationData);

      // Verificar que recursos existem
      const statsBefore = ablyChannelService.getChannelStats(channelName);
      expect(statsBefore).toBeDefined();

      // Limpar recursos
      await ablyChannelService.removeChannel(channelName);
      await notificationOrchestrator.cleanup();

      // Verificar limpeza
      const metricsAfter = notificationOrchestrator.getMetrics();
      expect(metricsAfter.totalSent).toBe(0);
    });
  });

  describe('Configurações Dinâmicas', () => {
    it('deve respeitar configurações de fallback', async () => {
      const userId = 'integration-user-123';

      // Simular múltiplas falhas para ativar circuit breaker
      jest.spyOn(ablyService, 'publishNotification').mockResolvedValue({
        success: false,
        error: 'Persistent failure'
      });

      // Enviar várias notificações para atingir threshold
      for (let i = 0; i < 6; i++) {
        await notificationOrchestrator.sendNotification(userId, {
          ...mockNotificationData,
          id: `notif-${i}`
        });
      }

      const healthStatus = notificationOrchestrator.getHealthStatus();
      expect(healthStatus.circuitBreaker.open).toBe(true);
    });

    it('deve aplicar configurações de retry', async () => {
      const userId = 'integration-user-123';
      let callCount = 0;

      jest.spyOn(ablyService, 'publishNotification').mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ success: false, error: 'Temporary failure' });
        }
        return Promise.resolve({ success: true, messageId: 'msg-123' });
      });

      const result = await notificationOrchestrator.sendNotification(
        userId,
        mockNotificationData
      );

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Deve ter tentado 3 vezes
    });
  });
});