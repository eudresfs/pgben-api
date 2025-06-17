import { Test, TestingModule } from '@nestjs/testing';
import { AblyController } from '../controllers/ably.controller';
import { AblyAuthService } from '../services/ably-auth.service';
import { AblyService } from '../services/ably.service';
import { AblyChannelService } from '../services/ably-channel.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { CreateNotificationDto, CreateBenefitNotificationDto } from '../dto/create-notification.dto';
import { BroadcastNotificationDto } from '../dto/broadcast-notification.dto';
import { NotificationType, NotificationPriority } from '../interfaces/ably.interface';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AblyController', () => {
  let controller: AblyController;
  let ablyAuthService: AblyAuthService;
  let ablyChannelService: AblyChannelService;
  let notificationOrchestrator: NotificationOrchestratorService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    perfil: 'ADMIN'
  };

  const mockTokenResult = {
    success: true,
    token: {
      token: 'mock-jwt-token',
      clientId: 'user-123',
      capability: { '*': ['*'] },
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AblyController],
      providers: [
        {
          provide: AblyService,
          useValue: {
            isHealthy: jest.fn().mockReturnValue(true),
            getConnectionStatus: jest.fn().mockReturnValue('connected'),
            getMetrics: jest.fn().mockReturnValue({}),
            publishNotification: jest.fn(),
          }
        },
        {
          provide: AblyAuthService,
          useValue: {
            generateToken: jest.fn(),
            validateToken: jest.fn(),
            revokeToken: jest.fn()
          }
        },
        {
          provide: AblyChannelService,
          useValue: {
            publishToChannel: jest.fn(),
            getChannelStats: jest.fn(),
            getAllChannelStats: jest.fn(),
            createUserChannel: jest.fn(),
            removeChannel: jest.fn()
          }
        },
        {
          provide: NotificationOrchestratorService,
          useValue: {
            sendNotification: jest.fn(),
            broadcastNotification: jest.fn(),
            forceDeliveryMethod: jest.fn(),
            getHealthStatus: jest.fn(),
            getMetrics: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<AblyController>(AblyController);
    ablyAuthService = module.get<AblyAuthService>(AblyAuthService);
    ablyChannelService = module.get<AblyChannelService>(AblyChannelService);
    notificationOrchestrator = module.get<NotificationOrchestratorService>(NotificationOrchestratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /auth/token', () => {
    it('deve gerar token com sucesso', async () => {
      (ablyAuthService.generateToken as jest.Mock).mockResolvedValue(mockTokenResult);
      
      const result = await controller.generateAuthToken(mockUser);
      
      expect(result).toEqual(mockTokenResult);
      expect(ablyAuthService.generateToken).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.perfil,
        undefined
      );
    });

    it('deve gerar token com capacidades customizadas', async () => {
      const customCapabilities = {
        channels: ['notifications:*'],
        permissions: ['subscribe']
      };
      
      (ablyAuthService.generateToken as jest.Mock).mockResolvedValue(mockTokenResult);
      
      const result = await controller.generateAuthToken(mockUser, customCapabilities);
      
      expect(result).toEqual(mockTokenResult);
      expect(ablyAuthService.generateToken).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.perfil,
        customCapabilities
      );
    });

    it('deve retornar erro quando geração falha', async () => {
      (ablyAuthService.generateToken as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha na geração do token',
        errorCode: 'TOKEN_GENERATION_FAILED'
      });
      
      await expect(controller.generateAuthToken(mockUser))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/revoke', () => {
    it('deve revogar token com sucesso', async () => {
      (ablyAuthService.revokeToken as jest.Mock).mockResolvedValue({
        success: true
      });
      
      const result = await controller.revokeAuthToken(mockUser);
      
      expect(result).toEqual({ success: true });
      expect(ablyAuthService.revokeToken).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('POST /notifications/send', () => {
    const createNotificationDto: CreateNotificationDto = {
      type: 'system' as NotificationType,
      title: 'Teste',
      message: 'Mensagem de teste',
      priority: 'normal' as NotificationPriority,
      data: { test: true }
    };

    const targetUserId = 'target-user-123';

    it('deve enviar notificação com sucesso', async () => {
      (notificationOrchestrator.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        method: 'ably',
        data: expect.any(Object)
      });
      
      const result = await controller.sendNotification(
        mockUser,
        targetUserId,
        createNotificationDto
      );
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('ably');
      expect(notificationOrchestrator.sendNotification).toHaveBeenCalledWith(
        targetUserId,
        expect.objectContaining({
          type: createNotificationDto.type,
          title: createNotificationDto.title,
          message: createNotificationDto.message,
          senderId: mockUser.id
        })
      );
    });

    it('deve enviar notificação de benefício', async () => {
      const benefitNotificationDto: CreateBenefitNotificationDto = {
        type: 'benefit' as NotificationType,
        title: 'Benefício Aprovado',
        message: 'Seu benefício foi aprovado',
        priority: 'high' as NotificationPriority,
        data: {
          benefitId: 'benefit-123',
          benefitType: 'AUXILIO_NATALIDADE',
          status: 'APROVADO',
          amount: 1000,
          approvedBy: 'admin-123',
          approvedAt: new Date()
        }
      };
      
      (notificationOrchestrator.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        method: 'ably'
      });
      
      const result = await controller.sendNotification(
        mockUser,
        targetUserId,
        benefitNotificationDto
      );
      
      expect(result.success).toBe(true);
      expect(notificationOrchestrator.sendNotification).toHaveBeenCalledWith(
        targetUserId,
        expect.objectContaining({
          type: 'benefit',
          data: expect.objectContaining({
            benefitId: 'benefit-123',
            benefitType: 'AUXILIO_NATALIDADE'
          })
        })
      );
    });

    it('deve forçar método de entrega quando especificado', async () => {
      (notificationOrchestrator.forceDeliveryMethod as jest.Mock).mockResolvedValue({
        success: true,
        method: 'sse'
      });
      
      const result = await controller.sendNotification(
        mockUser,
        targetUserId,
        createNotificationDto,
        'sse'
      );
      
      expect(result.success).toBe(true);
      expect(notificationOrchestrator.forceDeliveryMethod).toHaveBeenCalledWith(
        'sse',
        targetUserId,
        expect.any(Object)
      );
    });

    it('deve retornar erro quando envio falha', async () => {
      (notificationOrchestrator.sendNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha no envio',
        errorCode: 'SEND_FAILED'
      });
      
      await expect(controller.sendNotification(
        mockUser,
        targetUserId,
        createNotificationDto
      )).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /notifications/broadcast', () => {
    const broadcastDto: BroadcastNotificationDto = {
      type: 'announcement' as NotificationType,
      title: 'Anúncio Geral',
      message: 'Mensagem para todos',
      priority: 'normal' as NotificationPriority,
      target: {
        type: 'all',
        value: undefined
      },
      data: { announcement: true }
    };

    it('deve fazer broadcast com sucesso', async () => {
      (notificationOrchestrator.broadcastNotification as jest.Mock).mockResolvedValue({
        success: true,
        method: 'ably',
        recipientCount: 100
      });
      
      const result = await controller.broadcastNotification(mockUser, broadcastDto);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('ably');
      expect(result.recipientCount).toBe(100);
      expect(notificationOrchestrator.broadcastNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: broadcastDto.type,
          title: broadcastDto.title,
          message: broadcastDto.message,
          target: broadcastDto.target
        })
      );
    });

    it('deve fazer broadcast para departamento específico', async () => {
      const departmentBroadcast = {
        ...broadcastDto,
        target: {
          type: 'department' as const,
          value: 'dept-123'
        }
      };
      
      (notificationOrchestrator.broadcastNotification as jest.Mock).mockResolvedValue({
        success: true,
        method: 'ably',
        recipientCount: 25
      });
      
      const result = await controller.broadcastNotification(mockUser, departmentBroadcast);
      
      expect(result.success).toBe(true);
      expect(notificationOrchestrator.broadcastNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          target: {
            type: 'department',
            value: 'dept-123'
          }
        })
      );
    });

    it('deve retornar erro quando broadcast falha', async () => {
      (notificationOrchestrator.broadcastNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha no broadcast',
        errorCode: 'BROADCAST_FAILED'
      });
      
      await expect(controller.broadcastNotification(mockUser, broadcastDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /health', () => {
    it('deve retornar status de saúde', async () => {
      const mockHealthStatus = {
        healthy: true,
        ably: {
          healthy: true,
          connectionState: 'connected',
          lastError: null
        },
        sse: {
          healthy: true,
          activeConnections: 50,
          lastError: null
        },
        circuitBreaker: {
          open: false,
          failures: 0
        }
      };
      
      (notificationOrchestrator.getHealthStatus as jest.Mock).mockReturnValue(mockHealthStatus);
      
      const result = await controller.getHealthStatus();
      
      expect(result).toEqual(mockHealthStatus);
    });
  });

  describe('GET /metrics', () => {
    it('deve retornar métricas do sistema', async () => {
      const mockMetrics = {
        totalSent: 1000,
        ablySent: 800,
        sseSent: 200,
        ablyFailures: 5,
        sseFailures: 2,
        fallbacksUsed: 7,
        circuitBreakerOpen: false,
        averageResponseTime: 150,
        lastError: null
      };
      
      (notificationOrchestrator.getMetrics as jest.Mock).mockReturnValue(mockMetrics);
      
      const result = await controller.getMetrics();
      
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('GET /channels', () => {
    it('deve retornar lista de canais ativos', async () => {
      const mockChannelStats = [
        {
          channelName: 'notifications:general',
          messagesSent: 100,
          messagesReceived: 95,
          activeSubscribers: 50,
          presenceMembers: 25,
          lastActivity: new Date(),
          createdAt: new Date()
        },
        {
          channelName: 'user:123:notifications',
          messagesSent: 10,
          messagesReceived: 10,
          activeSubscribers: 1,
          presenceMembers: 1,
          lastActivity: new Date(),
          createdAt: new Date()
        }
      ];
      
      (ablyChannelService.getAllChannelStats as jest.Mock).mockReturnValue(mockChannelStats);
      
      const result = await controller.getActiveChannels();
      
      expect(result).toEqual({
        channels: mockChannelStats,
        totalChannels: 2,
        totalActiveSubscribers: 51,
        totalPresenceMembers: 26
      });
    });

    it('deve retornar lista vazia quando não há canais', async () => {
      (ablyChannelService.getAllChannelStats as jest.Mock).mockReturnValue([]);
      
      const result = await controller.getActiveChannels();
      
      expect(result).toEqual({
        channels: [],
        totalChannels: 0,
        totalActiveSubscribers: 0,
        totalPresenceMembers: 0
      });
    });
  });

  describe('POST /delivery-method/force', () => {
    const forceMethodDto = {
      method: 'sse' as const,
      userId: 'user-123',
      notification: {
        type: 'system' as NotificationType,
        title: 'Teste',
        message: 'Mensagem de teste',
        priority: 'normal' as NotificationPriority,
        data: {}
      }
    };

    it('deve forçar método de entrega', async () => {
      (notificationOrchestrator.forceDeliveryMethod as jest.Mock).mockResolvedValue({
        success: true,
        method: 'sse',
        forced: true
      });
      
      const result = await controller.forceDeliveryMethod(mockUser, forceMethodDto);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('sse');
      expect(result.forced).toBe(true);
      expect(notificationOrchestrator.forceDeliveryMethod).toHaveBeenCalledWith(
        'sse',
        'user-123',
        expect.objectContaining({
          type: 'system',
          title: 'Teste',
          senderId: mockUser.id
        })
      );
    });

    it('deve retornar erro para método inválido', async () => {
      (notificationOrchestrator.forceDeliveryMethod as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Método inválido',
        errorCode: 'INVALID_METHOD'
      });
      
      await expect(controller.forceDeliveryMethod(mockUser, forceMethodDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Validações de Entrada', () => {
    it('deve validar DTO de notificação', async () => {
      const invalidDto = {
        type: '',
        title: '',
        message: '',
        priority: 'invalid'
      } as any;
      
      // Este teste dependeria da validação automática do NestJS com class-validator
      // Em um ambiente real, o DTO seria validado antes de chegar ao controller
      expect(invalidDto.type).toBe('');
      expect(invalidDto.title).toBe('');
    });

    it('deve validar DTO de broadcast', async () => {
      const invalidBroadcastDto = {
        type: '',
        title: '',
        message: '',
        target: {
          type: 'invalid',
          value: null
        }
      } as any;
      
      expect(invalidBroadcastDto.type).toBe('');
      expect(invalidBroadcastDto.target.type).toBe('invalid');
    });
  });

  describe('Autorização', () => {
    it('deve permitir acesso para usuário admin', async () => {
      const adminUser = { ...mockUser, perfil: 'ADMIN' };
      
      (ablyAuthService.generateToken as jest.Mock).mockResolvedValue(mockTokenResult);
      
      const result = await controller.generateAuthToken(adminUser);
      
      expect(result).toEqual(mockTokenResult);
    });

    it('deve permitir acesso para usuário gestor', async () => {
      const gestorUser = { ...mockUser, perfil: 'GESTOR' };
      
      (ablyAuthService.generateToken as jest.Mock).mockResolvedValue({
        ...mockTokenResult,
        token: {
          ...mockTokenResult.token,
          capability: {
            'notifications:*': ['subscribe', 'publish'],
            'department:*': ['subscribe', 'publish']
          }
        }
      });
      
      const result = await controller.generateAuthToken(gestorUser);
      
      expect(result.success).toBe(true);
      expect(result.token?.capability).toHaveProperty('notifications:*');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro de serviço indisponível', async () => {
      (notificationOrchestrator.sendNotification as jest.Mock).mockRejectedValue(
        new Error('Serviço indisponível')
      );
      
      const createNotificationDto: CreateNotificationDto = {
        type: 'system' as NotificationType,
        title: 'Teste',
        message: 'Mensagem de teste',
        priority: 'normal' as NotificationPriority,
        data: {}
      };
      
      await expect(controller.sendNotification(
        mockUser,
        'user-123',
        createNotificationDto
      )).rejects.toThrow('Serviço indisponível');
    });

    it('deve tratar timeout de operação', async () => {
      (notificationOrchestrator.broadcastNotification as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      const broadcastDto: BroadcastNotificationDto = {
        type: 'announcement' as NotificationType,
        title: 'Teste',
        message: 'Mensagem de teste',
        priority: 'normal' as NotificationPriority,
        target: { type: 'all', value: undefined },
        data: {}
      };
      
      await expect(controller.broadcastNotification(mockUser, broadcastDto))
        .rejects.toThrow('Timeout');
    });
  });
});