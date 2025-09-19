import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { WhatsAppFlowsService } from './whatsapp-flows.service';
import { CryptographyService } from './cryptography.service';
import { ScreenHandlerService } from './screen-handler.service';
import { WhatsAppFlowSession } from '../entities/whatsapp-flow-session.entity';
import { WhatsAppFlowLog } from '../entities/whatsapp-flow-log.entity';
import { ScreenType } from '../enums/screen-type.enum';
import { ActionType } from '../enums/action-type.enum';
import { AuditEventEmitter } from '../../auditoria';
import { WhatsAppFlowRequestDto } from '../dto/whatsapp-flow-request.dto';
import { WhatsAppFlowResponseDto } from '../dto/whatsapp-flow-response.dto';

/**
 * Testes unitários para WhatsAppFlowsService
 * 
 * Cobertura de testes:
 * - Processamento de requisições criptografadas
 * - Gerenciamento de sessões
 * - Validação de requisições
 * - Tratamento de erros
 * - Operações de limpeza e estatísticas
 * - Cenários de sucesso e falha
 */
describe('WhatsAppFlowsService', () => {
  let service: WhatsAppFlowsService;
  let sessionRepository: jest.Mocked<Repository<WhatsAppFlowSession>>;
  let logRepository: jest.Mocked<Repository<WhatsAppFlowLog>>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let screenHandlerService: jest.Mocked<ScreenHandlerService>;
  let configService: jest.Mocked<ConfigService>;
  let auditEmitter: jest.Mocked<AuditEventEmitter>;

  // Mocks de dados para testes
  const mockSession: WhatsAppFlowSession = {
    id: 'session-123',
    flow_token: 'flow_123456_abc',
    current_screen: ScreenType.INICIO,
    session_data: {},
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  } as WhatsAppFlowSession;

  const mockDecryptedRequest = {
    version: '3.0',
    screen: ScreenType.INICIO,
    action: ActionType.INIT,
    flow_token: 'flow_123456_abc',
    data: {
      phone_number: '5511999999999'
    }
  };

  const mockEncryptedRequest: WhatsAppFlowRequestDto = {
    encrypted_flow_data: 'encrypted_data',
    encrypted_aes_key: 'encrypted_key',
    initial_vector: 'iv_data',
    decrypted_data: mockDecryptedRequest
  };

  const mockResponse: WhatsAppFlowResponseDto = {
    version: '3.0',
    action: ActionType.DATA_EXCHANGE,
    data: {
      message: 'Sucesso'
    }
  };

  beforeEach(async () => {
    // Criar mocks dos repositórios
    const mockSessionRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    // Criar mocks dos serviços
    const mockCryptographyService = {
      decryptRequest: jest.fn() as jest.MockedFunction<(encryptedData: string, iv: string, authTag: string) => string>,
      encryptResponse: jest.fn() as jest.MockedFunction<(data: any) => { encrypted_data: string; iv: string; auth_tag: string }>,
      encryptResponseLegacy: jest.fn() as jest.MockedFunction<(data: any) => { encrypted_data: string; iv: string; auth_tag: string }>,
    };

    const mockScreenHandlerService = {
      handleScreenRequest: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockAuditEmitter = {
      emitEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppFlowsService,
        {
          provide: getRepositoryToken(WhatsAppFlowSession),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(WhatsAppFlowLog),
          useValue: mockLogRepository,
        },
        {
          provide: CryptographyService,
          useValue: mockCryptographyService,
        },
        {
          provide: ScreenHandlerService,
          useValue: mockScreenHandlerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEmitter,
        },
      ],
    }).compile();

    service = module.get<WhatsAppFlowsService>(WhatsAppFlowsService);
    sessionRepository = module.get(getRepositoryToken(WhatsAppFlowSession));
    logRepository = module.get(getRepositoryToken(WhatsAppFlowLog));
    cryptographyService = module.get(CryptographyService);
    screenHandlerService = module.get(ScreenHandlerService);
    configService = module.get(ConfigService);
    auditEmitter = module.get(AuditEventEmitter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização do Serviço', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });
  });

  describe('processEncryptedRequest', () => {
    it('deve processar uma requisição criptografada com sucesso', async () => {
      // Arrange
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: mockDecryptedRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      sessionRepository.findOne.mockResolvedValue(null); // Simula que não existe sessão
      sessionRepository.create.mockReturnValue(mockSession);
      sessionRepository.save.mockResolvedValue(mockSession);
      screenHandlerService.handleScreenRequest.mockResolvedValue(mockResponse);
      cryptographyService.encryptResponse.mockReturnValue('encrypted_response_data');
      logRepository.create.mockReturnValue({} as WhatsAppFlowLog);
      logRepository.save.mockResolvedValue({} as WhatsAppFlowLog);

      // Act
      const result = await service.processEncryptedRequest(mockEncryptedRequest);

      // Assert
      expect(result).toEqual({
        encrypted_flow_data: 'encrypted_response_data'
      });
      expect(cryptographyService.decryptRequest).toHaveBeenCalledWith({
        encrypted_aes_key: 'encrypted_key',
        encrypted_flow_data: 'encrypted_data',
        initial_vector: 'iv_data'
      });
      expect(screenHandlerService.handleScreenRequest).toHaveBeenCalledWith(mockEncryptedRequest);
      expect(cryptographyService.encryptResponse).toHaveBeenCalledWith(
        mockResponse,
        Buffer.from('mock_aes_key'),
        Buffer.from('mock_iv')
      );
    });

    it('deve criar nova sessão quando não existe sessão anterior', async () => {
      // Arrange
      const mockRequest = {
        ...mockEncryptedRequest
      };

      // Mock para não encontrar sessão existente
      sessionRepository.findOne.mockResolvedValue(null);
      sessionRepository.create.mockReturnValue(mockSession);
      sessionRepository.save.mockResolvedValue(mockSession);
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: mockDecryptedRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      screenHandlerService.handleScreenRequest.mockResolvedValue(mockResponse);
      cryptographyService.encryptResponse.mockReturnValue('encrypted_response');
      logRepository.create.mockReturnValue({} as WhatsAppFlowLog);
      logRepository.save.mockResolvedValue({} as WhatsAppFlowLog);

      // Act
      await service.processEncryptedRequest(mockRequest);

      // Assert
      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalledTimes(2); // Uma para criar nova sessão, outra para atualizar após processamento
    });

    it('deve retornar resposta de erro quando descriptografia falha', async () => {
      // Arrange
      cryptographyService.decryptRequest.mockImplementation(() => {
        throw new Error('Erro de descriptografia');
      });
      cryptographyService.encryptResponseLegacy.mockReturnValue({
        encrypted_data: 'encrypted_error_response',
        iv: 'iv',
        auth_tag: 'auth_tag'
      });

      // Act
      const result = await service.processEncryptedRequest(mockEncryptedRequest);

      // Assert
      expect(result).toEqual({
        encrypted_flow_data: 'encrypted_error_response'
      });
      expect(cryptographyService.decryptRequest).toHaveBeenCalled();
      expect(cryptographyService.encryptResponseLegacy).toHaveBeenCalled();
    });

    it('deve retornar resposta vazia quando criptografia de erro falha', async () => {
      // Arrange
      cryptographyService.decryptRequest.mockImplementation(() => {
        throw new Error('Erro de descriptografia');
      });
      cryptographyService.encryptResponseLegacy.mockImplementation(() => {
        throw new Error('Erro de criptografia');
      });

      // Act
      const result = await service.processEncryptedRequest(mockEncryptedRequest);

      // Assert
      expect(result).toEqual({
        encrypted_flow_data: ''
      });
    });


  });

  describe('Validação de Requisições', () => {
    it('deve lançar erro quando versão não é fornecida', async () => {
      // Arrange
      const invalidRequest = {
        ...mockDecryptedRequest,
        version: undefined
      };
      
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: invalidRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      cryptographyService.encryptResponse.mockReturnValue('encrypted_error_response');

      // Act & Assert
      const result = await service.processEncryptedRequest({
        ...mockEncryptedRequest
      });
      
      expect(result.encrypted_flow_data).toBe('encrypted_error_response');
    });

    it('deve lançar erro quando versão não é suportada', async () => {
      // Arrange
      const invalidRequest = {
        ...mockDecryptedRequest,
        version: '2.0'
      };
      
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: invalidRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      cryptographyService.encryptResponse.mockReturnValue('encrypted_error_response');

      // Act & Assert
      const result = await service.processEncryptedRequest({
        ...mockEncryptedRequest
      });
      
      expect(result.encrypted_flow_data).toBe('encrypted_error_response');
    });

    it('deve lançar erro quando tela não é fornecida', async () => {
      // Arrange
      const invalidRequest = {
        ...mockDecryptedRequest,
        screen: undefined
      };
      
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: invalidRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      cryptographyService.encryptResponse.mockReturnValue('encrypted_error_response');

      // Act & Assert
      const result = await service.processEncryptedRequest({
        ...mockEncryptedRequest
      });
      
      expect(result.encrypted_flow_data).toBe('encrypted_error_response');
    });

    it('deve lançar erro quando ação não é fornecida', async () => {
      // Arrange
      const invalidRequest = {
        ...mockDecryptedRequest,
        action: undefined
      };
      
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: invalidRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      cryptographyService.encryptResponse.mockReturnValue('encrypted_error_response');

      // Act & Assert
      const result = await service.processEncryptedRequest({
        ...mockEncryptedRequest,
        decrypted_data: invalidRequest
      });
      
      expect(result.encrypted_flow_data).toBe('encrypted_error_response');
    });

    it('deve lançar erro quando tela é inválida', async () => {
      // Arrange
      const invalidRequest = {
        ...mockDecryptedRequest,
        screen: 'TELA_INVALIDA'
      };
      
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: invalidRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      cryptographyService.encryptResponse.mockReturnValue('encrypted_error_response');

      // Act & Assert
      const result = await service.processEncryptedRequest({
        ...mockEncryptedRequest,
        decrypted_data: invalidRequest
      });
      
      expect(result.encrypted_flow_data).toBe('encrypted_error_response');
    });

    it('deve lançar erro quando ação é inválida', async () => {
      // Arrange
      const invalidRequest = {
        ...mockDecryptedRequest,
        action: 'ACAO_INVALIDA'
      };
      
      cryptographyService.decryptRequest.mockReturnValue({
        decryptedBody: invalidRequest,
        aesKeyBuffer: Buffer.from('mock_aes_key'),
        initialVectorBuffer: Buffer.from('mock_iv')
      });
      cryptographyService.encryptResponse.mockReturnValue('encrypted_error_response');

      // Act & Assert
      const result = await service.processEncryptedRequest({
        ...mockEncryptedRequest,
        decrypted_data: invalidRequest
      });
      
      expect(result.encrypted_flow_data).toBe('encrypted_error_response');
    });
  });

  describe('findActiveSessions', () => {
    it('deve buscar sessões ativas sem critérios', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSession])
      } as any;
      
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findActiveSessions({});

      // Assert
      expect(result).toEqual([mockSession]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('session.isActive = :isActive', { isActive: true });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('session.lastActivity', 'DESC');
    });

    it('deve buscar sessões ativas com número de telefone', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSession])
      } as any;
      
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findActiveSessions({
        phoneNumber: '5511999999999'
      });

      // Assert
      expect(result).toEqual([mockSession]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'session.phoneNumber = :phoneNumber',
        { phoneNumber: '5511999999999' }
      );
    });

    it('deve buscar sessões ativas com tela específica', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSession])
      } as any;
      
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findActiveSessions({
        currentScreen: ScreenType.INICIO
      });

      // Assert
      expect(result).toEqual([mockSession]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'session.currentScreen = :currentScreen',
        { currentScreen: ScreenType.INICIO }
      );
    });

    it('deve buscar sessões ativas com limite', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSession])
      } as any;
      
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findActiveSessions({
        limit: 10
      });

      // Assert
      expect(result).toEqual([mockSession]);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('deve lançar erro quando busca falha', async () => {
      // Arrange
      sessionRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Erro de banco de dados');
      });

      // Act & Assert
      await expect(service.findActiveSessions({})).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('deve limpar sessões inativas com sucesso', async () => {
      // Arrange
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 })
      } as any;
      
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.cleanupInactiveSessions(30);

      // Assert
      expect(result).toBe(5);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(WhatsAppFlowSession);
      expect(mockQueryBuilder.set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('deve retornar 0 quando nenhuma sessão é afetada', async () => {
      // Arrange
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 })
      } as any;
      
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.cleanupInactiveSessions();

      // Assert
      expect(result).toBe(0);
    });

    it('deve lançar erro quando limpeza falha', async () => {
      // Arrange
      sessionRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Erro de banco de dados');
      });

      // Act & Assert
      await expect(service.cleanupInactiveSessions()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getSessionStats', () => {
    it('deve retornar estatísticas das sessões', async () => {
      // Arrange
      sessionRepository.count
        .mockResolvedValueOnce(10) // activeSessions
        .mockResolvedValueOnce(50); // totalSessions

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { screen: ScreenType.INICIO, count: '5' },
          { screen: ScreenType.BUSCAR_CIDADAO, count: '3' }
        ]),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: '15.5' })
      } as any;
      sessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getSessionStats();

      // Assert
      expect(result).toEqual({
        activeSessions: 10,
        totalSessions: 50,
        sessionsByScreen: {
          [ScreenType.INICIO]: 5,
          [ScreenType.BUSCAR_CIDADAO]: 3
        },
        averageSessionDuration: 15.5
      });
    });

    it('deve lançar erro quando busca de estatísticas falha', async () => {
      // Arrange
      sessionRepository.count.mockRejectedValue(new Error('Erro de banco de dados'));

      // Act & Assert
      await expect(service.getSessionStats()).rejects.toThrow(InternalServerErrorException);
    });
  });
});