import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AblyChannelService } from '../services/ably-channel.service';
import { AblyService } from '../services/ably.service';
import {
  IAblyNotificationData,
  NotificationType,
  NotificationPriority,
  IAblyChannelStats,
} from '../interfaces/ably.interface';
import * as Ably from 'ably';

describe('AblyChannelService', () => {
  let service: AblyChannelService;
  let ablyService: AblyService;
  let eventEmitter: EventEmitter2;
  let mockChannel: jest.Mocked<Ably.RealtimeChannel>;
  let mockPresence: jest.Mocked<Ably.RealtimePresence>;

  beforeEach(async () => {
    // Setup mocks
    mockPresence = {
      enter: jest.fn(),
      leave: jest.fn(),
      get: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as any;

    mockChannel = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      presence: mockPresence,
      history: jest.fn(),
      state: 'attached',
      name: 'test-channel',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AblyChannelService,
        {
          provide: 'ABLY_CONFIG',
          useValue: {
            validateConfig: jest.fn(),
            getClientOptions: jest.fn().mockReturnValue({
              key: 'test-api-key',
              environment: 'test',
              clientId: 'test-client',
            }),
            getChannelName: jest.fn().mockReturnValue('test-channel'),
            channelNotifications: 'notifications',
            channelSystem: 'system',
            channelUser: 'user',
          },
        },
        {
          provide: AblyService,
          useValue: {
            getChannel: jest.fn().mockReturnValue(mockChannel),
            publishNotification: jest.fn(),
            subscribeToChannel: jest.fn(),
            unsubscribeFromChannel: jest.fn(),
            isHealthy: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AblyChannelService>(AblyChannelService);
    ablyService = module.get<AblyService>(AblyService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve inicializar canais padrão', async () => {
      await service.onModuleInit();

      expect(ablyService.getChannel).toHaveBeenCalledWith(
        'notifications:general',
      );
      expect(ablyService.getChannel).toHaveBeenCalledWith('system:alerts');
      expect(ablyService.getChannel).toHaveBeenCalledWith('audit:logs');
    });
  });

  describe('createUserChannel', () => {
    const userId = 'user-123';
    const expectedChannelName = `user:${userId}:notifications`;

    it('deve criar canal de usuário com sucesso', async () => {
      const result = await service.createUserChannel(userId);

      expect(result.success).toBe(true);
      expect(result.channelName).toBe(expectedChannelName);
      expect(ablyService.getChannel).toHaveBeenCalledWith(expectedChannelName);
    });

    it('deve configurar listeners para canal de usuário', async () => {
      await service.createUserChannel(userId);

      expect(mockChannel.subscribe).toHaveBeenCalledWith(
        'notification',
        expect.any(Function),
      );
      expect(mockPresence.subscribe).toHaveBeenCalledWith(
        'enter',
        expect.any(Function),
      );
      expect(mockPresence.subscribe).toHaveBeenCalledWith(
        'leave',
        expect.any(Function),
      );
    });

    it('deve retornar erro para userId inválido', async () => {
      const result = await service.createUserChannel('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID do usuário é obrigatório');
      expect(result.errorCode).toBe('INVALID_USER_ID');
    });

    it('deve retornar erro quando criação falha', async () => {
      const error = new Error('Falha na criação do canal');
      (ablyService.getChannel as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const result = await service.createUserChannel(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na criação do canal');
      expect(result.errorCode).toBe('CHANNEL_CREATION_FAILED');
    });
  });

  describe('createBroadcastChannel', () => {
    const channelType = 'department';
    const targetId = 'dept-123';
    const expectedChannelName = `broadcast:${channelType}:${targetId}`;

    it('deve criar canal de broadcast com sucesso', async () => {
      const result = await service.createBroadcastChannel(
        channelType,
        targetId,
      );

      expect(result.success).toBe(true);
      expect(result.channelName).toBe(expectedChannelName);
      expect(ablyService.getChannel).toHaveBeenCalledWith(expectedChannelName);
    });

    it('deve configurar listeners para canal de broadcast', async () => {
      await service.createBroadcastChannel(channelType, targetId);

      expect(mockChannel.subscribe).toHaveBeenCalledWith(
        'broadcast',
        expect.any(Function),
      );
    });

    it('deve retornar erro para parâmetros inválidos', async () => {
      const result = await service.createBroadcastChannel('', targetId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tipo de canal e ID do alvo são obrigatórios');
      expect(result.errorCode).toBe('INVALID_BROADCAST_PARAMS');
    });
  });

  describe('publishToChannel', () => {
    const channelName = 'test-channel';
    const mockNotification: IAblyNotificationData = {
      id: 'notif-123',
      type: 'system' as NotificationType,
      title: 'Teste',
      message: 'Mensagem de teste',
      priority: 'normal' as NotificationPriority,
      data: { test: true },
      timestamp: new Date(),
      senderId: 'sender-123',
    };

    beforeEach(() => {
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: true,
        data: mockNotification,
      });
    });

    it('deve publicar notificação com sucesso', async () => {
      const result = await service.publishToChannel(
        channelName,
        mockNotification,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotification);
      expect(ablyService.publishNotification).toHaveBeenCalledWith(
        channelName,
        mockNotification,
      );
    });

    it('deve atualizar estatísticas do canal', async () => {
      await service.publishToChannel(channelName, mockNotification);

      const stats = service.getChannelStats(channelName);
      expect(stats?.messagesSent).toBe(1);
      expect(stats?.lastActivity).toBeInstanceOf(Date);
    });

    it('deve emitir evento de publicação', async () => {
      await service.publishToChannel(channelName, mockNotification);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ably.channel.message.published',
        {
          channelName,
          notification: mockNotification,
          timestamp: expect.any(Date),
        },
      );
    });

    it('deve retornar erro quando publicação falha', async () => {
      (ablyService.publishNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha na publicação',
        errorCode: 'PUBLISH_FAILED',
      });

      const result = await service.publishToChannel(
        channelName,
        mockNotification,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na publicação');
      expect(result.errorCode).toBe('PUBLISH_FAILED');
    });
  });

  describe('subscribeToUserChannel', () => {
    const userId = 'user-123';
    const callback = jest.fn();

    it('deve inscrever-se no canal do usuário', async () => {
      (ablyService.subscribeToChannel as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await service.subscribeToUserChannel(userId, callback);

      expect(result.success).toBe(true);
      expect(ablyService.subscribeToChannel).toHaveBeenCalledWith(
        `user:${userId}:notifications`,
        callback,
      );
    });

    it('deve retornar erro para userId inválido', async () => {
      const result = await service.subscribeToUserChannel('', callback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID do usuário é obrigatório');
    });
  });

  describe('unsubscribeFromUserChannel', () => {
    const userId = 'user-123';

    it('deve cancelar inscrição do canal do usuário', async () => {
      (ablyService.unsubscribeFromChannel as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await service.unsubscribeFromUserChannel(userId);

      expect(result.success).toBe(true);
      expect(ablyService.unsubscribeFromChannel).toHaveBeenCalledWith(
        `user:${userId}:notifications`,
      );
    });
  });

  describe('enterChannelPresence', () => {
    const channelName = 'test-channel';
    const userId = 'user-123';
    const userData = { name: 'Test User', role: 'ADMIN' };

    it('deve entrar na presença do canal', async () => {
      mockPresence.enter.mockResolvedValue(undefined);

      const result = await service.enterChannelPresence(
        channelName,
        userId,
        userData,
      );

      expect(result.success).toBe(true);
      expect(mockPresence.enter).toHaveBeenCalledWith({
        userId,
        ...userData,
        timestamp: expect.any(Date),
      });
    });

    it('deve retornar erro quando entrada na presença falha', async () => {
      const error = new Error('Falha na presença');
      mockPresence.enter.mockRejectedValue(error);

      const result = await service.enterChannelPresence(
        channelName,
        userId,
        userData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na presença');
    });
  });

  describe('leaveChannelPresence', () => {
    const channelName = 'test-channel';
    const userId = 'user-123';

    it('deve sair da presença do canal', async () => {
      mockPresence.leave.mockResolvedValue(undefined);

      const result = await service.leaveChannelPresence(channelName, userId);

      expect(result.success).toBe(true);
      expect(mockPresence.leave).toHaveBeenCalledWith({
        userId,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('getChannelPresence', () => {
    const channelName = 'test-channel';
    const mockPresenceMembers = [
      { clientId: 'user-1', data: { name: 'User 1' } },
      { clientId: 'user-2', data: { name: 'User 2' } },
    ];

    it('deve retornar membros presentes no canal', async () => {
      mockPresence.get.mockResolvedValue(mockPresenceMembers as any);

      const result = await service.getChannelPresence(channelName);

      expect(result.success).toBe(true);
      expect(result.members).toEqual(mockPresenceMembers);
    });

    it('deve retornar erro quando busca de presença falha', async () => {
      const error = new Error('Falha na busca de presença');
      mockPresence.get.mockRejectedValue(error);

      const result = await service.getChannelPresence(channelName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na busca de presença');
    });
  });

  describe('getChannelStats', () => {
    const channelName = 'test-channel';

    it('deve retornar estatísticas do canal', () => {
      // Simula atividade no canal
      service['channelStats'].set(channelName, {
        channelName,
        messagesSent: 5,
        messagesReceived: 3,
        activeSubscribers: 2,
        presenceMembers: 1,
        lastActivity: new Date(),
        createdAt: new Date(),
      });

      const stats = service.getChannelStats(channelName);

      expect(stats).toBeDefined();
      expect(stats?.messagesSent).toBe(5);
      expect(stats?.messagesReceived).toBe(3);
      expect(stats?.activeSubscribers).toBe(2);
    });

    it('deve retornar null para canal inexistente', () => {
      const stats = service.getChannelStats('non-existent-channel');
      expect(stats).toBeNull();
    });
  });

  describe('getAllChannelStats', () => {
    it('deve retornar estatísticas de todos os canais', () => {
      const channel1Stats: IAblyChannelStats = {
        channelName: 'channel-1',
        messagesSent: 5,
        messagesReceived: 3,
        activeSubscribers: 2,
        presenceMembers: 1,
        lastActivity: new Date(),
        createdAt: new Date(),
      };

      const channel2Stats: IAblyChannelStats = {
        channelName: 'channel-2',
        messagesSent: 10,
        messagesReceived: 8,
        activeSubscribers: 4,
        presenceMembers: 2,
        lastActivity: new Date(),
        createdAt: new Date(),
      };

      service['channelStats'].set('channel-1', channel1Stats);
      service['channelStats'].set('channel-2', channel2Stats);

      const allStats = service.getAllChannelStats();

      expect(allStats).toHaveLength(2);
      expect(allStats).toContain(channel1Stats);
      expect(allStats).toContain(channel2Stats);
    });

    it('deve retornar array vazio quando não há canais', () => {
      const allStats = service.getAllChannelStats();
      expect(allStats).toEqual([]);
    });
  });

  describe('removeChannel', () => {
    const channelName = 'test-channel';

    beforeEach(() => {
      // Adiciona canal às estatísticas
      service['channelStats'].set(channelName, {
        channelName,
        messagesSent: 5,
        messagesReceived: 3,
        activeSubscribers: 2,
        presenceMembers: 1,
        lastActivity: new Date(),
        createdAt: new Date(),
      });
    });

    it('deve remover canal com sucesso', async () => {
      (ablyService.unsubscribeFromChannel as jest.Mock).mockResolvedValue({
        success: true,
      });
      mockPresence.leave.mockResolvedValue(undefined);

      const result = await service.removeChannel(channelName);

      expect(result.success).toBe(true);
      expect(service.getChannelStats(channelName)).toBeNull();
      expect(ablyService.unsubscribeFromChannel).toHaveBeenCalledWith(
        channelName,
      );
    });

    it('deve emitir evento de remoção de canal', async () => {
      (ablyService.unsubscribeFromChannel as jest.Mock).mockResolvedValue({
        success: true,
      });
      mockPresence.leave.mockResolvedValue(undefined);

      await service.removeChannel(channelName);

      expect(eventEmitter.emit).toHaveBeenCalledWith('ably.channel.removed', {
        channelName,
        timestamp: expect.any(Date),
      });
    });

    it('deve retornar erro quando remoção falha', async () => {
      (ablyService.unsubscribeFromChannel as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Falha na remoção',
        errorCode: 'UNSUBSCRIBE_FAILED',
      });

      const result = await service.removeChannel(channelName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na remoção');
    });
  });

  describe('Listeners de Canal', () => {
    const channelName = 'test-channel';
    const mockMessage = {
      data: {
        id: 'notif-123',
        type: 'system',
        title: 'Test',
        message: 'Test message',
      },
    };

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve processar mensagens recebidas', () => {
      // Simula configuração de listener
      const messageHandler = jest.fn();
      mockChannel.subscribe.mockImplementation((event, handler) => {
        if (event === 'notification') {
          messageHandler.mockImplementation(handler);
        }
      });

      service.createUserChannel('user-123');

      // Simula recebimento de mensagem
      messageHandler(mockMessage);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ably.channel.message.received',
        {
          channelName: expect.stringContaining('user:user-123'),
          message: mockMessage,
          timestamp: expect.any(Date),
        },
      );
    });

    it('deve processar eventos de presença', () => {
      const presenceHandler = jest.fn();
      mockPresence.subscribe.mockImplementation((event, handler) => {
        if (event === 'enter') {
          presenceHandler.mockImplementation(handler);
        }
      });

      service.createUserChannel('user-123');

      const presenceMessage = {
        clientId: 'user-456',
        data: { name: 'Test User' },
      };

      presenceHandler(presenceMessage);

      expect(eventEmitter.emit).toHaveBeenCalledWith('ably.presence.enter', {
        channelName: expect.stringContaining('user:user-123'),
        member: presenceMessage,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao destruir módulo', async () => {
      // Adiciona alguns canais
      await service.createUserChannel('user-1');
      await service.createUserChannel('user-2');

      await service.onModuleDestroy();

      expect(service.getAllChannelStats()).toEqual([]);
    });
  });

  describe('Validações', () => {
    it('deve validar nome do canal', async () => {
      const mockNotification: IAblyNotificationData = {
        id: 'test',
        type: 'system' as NotificationType,
        title: 'Test',
        message: 'Test message',
        priority: 'normal' as NotificationPriority,
        data: {},
        timestamp: new Date(),
        senderId: 'test',
      };

      const result = await service.publishToChannel('', mockNotification);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CHANNEL_NAME');
    });

    it('deve validar dados de notificação', async () => {
      const invalidNotification = {
        id: '',
        type: 'system' as NotificationType,
        title: '',
        message: '',
        priority: 'normal' as NotificationPriority,
        data: {},
        timestamp: new Date(),
        senderId: '',
      };

      const result = await service.publishToChannel(
        'test-channel',
        invalidNotification,
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_NOTIFICATION_DATA');
    });
  });
});
