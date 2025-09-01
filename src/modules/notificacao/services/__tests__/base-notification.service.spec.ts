import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { BaseNotificationService } from '../base-notification.service';
import { TemplateValidationService } from '../template-validation.service';
import { AblyNotificationService } from '../ably-notification.service';
import { NotificationContextFactory } from '../notification-context.factory';
import { NotificationLoggerService } from '../notification-logger.service';
import { NotificationConfig } from '../../config/notification.config';
import { EmailService } from '../../../../common/services/email.service';
import { NotificacaoSistema } from '../../../../entities/notification.entity';
import {
  BaseNotificationContext,
  NotificationResult,
  NotificationType,
  NotificationPriority,
  NotificationChannel
} from '../../interfaces/base-notification.interface';

describe('BaseNotificationService', () => {
  let service: BaseNotificationService;
  let mockTemplateValidation: jest.Mocked<TemplateValidationService>;
  let mockAblyService: jest.Mocked<AblyNotificationService>;
  let mockContextFactory: jest.Mocked<NotificationContextFactory>;
  let mockLoggerService: jest.Mocked<NotificationLoggerService>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRepository: any;
  let mockConfig: any;

  beforeEach(async () => {
    mockTemplateValidation = {
      validarTemplate: jest.fn(),
      validarTemplatesLote: jest.fn(),
      listarTemplatesAtivos: jest.fn(),
      templateExisteEAtivo: jest.fn()
    } as any;

    mockAblyService = {
      enviarNotificacao: jest.fn().mockResolvedValue({
        canal: NotificationChannel.ABLY,
        sucesso: true,
        dados_resposta: { message_id: 'ably123' },
        timestamp: new Date()
      }),
      enviarNotificacaoLote: jest.fn(),
      configurarCanal: jest.fn(),
      verificarConexao: jest.fn(),
      getConnectionState: jest.fn().mockReturnValue('connected')
    } as any;

    mockContextFactory = {
      criarContextoSolicitacao: jest.fn(),
      criarContextoPagamento: jest.fn(),
      criarContextoConcessao: jest.fn(),
      criarContextoAprovacao: jest.fn(),
      criarContextoMonitoramento: jest.fn()
    } as any;

    mockLoggerService = {
      logNotificationStart: jest.fn(),
      logNotificationSuccess: jest.fn(),
      logNotificationError: jest.fn(),
      logChannelResult: jest.fn()
    } as any;

    mockEmailService = {
      sendEmail: jest.fn()
    } as any;

    mockEventEmitter = {
      emit: jest.fn()
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          'NOTIFICATION_MAX_RETRIES': 3,
          'NOTIFICATION_RETRY_INTERVAL': 1000,
          'NOTIFICATION_BACKOFF_MULTIPLIER': 2,
          'NOTIFICATION_MAX_INTERVAL': 30000
        };
        return config[key] || defaultValue;
      })
    } as any;

    mockRepository = {
      create: jest.fn().mockReturnValue({
        id: 'test-notification-id',
        destinatario_id: 'user123',
        status: 'EM_PROCESSAMENTO'
      }),
      save: jest.fn().mockResolvedValue({
        id: 'test-notification-id',
        destinatario_id: 'user123',
        status: 'EM_PROCESSAMENTO'
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn()
    };

    mockConfig = {
      templateConfig: {
        validacao_obrigatoria: true,
        cache_templates: true,
        cache_ttl: 3600,
        templates_path: '/templates',
        fallback_template: 'default'
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaseNotificationService,
        {
          provide: TemplateValidationService,
          useValue: mockTemplateValidation
        },
        {
          provide: AblyNotificationService,
          useValue: mockAblyService
        },
        {
          provide: NotificationContextFactory,
          useValue: mockContextFactory
        },
        {
          provide: NotificationLoggerService,
          useValue: mockLoggerService
        },
        {
          provide: EmailService,
          useValue: mockEmailService
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: getRepositoryToken(NotificacaoSistema),
          useValue: mockRepository
        },
        {
          provide: NotificationConfig,
          useValue: mockConfig
        }
      ]
    }).compile();

    service = module.get<BaseNotificationService>(BaseNotificationService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('enviarNotificacao', () => {
    const contextoValido: BaseNotificationContext = {
      destinatario_id: 'user123',
      tipo: NotificationType.PAGAMENTO,
      prioridade: NotificationPriority.ALTA,
      titulo: 'Pagamento Aprovado',
      conteudo: 'Seu pagamento foi aprovado com sucesso',
      url: '/pagamentos/123',
      template_email: 'pagamento-aprovado',
      dados_contexto: { valor: 100.50 },
      canais: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      metadata: { origem: 'api' }
    };

    it('deve enviar notificação com sucesso quando template é válido', async () => {
      // Arrange
      mockTemplateValidation.validarTemplate.mockResolvedValue({
        valido: true,
        existe: true,
        ativo: true,
        erros: []
      });

      mockAblyService.enviarNotificacao.mockResolvedValue({
        sucesso: true,
        canal: NotificationChannel.IN_APP,
        timestamp: new Date(),
        dados_resposta: {}
      });

      // Act
      const resultado = await service.enviarNotificacao(contextoValido);

      // Assert
      expect(resultado.sucesso).toBe(true);
      expect(mockTemplateValidation.validarTemplate).toHaveBeenCalledWith(contextoValido);
      expect(mockAblyService.enviarNotificacao).toHaveBeenCalledWith(contextoValido, 'test-notification-id');
    });

    it('deve falhar quando template é inválido', async () => {
      // Arrange
      mockTemplateValidation.validarTemplate.mockResolvedValue({
        valido: false,
        existe: false,
        ativo: false,
        erros: ['Template não encontrado']
      });

      // Act
      const resultado = await service.enviarNotificacao(contextoValido);

      // Assert
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro_geral).toContain('Template não encontrado');
      expect(mockAblyService.enviarNotificacao).not.toHaveBeenCalled();
    });

    it('deve falhar quando Ably retorna erro', async () => {
      // Arrange
      const contextoApenasAbly = {
        ...contextoValido,
        canais: [NotificationChannel.IN_APP]
      };

      mockTemplateValidation.validarTemplate.mockResolvedValue({
        valido: true,
        existe: true,
        ativo: true,
        erros: []
      });

      mockAblyService.enviarNotificacao.mockResolvedValueOnce({
        canal: NotificationChannel.IN_APP,
        sucesso: false,
        erro: 'Erro de conexão com Ably',
        timestamp: new Date()
      });

      // Act
      const resultado = await service.enviarNotificacao(contextoApenasAbly);

      // Assert
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro_geral).toContain('Falha em todos os canais');
    });

    it('deve lidar com exceções durante o envio', async () => {
      // Arrange
      mockTemplateValidation.validarTemplate.mockRejectedValue(new Error('Erro de banco'));

      // Act
      const resultado = await service.enviarNotificacao(contextoValido);

      // Assert
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro_geral).toContain('unexpected_error: Erro de banco');
    });
  });



  describe('contextFactory', () => {
    it('deve ter acesso ao contextFactory', () => {
      // Assert
      expect(service.contextFactory).toBeDefined();
      expect(service.contextFactory).toBe(mockContextFactory);
    });
  });
});