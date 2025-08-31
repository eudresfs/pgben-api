import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationLoggerService } from '../notification-logger.service';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  BaseNotificationContext
} from '../../interfaces/base-notification.interface';

describe('NotificationLoggerService', () => {
  let service: NotificationLoggerService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Mock do Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationLoggerService,
        {
          provide: Logger,
          useValue: mockLogger
        }
      ]
    }).compile();

    service = module.get<NotificationLoggerService>(NotificationLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logNotificationStart', () => {
    it('deve registrar início de notificação com contexto completo', () => {
      // Arrange
      const notificationId = 'notif-123';
      const contexto: BaseNotificationContext = {
        user_id: 'user-123',
        titulo: 'Teste de Notificação',
        conteudo: 'Conteúdo da notificação',
        dados: { key: 'value', senha: 'secret123' },
        prioridade: NotificationPriority.HIGH,
        canais: [NotificationChannel.EMAIL, NotificationChannel.ABLY],
        templates: { email: 'template-email' },
        tipo: NotificationType.SOLICITACAO
      };

      // Act
      service.logNotificationStart(notificationId, contexto);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Iniciando envio de notificação'),
        expect.objectContaining({
          notification_id: notificationId,
          user_id: 'user-123',
          tipo: NotificationType.SOLICITACAO,
          prioridade: NotificationPriority.HIGH,
          canais: [NotificationChannel.EMAIL, NotificationChannel.ABLY],
          contexto_sanitizado: expect.objectContaining({
            user_id: 'user-123',
            titulo: 'Teste de Notificação',
            dados: expect.objectContaining({
              key: 'value',
              senha: '[REDACTED]' // Dados sensíveis devem ser sanitizados
            })
          })
        })
      );
    });

    it('deve lidar com contexto sem dados sensíveis', () => {
      // Arrange
      const notificationId = 'notif-456';
      const contexto: BaseNotificationContext = {
        user_id: 'user-456',
        titulo: 'Notificação Simples',
        conteudo: 'Conteúdo simples',
        dados: { info: 'public data' },
        prioridade: NotificationPriority.LOW,
        canais: [NotificationChannel.EMAIL],
        templates: {}
      };

      // Act
      service.logNotificationStart(notificationId, contexto);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Iniciando envio de notificação'),
        expect.objectContaining({
          notification_id: notificationId,
          contexto_sanitizado: expect.objectContaining({
            dados: { info: 'public data' } // Dados não sensíveis mantidos
          })
        })
      );
    });
  });

  describe('logNotificationSuccess', () => {
    it('deve registrar sucesso com métricas', () => {
      // Arrange
      const notificationId = 'notif-123';
      const tempoProcessamento = 1500;
      const metricas = {
        canais_sucesso: 2,
        canais_falha: 0,
        tentativas_total: 1,
        tempo_medio_canal: 750
      };

      // Act
      service.logNotificationSuccess(notificationId, tempoProcessamento, metricas);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Notificação enviada com sucesso'),
        expect.objectContaining({
          notification_id: notificationId,
          tempo_processamento: tempoProcessamento,
          metricas,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logNotificationFailure', () => {
    it('deve registrar falha com detalhes do erro', () => {
      // Arrange
      const notificationId = 'notif-789';
      const tempoProcessamento = 2000;
      const erro = 'Falha na validação de template';
      const detalhes = {
        template_faltante: 'email-template',
        canais_tentados: [NotificationChannel.EMAIL],
        tentativas: 3
      };

      // Act
      service.logNotificationFailure(notificationId, tempoProcessamento, erro, detalhes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Falha no envio de notificação'),
        expect.objectContaining({
          notification_id: notificationId,
          tempo_processamento: tempoProcessamento,
          erro,
          detalhes,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logChannelResult', () => {
    it('deve registrar resultado de canal com sucesso', () => {
      // Arrange
      const notificationId = 'notif-123';
      const canal = NotificationChannel.EMAIL;
      const resultado = {
        sucesso: true,
        canal: NotificationChannel.EMAIL,
        tempo_processamento: 800,
        detalhes: { message_id: 'email-456' }
      };

      // Act
      service.logChannelResult(notificationId, canal, resultado);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Resultado do canal EMAIL'),
        expect.objectContaining({
          notification_id: notificationId,
          canal,
          resultado,
          timestamp: expect.any(String)
        })
      );
    });

    it('deve registrar resultado de canal com falha', () => {
      // Arrange
      const notificationId = 'notif-456';
      const canal = NotificationChannel.ABLY;
      const resultado = {
        sucesso: false,
        canal: NotificationChannel.ABLY,
        tempo_processamento: 1200,
        erro: 'Conexão com Ably falhou',
        detalhes: { tentativas: 3 }
      };

      // Act
      service.logChannelResult(notificationId, canal, resultado);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Resultado do canal ABLY'),
        expect.objectContaining({
          notification_id: notificationId,
          canal,
          resultado,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logTemplateValidation', () => {
    it('deve registrar validação de template com sucesso', () => {
      // Arrange
      const notificationId = 'notif-123';
      const resultado = {
        todos_validos: true,
        resultados: [
          { template_id: 'email-template', canal: NotificationChannel.EMAIL, valido: true }
        ],
        templates_faltantes: [],
        templates_invalidos: []
      };

      // Act
      service.logTemplateValidation(notificationId, resultado);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Validação de templates'),
        expect.objectContaining({
          notification_id: notificationId,
          validacao: resultado,
          timestamp: expect.any(String)
        })
      );
    });

    it('deve registrar validação de template com falha', () => {
      // Arrange
      const notificationId = 'notif-456';
      const resultado = {
        todos_validos: false,
        resultados: [],
        templates_faltantes: ['email-template'],
        templates_invalidos: ['sms-template']
      };

      // Act
      service.logTemplateValidation(notificationId, resultado);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Validação de templates'),
        expect.objectContaining({
          notification_id: notificationId,
          validacao: resultado,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logMetrics', () => {
    it('deve registrar métricas do sistema', () => {
      // Arrange
      const metricas = {
        total_enviadas: 100,
        total_sucessos: 95,
        total_falhas: 5,
        taxa_sucesso: 0.95,
        tempo_medio_processamento: 1200,
        metricas_por_canal: {
          [NotificationChannel.EMAIL]: { enviadas: 80, sucessos: 78, falhas: 2 },
          [NotificationChannel.ABLY]: { enviadas: 20, sucessos: 17, falhas: 3 }
        }
      };

      // Act
      service.logMetrics(metricas);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Métricas do sistema de notificações'),
        expect.objectContaining({
          metricas,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logPerformance', () => {
    it('deve registrar métricas de performance', () => {
      // Arrange
      const notificationId = 'notif-123';
      const performance = {
        tempo_validacao: 50,
        tempo_envio_total: 1200,
        tempo_por_canal: {
          [NotificationChannel.EMAIL]: 800,
          [NotificationChannel.ABLY]: 400
        },
        memoria_utilizada: 1024,
        cpu_utilizada: 15.5
      };

      // Act
      service.logPerformance(notificationId, performance);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Performance da notificação'),
        expect.objectContaining({
          notification_id: notificationId,
          performance,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logDebug', () => {
    it('deve registrar mensagem de debug', () => {
      // Arrange
      const mensagem = 'Debug: processando template';
      const contexto = {
        template_id: 'email-template',
        user_id: 'user-123'
      };

      // Act
      service.logDebug(mensagem, contexto);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        mensagem,
        expect.objectContaining({
          contexto,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logAudit', () => {
    it('deve registrar evento de auditoria', () => {
      // Arrange
      const evento = 'TEMPLATE_UPDATED';
      const detalhes = {
        template_id: 'email-template',
        usuario_id: 'admin-123',
        alteracoes: ['titulo', 'conteudo']
      };

      // Act
      service.logAudit(evento, detalhes);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Evento de auditoria: TEMPLATE_UPDATED'),
        expect.objectContaining({
          evento,
          detalhes,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logError', () => {
    it('deve registrar erro com stack trace', () => {
      // Arrange
      const erro = new Error('Erro de teste');
      const contexto = {
        notification_id: 'notif-123',
        canal: NotificationChannel.EMAIL
      };

      // Act
      service.logError(erro, contexto);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro no sistema de notificações'),
        expect.objectContaining({
          erro: {
            message: 'Erro de teste',
            stack: expect.any(String)
          },
          contexto,
          timestamp: expect.any(String)
        })
      );
    });

    it('deve lidar com erro sem stack trace', () => {
      // Arrange
      const erro = 'String de erro';
      const contexto = { info: 'teste' };

      // Act
      service.logError(erro as any, contexto);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro no sistema de notificações'),
        expect.objectContaining({
          erro: 'String de erro',
          contexto,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('sanitizeSensitiveData', () => {
    it('deve sanitizar dados sensíveis', () => {
      // Arrange
      const dados = {
        nome: 'João Silva',
        email: 'joao@email.com',
        senha: 'senha123',
        password: 'password456',
        token: 'abc123token',
        api_key: 'key789',
        secret: 'secret123',
        cpf: '123.456.789-00',
        dados_publicos: 'informação pública'
      };

      // Act
      const resultado = (service as any).sanitizeSensitiveData(dados);

      // Assert
      expect(resultado).toEqual({
        nome: 'João Silva',
        email: 'joao@email.com',
        senha: '[REDACTED]',
        password: '[REDACTED]',
        token: '[REDACTED]',
        api_key: '[REDACTED]',
        secret: '[REDACTED]',
        cpf: '[REDACTED]',
        dados_publicos: 'informação pública'
      });
    });

    it('deve lidar com objetos aninhados', () => {
      // Arrange
      const dados = {
        usuario: {
          nome: 'João',
          senha: 'senha123'
        },
        config: {
          api_key: 'key789',
          timeout: 5000
        }
      };

      // Act
      const resultado = (service as any).sanitizeSensitiveData(dados);

      // Assert
      expect(resultado).toEqual({
        usuario: {
          nome: 'João',
          senha: '[REDACTED]'
        },
        config: {
          api_key: '[REDACTED]',
          timeout: 5000
        }
      });
    });

    it('deve lidar com arrays', () => {
      // Arrange
      const dados = {
        usuarios: [
          { nome: 'João', senha: 'senha1' },
          { nome: 'Maria', senha: 'senha2' }
        ]
      };

      // Act
      const resultado = (service as any).sanitizeSensitiveData(dados);

      // Assert
      expect(resultado).toEqual({
        usuarios: [
          { nome: 'João', senha: '[REDACTED]' },
          { nome: 'Maria', senha: '[REDACTED]' }
        ]
      });
    });
  });

  describe('limitContextSize', () => {
    it('deve limitar tamanho do contexto', () => {
      // Arrange
      const contextoGrande = {
        dados: 'x'.repeat(6000), // String muito grande
        info: 'informação normal'
      };

      // Act
      const resultado = (service as any).limitContextSize(contextoGrande);

      // Assert
      expect(JSON.stringify(resultado).length).toBeLessThanOrEqual(5000);
      expect(resultado.info).toBe('informação normal');
      expect(resultado.dados).toContain('[TRUNCATED]');
    });

    it('deve manter contexto pequeno inalterado', () => {
      // Arrange
      const contextoPequeno = {
        dados: 'informação pequena',
        info: 'outra informação'
      };

      // Act
      const resultado = (service as any).limitContextSize(contextoPequeno);

      // Assert
      expect(resultado).toEqual(contextoPequeno);
    });
  });

  describe('formatTimestamp', () => {
    it('deve formatar timestamp corretamente', () => {
      // Act
      const timestamp = (service as any).formatTimestamp();

      // Assert
      expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });
});