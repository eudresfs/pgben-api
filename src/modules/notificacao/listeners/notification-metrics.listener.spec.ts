import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationMetricsListener } from './notification-metrics.listener';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { EnhancedMetricsService } from '../../../shared/monitoring/enhanced-metrics.service';
import { NotificacaoSistema } from '../entities/notificacao-sistema.entity';
import { TipoNotificacao } from '../enums/tipo-notificacao.enum';
import { PrioridadeNotificacao } from '../enums/prioridade-notificacao.enum';
import { StatusNotificacao } from '../enums/status-notificacao.enum';
import {
  NOTIFICATION_READ,
  NOTIFICATION_ARCHIVED,
} from '../events/notification.events';

describe('NotificationMetricsListener', () => {
  let listener: NotificationMetricsListener;
  let metricsService: jest.Mocked<EnhancedMetricsService>;

  const mockNotificacao: NotificacaoSistema = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    titulo: 'Teste de Notificação Métricas',
    conteudo: 'Conteúdo da notificação de teste para métricas',
    tipo: TipoNotificacao.SISTEMA,
    prioridade: PrioridadeNotificacao.ALTA,
    status: StatusNotificacao.NAO_LIDA,
    usuarioId: 'user-123',
    metadados: {
      origem: 'sistema',
      categoria: 'beneficio',
      acao: 'aprovacao',
    },
    criadoEm: new Date('2024-01-15T10:00:00Z'),
    atualizadoEm: new Date('2024-01-15T10:00:00Z'),
    lida: false,
    arquivada: false,
    lidaEm: null,
    arquivadaEm: null,
  } as NotificacaoSistema;

  beforeEach(async () => {
    const mockMetricsService = {
      recordSystemEvent: jest.fn(),
      recordSecurityEvent: jest.fn(),
      recordLgpdDataAccess: jest.fn(),
      recordDocumentEvent: jest.fn(),
      recordAuditoriaEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationMetricsListener,
        {
          provide: EnhancedMetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    listener = module.get<NotificationMetricsListener>(
      NotificationMetricsListener,
    );
    metricsService = module.get(EnhancedMetricsService);

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
    it('deve registrar métricas para notificação criada', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_created',
        'success',
      );

      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        `notification_type_${mockNotificacao.tipo}`,
        'created',
      );

      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        `notification_priority_${mockNotificacao.prioridade}`,
        'created',
      );

      expect(metricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'notification',
        'create',
        mockNotificacao.usuarioId,
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_created',
        mockNotificacao.usuarioId,
        {
          notificationId: mockNotificacao.id,
          tipo: mockNotificacao.tipo,
          prioridade: mockNotificacao.prioridade,
          metadados: mockNotificacao.metadados,
        },
      );
    });

    it('deve registrar métricas para diferentes tipos de notificação', async () => {
      // Arrange
      const tiposNotificacao = [
        TipoNotificacao.SISTEMA,
        TipoNotificacao.ALERTA,
        TipoNotificacao.INFO,
        TipoNotificacao.URGENTE,
      ];

      // Act & Assert
      for (const tipo of tiposNotificacao) {
        const notificacao = { ...mockNotificacao, tipo };
        const event = new NotificationCreatedEvent(notificacao);

        await listener.handleNotificationCreated(event);

        expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
          `notification_type_${tipo}`,
          'created',
        );
      }
    });

    it('deve registrar métricas para diferentes prioridades', async () => {
      // Arrange
      const prioridades = [
        PrioridadeNotificacao.BAIXA,
        PrioridadeNotificacao.MEDIA,
        PrioridadeNotificacao.ALTA,
      ];

      // Act & Assert
      for (const prioridade of prioridades) {
        const notificacao = { ...mockNotificacao, prioridade };
        const event = new NotificationCreatedEvent(notificacao);

        await listener.handleNotificationCreated(event);

        expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
          `notification_priority_${prioridade}`,
          'created',
        );
      }
    });

    it('deve registrar métricas com metadados vazios', async () => {
      // Arrange
      const notificacaoSemMetadados = {
        ...mockNotificacao,
        metadados: {},
      };
      const event = new NotificationCreatedEvent(notificacaoSemMetadados);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_created',
        notificacaoSemMetadados.usuarioId,
        {
          notificationId: notificacaoSemMetadados.id,
          tipo: notificacaoSemMetadados.tipo,
          prioridade: notificacaoSemMetadados.prioridade,
          metadados: {},
        },
      );
    });

    it('deve tratar erro ao registrar métricas', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      const error = new Error('Erro ao registrar métrica');
      metricsService.recordSystemEvent.mockImplementation(() => {
        throw error;
      });

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      // Deve continuar executando mesmo com erro
      expect(metricsService.recordSystemEvent).toHaveBeenCalled();
    });
  });

  describe('handleNotificationRead', () => {
    it('deve registrar métricas para notificação lida', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        readAt: new Date(),
      };

      // Act
      await listener.handleNotificationRead(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_read',
        'success',
      );

      expect(metricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'notification',
        'read',
        eventData.userId,
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_read',
        eventData.userId,
        {
          notificationId: eventData.notificationId,
          readAt: eventData.readAt,
        },
      );
    });

    it('deve tratar erro ao registrar métricas de leitura', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        readAt: new Date(),
      };
      const error = new Error('Erro ao registrar métrica de leitura');
      metricsService.recordSystemEvent.mockImplementation(() => {
        throw error;
      });

      // Act
      await listener.handleNotificationRead(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalled();
    });
  });

  describe('handleNotificationArchived', () => {
    it('deve registrar métricas para notificação arquivada', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        archivedAt: new Date(),
      };

      // Act
      await listener.handleNotificationArchived(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_archived',
        'success',
      );

      expect(metricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'notification',
        'archive',
        eventData.userId,
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_archived',
        eventData.userId,
        {
          notificationId: eventData.notificationId,
          archivedAt: eventData.archivedAt,
        },
      );
    });

    it('deve tratar erro ao registrar métricas de arquivamento', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        archivedAt: new Date(),
      };
      const error = new Error('Erro ao registrar métrica de arquivamento');
      metricsService.recordSystemEvent.mockImplementation(() => {
        throw error;
      });

      // Act
      await listener.handleNotificationArchived(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalled();
    });
  });

  describe('handleEmailSent', () => {
    it('deve registrar métricas para email enviado com sucesso', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        success: true,
      };

      // Act
      await listener.handleEmailSent(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_email_delivery',
        'success',
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_email_sent',
        eventData.userId,
        {
          notificationId: eventData.notificationId,
          success: true,
        },
      );
    });

    it('deve registrar métricas para falha no envio de email', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        success: false,
        error: 'Falha na conexão SMTP',
      };

      // Act
      await listener.handleEmailFailed(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_email_delivery',
        'failure',
      );

      expect(metricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'notification_email_failure',
        `Falha no envio de email: ${eventData.error}`,
        eventData.userId,
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_email_failed',
        eventData.userId,
        {
          notificationId: eventData.notificationId,
          error: eventData.error,
        },
      );
    });
  });

  describe('handleSseSent', () => {
    it('deve registrar métricas para SSE enviado com sucesso', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        success: true,
      };

      // Act
      await listener.handleSseSent(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_delivery',
        'success',
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_sse_sent',
        eventData.userId,
        {
          notificationId: eventData.notificationId,
          success: true,
        },
      );
    });

    it('deve registrar métricas para falha no envio SSE', async () => {
      // Arrange
      const eventData = {
        notificationId: mockNotificacao.id,
        userId: mockNotificacao.usuarioId,
        success: false,
        error: 'Conexão SSE perdida',
      };

      // Act
      await listener.handleSseFailed(eventData);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_sse_delivery',
        'failure',
      );

      expect(metricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'notification_sse_failure',
        `Falha no envio SSE: ${eventData.error}`,
        eventData.userId,
      );

      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_sse_failed',
        eventData.userId,
        {
          notificationId: eventData.notificationId,
          error: eventData.error,
        },
      );
    });
  });

  describe('integração com sistema de métricas', () => {
    it('deve registrar todas as métricas necessárias para compliance LGPD', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'notification',
        'create',
        mockNotificacao.usuarioId,
      );
    });

    it('deve registrar eventos de auditoria para rastreabilidade', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordAuditoriaEvent).toHaveBeenCalledWith(
        'notification_created',
        mockNotificacao.usuarioId,
        expect.objectContaining({
          notificationId: mockNotificacao.id,
          tipo: mockNotificacao.tipo,
          prioridade: mockNotificacao.prioridade,
        }),
      );
    });

    it('deve registrar eventos do sistema para monitoramento', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(metricsService.recordSystemEvent).toHaveBeenCalledTimes(3);
      expect(metricsService.recordSystemEvent).toHaveBeenCalledWith(
        'notification_created',
        'success',
      );
    });
  });

  describe('tratamento de erros', () => {
    it('deve continuar executando mesmo com falhas nas métricas', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      metricsService.recordSystemEvent.mockImplementation(() => {
        throw new Error('Falha no sistema de métricas');
      });

      // Act & Assert
      await expect(
        listener.handleNotificationCreated(event),
      ).resolves.not.toThrow();
    });

    it('deve logar erros sem interromper o fluxo', async () => {
      // Arrange
      const event = new NotificationCreatedEvent(mockNotificacao);
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
      metricsService.recordSystemEvent.mockImplementation(() => {
        throw new Error('Erro de teste');
      });

      // Act
      await listener.handleNotificationCreated(event);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });
});
