import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { UserIdentifierService } from '../services/user-identifier.service';
import { UserIdentificationStrategy } from '../interfaces/user-identifier.interface';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let userIdentifierService: jest.Mocked<UserIdentifierService>;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const mockUserIdentifierService = {
      identifyUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitMiddleware,
        {
          provide: UserIdentifierService,
          useValue: mockUserIdentifierService,
        },
      ],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);
    userIdentifierService = module.get(UserIdentifierService);

    mockRequest = {
      path: '/api/v1/auth/login',
      method: 'POST',
      ip: '192.168.1.1',
      get: jest.fn(),
    } as any;

    mockResponse = {
      send: jest.fn(),
      statusCode: 200,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('deve permitir requisições para rotas não-auth', () => {
      mockRequest.path = '/api/v1/users';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(userIdentifierService.identifyUser).not.toHaveBeenCalled();
    });

    it('deve usar UserIdentifierService para identificar usuário em rotas auth', () => {
      userIdentifierService.identifyUser.mockReturnValue({
        identifier: 'user:123',
        strategy: UserIdentificationStrategy.USER_ID,
        isAuthenticated: true,
      });

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(userIdentifierService.identifyUser).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('deve usar identificação por IP quando não há usuário autenticado', () => {
      userIdentifierService.identifyUser.mockReturnValue({
        identifier: 'ip:19216811',
        strategy: UserIdentificationStrategy.IP_FALLBACK,
        isAuthenticated: false,
      });

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(userIdentifierService.identifyUser).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('deve bloquear após múltiplas tentativas falhadas', () => {
      userIdentifierService.identifyUser.mockReturnValue({
        identifier: 'ip:19216811',
        strategy: UserIdentificationStrategy.IP_FALLBACK,
        isAuthenticated: false,
      });

      // Simular múltiplas tentativas falhadas
      for (let i = 0; i < 5; i++) {
        // Resetar mocks para cada tentativa
        mockResponse = {
          send: jest.fn(),
          statusCode: 200,
        };
        mockNext = jest.fn();
        
        // Executar middleware
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        
        // Simular falha de autenticação
        mockResponse.statusCode = 401;
        const sendFunction = mockResponse.send as jest.Mock;
        sendFunction({ statusCode: 401 });
      }

      // Verificar se o cliente foi bloqueado internamente
      const isClientBlocked = (middleware as any).isBlocked('ip:19216811', new Date());
      expect(isClientBlocked).toBe(true);
    });



    it('deve limpar tentativas após login bem-sucedido', () => {
      userIdentifierService.identifyUser.mockReturnValue({
        identifier: 'user:123',
        strategy: UserIdentificationStrategy.USER_ID,
        isAuthenticated: true,
      });

      // Primeira tentativa
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simular login bem-sucedido
      const originalSend = mockResponse.send as jest.Mock;
      mockResponse.statusCode = 200;
      originalSend.call(mockResponse, { token: 'abc123' });

      // Próxima tentativa deve ser permitida normalmente
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('deve tratar erros graciosamente', () => {
      userIdentifierService.identifyUser.mockImplementation(() => {
        throw new Error('Erro de identificação');
      });

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Deve permitir a requisição mesmo com erro
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('deve aplicar rate limiting apenas para rotas de autenticação específicas', () => {
      const authRoutes = ['/api/v1/auth/login', '/api/v1/auth/refresh'];
      const nonAuthRoutes = ['/api/v1/users', '/api/v1/documents', '/health'];

      authRoutes.forEach(route => {
        mockRequest.path = route;
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        expect(userIdentifierService.identifyUser).toHaveBeenCalled();
        jest.clearAllMocks();
      });

      nonAuthRoutes.forEach(route => {
        mockRequest.path = route;
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        expect(userIdentifierService.identifyUser).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith();
        jest.clearAllMocks();
      });
    });
  });

  describe('isAuthRoute', () => {
    it('deve identificar corretamente rotas de autenticação', () => {
      const authRoutes = [
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/some/path/api/v1/auth/login',
      ];

      const nonAuthRoutes = [
        '/api/v1/users',
        '/api/v1/auth/profile',
        '/api/v1/documents',
      ];

      authRoutes.forEach(route => {
        mockRequest.path = route;
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        expect(userIdentifierService.identifyUser).toHaveBeenCalled();
        jest.clearAllMocks();
      });

      nonAuthRoutes.forEach(route => {
        mockRequest.path = route;
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        expect(userIdentifierService.identifyUser).not.toHaveBeenCalled();
        jest.clearAllMocks();
      });
    });
  });

  describe('cleanupExpiredAttempts', () => {
    it('deve limpar tentativas expiradas', () => {
      userIdentifierService.identifyUser.mockReturnValue({
        identifier: 'ip:19216811',
        strategy: UserIdentificationStrategy.IP_FALLBACK,
        isAuthenticated: false,
      });

      // Fazer uma tentativa
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Verificar se o método de limpeza funciona sem erros
      expect(() => {
        middleware.cleanupExpiredAttempts();
      }).not.toThrow();
    });
  });
});