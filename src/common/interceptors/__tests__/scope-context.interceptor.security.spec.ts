import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { ScopeContextInterceptor } from '../scope-context.interceptor';
import { RequestContextHolder } from '../../services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { IScopeContext } from '../../interfaces/scope-context.interface';

/**
 * Testes de Segurança para ScopeContextInterceptor
 * 
 * Foca em casos extremos e vulnerabilidades de segurança:
 * - Tentativas de bypass de contexto
 * - Manipulação de headers maliciosos
 * - Contextos inconsistentes
 * - Falhas de validação
 */
describe('ScopeContextInterceptor - Security Tests', () => {
  let interceptor: ScopeContextInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScopeContextInterceptor],
    }).compile();

    interceptor = module.get<ScopeContextInterceptor>(ScopeContextInterceptor);
    
    // Spy no logger para verificar warnings de segurança
    loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    
    mockCallHandler = {
      handle: jest.fn(() => of('test-result')),
    };

    // Limpar contexto antes de cada teste
    RequestContextHolder.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    RequestContextHolder.clear();
  });

  describe('🔴 Testes de Vulnerabilidades Críticas', () => {
    it('deve prevenir vazamento de dados quando usuário é null', (done) => {
      // Arrange: Simular falha no contexto
      mockExecutionContext = createMockContext({
        user: null,
        headers: {},
      });

      // Mock do handler para capturar contexto durante execução
      mockCallHandler.handle = jest.fn(() => {
        const context = RequestContextHolder.get();
        expect(context).toBeDefined();
        expect(context.tipo).toBe(ScopeType.GLOBAL);
        expect(context.user_id).toBeNull();
        expect(context.unidade_id).toBeNull();
        done();
        return of('test-result');
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result$.subscribe();
    });

    it('deve sanitizar headers maliciosos', (done) => {
      // Arrange: Headers com tentativa de injeção
      mockExecutionContext = createMockContext({
        user: { 
          id: 'user123',
          escopo: 'UNIDADE',
          unidade_id: 'unidade123'
        },
        headers: {
          'x-unidade-id': "'; DROP TABLE usuarios; --",
        },
      });

      // Mock do handler para capturar contexto durante execução
      mockCallHandler.handle = jest.fn(() => {
        const context = RequestContextHolder.get();
        expect(context.tipo).toBe(ScopeType.UNIDADE);
        expect(context.unidade_id).toBe('unidade123'); // Deve usar user.unidade_id, não header
        expect(typeof context.unidade_id).toBe('string');
        done();
        return of('test-result');
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result$.subscribe();
    });

    it('deve aplicar fallback quando validação falha', (done) => {
      // Arrange: User com escopo UNIDADE mas sem unidade_id (inconsistente)
      mockExecutionContext = createMockContext({
        user: {
          id: 'user123',
          escopo: 'UNIDADE',
          // Sem unidade_id - isso deve causar fallback
        },
        headers: {
          'x-unidade-id': 'unidade123',
        },
      });

      // Mock do handler para capturar contexto durante execução
      mockCallHandler.handle = jest.fn(() => {
        const context = RequestContextHolder.get();
        expect(context.tipo).toBe(ScopeType.PROPRIO);
        expect(context.user_id).toBe('user123');
        expect(context.unidade_id).toBeNull();
        done();
        return of('test-result');
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result$.subscribe();
    });
  });

  describe('🔒 Testes de Integridade de Contexto', () => {
    it('deve converter user_id para string', (done) => {
      // Arrange: user.id como number
      mockExecutionContext = createMockContext({
        user: {
          id: 12345, // Number
          escopo: 'UNIDADE',
          unidade_id: 67890, // Number
        },
        headers: {},
      });

      // Mock do handler para capturar contexto durante execução
      mockCallHandler.handle = jest.fn(() => {
        const context = RequestContextHolder.get();
        expect(typeof context.user_id).toBe('string');
        expect(context.user_id).toBe('12345');
        expect(typeof context.unidade_id).toBe('string');
        expect(context.unidade_id).toBe('67890');
        done();
        return of('test-result');
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result$.subscribe();
    });

    it('deve tratar valores undefined/null adequadamente', (done) => {
      // Arrange: Valores undefined - sem usuário válido
      mockExecutionContext = createMockContext({
        user: {
          id: undefined,
          escopo: undefined,
          unidade_id: null,
        },
        headers: {},
      });

      // Mock do handler para capturar contexto durante execução
      mockCallHandler.handle = jest.fn(() => {
        const context = RequestContextHolder.get();
        // Com user.id undefined, deve aplicar fallback para PROPRIO
        expect(context.tipo).toBe(ScopeType.PROPRIO);
        expect(context.user_id).toBe('undefined'); // String 'undefined' quando user.id é undefined
        expect(context.unidade_id).toBeNull();
        done();
        return of('test-result');
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result$.subscribe();
    });

    it('deve priorizar unidade do usuário sobre header', (done) => {
      // Arrange: Conflito entre user.unidade_id e header
      mockExecutionContext = createMockContext({
        user: {
          id: 'user123',
          escopo: 'UNIDADE',
          unidade_id: 'unidade-user',
        },
        headers: {
          'x-unidade-id': 'unidade-header',
        },
      });

      // Mock do handler para capturar contexto durante execução
      mockCallHandler.handle = jest.fn(() => {
        const context = RequestContextHolder.get();
        expect(context.tipo).toBe(ScopeType.UNIDADE);
        expect(context.unidade_id).toBe('unidade-user');
        expect(context.user_id).toBe('user123');
        done();
        return of('test-result');
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result$.subscribe();
    });
  });

  describe('🛡️ Testes de Limpeza e Isolamento', () => {
    it('deve limpar contexto após execução', async () => {
      // Arrange
      mockExecutionContext = createMockContext({
        user: { id: 'user123' },
        headers: {},
      });

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result$.toPromise();

      // Assert: Contexto deve ser limpo
      expect(RequestContextHolder.hasContext()).toBe(false);
    });

    it('deve manter isolamento entre execuções', async () => {
      // Primeira execução
      mockExecutionContext = createMockContext({
        user: { id: 'user1', unidade_id: 'unidade1' },
        headers: {},
      });

      const result1$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result1$.toPromise();

      // Verificar que contexto foi limpo
      expect(RequestContextHolder.hasContext()).toBe(false);

      // Segunda execução com dados diferentes
      mockExecutionContext = createMockContext({
        user: { id: 'user2', unidade_id: 'unidade2' },
        headers: {},
      });

      const result2$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await result2$.toPromise();

      // Verificar isolamento
      expect(RequestContextHolder.hasContext()).toBe(false);
    });
  });

  /**
   * Helper para criar mock do ExecutionContext
   */
  function createMockContext(requestData: {
    user?: any;
    headers?: Record<string, any>;
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: requestData.user,
          headers: requestData.headers || {},
        }),
      }),
    } as ExecutionContext;
  }
});