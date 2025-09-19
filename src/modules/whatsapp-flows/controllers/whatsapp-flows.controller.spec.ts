import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppFlowsController } from './whatsapp-flows.controller';
import { WhatsAppFlowsService } from '../services/whatsapp-flows.service';
import {
  WhatsAppFlowRequestDto,
  EncryptedFlowResponseDto,
} from '../dto';
import { ScreenType } from '../enums/screen-type.enum';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PERMISSION_REQUIREMENTS_KEY } from '@/auth/decorators/requires-permission.decorator';

/**
 * Testes unitários para WhatsAppFlowsController
 * 
 * Testa todos os endpoints do controller, incluindo processamento de flows,
 * consulta de sessões, estatísticas e operações administrativas.
 */
describe('WhatsAppFlowsController', () => {
  let controller: WhatsAppFlowsController;
  let whatsAppFlowsService: jest.Mocked<WhatsAppFlowsService>;

  // Dados de teste
  const mockEncryptedRequest: WhatsAppFlowRequestDto = {
    encrypted_flow_data: 'eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0...',
    encrypted_aes_key: 'kx5jZWFyY2ggZm9yIGEgc2VjcmV0IGtleSBpbiB0aGUgZGF0YWJhc2U...',
    initial_vector: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
  };

  const mockEncryptedResponse: EncryptedFlowResponseDto = {
    encrypted_flow_data: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  };

  const mockActiveSessions = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      flow_token: 'flow_token_123',
      current_screen: ScreenType.INICIO,
      session_data: {},
      usuario_id: null,
      cidadao_id: null,
      created_at: new Date('2024-01-01T10:00:00Z'),
      updated_at: new Date('2024-01-01T10:30:00Z'),
      expires_at: new Date('2024-01-02T10:00:00Z'),
      usuario: null,
      cidadao: null,
      logs: [],
      isExpired: () => false,
      isAuthenticated: () => false,
      hasCidadao: () => false,
      updateSessionData: () => {},
      clearSensitiveData: () => {},
      extendExpiration: () => {},
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      flow_token: 'flow_token_456',
      current_screen: ScreenType.BUSCAR_CIDADAO,
      session_data: {},
      usuario_id: null,
      cidadao_id: null,
      created_at: new Date('2024-01-01T09:00:00Z'),
      updated_at: new Date('2024-01-01T10:15:00Z'),
      expires_at: new Date('2024-01-02T09:00:00Z'),
      usuario: null,
      cidadao: null,
      logs: [],
      isExpired: () => false,
      isAuthenticated: () => false,
      hasCidadao: () => false,
      updateSessionData: () => {},
      clearSensitiveData: () => {},
      extendExpiration: () => {},
    },
  ];

  const mockSessionStats = {
    activeSessions: 15,
    totalSessions: 150,
    sessionsByScreen: {
      [ScreenType.INICIO]: 8,
      [ScreenType.BUSCAR_CIDADAO]: 5,
      [ScreenType.ESQUECEU_SENHA]: 2,
    },
    averageSessionDuration: 12.5,
  };

  beforeEach(async () => {
    const mockWhatsAppFlowsService = {
      processEncryptedRequest: jest.fn(),
      findActiveSessions: jest.fn(),
      getSessionStats: jest.fn(),
      cleanupInactiveSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppFlowsController],
      providers: [
        {
          provide: WhatsAppFlowsService,
          useValue: mockWhatsAppFlowsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WhatsAppFlowsController>(WhatsAppFlowsController);
    whatsAppFlowsService = module.get(WhatsAppFlowsService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('processFlow', () => {
    it('deve processar requisição criptografada com sucesso', async () => {
      whatsAppFlowsService.processEncryptedRequest.mockResolvedValue(
        mockEncryptedResponse,
      );

      const result = await controller.processFlow(mockEncryptedRequest);

      expect(result).toEqual(mockEncryptedResponse);
      expect(whatsAppFlowsService.processEncryptedRequest).toHaveBeenCalledWith(
        mockEncryptedRequest,
      );
      expect(whatsAppFlowsService.processEncryptedRequest).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do serviço', async () => {
      const errorMessage = 'Erro na criptografia';
      whatsAppFlowsService.processEncryptedRequest.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.processFlow(mockEncryptedRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(whatsAppFlowsService.processEncryptedRequest).toHaveBeenCalledWith(
        mockEncryptedRequest,
      );
    });

    it('deve registrar logs de debug e sucesso', async () => {
      whatsAppFlowsService.processEncryptedRequest.mockResolvedValue(
        mockEncryptedResponse,
      );

      const loggerSpy = jest.spyOn(controller['logger'], 'debug');
      const loggerLogSpy = jest.spyOn(controller['logger'], 'log');

      await controller.processFlow(mockEncryptedRequest);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Recebida requisição do WhatsApp Flow',
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Requisição do WhatsApp Flow processada em'),
      );
    });

    it('deve registrar logs de erro quando falhar', async () => {
      const error = new Error('Erro de teste');
      whatsAppFlowsService.processEncryptedRequest.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(controller['logger'], 'error');

      await expect(controller.processFlow(mockEncryptedRequest)).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao processar WhatsApp Flow'),
        error.stack,
      );
    });
  });

  describe('getActiveSessions', () => {
    it('deve retornar sessões ativas sem filtros', async () => {
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        mockActiveSessions,
      );

      const result = await controller.getActiveSessions();

      expect(result).toEqual(mockActiveSessions);
      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber: undefined,
        currentScreen: undefined,
        limit: 50,
      });
    });

    it('deve retornar sessões ativas com filtro de telefone', async () => {
      const phoneNumber = '+5511999999999';
      const filteredSessions = [mockActiveSessions[0]];
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        filteredSessions,
      );

      const result = await controller.getActiveSessions(phoneNumber);

      expect(result).toEqual(filteredSessions);
      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber,
        currentScreen: undefined,
        limit: 50,
      });
    });

    it('deve retornar sessões ativas com filtro de tela', async () => {
      const currentScreen = ScreenType.INICIO;
      const filteredSessions = [mockActiveSessions[0]];
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        filteredSessions,
      );

      const result = await controller.getActiveSessions(
        undefined,
        currentScreen,
      );

      expect(result).toEqual(filteredSessions);
      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber: undefined,
        currentScreen,
        limit: 50,
      });
    });

    it('deve retornar sessões ativas com limite personalizado', async () => {
      const limit = 25;
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        mockActiveSessions,
      );

      const result = await controller.getActiveSessions(
        undefined,
        undefined,
        limit,
      );

      expect(result).toEqual(mockActiveSessions);
      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber: undefined,
        currentScreen: undefined,
        limit,
      });
    });

    it('deve limitar o máximo de resultados a 100', async () => {
      const limit = 150; // Acima do máximo
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        mockActiveSessions,
      );

      await controller.getActiveSessions(undefined, undefined, limit);

      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber: undefined,
        currentScreen: undefined,
        limit: 100, // Deve ser limitado a 100
      });
    });

    it('deve retornar sessões ativas com todos os filtros', async () => {
      const phoneNumber = '+5511999999999';
      const currentScreen = ScreenType.INICIO;
      const limit = 10;
      const filteredSessions = [mockActiveSessions[0]];
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        filteredSessions,
      );

      const result = await controller.getActiveSessions(
        phoneNumber,
        currentScreen,
        limit,
      );

      expect(result).toEqual(filteredSessions);
      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber,
        currentScreen,
        limit,
      });
    });

    it('deve registrar logs de debug e sucesso', async () => {
      whatsAppFlowsService.findActiveSessions.mockResolvedValue(
        mockActiveSessions,
      );

      const loggerSpy = jest.spyOn(controller['logger'], 'debug');
      const loggerLogSpy = jest.spyOn(controller['logger'], 'log');

      await controller.getActiveSessions();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Consultando sessões ativas'),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Retornadas ${mockActiveSessions.length} sessões ativas`,
      );
    });
  });

  describe('getSessionStats', () => {
    it('deve retornar estatísticas das sessões', async () => {
      whatsAppFlowsService.getSessionStats.mockResolvedValue(mockSessionStats);

      const result = await controller.getSessionStats();

      expect(result).toEqual(mockSessionStats);
      expect(whatsAppFlowsService.getSessionStats).toHaveBeenCalledTimes(1);
    });

    it('deve registrar logs de debug e sucesso', async () => {
      whatsAppFlowsService.getSessionStats.mockResolvedValue(mockSessionStats);

      const loggerSpy = jest.spyOn(controller['logger'], 'debug');
      const loggerLogSpy = jest.spyOn(controller['logger'], 'log');

      await controller.getSessionStats();

      expect(loggerSpy).toHaveBeenCalledWith('Consultando estatísticas das sessões');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Estatísticas obtidas - Sessões ativas: ${mockSessionStats.activeSessions}, Total: ${mockSessionStats.totalSessions}`,
      );
    });

    it('deve propagar erro do serviço', async () => {
      const errorMessage = 'Erro ao obter estatísticas';
      whatsAppFlowsService.getSessionStats.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.getSessionStats()).rejects.toThrow(errorMessage);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('deve limpar sessões inativas com parâmetro padrão', async () => {
      const cleanedCount = 5;
      whatsAppFlowsService.cleanupInactiveSessions.mockResolvedValue(
        cleanedCount,
      );

      const result = await controller.cleanupInactiveSessions();

      expect(result).toEqual({
        cleanedSessions: cleanedCount,
        message: `${cleanedCount} sessões inativas foram finalizadas`,
      });
      expect(whatsAppFlowsService.cleanupInactiveSessions).toHaveBeenCalledWith(
        30, // Valor padrão
      );
    });

    it('deve limpar sessões inativas com parâmetro personalizado', async () => {
      const inactiveMinutes = 60;
      const cleanedCount = 10;
      whatsAppFlowsService.cleanupInactiveSessions.mockResolvedValue(
        cleanedCount,
      );

      const result = await controller.cleanupInactiveSessions(inactiveMinutes);

      expect(result).toEqual({
        cleanedSessions: cleanedCount,
        message: `${cleanedCount} sessões inativas foram finalizadas`,
      });
      expect(whatsAppFlowsService.cleanupInactiveSessions).toHaveBeenCalledWith(
        inactiveMinutes,
      );
    });

    it('deve garantir mínimo de 5 minutos de inatividade', async () => {
      const inactiveMinutes = 2; // Abaixo do mínimo
      const cleanedCount = 3;
      whatsAppFlowsService.cleanupInactiveSessions.mockResolvedValue(
        cleanedCount,
      );

      await controller.cleanupInactiveSessions(inactiveMinutes);

      expect(whatsAppFlowsService.cleanupInactiveSessions).toHaveBeenCalledWith(
        5, // Deve ser ajustado para o mínimo
      );
    });

    it('deve retornar zero quando nenhuma sessão for limpa', async () => {
      const cleanedCount = 0;
      whatsAppFlowsService.cleanupInactiveSessions.mockResolvedValue(
        cleanedCount,
      );

      const result = await controller.cleanupInactiveSessions();

      expect(result).toEqual({
        cleanedSessions: 0,
        message: '0 sessões inativas foram finalizadas',
      });
    });

    it('deve registrar logs de debug e sucesso', async () => {
      const inactiveMinutes = 45;
      const cleanedCount = 7;
      whatsAppFlowsService.cleanupInactiveSessions.mockResolvedValue(
        cleanedCount,
      );

      const loggerSpy = jest.spyOn(controller['logger'], 'debug');
      const loggerLogSpy = jest.spyOn(controller['logger'], 'log');

      await controller.cleanupInactiveSessions(inactiveMinutes);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Iniciando limpeza de sessões inativas - Inatividade: ${inactiveMinutes} minutos`,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `${cleanedCount} sessões inativas foram finalizadas`,
      );
    });

    it('deve propagar erro do serviço', async () => {
      const errorMessage = 'Erro ao limpar sessões';
      whatsAppFlowsService.cleanupInactiveSessions.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.cleanupInactiveSessions()).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('Validação de parâmetros', () => {
    it('deve usar valor padrão para limit quando não fornecido', async () => {
      whatsAppFlowsService.findActiveSessions.mockResolvedValue([]);

      await controller.getActiveSessions();

      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    it('deve usar valor padrão para inactiveMinutes quando não fornecido', async () => {
      whatsAppFlowsService.cleanupInactiveSessions.mockResolvedValue(0);

      await controller.cleanupInactiveSessions();

      expect(whatsAppFlowsService.cleanupInactiveSessions).toHaveBeenCalledWith(
        30,
      );
    });
  });

  describe('Integração com guards e decorators', () => {
    it('deve ter JwtAuthGuard aplicado nos endpoints administrativos', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        WhatsAppFlowsController.prototype.getActiveSessions,
      );
      expect(guards).toContain(JwtAuthGuard);
    });

    it('deve ter RequiresPermission aplicado nos endpoints administrativos', () => {
      const permissions = Reflect.getMetadata(
        PERMISSION_REQUIREMENTS_KEY,
        WhatsAppFlowsController.prototype.getActiveSessions,
      );
      expect(permissions).toBeDefined();
    });

    it('deve não ter guards no endpoint principal processFlow', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        WhatsAppFlowsController.prototype.processFlow,
      );
      expect(guards).toBeUndefined();
    });
  });

  describe('Tratamento de erros e edge cases', () => {
    it('deve lidar com sessões vazias', async () => {
      whatsAppFlowsService.findActiveSessions.mockResolvedValue([]);

      const result = await controller.getActiveSessions();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('deve lidar com estatísticas zeradas', async () => {
      const emptyStats = {
        activeSessions: 0,
        totalSessions: 0,
        sessionsByScreen: {},
        averageSessionDuration: 0,
      };
      whatsAppFlowsService.getSessionStats.mockResolvedValue(emptyStats);

      const result = await controller.getSessionStats();

      expect(result).toEqual(emptyStats);
    });

    it('deve lidar com valores nulos nos parâmetros opcionais', async () => {
      whatsAppFlowsService.findActiveSessions.mockResolvedValue([]);

      await controller.getActiveSessions(null, null, null);

      expect(whatsAppFlowsService.findActiveSessions).toHaveBeenCalledWith({
        phoneNumber: null,
        currentScreen: null,
        limit: 50,
      });
    });
  });
});