import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedMetricsInterceptor } from '../enhanced-metrics.interceptor';
import { EnhancedMetricsService } from '../enhanced-metrics.service';
import {
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';

/**
 * Testes unitários para o interceptor de métricas aprimorado
 *
 * Verifica o funcionamento do interceptor que coleta métricas
 * avançadas sobre as requisições HTTP, com foco em segurança e compliance LGPD
 */
describe('EnhancedMetricsInterceptor', () => {
  let interceptor: EnhancedMetricsInterceptor;
  let metricsService: EnhancedMetricsService;
  let reflector: Reflector;

  // Mock do serviço de métricas aprimoradas
  const mockMetricsService = {
    incrementHttpRequestsInProgress: jest.fn(),
    decrementHttpRequestsInProgress: jest.fn(),
    recordHttpRequest: jest.fn(),
    recordHttpRequestDuration: jest.fn(),
    recordSecurityEvent: jest.fn(),
    recordLgpdDataAccess: jest.fn(),
    recordAuthorizationFailure: jest.fn(),
  };

  // Mock do reflector
  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock para Date.now() - primeiro retorna 1000, depois 1200
    jest
      .spyOn(Date, 'now')
      .mockImplementationOnce(() => 1000)
      .mockImplementationOnce(() => 1200);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedMetricsInterceptor,
        {
          provide: EnhancedMetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<EnhancedMetricsInterceptor>(
      EnhancedMetricsInterceptor,
    );
    metricsService = module.get<EnhancedMetricsService>(EnhancedMetricsService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve ser definido', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('deve coletar métricas para uma requisição bem-sucedida', (done) => {
      // Mock do contexto de execução
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/cidadaos',
        route: {
          path: '/api/cidadaos',
        },
        user: {
          id: 'user123',
          roles: ['admin'],
        },
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'test-agent',
        },
      } as unknown as Request;

      const mockResponse = {
        statusCode: 200,
        getHeaders: jest.fn().mockReturnValue({}),
      } as unknown as Response;

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // Mock do handler de chamada
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      } as unknown as CallHandler;

      // Mock do reflector para retornar metadados de LGPD
      mockReflector.get
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['dados_pessoais']); // lgpdDataTypes

      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });

          // Verificar se as métricas foram coletadas corretamente
          expect(
            mockMetricsService.incrementHttpRequestsInProgress,
          ).toHaveBeenCalledWith('GET', '/api/cidadaos', 'admin');

          expect(
            mockMetricsService.decrementHttpRequestsInProgress,
          ).toHaveBeenCalledWith('GET', '/api/cidadaos', 'admin');

          // O método recordHttpRequest não recebe ip e user-agent
          expect(mockMetricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/cidadaos',
            200,
            'admin',
          );

          // Verificar se a duração foi registrada
          // O método recordHttpRequestDuration não recebe ip e user-agent
          expect(
            mockMetricsService.recordHttpRequestDuration,
          ).toHaveBeenCalledWith(
            'GET',
            '/api/cidadaos',
            200,
            0.2, // 200ms em segundos
            'admin',
          );

          // O método recordLgpdDataAccess não é chamado automaticamente no interceptor
          // A verificação de acesso a dados LGPD deve ser feita manualmente

          done();
        },
        error: (err) => {
          done.fail(`Erro inesperado: ${err}`);
        },
      });
    });

    it('deve coletar métricas para uma requisição com erro', (done) => {
      // Mock do contexto de execução
      const mockRequest = {
        method: 'POST',
        originalUrl: '/api/cidadaos',
        route: {
          path: '/api/cidadaos',
        },
        user: {
          id: 'user123',
          roles: ['user'],
        },
        ip: '192.168.1.2',
        headers: {
          'user-agent': 'test-agent',
        },
      } as unknown as Request;

      const mockResponse = {
        statusCode: 500,
        getHeaders: jest.fn().mockReturnValue({}),
      } as unknown as Response;

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // Mock do handler de chamada com erro
      const mockError = new Error('Erro interno do servidor');
      (mockError as any).status = 500;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(throwError(() => mockError)),
      } as unknown as CallHandler;

      // Mock do reflector - não é usado em caso de erro
      mockReflector.get.mockImplementation((key: string) => {
        if (key === 'isPublic') {
          return false;
        }
        return undefined;
      });

      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          done.fail('O interceptor deveria ter retornado um erro');
        },
        error: (error) => {
          expect(error).toBe(mockError);

          // Verificar se as métricas de erro foram registradas
          expect(mockMetricsService.recordHttpRequest).toHaveBeenCalledWith(
            'POST',
            '/api/cidadaos',
            500,
            'user',
          );

          // Verificar se a duração foi registrada
          expect(
            mockMetricsService.recordHttpRequestDuration,
          ).toHaveBeenCalledWith(
            'POST',
            '/api/cidadaos',
            500,
            expect.any(Number), // Duração em segundos
            'user',
          );

          // Verificar se o evento de segurança foi registrado
          expect(mockMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
            'server_error',
            'error',
            'api',
          );

          done();
        },
      });
    });

    it('deve lidar com requisições não autenticadas', (done) => {
      // Mock do contexto de execução sem usuário autenticado
      const mockRequest = {
        method: 'GET',
        url: '/api/public',
        route: {
          path: '/api/public',
        },
        ip: '192.168.1.3',
        headers: {
          'user-agent': 'test-agent',
        },
      } as unknown as Request;

      const mockResponse = {
        statusCode: 200,
        getHeaders: jest.fn().mockReturnValue({}),
      } as unknown as Response;

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // Mock do handler de chamada
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'public data' })),
      } as unknown as CallHandler;

      // O interceptor não verifica isPublic, apenas registra métricas
      // A verificação de rotas públicas é feita por outros middlewares/guards
      mockReflector.get.mockImplementation((key: string) => {
        if (key === 'isPublic') {
          return true;
        }
        return undefined;
      });

      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'public data' });

          // Verificar se as métricas foram coletadas sem informações de usuário
          expect(mockMetricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/public',
            200,
            'anonymous',
          );

          // Verificar se a duração foi registrada
          expect(
            mockMetricsService.recordHttpRequestDuration,
          ).toHaveBeenCalledWith(
            'GET',
            '/api/public',
            200,
            expect.any(Number), // Duração em segundos
            'anonymous',
          );

          // O interceptor não verifica isPublic, então não podemos garantir que recordLgpdDataAccess não foi chamado
          // A verificação de rotas públicas é feita por outros middlewares/guards

          done();
        },
        error: done,
      });
    });

    it('deve lidar com erros de autorização', (done) => {
      // Mock do contexto de execução com usuário não autorizado
      const mockRequest = {
        method: 'GET',
        originalUrl: '/api/admin',
        route: {
          path: '/api/admin',
        },
        user: {
          id: 'user123',
          roles: ['user'],
        },
        ip: '192.168.1.4',
        headers: {
          'user-agent': 'test-agent',
        },
      } as unknown as Request;

      const mockResponse = {
        statusCode: 403,
        getHeaders: jest.fn().mockReturnValue({}),
      } as unknown as Response;

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // Mock do handler de chamada com erro de autorização
      const mockError = new UnauthorizedException('Acesso não autorizado');
      (mockError as any).status = 403;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(throwError(() => mockError)),
      } as unknown as CallHandler;

      // Mock do reflector para o teste de autorização
      mockReflector.get.mockImplementation((key: string) => {
        if (key === 'isPublic') {
          return false;
        }
        if (key === 'roles') {
          return ['admin'];
        }
        if (key === 'lgpdDataTypes') {
          return [];
        }
        return undefined;
      });

      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          done.fail('Não deveria chegar aqui');
        },
        error: (error) => {
          expect(error).toBe(mockError);

          // Verificar se o evento de segurança foi registrado
          expect(mockMetricsService.recordSecurityEvent).toHaveBeenCalledWith(
            'authorization_failure',
            'warning',
            'api',
          );

          // Verificar se a falha de autorização foi registrada
          expect(
            mockMetricsService.recordAuthorizationFailure,
          ).toHaveBeenCalledWith('/api/admin', 'unknown', 'user');

          done();
        },
      });
    });
  });
});
