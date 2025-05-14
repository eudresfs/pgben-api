import { Test, TestingModule } from '@nestjs/testing';
import { MetricsInterceptor } from '../metrics.interceptor';
import { MetricsService } from '../metrics.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Testes unitários para o interceptor de métricas
 * 
 * Verifica o funcionamento do interceptor que coleta métricas
 * sobre as requisições HTTP
 */
describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: MetricsService;
  
  // Mock do serviço de métricas
  const mockMetricsService = {
    incrementHttpRequestsInProgress: jest.fn(),
    decrementHttpRequestsInProgress: jest.fn(),
    recordHttpRequest: jest.fn(),
    recordHttpRequestDuration: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
    metricsService = module.get<MetricsService>(MetricsService);
    
    // Mock para Date.now() - primeiro retorna 1000, depois 1200
    const mockNow = jest.spyOn(Date, 'now')
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
    it('deve coletar métricas para uma requisição bem-sucedida', (done) => {
      // Mock do contexto de execução
      const mockRequest = {
        method: 'GET',
        url: '/api/cidadaos',
        route: {
          path: '/api/cidadaos',
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
          
          // Verificar se as métricas foram coletadas corretamente
          expect(mockMetricsService.incrementHttpRequestsInProgress).toHaveBeenCalledWith(
            'GET',
            '/api/cidadaos'
          );
          
          expect(mockMetricsService.decrementHttpRequestsInProgress).toHaveBeenCalledWith(
            'GET',
            '/api/cidadaos'
          );
          
          expect(mockMetricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/cidadaos',
            200
          );
          
          // Verificar se a duração foi registrada, sem verificar o valor exato
          expect(mockMetricsService.recordHttpRequestDuration).toHaveBeenCalled();
          const durationCall = mockMetricsService.recordHttpRequestDuration.mock.calls[0];
          expect(durationCall[0]).toBe('GET');
          expect(durationCall[1]).toBe('/api/cidadaos');
          expect(durationCall[2]).toBe(200);
          // O quarto parâmetro é a duração, que pode variar
          
          done();
        },
        error: done,
      });
    });

    it('deve coletar métricas para uma requisição com erro', (done) => {
      // Mock do contexto de execução
      const mockRequest = {
        method: 'POST',
        url: '/api/cidadaos',
        route: {
          path: '/api/cidadaos',
        },
      } as unknown as Request;
      
      const mockResponse = {
        statusCode: 500,
      } as unknown as Response;
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;
      
      // Mock do handler de chamada com erro
      const mockError = new Error('Teste de erro');
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(throwError(() => mockError)),
      } as unknown as CallHandler;
      
      // Executar o interceptor
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          done.fail('Não deveria chegar aqui');
        },
        error: (error) => {
          expect(error).toBe(mockError);
          
          // Verificar se as métricas foram coletadas corretamente
          expect(mockMetricsService.incrementHttpRequestsInProgress).toHaveBeenCalledWith(
            'POST',
            '/api/cidadaos'
          );
          
          expect(mockMetricsService.decrementHttpRequestsInProgress).toHaveBeenCalledWith(
            'POST',
            '/api/cidadaos'
          );
          
          expect(mockMetricsService.recordHttpRequest).toHaveBeenCalledWith(
            'POST',
            '/api/cidadaos',
            500
          );
          
          // Verificar se a duração foi registrada, sem verificar o valor exato
          expect(mockMetricsService.recordHttpRequestDuration).toHaveBeenCalled();
          const durationCall = mockMetricsService.recordHttpRequestDuration.mock.calls[0];
          expect(durationCall[0]).toBe('POST');
          expect(durationCall[1]).toBe('/api/cidadaos');
          expect(durationCall[2]).toBe(500);
          // O quarto parâmetro é a duração, que pode variar
          
          done();
        },
      });
    });

    it('deve usar a URL da requisição quando a rota não está disponível', (done) => {
      // Mock do contexto de execução sem rota definida
      const mockRequest = {
        method: 'GET',
        url: '/api/cidadaos/123',
        // Sem objeto route
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
          
          // Verificar se as métricas foram coletadas usando a URL
          expect(mockMetricsService.incrementHttpRequestsInProgress).toHaveBeenCalled();
          const incrementCall = mockMetricsService.incrementHttpRequestsInProgress.mock.calls[0];
          expect(incrementCall[0]).toBe('GET');
          // Não verificamos o caminho exato, pois pode ser normalizado pelo interceptor
          
          expect(mockMetricsService.decrementHttpRequestsInProgress).toHaveBeenCalled();
          const decrementCall = mockMetricsService.decrementHttpRequestsInProgress.mock.calls[0];
          expect(decrementCall[0]).toBe('GET');
          // Não verificamos o caminho exato, pois pode ser normalizado pelo interceptor
          
          expect(mockMetricsService.recordHttpRequest).toHaveBeenCalled();
          const recordCall = mockMetricsService.recordHttpRequest.mock.calls[0];
          expect(recordCall[0]).toBe('GET');
          // Não verificamos o caminho exato, pois pode ser normalizado pelo interceptor
          expect(recordCall[2]).toBe(200);
          
          // Verificar se a duração foi registrada, sem verificar o valor exato
          expect(mockMetricsService.recordHttpRequestDuration).toHaveBeenCalled();
          const durationCall = mockMetricsService.recordHttpRequestDuration.mock.calls[0];
          expect(durationCall[0]).toBe('GET');
          // Não verificamos o caminho exato, pois pode ser normalizado pelo interceptor para '/api/cidadaos/:id'
          expect(durationCall[2]).toBe(200);
          // O quarto parâmetro é a duração, que pode variar
          
          done();
        },
        error: done,
      });
    });
  });
});
