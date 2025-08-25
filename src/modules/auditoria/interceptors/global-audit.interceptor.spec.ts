/**
 * Testes para GlobalAuditInterceptor
 *
 * Valida o funcionamento do interceptor global de auditoria,
 * garantindo que todas as requisições sejam capturadas corretamente.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GlobalAuditInterceptor } from './global-audit.interceptor';
import { AuditEventEmitter } from '../events/emitters/audit-event.emitter';
import { AuditMetricsService } from '../services/audit-metrics.service';
import { RequestDeduplicationService } from '../services/request-deduplication.service';
import {
  AuditEventType,
  RiskLevel,
} from '../events/types/audit-event.types';
import { AuditContextHolder } from '../../../common/interceptors/audit-context.interceptor';
import { ConfigService } from '@nestjs/config';

describe('GlobalAuditInterceptor', () => {
  let interceptor: GlobalAuditInterceptor;
  let auditEventEmitter: jest.Mocked<AuditEventEmitter>;
  let auditMetricsService: jest.Mocked<AuditMetricsService>;
  let deduplicationService: RequestDeduplicationService;
  let configService: jest.Mocked<ConfigService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    // Mock do AuditEventEmitter
    const mockAuditEventEmitter = {
      emit: jest.fn(),
    };

    // Mock do AuditMetricsService
    const mockAuditMetricsService = {
      recordInterceptorEvent: jest.fn(),
    };

    // Mock do ConfigService
    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        enabledRoutes: ['*'],
        excludedRoutes: [],
        enableMetrics: true,
        enableEventEmission: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalAuditInterceptor,
        RequestDeduplicationService,
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
        {
          provide: AuditMetricsService,
          useValue: mockAuditMetricsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    interceptor = module.get<GlobalAuditInterceptor>(GlobalAuditInterceptor);
    auditEventEmitter = module.get(AuditEventEmitter);
    auditMetricsService = module.get(AuditMetricsService);
    deduplicationService = module.get<RequestDeduplicationService>(RequestDeduplicationService);
    configService = module.get(ConfigService);

    // Mock do Request
    mockRequest = {
      method: 'GET',
      url: '/api/v1/cidadao/123',
      path: '/api/v1/cidadao/123',
      route: { path: '/api/v1/cidadao/:id' },
      params: { id: '123' },
      query: { include: 'endereco' },
      body: {},
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': '192.168.1.100',
      },
      connection: { remoteAddress: '192.168.1.100' },
      user: { id: 'user123', sub: 'user123' },
    };

    // Mock do Response
    mockResponse = {
      statusCode: 200,
    };

    // Mock do ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getClass: jest.fn().mockReturnValue({ name: 'CidadaoController' }),
      getHandler: jest.fn().mockReturnValue({ name: 'findById' }),
    } as any;

    // Mock do CallHandler
    mockCallHandler = {
      handle: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    deduplicationService.clearCache();
  });

  afterAll(() => {
    deduplicationService.onModuleDestroy();
  });

  describe('intercept', () => {
    it('deve auditar requisição GET com sucesso', async () => {
      // Arrange
      const mockResult = { id: '123', nome: 'João Silva', cpf: '***MASKED***' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual(mockResult);
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(2);

      // Verificar evento de início
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.eventType).toBe(AuditEventType.OPERATION_START);
      expect(startEvent.userId).toBe('user123');
      expect(startEvent.ip).toBe('192.168.1.100');
      expect(startEvent.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(startEvent.metadata.controller).toBe('CidadaoController');
      expect(startEvent.metadata.method).toBe('findById');
      expect(startEvent.metadata.url).toBe('/api/v1/cidadao/:id');
      expect(startEvent.metadata.httpMethod).toBe('GET');

      // Verificar evento de sucesso
      const successEvent = auditEventEmitter.emit.mock.calls[1][0];
      expect(successEvent.eventType).toBe(AuditEventType.OPERATION_SUCCESS);
      expect(successEvent.entityName).toBe('cidadao');
      expect(successEvent.entityId).toBe('123');
      expect(successEvent.operation).toBe('read');
      expect(successEvent.metadata.duration).toBeGreaterThan(0);
    });

    it('deve auditar requisição POST com dados sensíveis', async () => {
      // Arrange
      mockRequest.method = 'POST';
      mockRequest.url = '/api/v1/cidadao';
      mockRequest.path = '/api/v1/cidadao';
      mockRequest.route = { path: '/api/v1/cidadao' };
      mockRequest.body = {
        nome: 'Maria Silva',
        cpf: '12345678901',
        email: 'maria@email.com',
      };

      const mockResult = { id: '456', nome: 'Maria Silva' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result$.toPromise();

      // Assert
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(2);

      // Verificar evento de início com dados sanitizados
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.eventType).toBe(AuditEventType.OPERATION_START);
      expect(startEvent.riskLevel).toBe(RiskLevel.HIGH);
      expect(startEvent.metadata.body.cpf).toBe('***MASKED***');
      expect(startEvent.metadata.body.email).toBe('***MASKED***');
      expect(startEvent.metadata.body.nome).toBe('Maria Silva');

      // Verificar evento de sucesso
      const successEvent = auditEventEmitter.emit.mock.calls[1][0];
      expect(successEvent.eventType).toBe(AuditEventType.OPERATION_SUCCESS);
      expect(successEvent.operation).toBe('create');
      expect(successEvent.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('deve auditar operação DELETE como crítica', async () => {
      // Arrange
      mockRequest.method = 'DELETE';
      mockRequest.url = '/api/v1/cidadao/123';
      mockRequest.path = '/api/v1/cidadao/123';
      mockRequest.route = { path: '/api/v1/cidadao/:id' };

      mockCallHandler.handle.mockReturnValue(of({ deleted: true }));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result$.toPromise();

      // Assert
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.riskLevel).toBe(RiskLevel.CRITICAL);

      const successEvent = auditEventEmitter.emit.mock.calls[1][0];
      expect(successEvent.operation).toBe('delete');
      expect(successEvent.riskLevel).toBe(RiskLevel.CRITICAL);
    });

    it('deve auditar erro com nível de risco alto', async () => {
      // Arrange
      const error = new Error('Erro de validação');
      (error as any).status = 400;
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act & Assert
      try {
        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
        await result$.toPromise();
        fail('Deveria ter lançado erro');
      } catch (thrownError) {
        expect(thrownError).toBe(error);
      }

      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(2);

      // Verificar evento de erro
      const errorEvent = auditEventEmitter.emit.mock.calls[1][0];
      expect(errorEvent.eventType).toBe(AuditEventType.OPERATION_ERROR);
      expect(errorEvent.riskLevel).toBe(RiskLevel.HIGH);
      expect(errorEvent.metadata.error.message).toBe('Erro de validação');
      expect(errorEvent.metadata.error.status).toBe(400);
      expect(errorEvent.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('deve pular rotas de sistema', async () => {
      // Arrange
      mockRequest.path = '/health';
      mockRequest.url = '/health';
      mockRequest.route = { path: '/health' };

      mockCallHandler.handle.mockReturnValue(of({ status: 'ok' }));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result$.toPromise();

      // Assert
      expect(auditEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('deve extrair IP corretamente de diferentes headers', async () => {
      // Arrange
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 192.168.1.100',
        'x-real-ip': '203.0.113.1',
      };
      delete mockRequest.connection;

      mockCallHandler.handle.mockReturnValue(of({}));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result$.toPromise();

      // Assert
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.ip).toBe('203.0.113.1');
    });

    it('deve gerar correlation ID quando não fornecido', async () => {
      // Arrange
      mockCallHandler.handle.mockReturnValue(of({}));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result$.toPromise();

      // Assert
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.correlationId).toMatch(/^corr_\d+_[a-z0-9]{9}$/);

      const successEvent = auditEventEmitter.emit.mock.calls[1][0];
      expect(successEvent.correlationId).toBe(startEvent.correlationId);
    });

    it('deve determinar nível de risco baseado na rota', async () => {
      // Arrange
      const testCases = [
        { path: '/api/v1/admin/users', method: 'GET', expected: RiskLevel.CRITICAL },
        { path: '/api/v1/auth/login', method: 'POST', expected: RiskLevel.HIGH },
        { path: '/api/v1/usuario/profile', method: 'PUT', expected: RiskLevel.HIGH },
        { path: '/api/v1/beneficio/list', method: 'GET', expected: RiskLevel.MEDIUM },
        { path: '/api/v1/public/info', method: 'GET', expected: RiskLevel.LOW },
      ];

      for (const testCase of testCases) {
        // Reset mocks
        jest.clearAllMocks();

        mockRequest.path = testCase.path;
        mockRequest.url = testCase.path;
        mockRequest.method = testCase.method;
        mockRequest.route = { path: testCase.path };

        mockCallHandler.handle.mockReturnValue(of({}));

        // Act
        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
        await result$.toPromise();

        // Assert
        const startEvent = auditEventEmitter.emit.mock.calls[0][0];
        expect(startEvent.riskLevel).toBe(testCase.expected);
      }
    });

    it('deve tratar erro no emit graciosamente', async () => {
      // Arrange
      auditEventEmitter.emit.mockImplementation(() => {
        throw new Error('Erro no emit');
      });

      mockCallHandler.handle.mockReturnValue(of({}));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual({});
      // Não deve quebrar o fluxo principal
    });
  });

  describe('Deduplicação de Requisições', () => {
    it('deve processar primeira requisição normalmente', async () => {
      // Arrange
      const mockResult = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await result$.toPromise();

      // Assert
      expect(result).toEqual(mockResult);
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(2); // start + success
      expect(auditMetricsService.recordInterceptorEvent).toHaveBeenCalled();
    });

    it('deve ignorar requisição duplicada', async () => {
      // Arrange
      const mockResult = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));

      // Act - Primeira requisição
      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
      
      // Act - Segunda requisição idêntica (duplicata)
      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Assert - Deve ter processado apenas a primeira
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(2); // Apenas da primeira requisição
      expect(auditMetricsService.recordInterceptorEvent).toHaveBeenCalledTimes(2); // 1 start + 1 success
    });

    it('deve processar requisições diferentes separadamente', async () => {
      // Arrange
      const mockResult = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));
      
      const mockExecutionContext2 = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => ({
            ...mockRequest,
            method: 'POST',
            url: '/api/v1/different',
          }),
          getResponse: () => mockResponse,
        }),
        getClass: jest.fn().mockReturnValue({ name: 'DifferentController' }),
        getHandler: jest.fn().mockReturnValue({ name: 'create' }),
      } as any;

      // Act - Primeira requisição
      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
      
      // Act - Segunda requisição diferente
      await interceptor.intercept(mockExecutionContext2, mockCallHandler).toPromise();

      // Assert - Deve ter processado ambas
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(4); // 2 eventos para cada requisição
      expect(auditMetricsService.recordInterceptorEvent).toHaveBeenCalledTimes(4); // 2 + 2 métricas
    });

    it('deve incluir requestId no contexto de auditoria', async () => {
      // Arrange
      const mockResult = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));

      // Act
      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Assert
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.metadata.requestId).toBeDefined();
      expect(typeof startEvent.metadata.requestId).toBe('string');
      expect(startEvent.metadata.requestId.length).toBe(16);
    });

    it('deve processar requisições sem usuário', async () => {
      // Arrange
      const mockResult = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));
      
      const mockExecutionContextNoUser = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => ({
            ...mockRequest,
            user: undefined, // Sem usuário
          }),
          getResponse: () => mockResponse,
        }),
        getClass: jest.fn().mockReturnValue({ name: 'PublicController' }),
        getHandler: jest.fn().mockReturnValue({ name: 'public' }),
      } as any;

      // Act
      const result = await interceptor.intercept(mockExecutionContextNoUser, mockCallHandler).toPromise();

      // Assert
      expect(result).toEqual(mockResult);
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(2);
      
      const startEvent = auditEventEmitter.emit.mock.calls[0][0];
      expect(startEvent.userId).toBeUndefined();
    });

    it('deve respeitar TTL do cache para deduplicação', async () => {
      // Arrange
      const mockResult = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(mockResult));

      // Act - Primeira requisição
      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
      
      // Verifica que foi marcada como processada
      const cacheStats = deduplicationService.getCacheStats();
      expect(cacheStats.size).toBe(1);

      // Simula expiração limpando cache
      deduplicationService.clearCache();
      
      // Act - Segunda requisição após "expiração"
      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Assert - Deve ter processado novamente
      expect(auditEventEmitter.emit).toHaveBeenCalledTimes(4); // 2 + 2 eventos
      expect(auditMetricsService.recordInterceptorEvent).toHaveBeenCalledTimes(4); // 2 + 2 métricas
    });
  });
});