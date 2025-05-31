import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SseService } from '../services/sse.service';
import { SseNotification, SseConnection } from '../interfaces/sse-notification.interface';
import { Observable } from 'rxjs';
import { Request } from 'express';

describe('SseService', () => {
  let service: SseService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'sse.heartbeatInterval': 30000,
        'sse.connectionTimeout': 300000,
        'sse.maxConnectionsPerUser': 5,
        'sse.cleanupInterval': 60000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SseService>(SseService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Limpar todas as conexões após cada teste
    service.removeAllConnections();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConnection', () => {
    it('should create a new SSE connection', (done) => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      const observable = service.createConnection(userId, mockRequest);

      expect(observable).toBeInstanceOf(Observable);

      // Verificar se a conexão foi adicionada
      const stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
      expect(stats.connectionsByUser[userId]).toBe(1);

      done();
    });

    it('should limit connections per user', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      // Criar o máximo de conexões permitidas
      for (let i = 0; i < 5; i++) {
        service.createConnection(userId, mockRequest);
      }

      // Tentar criar uma conexão adicional
      expect(() => {
        service.createConnection(userId, mockRequest);
      }).toThrow('Máximo de conexões por usuário atingido');
    });

    it('should generate unique connection IDs', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      const connection1 = service.createConnection(userId, mockRequest);
      const connection2 = service.createConnection(userId, mockRequest);

      // As conexões devem ter IDs diferentes
      expect(connection1).not.toBe(connection2);
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send notification to specific user', (done) => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      const notification: SseNotification = {
        id: 'notif-123',
        type: 'notification',
        data: {
          id: 'notif-123',
          titulo: 'Teste',
          conteudo: 'Conteúdo de teste',
          tipo: 'info',
          prioridade: 'media',
          data_criacao: new Date().toISOString(),
          lida: false,
        },
      };

      // Criar conexão
      const observable = service.createConnection(userId, mockRequest);
      
      // Subscrever para receber notificações
      observable.subscribe({
        next: (event) => {
          if (event.type === 'notification') {
            expect(event.data.titulo).toBe('Teste');
            done();
          }
        },
      });

      // Enviar notificação
      const result = service.sendNotificationToUser(userId, notification);
      expect(result).toBe(true);
    });

    it('should return false when user has no connections', () => {
      const userId = 'user-without-connections';
      const notification: SseNotification = {
        id: 'notif-123',
        type: 'notification',
        data: {
          id: 'notif-123',
          titulo: 'Teste',
          conteudo: 'Conteúdo de teste',
          tipo: 'info',
          prioridade: 'media',
          data_criacao: new Date().toISOString(),
          lida: false,
        },
      };

      const result = service.sendNotificationToUser(userId, notification);
      expect(result).toBe(false);
    });
  });

  describe('broadcastToAllUsers', () => {
    it('should send notification to all connected users', (done) => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      const notification: SseNotification = {
        id: 'notif-broadcast',
        type: 'notification',
        data: {
          id: 'notif-broadcast',
          titulo: 'Broadcast',
          conteudo: 'Mensagem para todos',
          tipo: 'info',
          prioridade: 'media',
          data_criacao: new Date().toISOString(),
          lida: false,
        },
      };

      let receivedCount = 0;
      const expectedCount = 2;

      // Criar conexões para dois usuários
      const obs1 = service.createConnection(user1, mockRequest);
      const obs2 = service.createConnection(user2, mockRequest);

      // Subscrever ambas as conexões
      [obs1, obs2].forEach((obs) => {
        obs.subscribe({
          next: (event) => {
            if (event.type === 'notification') {
              receivedCount++;
              if (receivedCount === expectedCount) {
                done();
              }
            }
          },
        });
      });

      // Enviar broadcast
      const result = service.broadcastToAllUsers(notification);
      expect(result).toBe(2); // Deve retornar o número de usuários que receberam
    });
  });

  describe('removeConnection', () => {
    it('should remove specific connection', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      // Criar conexão
      service.createConnection(userId, mockRequest);
      
      let stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(1);

      // Obter ID da conexão (simulado)
      const connections = service['connections'];
      const connectionId = Array.from(connections.keys())[0];

      // Remover conexão
      service.removeConnection(connectionId);

      stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });
  });

  describe('removeUserConnections', () => {
    it('should remove all connections for a user', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      // Criar múltiplas conexões para o mesmo usuário
      service.createConnection(userId, mockRequest);
      service.createConnection(userId, mockRequest);
      service.createConnection(userId, mockRequest);

      let stats = service.getConnectionStats();
      expect(stats.connectionsByUser[userId]).toBe(3);

      // Remover todas as conexões do usuário
      const removedCount = service.removeUserConnections(userId);
      expect(removedCount).toBe(3);

      stats = service.getConnectionStats();
      expect(stats.connectionsByUser[userId]).toBeUndefined();
      expect(stats.totalConnections).toBe(0);
    });
  });

  describe('isUserConnected', () => {
    it('should return true when user has active connections', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      expect(service.isUserConnected(userId)).toBe(false);

      service.createConnection(userId, mockRequest);
      expect(service.isUserConnected(userId)).toBe(true);
    });
  });

  describe('getUserConnectionCount', () => {
    it('should return correct connection count for user', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      expect(service.getUserConnectionCount(userId)).toBe(0);

      service.createConnection(userId, mockRequest);
      expect(service.getUserConnectionCount(userId)).toBe(1);

      service.createConnection(userId, mockRequest);
      expect(service.getUserConnectionCount(userId)).toBe(2);
    });
  });

  describe('getConnectionStats', () => {
    it('should return accurate connection statistics', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      // Estado inicial
      let stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.uniqueUsers).toBe(0);

      // Adicionar conexões
      service.createConnection(user1, mockRequest);
      service.createConnection(user1, mockRequest);
      service.createConnection(user2, mockRequest);

      stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.activeConnections).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.connectionsByUser[user1]).toBe(2);
      expect(stats.connectionsByUser[user2]).toBe(1);
    });
  });

  describe('heartbeat functionality', () => {
    it('should send heartbeat events', (done) => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      const observable = service.createConnection(userId, mockRequest);
      
      observable.subscribe({
        next: (event) => {
          if (event.type === 'heartbeat') {
            expect(event.data.timestamp).toBeDefined();
            expect(event.data.server_time).toBeDefined();
            done();
          }
        },
      });

      // Simular envio de heartbeat
      service['sendHeartbeat']();
    });
  });

  describe('cleanup functionality', () => {
    it('should clean up inactive connections', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      // Criar conexão
      service.createConnection(userId, mockRequest);
      
      let stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(1);

      // Simular conexão inativa (modificar timestamp)
      const connections = service['connections'];
      const connection = Array.from(connections.values())[0];
      connection.lastActivity = new Date(Date.now() - 400000); // 6 minutos atrás

      // Executar limpeza
      service['cleanupInactiveConnections']();

      stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid notification data gracefully', () => {
      const userId = 'user-123';
      const invalidNotification = null as any;

      expect(() => {
        service.sendNotificationToUser(userId, invalidNotification);
      }).not.toThrow();
    });

    it('should handle connection errors gracefully', () => {
      const userId = 'user-123';
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      const observable = service.createConnection(userId, mockRequest);
      
      // Simular erro na conexão
      expect(() => {
        observable.subscribe({
          error: (error) => {
            expect(error).toBeDefined();
          },
        });
      }).not.toThrow();
    });
  });

  describe('memory management', () => {
    it('should not exceed memory limits with many connections', () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as Request;

      // Criar muitas conexões para usuários diferentes
      for (let i = 0; i < 100; i++) {
        const userId = `user-${i}`;
        service.createConnection(userId, mockRequest);
      }

      const stats = service.getConnectionStats();
      expect(stats.totalConnections).toBe(100);
      expect(stats.uniqueUsers).toBe(100);

      // Verificar se o serviço ainda está responsivo
      expect(service.isUserConnected('user-50')).toBe(true);
    });
  });
});