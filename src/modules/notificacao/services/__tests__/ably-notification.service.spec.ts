import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AblyNotificationService } from '../ably-notification.service';
import { AblyChannelService } from '../ably-channel.service';
import { AblyService } from '../ably.service';
import {
  BaseNotificationContext,
  NotificationType,
  NotificationPriority,
  NotificationChannel
} from '../../interfaces/base-notification.interface';

describe('AblyNotificationService', () => {
  let service: AblyNotificationService;
  let mockAblyService: jest.Mocked<AblyService>;
  let mockAblyChannelService: jest.Mocked<AblyChannelService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const contextoValido: BaseNotificationContext = {
    destinatario_id: 'user123',
    tipo: NotificationType.PAGAMENTO,
    prioridade: NotificationPriority.MEDIA,
    titulo: 'Pagamento Aprovado',
    conteudo: 'Seu pagamento foi aprovado com sucesso',
    url: '/pagamentos/123',
    template_email: 'pagamento-aprovado',
    canais: [NotificationChannel.ABLY],
    dados_contexto: {
      nome_usuario: 'João',
      valor_pagamento: 'R$ 100,00'
    },
    metadata: {
      origem: 'sistema-pagamento'
    }
  };

  const mockChannel = {
    name: 'user:user123',
    publish: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    const mockAblyServiceProvider = {
      provide: AblyService,
      useValue: {
        getConnectionState: jest.fn()
      }
    };

    const mockAblyChannelServiceProvider = {
      provide: AblyChannelService,
      useValue: {
        createUserChannel: jest.fn()
      }
    };

    const mockConfigServiceProvider = {
      provide: ConfigService,
      useValue: {
        get: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AblyNotificationService,
        mockAblyServiceProvider,
        mockAblyChannelServiceProvider,
        mockConfigServiceProvider
      ]
    }).compile();

    service = module.get<AblyNotificationService>(AblyNotificationService);
    mockAblyService = module.get(AblyService);
    mockAblyChannelService = module.get(AblyChannelService);
    mockConfigService = module.get(ConfigService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const configs = {
        'ABLY_MAX_RETRIES': 3,
        'ABLY_RETRY_DELAY': 1000
      };
      return configs[key] || defaultValue;
    });

    // Reset mocks
    jest.clearAllMocks();
    mockChannel.publish.mockClear();
  });

  describe('enviarNotificacao', () => {
    it('deve enviar notificação com sucesso', async () => {
      // Arrange
      const notificacaoId = 'notif123';
      mockAblyChannelService.createUserChannel.mockResolvedValue({
        success: true,
        data: mockChannel
      });

      // Act
      const resultado = await service.enviarNotificacao(contextoValido, notificacaoId);

      // Assert
      expect(resultado.sucesso).toBe(true);
      expect(resultado.canal).toBe(NotificationChannel.ABLY);
      expect(resultado.dados_resposta).toEqual({
        tentativa: 1,
        canal_nome: 'user:user123'
      });
      expect(mockAblyChannelService.createUserChannel).toHaveBeenCalledWith('user123');
      expect(mockChannel.publish).toHaveBeenCalledWith('notification', {
        id: notificacaoId,
        titulo: contextoValido.titulo,
        conteudo: contextoValido.conteudo,
        tipo: contextoValido.tipo,
        prioridade: contextoValido.prioridade,
        url: contextoValido.url,
        timestamp: expect.any(Date),
        metadata: contextoValido.metadata
      });
    });

    it('deve falhar quando URL não está presente', async () => {
      // Arrange
      const contextoSemUrl = { ...contextoValido, url: undefined };
      const notificacaoId = 'notif123';

      // Act
      const resultado = await service.enviarNotificacao(contextoSemUrl, notificacaoId);

      // Assert
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('URL é obrigatória para notificações in-app via Ably');
      expect(mockAblyChannelService.createUserChannel).not.toHaveBeenCalled();
    });

    it('deve falhar quando não consegue obter canal do usuário', async () => {
      // Arrange
      const notificacaoId = 'notif123';
      mockAblyChannelService.createUserChannel.mockResolvedValue({
        success: false,
        data: null
      });

      // Act
      const resultado = await service.enviarNotificacao(contextoValido, notificacaoId);

      // Assert
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Falha após 3 tentativas');
      expect(mockAblyChannelService.createUserChannel).toHaveBeenCalledTimes(3); // 3 tentativas
    });

    it('deve fazer retry quando publish falha', async () => {
      // Arrange
      const notificacaoId = 'notif123';
      mockAblyChannelService.createUserChannel.mockResolvedValue({
        success: true,
        data: mockChannel
      });
      mockChannel.publish
        .mockRejectedValueOnce(new Error('Erro temporário'))
        .mockResolvedValueOnce(undefined); // Sucesso na segunda tentativa

      // Act
      const resultado = await service.enviarNotificacao(contextoValido, notificacaoId);

      // Assert
      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados_resposta.tentativa).toBe(2);
      expect(mockChannel.publish).toHaveBeenCalledTimes(2);
    });

    it('deve lidar com erros inesperados', async () => {
      // Arrange
      const notificacaoId = 'notif123';
      mockAblyChannelService.createUserChannel.mockRejectedValue(new Error('Erro inesperado'));

      // Act
      const resultado = await service.enviarNotificacao(contextoValido, notificacaoId);

      // Assert
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Erro inesperado');
    });
  });

  describe('enviarBroadcast', () => {
    it('deve enviar broadcast para múltiplos usuários', async