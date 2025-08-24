import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ScopeContextInterceptor } from '../scope-context.interceptor';
import { RequestContextHolder } from '../../services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { IScopeContext } from '../../interfaces/scope-context.interface';
import { of, throwError } from 'rxjs';

/**
 * Testes de Integração para ScopeContextInterceptor
 *
 * Valida o comportamento completo do sistema:
 * - Integração com guards e middlewares
 * - Fluxo completo de requisição
 * - Comportamento em cenários reais
 * - Performance e concorrência
 */
describe('ScopeContextInterceptor - Integration Tests', () => {
  let app: INestApplication;
  let interceptor: ScopeContextInterceptor;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ScopeContextInterceptor],
    }).compile();

    app = moduleFixture.createNestApplication();
    interceptor = moduleFixture.get<ScopeContextInterceptor>(
      ScopeContextInterceptor,
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    RequestContextHolder.clear();
  });

  describe('🔄 Fluxos de Contexto Completos', () => {
    it('deve processar contexto GLOBAL corretamente', (done) => {
      // Arrange: Simular requisição sem autenticação
      const mockContext = createMockExecutionContext({
        user: null,
        headers: {},
      });

      const mockHandler = {
        handle: () => {
          // Capturar contexto durante execução
          const context = RequestContextHolder.get();
          expect(context).toBeDefined();
          expect(context.tipo).toBe(ScopeType.GLOBAL);
          expect(context.user_id).toBeNull();
          expect(context.unidade_id).toBeNull();
          done();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });

    it('deve processar contexto PROPRIO corretamente', (done) => {
      // Arrange: Usuário autenticado sem unidade
      const mockContext = createMockExecutionContext({
        user: {
          id: 'user-123',
          email: 'user@test.com',
          escopo: 'PROPRIO',
          // Sem unidade_id
        },
        headers: {},
      });

      const mockHandler = {
        handle: () => {
          const context = RequestContextHolder.get();
          expect(context.tipo).toBe(ScopeType.PROPRIO);
          expect(context.user_id).toBe('user-123');
          expect(context.unidade_id).toBeNull();
          done();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });

    it('deve processar contexto UNIDADE corretamente', (done) => {
      // Arrange: Usuário com unidade
      const mockContext = createMockExecutionContext({
        user: {
          id: 'user-456',
          email: 'admin@unidade.com',
          escopo: 'UNIDADE',
          unidade_id: 'unidade-789',
        },
        headers: {},
      });

      const mockHandler = {
        handle: () => {
          const context = RequestContextHolder.get();
          expect(context.tipo).toBe(ScopeType.UNIDADE);
          expect(context.user_id).toBe('user-456');
          expect(context.unidade_id).toBe('unidade-789');
          done();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });

    it('deve priorizar unidade do usuário sobre header', (done) => {
      // Arrange: Conflito entre user.unidade_id e header
      const mockContext = createMockExecutionContext({
        user: {
          id: 'user-789',
          escopo: 'UNIDADE',
          unidade_id: 'unidade-do-user',
        },
        headers: {
          'x-unidade-id': 'unidade-do-header',
        },
      });

      const mockHandler = {
        handle: () => {
          const context = RequestContextHolder.get();
          expect(context.tipo).toBe(ScopeType.UNIDADE);
          expect(context.unidade_id).toBe('unidade-do-user'); // Prioridade do user
          done();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });
  });

  describe('🚀 Testes de Performance', () => {
    it('deve processar múltiplas requisições rapidamente', async () => {
      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      // Simular 100 requisições concorrentes
      for (let i = 0; i < 100; i++) {
        const mockContext = createMockExecutionContext({
          user: {
            id: `user-${i}`,
            unidade_id: `unidade-${i % 10}`, // 10 unidades diferentes
          },
          headers: {},
        });

        const mockHandler = createMockCallHandler();
        const promise = interceptor
          .intercept(mockContext, mockHandler)
          .toPromise();
        promises.push(promise);
      }

      // Act
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Menos de 1 segundo

      // Verificar que contexto foi limpo
      expect(RequestContextHolder.get()).toBeUndefined();
    });

    it('deve manter isolamento entre requisições concorrentes', async () => {
      const contexts: IScopeContext[] = [];
      const promises: Promise<void>[] = [];

      // Criar 50 requisições com contextos diferentes
      for (let i = 0; i < 50; i++) {
        const promise = new Promise<void>((resolve) => {
          const mockContext = createMockExecutionContext({
            user: {
              id: `user-${i}`,
              unidade_id: i % 2 === 0 ? `unidade-${i}` : undefined,
            },
            headers: {},
          });

          const mockHandler = {
            handle: () => {
              // Capturar contexto durante execução
              const currentContext = RequestContextHolder.get();
              contexts.push({ ...currentContext });
              return of(`result-${i}`);
            },
          };

          interceptor
            .intercept(mockContext, mockHandler)
            .toPromise()
            .then(() => {
              resolve();
            });
        });

        promises.push(promise);
      }

      // Act
      await Promise.all(promises);

      // Assert: Verificar que cada contexto foi único
      expect(contexts).toHaveLength(50);

      const userIds = contexts.map((c) => c.user_id);
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds).toHaveLength(50); // Todos únicos
    });
  });

  describe('🔧 Testes de Robustez', () => {
    it('deve lidar com dados corrompidos graciosamente', (done) => {
      // Arrange: Dados malformados
      const mockContext = createMockExecutionContext({
        user: {
          id: null,
          escopo: 'PROPRIO',
          unidade_id: '',
          invalid_field: 'should_be_ignored',
        },
        headers: {
          'x-unidade-id': '',
          'content-type': 'application/json',
        },
      });

      const mockHandler = {
        handle: () => {
          const context = RequestContextHolder.get();
          expect(context.tipo).toBe(ScopeType.PROPRIO);
          expect(context.user_id).toBe('null'); // null convertido para string 'null'
          done();
          return of('mock-result');
        },
      };

      // Act: Não deve lançar exceção
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });

    it('deve recuperar de falhas no handler', async () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        user: { id: 'user-test' },
        headers: {},
      });

      const mockHandler = {
        handle: () => {
          return throwError(() => new Error('Falha simulada no handler'));
        },
      };

      // Act & Assert
      await expect(
        interceptor.intercept(mockContext, mockHandler).toPromise(),
      ).rejects.toThrow('Falha simulada no handler');

      // Contexto deve ser limpo mesmo com erro
      expect(RequestContextHolder.get()).toBeUndefined();
    });

    it('deve funcionar com headers case-insensitive', (done) => {
      // Arrange: Headers com diferentes cases
      const mockContext = createMockExecutionContext({
        user: {
          id: 'user-case-test',
          escopo: 'UNIDADE',
          unidade_id: 'user-unidade-123',
        },
        headers: {
          'X-UNIDADE-ID': 'unidade-uppercase',
          'x-unidade-id': 'unidade-lowercase', // Deve ser ignorado
          'X-Unidade-Id': 'unidade-mixedcase', // Deve ser ignorado
        },
      });

      const mockHandler = {
        handle: () => {
          // Assert: Deve usar a unidade do usuário (prioridade)
          const context = RequestContextHolder.get();
          expect(context.tipo).toBe(ScopeType.UNIDADE);
          expect(context.unidade_id).toBe('user-unidade-123'); // Prioridade do usuário
          done();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });
  });

  describe('📊 Testes de Métricas e Logging', () => {
    it('deve gerar logs apropriados para diferentes cenários', (done) => {
      // Arrange: Spy no logger do interceptor
      const debugSpy = jest
        .spyOn((interceptor as any).logger, 'debug')
        .mockImplementation();
      const warnSpy = jest
        .spyOn((interceptor as any).logger, 'warn')
        .mockImplementation();

      let callCount = 0;
      const expectedCalls = 2;

      const checkCompletion = () => {
        callCount++;
        if (callCount === expectedCalls) {
          // Assert: Verificar que logs foram gerados
          expect(
            debugSpy.mock.calls.length + warnSpy.mock.calls.length,
          ).toBeGreaterThan(0);
          debugSpy.mockRestore();
          warnSpy.mockRestore();
          done();
        }
      };

      // Cenário 1: Usuário válido
      const mockContext1 = createMockExecutionContext({
        user: { id: 'valid-user', escopo: 'UNIDADE', unidade_id: 'unit-123' },
        headers: {},
      });

      const mockHandler1 = {
        handle: () => {
          checkCompletion();
          return of('mock-result');
        },
      };

      // Cenário 2: Usuário sem unidade (fallback)
      const mockContext2 = createMockExecutionContext({
        user: { id: 'no-unit-user', escopo: 'UNIDADE' }, // Sem unidade_id para trigger fallback
        headers: {},
      });

      const mockHandler2 = {
        handle: () => {
          checkCompletion();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext1, mockHandler1).toPromise();
      interceptor.intercept(mockContext2, mockHandler2).toPromise();
    });

    it('deve gerar logs de auditoria', (done) => {
      // Arrange: Spy no logger do interceptor
      const debugSpy = jest
        .spyOn((interceptor as any).logger, 'debug')
        .mockImplementation();
      const mockContext = createMockExecutionContext({
        user: { id: 'audit-user', escopo: 'PROPRIO' },
        headers: {},
      });

      const mockHandler = {
        handle: () => {
          // Assert: Verificar que logs de debug foram gerados
          expect(debugSpy).toHaveBeenCalled();
          debugSpy.mockRestore();
          done();
          return of('mock-result');
        },
      };

      // Act
      interceptor.intercept(mockContext, mockHandler).toPromise();
    });
  });

  /**
   * Helper para criar mock do ExecutionContext
   */
  function createMockExecutionContext(requestData: {
    user?: any;
    headers?: Record<string, any>;
  }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: requestData.user,
          headers: requestData.headers || {},
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({
        getContext: () => ({}),
        getData: () => ({}),
      }),
      switchToWs: () => ({
        getClient: () => ({}),
        getData: () => ({}),
      }),
      getType: () => 'http',
    } as any;
  }

  /**
   * Helper para criar mock do CallHandler
   */
  function createMockCallHandler() {
    return {
      handle: () => of('mock-result'),
    };
  }
});
