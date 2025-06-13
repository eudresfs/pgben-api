import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { NotificationSseListener } from './notification-sse.listener';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { SseService } from '../services/sse.service';
import { SseMetricsService } from '../services/sse-metrics.service';
import { EnhancedMetricsService } from '../../../shared/monitoring/enhanced-metrics.service';
import { NotificacaoSistema } from '../entities/notificacao-sistema.entity';
import { TipoNotificacao } from '../enums/tipo-notificacao.enum';
import { PrioridadeNotificacao } from '../enums/prioridade-notificacao.enum';
import { StatusNotificacao } from '../enums/status-notificacao.enum';

describe('NotificationSseListener', () => {
  let listener: NotificationSseListener;
  let sseService: jest.Mocked<SseService>;
  let sseMetricsService: jest.Mocked<SseMetricsService>;
  let metricsService: jest.Mocked<EnhancedMetricsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockNotificacao: NotificacaoSistema = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    titulo: 'Teste de Notificação SSE',
    conteudo: 'Conteúdo da notificação de teste para SSE',
    tipo: TipoNotificacao.SISTEMA,
    prioridade: PrioridadeNotificacao.ALTA,
    status: StatusNotificacao.NAO_LIDA,
    usuarioId: 'user-123',
    metadados: {
      origem: 'sistema',
      categoria: 'beneficio',
      acao: 'aprovacao'
    },
    criadoEm: new Date('2024-01-15T10:00:00Z'),
    atualizadoEm: new Date('2024-01-15T10:00:00Z'),
    lida: false,
    arquivada: false,
    lidaEm: null,
    arquivadaEm: null
  } as NotificacaoSistema;

  beforeEach(async () => {
    const mockSseService = {
      sendToUser: jest.fn(),
      hasActiveConnections: jest.fn().mockReturnValue(true),
      getActiveConnectionsCount: jest.fn().mockReturnValue(2)
    };

    const mockSseMetricsService = {
      recordMessageSent: jest.fn(),
      recordMessageDelivered: jest.fn(),
      recordMessageFailed: jest.fn()
    };

    const mockMetricsService = {
      recordSystemEvent: jest.fn(),
      recordSecurityEvent: jest.fn(),
      recordLgpdDataAccess: jest.fn()
    };

    const mockEventEmitter = {
      emit: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSseListener,
        {
          provide: SseService,
          useValue: mockSseService
        },
        {
          provide: SseMetricsService,
          useValue: mockSseMetricsService
        },
        {
          provide: EnhancedMetricsService,
          useValue: mockMetricsService
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter
        }
      ]
    }).compile();

    listener = module.get<NotificationSseListener>(NotificationSseListener);
    sseService = module.get(SseService);
    sseMetricsService = module.get(SseMetricsService);
    metricsService = module.get(EnhancedMetricsService);
    eventEmitter = module.get(EventEmitter2);

    // Mock do logger para evitar logs durante os testes
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleNotificationCreated', () => {
    it('deve processar notificação criada com sucesso', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalledWith(
        mockNotificacao.usuarioId,
        'notification',
        {
          id: mockNotificacao.id,
          titulo: mockNotificacao.titulo,
          conteudo: mockNotificacao.conteudo,
          tipo: mockNotificacao.tipo,
          prioridade: mockNotificacao.prioridade,
          metadados: mockNotificacao.metadados,
          criadoEm: mockNotificacao.criadoEm
        }
      );

      expect(sseMetricsService.recordMessageSent).toHaveBeenCalledWith(
        expect.any(String),
        'notification'
      );

      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_sent',
        'success'
      );

      expect(metricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'notification_sse',
        'send',
        mockNotificacao.usuarioId
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.sse.sent',
        {
          notificationId: mockNotificacao.id,
          userId: mockNotificacao.usuarioId,
          success: true
        }
      );
    });

    it('deve pular envio quando não há conexões ativas', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.hasActiveConnections.mockReturnValue(false);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).not.toHaveBeenCalled();
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_skipped',
        'no_connections'
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('deve tratar erro no envio SSE', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      const sseError = new Error('Falha na conexão SSE');
      sseService.sendToUser.mockRejectedValue(sseError);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalled();
      
      expect(sseMetricsService.recordMessageFailed).toHaveBeenCalledWith(
        expect.any(String),
        sseError.message
      );

      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_failed',
        'error'
      );

      expect(metricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'notification_sse_failure',
        `Falha no envio de notificação SSE: ${sseError.message}`,
        mockNotificacao.usuarioId
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.sse.failed',
        {
          notificationId: mockNotificacao.id,
          userId: mockNotificacao.usuarioId,
          error: sseError.message
        }
      );
    });

    it('deve processar notificação com metadados vazios', async () => {
      // Arrange
      const notificacaoSemMetadados = {
        ...mockNotificacao,
        metadados: {}
      };
      const event = new NotificationCreatedEvent(notificacaoSemMetadados);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalledWith(
        notificacaoSemMetadados.usuarioId,
        'notification',
        {
          id: notificacaoSemMetadados.id,
          titulo: notificacaoSemMetadados.titulo,
          conteudo: notificacaoSemMetadados.conteudo,
          tipo: notificacaoSemMetadados.tipo,
          prioridade: notificacaoSemMetadados.prioridade,
          metadados: {},
          criadoEm: notificacaoSemMetadados.criadoEm
        }
      );
    });

    it('deve processar notificação do tipo URGENTE', async () => {
      // Arrange
      const notificacaoUrgente = {
        ...mockNotificacao,
        tipo: TipoNotificacao.URGENTE,
        prioridade: PrioridadeNotificacao.ALTA
      };
      const event = new NotificationCreatedEvent(notificacaoUrgente);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalledWith(
        notificacaoUrgente.usuarioId,
        'notification',
        expect.objectContaining({
          tipo: TipoNotificacao.URGENTE,
          prioridade: PrioridadeNotificacao.ALTA
        })
      );
    });

    it('deve processar notificação do tipo ALERTA', async () => {
      // Arrange
      const notificacaoAlerta = {
        ...mockNotificacao,
        tipo: TipoNotificacao.ALERTA
      };
      const event = new NotificationCreatedEvent(notificacaoAlerta);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalledWith(
        notificacaoAlerta.usuarioId,
        'notification',
        expect.objectContaining({
          tipo: TipoNotificacao.ALERTA
        })
      );
    });

    it('deve processar notificação do tipo INFO', async () => {
      // Arrange
      const notificacaoInfo = {
        ...mockNotificacao,
        tipo: TipoNotificacao.INFO,
        prioridade: PrioridadeNotificacao.BAIXA
      };
      const event = new NotificationCreatedEvent(notificacaoInfo);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalledWith(
        notificacaoInfo.usuarioId,
        'notification',
        expect.objectContaining({
          tipo: TipoNotificacao.INFO,
          prioridade: PrioridadeNotificacao.BAIXA
        })
      );
    });

    it('deve processar notificação com prioridade BAIXA', async () => {
      // Arrange
      const notificacaoBaixa = {
        ...mockNotificacao,
        prioridade: PrioridadeNotificacao.BAIXA
      };
      const event = new NotificationCreatedEvent(notificacaoBaixa);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalled();
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_sent',
        'success'
      );
    });

    it('deve processar notificação com prioridade MEDIA', async () => {
      // Arrange
      const notificacaoMedia = {
        ...mockNotificacao,
        prioridade: PrioridadeNotificacao.MEDIA
      };
      const event = new NotificationCreatedEvent(notificacaoMedia);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseService.sendToUser).toHaveBeenCalled();
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_sent',
        'success'
      );
    });
  });

  describe('integração com métricas SSE', () => {
    it('deve registrar métricas de envio bem-sucedido', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseMetricsService.recordMessageSent).toHaveBeenCalledWith(
        expect.any(String),
        'notification'
      );
      expect(sseMetricsService.recordMessageDelivered).not.toHaveBeenCalled();
      expect(sseMetricsService.recordMessageFailed).not.toHaveBeenCalled();
    });

    it('deve registrar métricas de falha', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      const error = new Error('Erro de conexão');
      sseService.sendToUser.mockRejectedValue(error);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(sseMetricsService.recordMessageSent).toHaveBeenCalledWith(
        expect.any(String),
        'notification'
      );
      expect(sseMetricsService.recordMessageFailed).toHaveBeenCalledWith(
        expect.any(String),
        error.message
      );
      expect(sseMetricsService.recordMessageDelivered).not.toHaveBeenCalled();
    });
  });

  describe('integração com métricas globais', () => {
    it('deve registrar todas as métricas necessárias em caso de sucesso', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_sent',
        'success'
      );
      expect(metricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'notification_sse',
        'send',
        mockNotificacao.usuarioId
      );
      expect(metricsService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('deve registrar métricas de erro em caso de falha', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      const error = new Error('Erro de teste');
      sseService.sendToUser.mockRejectedValue(error);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_failed',
        'error'
      );
      expect(metricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'notification_sse_failure',
        `Falha no envio de notificação SSE: ${error.message}`,
        mockNotificacao.usuarioId
      );
    });

    it('deve registrar métrica de pulo quando não há conexões', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.hasActiveConnections.mockReturnValue(false);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_skipped',
        'no_connections'
      );
      expect(metricsService.recordLgpdDataAccess).not.toHaveBeenCalled();
      expect(metricsService.recordSecurityEvent).not.toHaveBeenCalled();
    });
  });

  describe('integração com eventos', () => {
    it('deve emitir evento de sucesso', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.sse.sent',
        {
          notificationId: mockNotificacao.id,
          userId: mockNotificacao.usuarioId,
          success: true
        }
      );
    });

    it('deve emitir evento de falha', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      const error = new Error('Erro de teste');
      sseService.sendToUser.mockRejectedValue(error);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.sse.failed',
        {
          notificationId: mockNotificacao.id,
          userId: mockNotificacao.usuarioId,
          error: error.message
        }
      );
    });

    it('não deve emitir eventos quando não há conexões', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      sseService.hasActiveConnections.mockReturnValue(false);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('geração de connectionId', () => {
    it('deve gerar connectionId único para cada chamada', async () => {
      // Arrange
      const event1 = new NotificationCreatedEvent(mockNotificacao);
      const event2 = new NotificationCreatedEvent({
        ...mockNotificacao,
        id: 'different-id'
      });
      sseService.sendToUser.mockResolvedValue(undefined);

      // Act
      await listener.handleNotificationCreated(event1);
      await listener.handleNotificationCreated(event2);

      // Assert
      const calls = sseMetricsService.recordMessageSent.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).not.toBe(calls[1][0]); // connectionIds diferentes
    });
  });
});