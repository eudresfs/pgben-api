import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AblyService } from '../services/ably.service';
import { AblyConfig } from '../../../config/ably.config';
import {
  IAblyNotificationData,
  NotificationType,
  NotificationPriority,
} from '../interfaces/ably.interface';
import * as Ably from 'ably';

// Mock do Ably
jest.mock('ably');

describe('AblyService', () => {
  let service: AblyService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let mockAblyRealtime: jest.Mocked<Ably.Realtime>;
  let mockAblyRest: jest.Mocked<Ably.Rest>;
  let mockChannel: jest.Mocked<Ably.RealtimeChannel>;

  const mockConfig = {
    ABLY_API_KEY: 'test-api-key',
    ABLY_ENVIRONMENT: 'test',
    ABLY_CLIENT_ID: 'test-client',
    ABLY_JWT_EXPIRES_IN: '1h',
    ABLY_JWT_CAPABILITIES: JSON.stringify({ '*': ['*'] }),
    ABLY_CHANNEL_PREFIX: 'test',
    ABLY_CONNECTION_TIMEOUT: 5000,
    ABLY_MAX_MESSAGE_SIZE: 65536,
    ABLY_HEARTBEAT_INTERVAL: 30000,
    ABLY_MAX_RECONNECT_ATTEMPTS: 5,
    ABLY_ENABLE_TLS: true,
    ABLY_LOG_LEVEL: 'warn',
    ABLY_ENABLE_FALLBACK: true,
  };

  beforeEach(async () => {
    // Use fake timers para controlar timers nos testes
    jest.useFakeTimers();

    // Setup mocks
    mockChannel = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      presence: {
        enter: jest.fn(),
        leave: jest.fn(),
        get: jest.fn(),
      } as any,
      history: jest.fn(),
      state: 'attached',
    } as any;

    mockAblyRealtime = {
      channels: {
        get: jest.fn().mockReturnValue(mockChannel),
      },
      connection: {
        state: 'connected',
        id: 'test-connection-id',
        on: jest.fn(),
        off: jest.fn(),
        close: jest.fn(),
      },
      auth: {
        createTokenRequest: jest.fn(),
      },
      close: jest.fn(),
    } as any;

    mockAblyRest = {
      channels: {
        get: jest.fn().mockReturnValue(mockChannel),
      },
      auth: {
        createTokenRequest: jest.fn(),
      },
    } as any;

    (Ably.Realtime as jest.Mock).mockImplementation(() => mockAblyRealtime);
    (Ably.Rest as jest.Mock).mockImplementation(() => mockAblyRest);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AblyService,
        {
          provide: 'ABLY_CONFIG',
          useValue: {
            validateConfig: jest.fn(),
            getClientOptions: jest.fn().mockReturnValue({
              key: 'test-api-key',
              environment: 'test',
              clientId: 'test-client',
              autoConnect: true,
              disconnectedRetryTimeout: 5000,
              suspendedRetryTimeout: 5000,
              httpRequestTimeout: 5000,
            }),
            getChannelName: jest.fn().mockReturnValue('test-channel'),
          },
        },
        {
          provide: AblyConfig,
          useValue: {
            validateConfig: jest.fn(),
            getClientOptions: jest.fn().mockReturnValue({
              key: 'test-api-key',
              environment: 'test',
              clientId: 'test-client',
              autoConnect: true,
              disconnectedRetryTimeout: 5000,
              suspendedRetryTimeout: 5000,
              httpRequestTimeout: 5000,
            }),
            getChannelName: jest.fn().mockReturnValue('test-channel'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
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

    service = module.get<AblyService>(AblyService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    // Limpar todos os timers fake
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup das conexões Ably para evitar handles abertos
    if (service && typeof service.onModuleDestroy === 'function') {
      await service.onModuleDestroy();
    }

    // Garantir que todos os timers sejam limpos
    jest.clearAllTimers();
    jest.useRealTimers();

    // Limpar todos os mocks
    jest.restoreAllMocks();

    // Forçar garbage collection se disponível
    if (global.gc) {
      global.gc();
    }
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve inicializar com configurações corretas', async () => {
      await service.onModuleInit();

      expect(Ably.Realtime).toHaveBeenCalledWith({
        key: 'test-api-key',
        environment: 'test',
        clientId: 'test-client',
        autoConnect: true,
        disconnectedRetryTimeout: 5000,
        suspendedRetryTimeout: 5000,
        httpRequestTimeout: 5000,
        tls: true,
        logLevel: 'warn',
      });
    });

    it('deve configurar listeners de conexão', async () => {
      await service.onModuleInit();

      expect(mockAblyRealtime.connection.on).toHaveBeenCalledWith(
        'connected',
        expect.any(Function),
      );
      expect(mockAblyRealtime.connection.on).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function),
      );
      expect(mockAblyRealtime.connection.on).toHaveBeenCalledWith(
        'failed',
        expect.any(Function),
      );
    });
  });

  describe('publishNotification', () => {
    const mockNotification: IAblyNotificationData = {
      id: 'test-notification-1',
      type: 'system' as NotificationType,
      title: 'Teste',
      message: 'Mensagem de teste',
      priority: 'normal' as NotificationPriority,
      data: { test: true },
      timestamp: new Date(),
      senderId: 'sender-123',
    };

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve publicar notificação com sucesso', async () => {
      mockChannel.publish.mockResolvedValue(undefined);

      const result = await service.publishNotification(
        'test-channel',
        mockNotification,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotification);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'notification',
        mockNotification,
      );
    });

    it('deve retornar erro quando publicação falha', async () => {
      const error = new Error('Falha na publicação');
      mockChannel.publish.mockRejectedValue(error);

      const result = await service.publishNotification(
        'test-channel',
        mockNotification,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na publicação');
      expect(result.errorCode).toBe('PUBLISH_FAILED');
    });

    it('deve validar tamanho da mensagem', async () => {
      const largeNotification = {
        ...mockNotification,
        message: 'x'.repeat(70000), // Maior que o limite
      };

      const result = await service.publishNotification(
        'test-channel',
        largeNotification,
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MESSAGE_TOO_LARGE');
    });

    it('deve incrementar métricas de publicação', async () => {
      mockChannel.publish.mockResolvedValue(undefined);

      await service.publishNotification('test-channel', mockNotification);

      const metrics = service.getMetrics();
      expect(metrics.messagesPublished).toBe(1);
    });
  });

  describe('getChannel', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve retornar canal existente', () => {
      const channel = service.getChannel('test-channel');

      expect(channel).toBe(mockChannel);
      expect(mockAblyRealtime.channels.get).toHaveBeenCalledWith(
        'test-channel',
      );
    });

    it('deve criar novo canal se não existir', () => {
      const newMockChannel = { ...mockChannel };
      mockAblyRealtime.channels.get.mockReturnValue(newMockChannel);

      const channel = service.getChannel('new-channel');

      expect(channel).toBe(newMockChannel);
      expect(mockAblyRealtime.channels.get).toHaveBeenCalledWith('new-channel');
    });
  });

  describe('subscribeToChannel', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve inscrever-se em canal com callback', async () => {
      const callback = jest.fn();

      const result = await service.subscribeToChannel('test-channel', callback);

      expect(result.success).toBe(true);
      expect(mockChannel.subscribe).toHaveBeenCalledWith(
        'notification',
        callback,
      );
    });

    it('deve retornar erro se inscrição falha', async () => {
      const error = new Error('Falha na inscrição');
      mockChannel.subscribe.mockRejectedValue(error);
      const callback = jest.fn();

      const result = await service.subscribeToChannel('test-channel', callback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na inscrição');
    });
  });

  describe('unsubscribeFromChannel', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve cancelar inscrição de canal', async () => {
      const result = await service.unsubscribeFromChannel('test-channel');

      expect(result.success).toBe(true);
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('deve retornar erro se cancelamento falha', async () => {
      const error = new Error('Falha no cancelamento');
      mockChannel.unsubscribe.mockRejectedValue(error);

      const result = await service.unsubscribeFromChannel('test-channel');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha no cancelamento');
    });
  });

  describe('isHealthy', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve retornar true quando conectado', () => {
      mockAblyRealtime.connection.state = 'connected';

      expect(service.isHealthy()).toBe(true);
    });

    it('deve retornar false quando desconectado', () => {
      mockAblyRealtime.connection.state = 'disconnected';

      expect(service.isHealthy()).toBe(false);
    });

    it('deve retornar false quando falhou', () => {
      mockAblyRealtime.connection.state = 'failed';

      expect(service.isHealthy()).toBe(false);
    });
  });

  describe('getConnectionState', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve retornar estado da conexão', () => {
      mockAblyRealtime.connection.state = 'connected';

      expect(service.getConnectionState()).toBe('connected');
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve retornar métricas iniciais', () => {
      const metrics = service.getMetrics();

      expect(metrics).toEqual({
        messagesPublished: 0,
        messagesReceived: 0,
        activeChannels: 0,
        connectionState: 'connected',
        lastError: null,
        uptime: expect.any(Number),
      });
    });

    it('deve atualizar métricas após publicação', async () => {
      mockChannel.publish.mockResolvedValue(undefined);

      await service.publishNotification('test-channel', {
        id: 'test',
        type: 'system' as NotificationType,
        title: 'Test',
        message: 'Test message',
        priority: 'normal' as NotificationPriority,
        data: {},
        timestamp: new Date(),
        senderId: 'test',
      });

      const metrics = service.getMetrics();
      expect(metrics.messagesPublished).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('deve fechar conexões ao destruir módulo', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockAblyRealtime.close).toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve capturar e registrar erros de conexão', async () => {
      const connectionHandlers = {};
      mockAblyRealtime.connection.on.mockImplementation((event, handler) => {
        connectionHandlers[event] = handler;
      });

      // Simula reconexão
      await service.onModuleInit();

      // Verificar se o handler foi registrado
      expect(connectionHandlers['failed']).toBeDefined();

      // Simula erro de conexão
      const error = new Error('Erro de conexão');
      if (connectionHandlers['failed']) {
        connectionHandlers['failed'](error);
        expect(service.getLastError()).toBe('Erro de conexão');
      }
    });

    it('deve emitir eventos de erro', async () => {
      const connectionHandlers = {};
      mockAblyRealtime.connection.on.mockImplementation((event, handler) => {
        connectionHandlers[event] = handler;
      });

      await service.onModuleInit();

      // Verificar se o handler foi registrado
      expect(connectionHandlers['failed']).toBeDefined();

      const error = new Error('Erro de teste');
      if (connectionHandlers['failed']) {
        connectionHandlers['failed'](error);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'ably.connection.failed',
          {
            type: 'failed',
            connectionId: 'test-connection-id',
            clientId: 'test-client',
            timestamp: expect.any(Date),
          },
        );
      }
    });
  });

  describe('Validações', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('deve validar dados de notificação obrigatórios', async () => {
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

      const result = await service.publishNotification(
        'test-channel',
        invalidNotification,
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_NOTIFICATION_DATA');
    });

    it('deve validar nome do canal', async () => {
      const notification: IAblyNotificationData = {
        id: 'test',
        type: 'system' as NotificationType,
        title: 'Test',
        message: 'Test message',
        priority: 'normal' as NotificationPriority,
        data: {},
        timestamp: new Date(),
        senderId: 'test',
      };

      const result = await service.publishNotification('', notification);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CHANNEL_NAME');
    });
  });
});
