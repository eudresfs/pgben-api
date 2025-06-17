import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SseMetricsService, SseMetrics, ConnectionStats } from './sse-metrics.service';
import { EnhancedMetricsService } from '../../../shared/monitoring/enhanced-metrics.service';

describe('SseMetricsService', () => {
  let service: SseMetricsService;
  let enhancedMetricsService: jest.Mocked<EnhancedMetricsService>;

  beforeEach(async () => {
    const mockEnhancedMetricsService = {
      recordSecurityEvent: jest.fn(),
      recordLgpdDataAccess: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseMetricsService,
        {
          provide: EnhancedMetricsService,
          useValue: mockEnhancedMetricsService
        }
      ]
    }).compile();

    service = module.get<SseMetricsService>(SseMetricsService);
    enhancedMetricsService = module.get(EnhancedMetricsService);

    // Mock do logger para evitar logs durante os testes
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Limpar métricas antes de cada teste
    service.resetMetrics();
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.resetMetrics();
  });

  describe('recordConnection', () => {
    it('deve registrar uma nova conexão corretamente', () => {
      // Arrange
      const userId = 'user-123';
      const connectionId = 'conn-456';
      const userAgent = 'Mozilla/5.0';

      // Act
      service.recordConnection(userId, connectionId, userAgent);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(1);
      expect(metrics.totalConnections).toBe(1);
      expect(metrics.connectionsPerUser[userId]).toBe(1);
      expect(metrics.connectionsByUserAgent[userAgent]).toBe(1);
      expect(metrics.peakConnections).toBe(1);

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_connection_established',
        'info',
        'notification_module'
      );

      expect(enhancedMetricsService.recordLgpdDataAccess).toHaveBeenCalledWith(
        'sse_connection',
        'create',
        true,
        'user'
      );
    });

    it('deve atualizar o pico de conexões', () => {
      // Arrange & Act
      service.recordConnection('user1', 'conn1');
      service.recordConnection('user2', 'conn2');
      service.recordConnection('user3', 'conn3');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(3);
      expect(metrics.peakConnections).toBe(3);
    });

    it('deve registrar múltiplas conexões do mesmo usuário', () => {
      // Arrange
      const userId = 'user-123';

      // Act
      service.recordConnection(userId, 'conn1');
      service.recordConnection(userId, 'conn2');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(2);
      expect(metrics.connectionsPerUser[userId]).toBe(2);
    });

    it('deve registrar estatísticas da conexão', () => {
      // Arrange
      const userId = 'user-123';
      const connectionId = 'conn-456';
      const userAgent = 'Mozilla/5.0';

      // Act
      service.recordConnection(userId, connectionId, userAgent);

      // Assert
      const connectionStats = service.getConnectionStats(connectionId);
      expect(connectionStats).toBeDefined();
      expect(connectionStats!.userId).toBe(userId);
      expect(connectionStats!.connectionId).toBe(connectionId);
      expect(connectionStats!.userAgent).toBe(userAgent);
      expect(connectionStats!.messagesSent).toBe(0);
      expect(connectionStats!.messagesDelivered).toBe(0);
      expect(connectionStats!.messagesFailed).toBe(0);
    });

    it('deve tratar erro ao registrar conexão', () => {
      // Arrange
      enhancedMetricsService.recordSecurityEvent.mockImplementation(() => {
        throw new Error('Erro no sistema de métricas');
      });

      // Act & Assert
      expect(() => {
        service.recordConnection('user-123', 'conn-456');
      }).not.toThrow();
    });
  });

  describe('recordDisconnection', () => {
    it('deve registrar desconexão corretamente', () => {
      // Arrange
      const userId = 'user-123';
      const connectionId = 'conn-456';
      service.recordConnection(userId, connectionId);

      // Act
      service.recordDisconnection(connectionId);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.connectionsPerUser[userId]).toBeUndefined();

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_connection_closed',
        'info',
        'notification_module'
      );

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_connection_duration',
        'info',
        'notification_module'
      );
    });

    it('deve manter conexões ativas de outros usuários', () => {
      // Arrange
      service.recordConnection('user1', 'conn1');
      service.recordConnection('user2', 'conn2');

      // Act
      service.recordDisconnection('conn1');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(1);
      expect(metrics.connectionsPerUser['user1']).toBeUndefined();
      expect(metrics.connectionsPerUser['user2']).toBe(1);
    });

    it('deve decrementar corretamente múltiplas conexões do mesmo usuário', () => {
      // Arrange
      const userId = 'user-123';
      service.recordConnection(userId, 'conn1');
      service.recordConnection(userId, 'conn2');

      // Act
      service.recordDisconnection('conn1');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(1);
      expect(metrics.connectionsPerUser[userId]).toBe(1);
    });

    it('deve limpar dados da conexão', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);

      // Act
      service.recordDisconnection(connectionId);

      // Assert
      const connectionStats = service.getConnectionStats(connectionId);
      expect(connectionStats).toBeUndefined();
    });

    it('deve tratar desconexão de conexão inexistente', () => {
      // Act & Assert
      expect(() => {
        service.recordDisconnection('conn-inexistente');
      }).not.toThrow();
    });
  });

  describe('recordMessageSent', () => {
    it('deve registrar mensagem enviada', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);

      // Act
      service.recordMessageSent(connectionId, 'notification');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.messagesSent).toBe(1);

      const connectionStats = service.getConnectionStats(connectionId);
      expect(connectionStats!.messagesSent).toBe(1);

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_message_sent',
        'info',
        'notification_module'
      );

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_message_type_notification',
        'info',
        'notification_module'
      );
    });

    it('deve atualizar última atividade da conexão', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);
      const initialActivity = service.getConnectionStats(connectionId)!.lastActivity;

      // Act
      service.recordMessageSent(connectionId, 'notification');

      // Assert
      const updatedActivity = service.getConnectionStats(connectionId)!.lastActivity;
      expect(updatedActivity.getTime()).toBeGreaterThanOrEqual(initialActivity.getTime());
    });

    it('deve registrar múltiplas mensagens', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);

      // Act
      service.recordMessageSent(connectionId, 'notification');
      service.recordMessageSent(connectionId, 'alert');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.messagesSent).toBe(2);

      const connectionStats = service.getConnectionStats(connectionId);
      expect(connectionStats!.messagesSent).toBe(2);
    });
  });

  describe('recordMessageDelivered', () => {
    it('deve registrar mensagem entregue', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);
      service.recordMessageSent(connectionId, 'notification');

      // Act
      service.recordMessageDelivered(connectionId);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.messagesDelivered).toBe(1);
      expect(metrics.deliveryRate).toBe(100);

      const connectionStats = service.getConnectionStats(connectionId);
      expect(connectionStats!.messagesDelivered).toBe(1);

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_message_delivered',
        'info',
        'notification_module'
      );
    });

    it('deve calcular taxa de entrega corretamente', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);
      
      // Enviar 4 mensagens, entregar 3
      for (let i = 0; i < 4; i++) {
        service.recordMessageSent(connectionId, 'notification');
      }
      for (let i = 0; i < 3; i++) {
        service.recordMessageDelivered(connectionId);
      }

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.deliveryRate).toBe(75); // 3/4 * 100
    });
  });

  describe('recordMessageFailed', () => {
    it('deve registrar mensagem falhada', () => {
      // Arrange
      const connectionId = 'conn-456';
      const userId = 'user-123';
      service.recordConnection(userId, connectionId);
      service.recordMessageSent(connectionId, 'notification');

      // Act
      service.recordMessageFailed(connectionId, 'Conexão perdida');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.messagesFailed).toBe(1);
      expect(metrics.errorRate).toBe(100);

      const connectionStats = service.getConnectionStats(connectionId);
      expect(connectionStats!.messagesFailed).toBe(1);

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_message_failed',
        'error',
        'notification_module'
      );

      expect(enhancedMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
        'sse_delivery_failure',
        'error',
        'notification_module'
      );
    });

    it('deve calcular taxa de erro corretamente', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);
      
      // Enviar 5 mensagens, falhar 2
      for (let i = 0; i < 5; i++) {
        service.recordMessageSent(connectionId, 'notification');
      }
      for (let i = 0; i < 2; i++) {
        service.recordMessageFailed(connectionId, 'Erro de teste');
      }

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.errorRate).toBe(40); // 2/5 * 100
    });
  });

  describe('getMetrics', () => {
    it('deve retornar cópia das métricas', () => {
      // Arrange
      service.recordConnection('user-123', 'conn-456');

      // Act
      const metrics1 = service.getMetrics();
      const metrics2 = service.getMetrics();

      // Assert
      expect(metrics1).not.toBe(metrics2); // Diferentes instâncias
      expect(metrics1).toEqual(metrics2); // Mesmo conteúdo
    });

    it('deve retornar métricas iniciais corretas', () => {
      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.messagesSent).toBe(0);
      expect(metrics.messagesDelivered).toBe(0);
      expect(metrics.messagesFailed).toBe(0);
      expect(metrics.averageConnectionDuration).toBe(0);
      expect(metrics.deliveryRate).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.peakConnections).toBe(0);
      expect(Object.keys(metrics.connectionsPerUser)).toHaveLength(0);
      expect(Object.keys(metrics.connectionsByUserAgent)).toHaveLength(0);
    });
  });

  describe('getAllConnectionStats', () => {
    it('deve retornar estatísticas de todas as conexões ativas', () => {
      // Arrange
      service.recordConnection('user1', 'conn1');
      service.recordConnection('user2', 'conn2');
      service.recordConnection('user1', 'conn3');

      // Act
      const allStats = service.getAllConnectionStats();

      // Assert
      expect(allStats).toHaveLength(3);
      expect(allStats.map(s => s.connectionId)).toContain('conn1');
      expect(allStats.map(s => s.connectionId)).toContain('conn2');
      expect(allStats.map(s => s.connectionId)).toContain('conn3');
    });

    it('deve retornar array vazio quando não há conexões', () => {
      // Act
      const allStats = service.getAllConnectionStats();

      // Assert
      expect(allStats).toHaveLength(0);
    });
  });

  describe('resetMetrics', () => {
    it('deve resetar todas as métricas', () => {
      // Arrange
      service.recordConnection('user-123', 'conn-456');
      service.recordMessageSent('conn-456', 'notification');

      // Act
      service.resetMetrics();

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.messagesSent).toBe(0);
      expect(Object.keys(metrics.connectionsPerUser)).toHaveLength(0);
      
      const allStats = service.getAllConnectionStats();
      expect(allStats).toHaveLength(0);
    });
  });

  describe('cálculos de métricas', () => {
    it('deve calcular duração média das conexões', () => {
      // Arrange
      const connectionId = 'conn-456';
      service.recordConnection('user-123', connectionId);
      
      // Simular passagem de tempo
      jest.spyOn(Date.prototype, 'getTime')
        .mockReturnValueOnce(2000) // now
        .mockReturnValueOnce(1000); // start time

      // Act
      service.recordDisconnection(connectionId);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.averageConnectionDuration).toBeGreaterThan(0);
    });

    it('deve calcular taxa de entrega zero quando não há mensagens', () => {
      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.deliveryRate).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('tratamento de erros', () => {
    it('deve continuar funcionando mesmo com erros nas métricas', () => {
      // Arrange
      enhancedMetricsService.recordSecurityEvent.mockImplementation(() => {
        throw new Error('Erro no sistema de métricas');
      });

      // Act & Assert
      expect(() => {
        service.recordConnection('user-123', 'conn-456');
        service.recordMessageSent('conn-456', 'notification');
        service.recordMessageDelivered('conn-456');
        service.recordMessageFailed('conn-456', 'Erro de teste');
        service.recordDisconnection('conn-456');
      }).not.toThrow();
    });
  });
});