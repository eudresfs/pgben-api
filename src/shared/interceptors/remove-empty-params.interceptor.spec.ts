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

    it('deve processar query parameters em requisições GET', () => {
      mockRequest.method = 'GET';
      mockRequest.query = {
        status: '',
        nome: 'João',
        idade: null,
        ativo: undefined,
        categoria: 'admin',
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.query).toEqual({
        nome: 'João',
        categoria: 'admin',
      });
    });

    it('deve processar query parameters em requisições POST', () => {
      mockRequest.method = 'POST';
      mockRequest.query = {
        filter: '',
        page: '1',
        limit: null,
      };
      mockRequest.body = {
        nome: 'João',
        email: '',
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.query).toEqual({
        page: '1',
      });
      expect(mockRequest.body).toEqual({
        nome: 'João',
      });
    });

    it('deve processar query parameters complexos', () => {
      mockRequest.method = 'GET';
      mockRequest.query = {
        solicitacao_id: '',
        status: 'aberta',
        registrado_por_id: null,
        data_criacao_inicio: undefined,
        busca_descricao: '   ',
        apenas_vencidas: 'true',
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.query).toEqual({
        status: 'aberta',
        apenas_vencidas: 'true',
      });
    });

    it('deve manter query vazio quando todos os parâmetros são removidos', () => {
      mockRequest.method = 'GET';
      mockRequest.query = {
        param1: '',
        param2: null,
        param3: undefined,
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.query).toEqual({});
    });

    it('não deve processar quando query não existe', () => {
      mockRequest.method = 'GET';
      mockRequest.query = undefined;

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.query).toBeUndefined();
    });

    it('deve preservar valores falsy válidos em query parameters', () => {
      mockRequest.method = 'GET';
      mockRequest.query = {
        page: '0',
        active: 'false',
        count: '0',
        empty: '',
        nullValue: null,
      };

      interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      expect(mockRequest.query).toEqual({
        page: '0',
        active: 'false',
        count: '0',
      });
    });
  });
});
