import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from '../logging.interceptor';
import { LoggingService } from '../logging.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Testes unitários para o interceptor de logging
 *
 * Verifica o funcionamento do interceptor que registra
 * informações sobre requisições HTTP
 */
describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggingService: LoggingService;

  // Mock do serviço de logging
  const mockLoggingService = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    loggingService = module.get<LoggingService>(LoggingService);

    // Mock para Date.now()
    jest
      .spyOn(Date, 'now')
      .mockImplementationOnce(() => 1000)
      .mockImplementationOnce(() => 1200);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve ser definido', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('deve registrar informações sobre a requisição e resposta', (done) => {
      // Mock do contexto de execução
      const mockRequest = {
        method: 'GET',
        url: '/api/cidadaos',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
        },
        user: {
          id: 'user-123',
          email: 'usuario@teste.com',
        },
      } as unknown as Request;

      const mockResponse = {
        statusCode: 200,
      } as unknown as Response;

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      // Mock do handler de chamada
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      } as unknown as CallHandler;

      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });

          // Verificar se o log de início da requisição foi registrado
          expect(mockLoggingService.info).toHaveBeenCalledWith(
            'Requisição iniciada: GET /api/cidadaos',
            'HTTP',
            expect.objectContaining({
              method: 'GET',
              url: '/api/cidadaos',
            }),
          );

          // Verificar se o log de fim da requisição foi registrado
          expect(mockLoggingService.info).toHaveBeenCalledWith(
            'Requisição concluída: GET /api/cidadaos - Status: 200 - Tempo: 200ms',
            'HTTP',
            expect.objectContaining({
              method: 'GET',
              url: '/api/cidadaos',
              statusCode: 200,
            }),
          );

          done();
        },
        error: done,
      });
    });

    it('deve lidar com requisições sem usuário autenticado', (done) => {
      // Mock do contexto de execução sem usuário
      const mockRequest = {
        method: 'GET',
        url: '/api/public',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
        },
        // Sem objeto user
      } as unknown as Request;

      const mockResponse = {
        statusCode: 200,
      } as unknown as Response;

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      // Mock do handler de chamada
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'public' })),
      } as unknown as CallHandler;

      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'public' });

          // Verificar se o log de início da requisição foi registrado sem userId
          expect(mockLoggingService.info).toHaveBeenCalledWith(
            'Requisição iniciada: GET /api/public',
            'HTTP',
            expect.objectContaining({
              method: 'GET',
              url: '/api/public',
            }),
          );

          // Verificar se o log de fim da requisição foi registrado sem userId
          expect(mockLoggingService.info).toHaveBeenCalledWith(
            'Requisição concluída: GET /api/public - Status: 200 - Tempo: 200ms',
            'HTTP',
            expect.objectContaining({
              method: 'GET',
              url: '/api/public',
              statusCode: 200,
            }),
          );

          done();
        },
        error: done,
      });
    });
  });
});
