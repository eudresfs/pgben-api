import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { AblyService } from '../services/ably.service';
import { SseService } from '../services/sse.service';
import { SseHealthCheckService } from '../services/sse-health-check.service';
import { IAblyNotificationData, NotificationType, NotificationPriority } from '../interfaces/ably.interface';

describe('NotificationOrchestratorService', () => {
  let service: NotificationOrchestratorService;
  let ablyService: AblyService;
  let sseService: SseService;
  let sseHealthCheckService: SseHealthCheckService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  const mockConfig = {
    ABLY_ENABLE_FALLBACK: true,
    ABLY_FALLBACK_THRESHOLD: 3,
    ABLY_CIRCUIT_BREAKER_THRESHOLD: 5,
    ABLY_CIRCUIT_BREAKER_TIMEOUT: 60000,
    ABLY_RETRY_MAX_ATTEMPTS: 3,
    ABLY_RETRY_DELAY: 1000
  };

  const mockNotification: IAblyNotificationData = {
    id: 'notif-123',
    type: 'system' as NotificationType,
    title: 'Teste',
    message: 'Mensagem de teste',
    priority: 'high' as NotificationPriority,
    data: { test: true },
    timestamp: new Date(),
    senderId: 'sender-123'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationOrchestratorService,
        {
          provide: AblyService,
          useValue: {
            publishNotification: jest.fn(),
            isHealthy: jest.fn(),
            getConnectionState: jest.fn(),
            getMetrics: jest.fn()
          }
        },
        {
          provide: 'AblyChannelService',
          useValue: {
            publishToChannel: jest.fn(),
            subscribeToChannel: jest.fn(),
            getChannelStats: jest.fn()
          }
        },
        {
          provide: 'AblyAuthService',
          useValue: {
            generateToken: jest.fn(),
            validateToken: jest.fn()
          }
        },
        {
          provide: SseService,
          useValue: {
            sendNotificationToUser: jest.fn(),
            broadcastNotification: jest.fn(),
            isHealthy: jest.fn()
          }
        },
        {
          provide: SseHealthCheckService,
          useValue: {
            isHealthy: jest.fn(),
            getHealthStatus: jest.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key])
          }
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<NotificationOrchestratorService>(NotificationOrchestratorService);
    ablyService = module.get<AblyService>(AblyService);
    sseService = module.get<SseService>(SseService);
    sseHealthCheckService = module.get<SseHealthCheckService>(SseHealthCheckService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve inicializar com configurações corretas', async () => {
      await service.onModuleInit();
      
      expect(configService.get).toHaveBeenCalledWith('ABLY_ENABLE_FALLBACK');
      expect(configService.get).toHaveBeenCalledWith('ABLY_FALLBACK_THRESHOLD');
      expect(configService.get).toHaveBeenCalledWith('ABLY_CIRCUIT_BREAKER_THRESHOLD');
    });
  });

  describe('sendNotification', () => {
    const userId = 'user-123';
    const channelName = `user:${userId}:notifications`;

    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('Quando Ably está saudável', () => {
      beforeEach(() => {
        (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
        (ablyService.publishNotification as jest.Mock).mockResolvedValue({
          success: true,
          data: mockNotification
        });
      });

      it('deve enviar notificação via Ably', async () => {
        const result = await service.sendNotification(userId, mockNotification);
        
        expect(result.success).toBe(true);
        expect(result.method).toBe('ably');
        expect(ablyService.publishNotification).toHaveBeenCalledWith(channelName, mockNotification);
        expect(sseService.sendNotificationToUser).not.toHaveBeenCalled();
      });

      it('deve emitir evento de sucesso', async () => {
        await service.sendNotification(userId, mockNotification);
        
        expect(eventEmitter.emit).toHaveBeenCalledWith('notification.sent', {
          userId,
          notification: mockNotification,
          method: 'ably',
          success: true,
          timestamp: expect.any(Date)
        });
      });

      it('deve atualizar métricas de sucesso', async () => {
        await service.sendNotification(userId, mockNotification);
        
        const metrics = service.getMetrics();
        expect(metrics.totalSent).toBe(1);
        expect(metrics.ablySent).toBe(1);
        expect(metrics.sseSent).toBe(0);
      });
    });

    describe('Quando Ably falha', () => {
      beforeEach(() => {
        (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
        (ablyService.publishNotification as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Falha no Ably',
          errorCode: 'ABLY_ERROR'
        });
        (sseService.sendNotificationToUser as jest.Mock).mockResolvedValue({
          success: true
        });
      });

      it('deve fazer fallback para SSE', async () => {
        const result = await service.sendNotification(userId, mockNotification);
        
        expect(result.success).toBe(true);
        expect(result.method).toBe('sse');
        expect(result.fallbackUsed).toBe(true);
        expect(sseService.sendNotificationToUser).toHaveBeenCalledWith(userId, mockNotification);
      });

      it('deve incrementar contador de falhas', async () => {
        await service.sendNotification(userId, mockNotification);
        
        const metrics = service.getMetrics();
        expect(metrics.ablyFailures).toBe(1);
        expect(metrics.fallbacksUsed).toBe(1);
      });
    });

    describe('Quando Ably está não saudável', () => {
      beforeEach(() => {
        (ablyService.isHealthy as jest.Mock).mockReturnValue(false);
        (sseService.sendNotificationToUser as jest.Mock).mockResolvedValue({
          success: true
        });
      });

      it('deve usar SSE diretamente', async () => {
        const result = await service.sendNotification(userId, mockNotification);
        
        expect(result.success).toBe(true);
        expect(result.method).toBe('sse');
        expect(result.fallbackUsed).toBe(true);
        expect(ablyService.publishNotification).not.toHaveBeenCalled();
        expect(sseService.sendNotificationToUser).toHaveBeenCalledWith(userId, mockNotification);
      });
    });

    describe('Quando ambos falham', () => {
      beforeEach(() => {
        (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
        (ablyService.publishNotification as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Falha no Ably'
        });
        (sseService.sendNotificationToUser as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Falha no SSE'
        });
      });

      it('deve retornar erro', async () => {
        const result = await service.sendNotification(userId, mockNotification);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Falha no SSE');
        expect(result.fallbackUsed).toBe(true);
      });

      it('deve emitir evento de falha', async () => {
        await service.sendNotification(userId, mockNotification);
        
        expect(eventEmitter.emit).toHaveBeenCalledWith('notification.failed', {
          userId,
          notification: mockNotification,
          error: 'Falha no SSE',
          timestamp: expect.any(Date)
        });
      });
    });
  });

  describe('broadcastNotification', () => {
    const broadcastData = {
      type: 'announcement' as NotificationType,
      title: 'Anúncio',
      message: 'Mensagem de anúncio',
      priority: 'normal' as NotificationPriority,
      target: {
        type: 'all' as const,
        value: undefined
      }
    };

    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('Quando Ably está saudável', () => {
      beforeEach(() => {
        (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
        (ablyService.publishNotification as jest.Mock).mockResolvedValue({
          success: true,
          data: mockNotification
        });
      });

      it('deve fazer broadcast via Ably', async () => {
        const result = await service.broadcastNotification(broadcastData);
        
        expect(result.success).toBe(true);
        expect(result.method).toBe('ably');
        expect(ablyService.publishNotification).toHaveBeenCalledWith(
          'broadcast:all',
          expect.objectContaining({
            type: broadcastData.type,
            title: broadcastData.title,
            message: broadcastData.message
          })
        );
      });
    });

    describe('Quando Ably falha', () => {
      beforeEach(() => {
        (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
        (ablyService.publishNotification as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Falha no broadcast'
        });
        (sseService.broadcastNotification as jest.Mock).mockResolvedValue({
          success: true
        });
      });

      it('deve fazer fallback para SSE', async () => {
        const result = await service.broadcastNotification(broadcastData);
        
        expect(result.success).toBe(true);
        expect(result.method).toBe('sse');
        expect(result.fallbackUsed).toBe(true);
        expect(sseService.broadcastNotification).toHaveBeenCalled();
      });
    });
  });

  describe('forceDeliveryMethod', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve forçar uso do Ably', async () => {
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: true,
        data: mockNotification
      });
      
      const result = await service.forceDeliveryMethod('ably', userId, mockNotification);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('ably');
      expect(ablyService.publishNotification).toHaveBeenCalled();
      expect(sseService.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('deve forçar uso do SSE', async () => {
      (sseService.sendNotificationToUser as jest.Mock).mockResolvedValue({
        success: true
      });
      
      const result = await service.forceDeliveryMethod('sse', userId, mockNotification);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('sse');
      expect(sseService.sendNotificationToUser).toHaveBeenCalled();
      expect(ablyService.publishNotification).not.toHaveBeenCalled();
    });

    it('deve retornar erro para método inválido', async () => {
      const result = await service.forceDeliveryMethod('invalid' as any, userId, mockNotification);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Método de entrega inválido');
      expect(result.errorCode).toBe('INVALID_DELIVERY_METHOD');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
      (sseService.sendNotificationToUser as jest.Mock).mockResolvedValue({
        success: true
      });
    });

    it('deve abrir circuit breaker após muitas falhas', async () => {
      const userId = 'user-123';
      
      // Simula falhas consecutivas
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha no Ably'
      });
      
      // Executa falhas até atingir o threshold
      for (let i = 0; i < 5; i++) {
        await service.sendNotification(userId, mockNotification);
      }
      
      // Próxima tentativa deve usar SSE diretamente
      (ablyService.publishNotification as jest.Mock).mockClear();
      
      const result = await service.sendNotification(userId, mockNotification);
      
      expect(result.method).toBe('sse');
      expect(ablyService.publishNotification).not.toHaveBeenCalled();
    });

    it('deve resetar circuit breaker após timeout', async () => {
      const userId = 'user-123';
      
      // Simula falhas para abrir circuit breaker
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha no Ably'
      });
      
      for (let i = 0; i < 5; i++) {
        await service.sendNotification(userId, mockNotification);
      }
      
      // Simula passagem do tempo
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000); // 61 segundos
      
      // Simula sucesso após reset
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: true,
        data: mockNotification
      });
      
      const result = await service.sendNotification(userId, mockNotification);
      
      expect(result.method).toBe('ably');
      expect(ablyService.publishNotification).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.onModuleInit();
      (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
    });

    it('deve tentar novamente após falha temporária', async () => {
      let callCount = 0;
      (ablyService.publishNotification as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Falha temporária',
            errorCode: 'TEMPORARY_ERROR'
          });
        }
        return Promise.resolve({
          success: true,
          data: mockNotification
        });
      });
      
      const result = await service.sendNotification(userId, mockNotification);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('ably');
      expect(ablyService.publishNotification).toHaveBeenCalledTimes(2);
    });

    it('deve parar de tentar após máximo de tentativas', async () => {
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha persistente',
        errorCode: 'PERSISTENT_ERROR'
      });
      
      (sseService.sendNotificationToUser as jest.Mock).mockResolvedValue({
        success: true
      });
      
      const result = await service.sendNotification(userId, mockNotification);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('sse');
      expect(result.fallbackUsed).toBe(true);
      expect(ablyService.publishNotification).toHaveBeenCalledTimes(3); // Máximo de tentativas
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve retornar status de saúde', () => {
      (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
      (sseHealthCheckService.isHealthy as jest.Mock).mockReturnValue(true);
      
      const health = service.getHealthStatus();
      
      expect(health.healthy).toBe(true);
      expect(health.ably.healthy).toBe(true);
      expect(health.sse.healthy).toBe(true);
    });

    it('deve detectar problemas de saúde', () => {
      (ablyService.isHealthy as jest.Mock).mockReturnValue(false);
      (sseHealthCheckService.isHealthy as jest.Mock).mockReturnValue(true);
      
      const health = service.getHealthStatus();
      
      expect(health.healthy).toBe(false);
      expect(health.ably.healthy).toBe(false);
      expect(health.sse.healthy).toBe(true);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve retornar métricas iniciais', () => {
      const metrics = service.getMetrics();
      
      expect(metrics).toEqual({
        totalSent: 0,
        ablySent: 0,
        sseSent: 0,
        ablyFailures: 0,
        sseFailures: 0,
        fallbacksUsed: 0,
        circuitBreakerOpen: false,
        averageResponseTime: 0,
        lastError: null
      });
    });

    it('deve atualizar métricas após envios', async () => {
      const userId = 'user-123';
      
      (ablyService.isHealthy as jest.Mock).mockReturnValue(true);
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: true,
        data: mockNotification
      });
      
      await service.sendNotification(userId, mockNotification);
      
      const metrics = service.getMetrics();
      expect(metrics.totalSent).toBe(1);
      expect(metrics.ablySent).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao destruir módulo', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();
      
      // Verifica se métricas foram resetadas
      const metrics = service.getMetrics();
      expect(metrics.totalSent).toBe(0);
    });
  });

  describe('Validações', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve validar userId', async () => {
      const result = await service.sendNotification('', mockNotification);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID do usuário é obrigatório');
      expect(result.errorCode).toBe('INVALID_USER_ID');
    });

    it('deve validar dados de notificação', async () => {
      const invalidNotification = {
        ...mockNotification,
        id: '',
        title: '',
        message: ''
      };
      
      const result = await service.sendNotification('user-123', invalidNotification);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Dados de notificação inválidos');
      expect(result.errorCode).toBe('INVALID_NOTIFICATION_DATA');
    });
  });
});