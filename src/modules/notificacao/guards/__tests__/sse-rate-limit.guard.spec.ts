import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SseRateLimitGuard } from '../sse-rate-limit.guard';
import { SseRateLimiterService } from '../../services/sse-rate-limiter.service';
import { Request, Response } from 'express';

// Mock do SseRateLimiterService
const mockSseRateLimiterService = {
  checkRateLimit: jest.fn(),
};

// Mock do JwtService
const mockJwtService = {
  verify: jest.fn(),
};

// Mock do Reflector
const mockReflector = {
  get: jest.fn(),
  getAllAndOverride: jest.fn(),
};

// Helper para criar mock do ExecutionContext
const createMockExecutionContext = (
  request: Partial<Request>,
  response: Partial<Response> = {},
) => {
  const mockResponse = {
    setHeader: jest.fn(),
    ...response,
  } as unknown as Response;

  const mockRequest = {
    headers: {},
    query: {},
    cookies: {},
    ip: '127.0.0.1',
    ...request,
  } as unknown as Request;

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
};

describe('SseRateLimitGuard', () => {
  let guard: SseRateLimitGuard;
  let rateLimiterService: SseRateLimiterService;
  let reflector: Reflector;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseRateLimitGuard,
        {
          provide: SseRateLimiterService,
          useValue: mockSseRateLimiterService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    guard = module.get<SseRateLimitGuard>(SseRateLimitGuard);
    rateLimiterService = module.get<SseRateLimiterService>(
      SseRateLimiterService,
    );
    reflector = module.get<Reflector>(Reflector);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('deve permitir quando rate limit não é excedido', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false); // não pular rate limit
      mockReflector.get.mockReturnValue({ profile: 'default' }); // configuração padrão
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: 0,
        limit: 10,
        windowSeconds: 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSseRateLimiterService.checkRateLimit).toHaveBeenCalledWith(
        'ip:192.168.1.1',
        'default',
        '192.168.1.1',
      );
    });

    it('deve bloquear quando rate limit é excedido', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({ profile: 'default' });
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: 30,
        limit: 10,
        windowSeconds: 60,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            message: 'Rate limit excedido',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            retryAfter: 30,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('deve pular rate limiting quando decorador SkipSseRateLimit está presente', async () => {
      const context = createMockExecutionContext({});

      mockReflector.getAllAndOverride.mockReturnValue(true); // pular rate limit

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSseRateLimiterService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('deve usar perfil admin quando especificado', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({ profile: 'admin' });
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 25,
        resetTime: 0,
        limit: 50,
        windowSeconds: 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSseRateLimiterService.checkRateLimit).toHaveBeenCalledWith(
        'ip:192.168.1.1',
        'admin',
        '192.168.1.1',
      );
    });

    it('deve usar identificador customizado quando fornecido', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({
        profile: 'default',
        identifier: 'custom:123',
      });
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: 0,
        limit: 10,
        windowSeconds: 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSseRateLimiterService.checkRateLimit).toHaveBeenCalledWith(
        'custom:123',
        'default',
        '192.168.1.1',
      );
    });

    it('deve adicionar headers de rate limit na resposta', async () => {
      const mockResponse = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        { ip: '192.168.1.1' },
        mockResponse,
      );

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({ profile: 'default' });
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: 0,
        limit: 10,
        windowSeconds: 60,
      });

      await guard.canActivate(context);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '10',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '5',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });
  });

  describe('extractToken', () => {
    it('deve extrair token do query parameter', () => {
      const request = {
        query: { token: 'query-token' },
        headers: {},
        cookies: {},
      } as unknown as Request;

      const token = guard['extractToken'](request);
      expect(token).toBe('query-token');
    });

    it('deve extrair token do header Authorization', () => {
      const request = {
        query: {},
        headers: { authorization: 'Bearer header-token' },
        cookies: {},
      } as unknown as Request;

      const token = guard['extractToken'](request);
      expect(token).toBe('header-token');
    });

    it('deve extrair token dos cookies', () => {
      const request = {
        query: {},
        headers: {},
        cookies: { access_token: 'cookie-token' },
      } as unknown as Request;

      const token = guard['extractToken'](request);
      expect(token).toBe('cookie-token');
    });

    it('deve retornar null quando não há token', () => {
      const request = {
        query: {},
        headers: {},
        cookies: {},
      } as unknown as Request;

      const token = guard['extractToken'](request);
      expect(token).toBeNull();
    });

    it('deve priorizar query parameter sobre header', () => {
      const request = {
        query: { token: 'query-token' },
        headers: { authorization: 'Bearer header-token' },
        cookies: {},
      } as unknown as Request;

      const token = guard['extractToken'](request);
      expect(token).toBe('query-token');
    });
  });

  describe('getUserProfile', () => {
    it('deve retornar perfil do usuário baseado no token JWT', () => {
      const payload = {
        sub: 'user123',
        roles: ['admin'],
        profile: 'admin',
      };

      mockJwtService.verify.mockReturnValue(payload);

      const profile = guard['getUserProfile']('valid-token');
      expect(profile).toBe('admin');
    });

    it('deve retornar perfil system para usuários com role system', () => {
      const payload = {
        sub: 'system123',
        roles: ['system'],
      };

      mockJwtService.verify.mockReturnValue(payload);

      const profile = guard['getUserProfile']('valid-token');
      expect(profile).toBe('system');
    });

    it('deve retornar perfil admin para usuários com role admin', () => {
      const payload = {
        sub: 'admin123',
        roles: ['admin'],
      };

      mockJwtService.verify.mockReturnValue(payload);

      const profile = guard['getUserProfile']('valid-token');
      expect(profile).toBe('admin');
    });

    it('deve retornar perfil premium para usuários com role premium', () => {
      const payload = {
        sub: 'premium123',
        roles: ['premium'],
      };

      mockJwtService.verify.mockReturnValue(payload);

      const profile = guard['getUserProfile']('valid-token');
      expect(profile).toBe('premium');
    });

    it('deve retornar perfil default para usuários sem roles especiais', () => {
      const payload = {
        sub: 'user123',
        roles: ['user'],
      };

      mockJwtService.verify.mockReturnValue(payload);

      const profile = guard['getUserProfile']('valid-token');
      expect(profile).toBe('default');
    });

    it('deve retornar default quando token é inválido', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const profile = guard['getUserProfile']('invalid-token');
      expect(profile).toBe('default');
    });

    it('deve retornar default quando não há token', () => {
      const profile = guard['getUserProfile'](null);
      expect(profile).toBe('default');
    });
  });

  describe('getIdentifier', () => {
    it('deve usar identificador customizado quando fornecido', () => {
      const request = { ip: '192.168.1.1' } as Request;
      const config = { identifier: 'custom:123' };

      const identifier = guard['getIdentifier'](request, config, null);
      expect(identifier).toBe('custom:123');
    });

    it('deve usar userId quando token está presente', () => {
      const request = { ip: '192.168.1.1' } as Request;
      const config = {};
      const payload = { sub: 'user123' };

      mockJwtService.verify.mockReturnValue(payload);

      const identifier = guard['getIdentifier'](request, config, 'valid-token');
      expect(identifier).toBe('user:user123');
    });

    it('deve usar IP quando não há token nem identificador customizado', () => {
      const request = { ip: '192.168.1.1' } as Request;
      const config = {};

      const identifier = guard['getIdentifier'](request, config, null);
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('deve usar IP quando token é inválido', () => {
      const request = { ip: '192.168.1.1' } as Request;
      const config = {};

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const identifier = guard['getIdentifier'](
        request,
        config,
        'invalid-token',
      );
      expect(identifier).toBe('ip:192.168.1.1');
    });
  });

  describe('Error Handling', () => {
    it('deve permitir acesso em caso de erro no rate limiter (fail-open)', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({ profile: 'default' });
      mockSseRateLimiterService.checkRateLimit.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('deve logar erros mas não falhar', async () => {
      const loggerSpy = jest
        .spyOn(guard['logger'], 'error')
        .mockImplementation();
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({ profile: 'default' });
      mockSseRateLimiterService.checkRateLimit.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await guard.canActivate(context);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erro no rate limiting SSE'),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('Decorators Integration', () => {
    it('deve usar configuração do decorator SseRateLimit', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue({
        profile: 'premium',
        identifier: 'special:user',
      });
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 15,
        resetTime: 0,
        limit: 25,
        windowSeconds: 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSseRateLimiterService.checkRateLimit).toHaveBeenCalledWith(
        'special:user',
        'premium',
        '192.168.1.1',
      );
    });

    it('deve usar configuração padrão quando não há decorator', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockReflector.get.mockReturnValue(null); // sem configuração
      mockSseRateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: 0,
        limit: 10,
        windowSeconds: 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSseRateLimiterService.checkRateLimit).toHaveBeenCalledWith(
        'ip:192.168.1.1',
        'default',
        '192.168.1.1',
      );
    });
  });
});
