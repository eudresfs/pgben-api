import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditoriaInterceptor } from '../../../interceptors/auditoria.interceptor';
import { AuditoriaService } from '../../../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../../../enums/tipo-operacao.enum';
import { AUDITORIA_METADATA_KEY } from '../../../decorators/auditoria.decorator';

describe('AuditoriaInterceptor', () => {
  let interceptor: AuditoriaInterceptor;
  let auditoriaService: jest.Mocked<AuditoriaService>;
  let reflector: jest.Mocked<Reflector>;
  let executionContext: jest.Mocked<ExecutionContext>;
  let callHandler: jest.Mocked<CallHandler>;

  const mockRequest = {
    method: 'POST',
    url: '/pagamentos',
    route: { path: '/pagamentos' },
    ip: '127.0.0.1',
    get: jest.fn(),
    headers: {
      'user-agent': 'test-agent',
      'authorization': 'Bearer token',
    },
    query: {},
    params: { id: 'test-id' },
    user: {
      id: 'user-123',
      email: 'test@example.com',
      perfil: 'ADMIN',
      unidadeId: 'unidade-123',
      nome: 'Test User',
    },
  };

  const mockResponse = {
    statusCode: 201,
  };

  const mockAuditoriaMetadata = {
    entidade: 'Pagamento',
    operacao: TipoOperacao.CREATE,
    descricao: 'Criação de pagamento',
    mascarDados: true,
  };

  beforeEach(async () => {
    const mockAuditoriaService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaInterceptor,
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuditoriaInterceptor>(AuditoriaInterceptor);
    auditoriaService = module.get(AuditoriaService);
    reflector = module.get(Reflector);

    // Mock ExecutionContext
    executionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    // Mock CallHandler
    callHandler = {
      handle: jest.fn(),
    } as any;

    // Setup default mocks
    mockRequest.get.mockImplementation((header: string) => {
      const headers: Record<string, string> = {
        'User-Agent': 'test-agent',
        'X-Forwarded-For': '192.168.1.1',
      };
      return headers[header];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('deve pular auditoria quando não há metadados', async () => {
      // Arrange
      reflector.get.mockReturnValue(undefined);
      const mockData = { id: 'test-id' };
      callHandler.handle.mockReturnValue(of(mockData));

      // Act
      const result = await interceptor.intercept(executionContext, callHandler).toPromise();

      // Assert
      expect(result).toEqual(mockData);
      expect(auditoriaService.create).not.toHaveBeenCalled();
    });

    it('deve registrar auditoria de sucesso', async () => {
      // Arrange
      reflector.get.mockReturnValueOnce(mockAuditoriaMetadata);
      const mockData = { id: 'pagamento-123', valor: 1000 };
      callHandler.handle.mockReturnValue(of(mockData));

      // Act
      const result = await interceptor.intercept(executionContext, callHandler).toPromise();

      // Assert
      expect(result).toEqual(mockData);
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Pagamento',
          entidade_id: 'test-id',
          usuario_id: 'user-123',
          endpoint: '/pagamentos',
          metodo_http: 'POST',
          ip_origem: '127.0.0.1',
          user_agent: 'test-agent',
          dados_novos: mockData,
          status_http: 201,
          sucesso: true,
        })
      );
    });

    it('deve propagar erros corretamente', async () => {
      // Arrange
      reflector.get.mockReturnValueOnce(mockAuditoriaMetadata);
      const mockError = new Error('Erro de teste');
      callHandler.handle.mockImplementation(() => {
        throw mockError;
      });

      // Act & Assert
      try {
        await interceptor.intercept(executionContext, callHandler).toPromise();
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    it('deve mascarar dados sensíveis quando configurado', async () => {
      // Arrange
      reflector.get.mockReturnValueOnce({
        ...mockAuditoriaMetadata,
        mascarDados: true,
      });
      
      const mockData = {
        id: 'pagamento-123',
        dadosBancarios: {
          conta: '12345678',
          agencia: '1234',
          chavePix: '12345678901',
          pixTipo: 'CPF',
        },
      };
      
      callHandler.handle.mockReturnValue(of(mockData));

      // Act
      await interceptor.intercept(executionContext, callHandler).toPromise();
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dados_novos: expect.objectContaining({
            dadosBancarios: expect.objectContaining({
              conta: expect.stringMatching(/\*+/), // Deve estar mascarado
              agencia: expect.stringMatching(/\*+/), // Deve estar mascarado
              chavePix: expect.stringMatching(/\*+/), // Deve estar mascarado
            }),
          }),
        })
      );
    });

    it('deve extrair IP corretamente de diferentes headers', async () => {
      // Arrange
      const mockRequestWithForwardedIP = {
        ...mockRequest,
        ip: undefined,
        connection: undefined,
        socket: undefined,
        get: jest.fn().mockImplementation((header: string) => {
          if (header === 'X-Forwarded-For') return '192.168.1.1, 10.0.0.1';
          if (header === 'User-Agent') return 'test-agent';
          return undefined;
        }),
      };

      executionContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequestWithForwardedIP),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      } as any);

      reflector.get.mockReturnValueOnce(mockAuditoriaMetadata);
      callHandler.handle.mockReturnValue(of({ id: 'test' }));

      // Act
      await interceptor.intercept(executionContext, callHandler).toPromise();
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_origem: '192.168.1.1', // Primeiro IP do X-Forwarded-For
        })
      );
    });

    it('deve gerar descrição automática quando não fornecida', async () => {
      // Arrange
      const metadataSemDescricao = {
        entidade: 'Pagamento',
        operacao: TipoOperacao.UPDATE,
        mascarDados: true,
      };
      
      reflector.get.mockReturnValueOnce(metadataSemDescricao);
      callHandler.handle.mockReturnValue(of({ id: 'test' }));

      // Act
      await interceptor.intercept(executionContext, callHandler).toPromise();
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descricao: expect.stringContaining('Atualização de Pagamento'),
        })
      );
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      reflector.get.mockReturnValueOnce(mockAuditoriaMetadata);
      auditoriaService.create.mockRejectedValue(new Error('Erro na auditoria'));
      const mockData = { id: 'test' };
      callHandler.handle.mockReturnValue(of(mockData));

      // Act
      const result = await interceptor.intercept(executionContext, callHandler).toPromise();

      // Assert
      expect(result).toEqual(mockData); // Operação principal deve continuar
    });
  });

  describe('extrairEntidadeId', () => {
    it('deve extrair ID dos parâmetros da URL', async () => {
      // Arrange
      reflector.get.mockReturnValueOnce(mockAuditoriaMetadata);
      const mockData = { nome: 'test' }; // Sem ID na resposta
      callHandler.handle.mockReturnValue(of(mockData));

      // Act
      await interceptor.intercept(executionContext, callHandler).toPromise();
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entidade_id: 'test-id', // Do mockRequest.params.id
        })
      );
    });

    it('deve extrair ID da resposta quando não há nos parâmetros', async () => {
      // Arrange
      const mockRequestSemParams = {
        ...mockRequest,
        params: {},
      };
      
      executionContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequestSemParams),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      } as any);

      reflector.get.mockReturnValueOnce(mockAuditoriaMetadata);
      const mockData = { id: 'response-id' };
      callHandler.handle.mockReturnValue(of(mockData));

      // Act
      await interceptor.intercept(executionContext, callHandler).toPromise();
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entidade_id: 'response-id', // Da resposta
        })
      );
    });
  });
});