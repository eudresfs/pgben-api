import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { RemoveEmptyParamsInterceptor } from './remove-empty-params.interceptor';

describe('RemoveEmptyParamsInterceptor', () => {
  let interceptor: RemoveEmptyParamsInterceptor;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler>;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RemoveEmptyParamsInterceptor],
    }).compile();

    interceptor = module.get<RemoveEmptyParamsInterceptor>(
      RemoveEmptyParamsInterceptor,
    );

    mockRequest = {
      method: 'POST',
      body: {},
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: () => of({}),
    };
  });

  it('deve ser definido', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('deve remover strings vazias', () => {
      mockRequest.body = {
        nome: '',
        idade: 30,
        email: 'test@test.com',
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        idade: 30,
        email: 'test@test.com',
      });
    });

    it('deve remover valores null e undefined', () => {
      mockRequest.body = {
        nome: 'João',
        sobrenome: null,
        idade: undefined,
        ativo: true,
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        nome: 'João',
        ativo: true,
      });
    });

    it('deve preservar valores falsy válidos (0, false)', () => {
      mockRequest.body = {
        nome: '',
        idade: 0,
        ativo: false,
        pontos: 0,
        descricao: null,
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        idade: 0,
        ativo: false,
        pontos: 0,
      });
    });

    it('deve remover arrays vazios', () => {
      mockRequest.body = {
        nome: 'João',
        tags: [],
        categorias: ['categoria1'],
        vazio: [],
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        nome: 'João',
        categorias: ['categoria1'],
      });
    });

    it('deve remover objetos vazios', () => {
      mockRequest.body = {
        nome: 'João',
        endereco: {},
        contato: {
          telefone: '123456789',
        },
        metadata: {},
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        nome: 'João',
        contato: {
          telefone: '123456789',
        },
      });
    });

    it('deve processar objetos aninhados recursivamente', () => {
      mockRequest.body = {
        usuario: {
          nome: 'João',
          sobrenome: '',
          endereco: {
            rua: 'Rua A',
            numero: null,
            complemento: '',
            cidade: {
              nome: 'São Paulo',
              estado: '',
            },
          },
        },
        configuracoes: {
          tema: '',
          notificacoes: true,
        },
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        usuario: {
          nome: 'João',
          endereco: {
            rua: 'Rua A',
            cidade: {
              nome: 'São Paulo',
            },
          },
        },
        configuracoes: {
          notificacoes: true,
        },
      });
    });

    it('deve processar arrays com objetos', () => {
      mockRequest.body = {
        usuarios: [
          {
            nome: 'João',
            email: '',
          },
          {
            nome: '',
            email: 'maria@test.com',
          },
          {
            nome: 'Pedro',
            email: 'pedro@test.com',
          },
        ],
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        usuarios: [
          {
            nome: 'João',
          },
          {
            email: 'maria@test.com',
          },
          {
            nome: 'Pedro',
            email: 'pedro@test.com',
          },
        ],
      });
    });

    it('deve remover strings com apenas espaços em branco', () => {
      mockRequest.body = {
        nome: '   ',
        descricao: '\t\n  ',
        titulo: 'Título válido',
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        titulo: 'Título válido',
      });
    });

    it('não deve processar requisições GET', () => {
      mockRequest.method = 'GET';
      mockRequest.body = {
        nome: '',
        idade: 30,
      };

      const originalBody = { ...mockRequest.body };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual(originalBody);
    });

    it('não deve processar requisições DELETE', () => {
      mockRequest.method = 'DELETE';
      mockRequest.body = {
        nome: '',
        idade: 30,
      };

      const originalBody = { ...mockRequest.body };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual(originalBody);
    });

    it('deve processar requisições PUT', () => {
      mockRequest.method = 'PUT';
      mockRequest.body = {
        nome: '',
        idade: 30,
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        idade: 30,
      });
    });

    it('deve processar requisições PATCH', () => {
      mockRequest.method = 'PATCH';
      mockRequest.body = {
        nome: '',
        idade: 30,
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        idade: 30,
      });
    });

    it('deve lidar com body undefined ou null', () => {
      mockRequest.body = null;

      expect(() => {
        interceptor.intercept(
          mockExecutionContext as ExecutionContext,
          mockCallHandler as CallHandler,
        );
      }).not.toThrow();

      mockRequest.body = undefined;

      expect(() => {
        interceptor.intercept(
          mockExecutionContext as ExecutionContext,
          mockCallHandler as CallHandler,
        );
      }).not.toThrow();
    });

    it('deve retornar undefined para objetos que ficam completamente vazios', () => {
      mockRequest.body = {
        config: {
          tema: '',
          idioma: null,
          opcoes: [],
        },
        nome: 'João',
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.body).toEqual({
        nome: 'João',
      });
    });
  });
});