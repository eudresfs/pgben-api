import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NotificacaoModule } from '../notificacao.module';
import { NotificacaoSistema } from '../entities/notificacao-sistema.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { SseService } from '../services/sse.service';
import { NotificacaoService } from '../services/notificacao.service';
import { AuthModule } from '../../auth/auth.module';
import { User } from '../../user/entities/user.entity';

describe('Notification SSE Integration', () => {
  let app: INestApplication;
  let notificacaoService: NotificacaoService;
  let sseService: SseService;
  let notificacaoRepository: Repository<NotificacaoSistema>;
  let userRepository: Repository<User>;
  let jwtToken: string;
  let testUser: User;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
        SSE_HEARTBEAT_INTERVAL: 30000,
        SSE_CONNECTION_TIMEOUT: 300000,
        SSE_MAX_CONNECTIONS_PER_USER: 5,
        DATABASE_URL: 'sqlite::memory:',
      };
      return config[key];
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: () => ({
            type: 'sqlite',
            database: ':memory:',
            entities: [NotificacaoSistema, NotificationTemplate, User],
            synchronize: true,
            logging: false,
          }),
          inject: [ConfigService],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get('JWT_EXPIRES_IN'),
            },
          }),
          inject: [ConfigService],
        }),
        NotificacaoModule,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    notificacaoService =
      moduleFixture.get<NotificacaoService>(NotificacaoService);
    sseService = moduleFixture.get<SseService>(SseService);
    notificacaoRepository = moduleFixture.get<Repository<NotificacaoSistema>>(
      getRepositoryToken(NotificacaoSistema),
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    // Criar usuário de teste
    testUser = userRepository.create({
      id: 'test-user-id',
      email: 'test@example.com',
      nome: 'Test User',
      roles: ['user'],
    });
    await userRepository.save(testUser);

    // Gerar token JWT para testes
    const jwtService = moduleFixture.get('JwtService');
    jwtToken = await jwtService.signAsync({
      id: testUser.id,
      email: testUser.email,
      roles: testUser.roles,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar dados entre testes
    await notificacaoRepository.clear();
    sseService.clearAllConnections();
  });

  describe('SSE Connection Endpoints', () => {
    it('should establish SSE connection with valid token', (done) => {
      request(app.getHttpServer())
        .get(`/v1/notificacao/sse?token=${jwtToken}`)
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .expect('Cache-Control', 'no-cache')
        .expect('Connection', 'keep-alive')
        .end((err, res) => {
          if (err) return done(err);

          // Verificar se a conexão foi estabelecida
          const stats = sseService.getConnectionStats();
          expect(stats.totalConnections).toBe(1);
          expect(stats.activeUsers).toBe(1);

          done();
        });
    });

    it('should reject SSE connection without token', () => {
      return request(app.getHttpServer())
        .get('/v1/notificacao/sse')
        .expect(403);
    });

    it('should reject SSE connection with invalid token', () => {
      return request(app.getHttpServer())
        .get('/v1/notificacao/sse?token=invalid-token')
        .expect(403);
    });

    it('should get SSE connection statistics', () => {
      return request(app.getHttpServer())
        .get('/v1/notificacao/sse/stats')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalConnections');
          expect(res.body).toHaveProperty('activeUsers');
          expect(res.body).toHaveProperty('connectionsPerUser');
          expect(res.body).toHaveProperty('uptime');
        });
    });

    it('should check user SSE connection status', () => {
      return request(app.getHttpServer())
        .get(`/v1/notificacao/sse/status/${testUser.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isConnected');
          expect(res.body).toHaveProperty('connectionCount');
          expect(res.body).toHaveProperty('userId', testUser.id);
        });
    });
  });

  describe('Real-time Notification Broadcasting', () => {
    let sseConnection: any;

    beforeEach((done) => {
      // Estabelecer conexão SSE para testes
      sseConnection = request(app.getHttpServer())
        .get(`/v1/notificacao/sse?token=${jwtToken}`)
        .buffer(false)
        .parse((res, callback) => {
          res.on('data', (chunk) => {
            const data = chunk.toString();
            if (data.includes('data:')) {
              try {
                const jsonData = JSON.parse(data.split('data: ')[1]);
                sseConnection.emit('notification', jsonData);
              } catch (e) {
                // Ignorar dados que não são JSON (como heartbeat)
              }
            }
          });
          callback(null, res);
        });

      setTimeout(done, 100); // Aguardar estabelecimento da conexão
    });

    afterEach(() => {
      if (sseConnection) {
        sseConnection.abort();
      }
    });

    it('should receive notification via SSE when created', (done) => {
      const notificationData = {
        tipo: 'info',
        titulo: 'Teste SSE',
        conteudo: 'Notificação de teste via SSE',
        destinatario_id: testUser.id,
      };

      sseConnection.on('notification', (data) => {
        expect(data.type).toBe('notification');
        expect(data.data.titulo).toBe(notificationData.titulo);
        expect(data.data.conteudo).toBe(notificationData.conteudo);
        expect(data.data.destinatario_id).toBe(testUser.id);
        done();
      });

      // Criar notificação que deve ser enviada via SSE
      setTimeout(async () => {
        await notificacaoService.criarEBroadcast(
          notificationData.destinatario_id,
          notificationData.tipo,
          notificationData.titulo,
          notificationData.conteudo,
        );
      }, 50);
    });

    it('should receive heartbeat events', (done) => {
      let heartbeatReceived = false;

      sseConnection.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('event: heartbeat')) {
          heartbeatReceived = true;
          expect(data).toContain('event: heartbeat');
          expect(data).toContain('data: {"timestamp"');
          done();
        }
      });

      // Aguardar heartbeat (configurado para 30s, mas pode ser forçado)
      setTimeout(() => {
        if (!heartbeatReceived) {
          done(new Error('Heartbeat não recebido'));
        }
      }, 5000);
    });

    it('should handle multiple notifications in sequence', (done) => {
      const notifications = [
        { titulo: 'Notificação 1', conteudo: 'Conteúdo 1' },
        { titulo: 'Notificação 2', conteudo: 'Conteúdo 2' },
        { titulo: 'Notificação 3', conteudo: 'Conteúdo 3' },
      ];

      let receivedCount = 0;
      const receivedNotifications = [];

      sseConnection.on('notification', (data) => {
        receivedNotifications.push(data.data);
        receivedCount++;

        if (receivedCount === notifications.length) {
          expect(receivedNotifications).toHaveLength(3);
          expect(receivedNotifications[0].titulo).toBe('Notificação 1');
          expect(receivedNotifications[1].titulo).toBe('Notificação 2');
          expect(receivedNotifications[2].titulo).toBe('Notificação 3');
          done();
        }
      });

      // Enviar múltiplas notificações
      setTimeout(async () => {
        for (const notification of notifications) {
          await notificacaoService.criarEBroadcast(
            testUser.id,
            'info',
            notification.titulo,
            notification.conteudo,
          );
          await new Promise((resolve) => setTimeout(resolve, 10)); // Pequeno delay
        }
      }, 50);
    });
  });

  describe('Notification API Integration with SSE', () => {
    it('should create notification and broadcast via SSE', async () => {
      const notificationData = {
        tipo: 'success',
        titulo: 'Benefício Aprovado',
        conteudo: 'Seu benefício foi aprovado com sucesso',
        destinatario_id: testUser.id,
      };

      // Criar notificação via API
      const response = await request(app.getHttpServer())
        .post('/v1/notificacao')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(notificationData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.titulo).toBe(notificationData.titulo);

      // Verificar se foi salva no banco
      const savedNotification = await notificacaoRepository.findOne({
        where: { id: response.body.id },
      });

      expect(savedNotification).toBeDefined();
      expect(savedNotification.titulo).toBe(notificationData.titulo);
    });

    it('should mark notification as read and update SSE stats', async () => {
      // Criar notificação
      const notification = await notificacaoService.criar(
        testUser.id,
        'info',
        'Teste Leitura',
        'Conteúdo de teste',
      );

      // Marcar como lida
      await request(app.getHttpServer())
        .put(`/v1/notificacao/${notification.id}/ler`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Verificar se foi marcada como lida
      const updatedNotification = await notificacaoRepository.findOne({
        where: { id: notification.id },
      });

      expect(updatedNotification.lida).toBe(true);
      expect(updatedNotification.data_leitura).toBeDefined();
    });

    it('should get unread notification count', async () => {
      // Criar algumas notificações
      await notificacaoService.criar(
        testUser.id,
        'info',
        'Teste 1',
        'Conteúdo 1',
      );
      await notificacaoService.criar(
        testUser.id,
        'info',
        'Teste 2',
        'Conteúdo 2',
      );
      await notificacaoService.criar(
        testUser.id,
        'info',
        'Teste 3',
        'Conteúdo 3',
      );

      const response = await request(app.getHttpServer())
        .get('/v1/notificacao/contador/nao-lidas')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.count).toBe(3);
    });

    it('should list user notifications with pagination', async () => {
      // Criar várias notificações
      for (let i = 1; i <= 15; i++) {
        await notificacaoService.criar(
          testUser.id,
          'info',
          `Notificação ${i}`,
          `Conteúdo da notificação ${i}`,
        );
      }

      const response = await request(app.getHttpServer())
        .get('/v1/notificacao/minhas?page=1&limit=10')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.total).toBe(15);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(2);
    });
  });

  describe('SSE Service Integration', () => {
    it('should handle multiple connections from same user', async () => {
      // Simular múltiplas conexões do mesmo usuário
      const connection1 = sseService.createConnection(testUser.id, {} as any);
      const connection2 = sseService.createConnection(testUser.id, {} as any);
      const connection3 = sseService.createConnection(testUser.id, {} as any);

      const stats = sseService.getConnectionStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.activeUsers).toBe(1);
      expect(stats.connectionsPerUser[testUser.id]).toBe(3);

      // Remover uma conexão
      sseService.removeConnection(connection1.id);

      const updatedStats = sseService.getConnectionStats();
      expect(updatedStats.totalConnections).toBe(2);
      expect(updatedStats.connectionsPerUser[testUser.id]).toBe(2);
    });

    it('should enforce connection limits per user', () => {
      // Tentar criar mais conexões que o limite
      const connections = [];

      for (let i = 0; i < 7; i++) {
        // Limite é 5
        try {
          const connection = sseService.createConnection(
            testUser.id,
            {} as any,
          );
          connections.push(connection);
        } catch (error) {
          expect(error.message).toContain('limite máximo');
        }
      }

      expect(connections.length).toBeLessThanOrEqual(5);
    });

    it('should broadcast to all connected users', async () => {
      // Criar usuários adicionais
      const user2 = userRepository.create({
        id: 'user-2',
        email: 'user2@example.com',
        nome: 'User 2',
        roles: ['user'],
      });
      await userRepository.save(user2);

      // Criar conexões para ambos usuários
      sseService.createConnection(testUser.id, {} as any);
      sseService.createConnection(user2.id, {} as any);

      // Broadcast geral
      const notification = {
        type: 'announcement',
        data: {
          titulo: 'Anúncio Geral',
          conteudo: 'Mensagem para todos os usuários',
        },
      };

      const result = sseService.broadcastToAll(notification);
      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(2);
    });

    it('should clean up inactive connections', async () => {
      // Criar conexão
      const connection = sseService.createConnection(testUser.id, {} as any);

      expect(sseService.getConnectionStats().totalConnections).toBe(1);

      // Simular conexão inativa (timeout)
      connection.lastActivity = Date.now() - 400000; // 400 segundos atrás

      // Executar limpeza
      sseService.cleanupInactiveConnections();

      expect(sseService.getConnectionStats().totalConnections).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simular erro no banco
      jest
        .spyOn(notificacaoRepository, 'save')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      try {
        await notificacaoService.criar(
          testUser.id,
          'error',
          'Teste Erro',
          'Conteúdo de teste',
        );
      } catch (error) {
        expect(error.message).toContain('Database connection failed');
      }
    });

    it('should handle SSE connection errors', () => {
      const mockResponse = {
        writeHead: jest.fn(),
        write: jest.fn().mockImplementation(() => {
          throw new Error('Connection lost');
        }),
        end: jest.fn(),
        on: jest.fn(),
      };

      expect(() => {
        sseService.createConnection(testUser.id, mockResponse as any);
      }).not.toThrow();
    });

    it('should handle invalid notification data', async () => {
      const invalidData = {
        tipo: '', // Tipo vazio
        titulo: '', // Título vazio
        conteudo: 'Conteúdo válido',
        destinatario_id: 'invalid-user-id',
      };

      await request(app.getHttpServer())
        .post('/v1/notificacao')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of notifications', async () => {
      const startTime = Date.now();
      const notificationCount = 100;

      const promises = [];
      for (let i = 0; i < notificationCount; i++) {
        promises.push(
          notificacaoService.criar(
            testUser.id,
            'info',
            `Notificação ${i}`,
            `Conteúdo ${i}`,
          ),
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Deve completar em menos de 5 segundos

      const count = await notificacaoRepository.count({
        where: { destinatario_id: testUser.id },
      });
      expect(count).toBe(notificationCount);
    });

    it('should handle multiple concurrent SSE connections', () => {
      const connectionCount = 50;
      const connections = [];

      const startTime = Date.now();

      for (let i = 0; i < connectionCount; i++) {
        const mockResponse = {
          writeHead: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
        };

        const connection = sseService.createConnection(
          `user-${i}`,
          mockResponse as any,
        );
        connections.push(connection);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Deve completar em menos de 1 segundo
      expect(sseService.getConnectionStats().totalConnections).toBe(
        connectionCount,
      );
    });
  });
});
