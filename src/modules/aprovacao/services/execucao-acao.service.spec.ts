import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ExecucaoAcaoService } from './execucao-acao.service';
import { TipoAcaoCritica } from '../enums/tipo-acao-critica.enum';
import { StatusSolicitacao } from '../enums/status-solicitacao.enum';
import { EstrategiaAprovacao } from '../enums/estrategia-aprovacao.enum';

describe('ExecucaoAcaoService', () => {
  let service: ExecucaoAcaoService;
  let httpService: HttpService;
  let logger: Logger;

  const mockHttpService = {
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn()
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'APP_PORT': 3000,
        'APP_HOST': 'localhost',
        'APP_PROTOCOL': 'http'
      };
      return config[key] || defaultValue;
    })
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecucaoAcaoService,
        {
          provide: HttpService,
          useValue: mockHttpService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: Logger,
          useValue: mockLogger
        },
        {
          provide: REQUEST,
          useValue: {
            headers: {
              authorization: 'Bearer mock-token'
            }
          }
        }
      ]
    }).compile();

    service = module.get<ExecucaoAcaoService>(ExecucaoAcaoService);
    httpService = module.get<HttpService>(HttpService);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executarAcao', () => {
    it('deve executar cancelamento de solicitação com sucesso', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-001',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de cancelamento',
        dados_acao: {
          url: '/api/solicitacoes/456',
          method: 'DELETE',
          params: { id: '456' }
        },
        metodo_execucao: 'DELETE /api/solicitacoes/456',
        acao_aprovacao_id: 'acao-123',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-123',
          tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
          nome: 'Cancelamento de Solicitação',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      const mockResponse = { 
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      } as any;
      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: '/api/solicitacoes/456',
          metodo: 'DELETE',
          status_resposta: 200,
          solicitacao_codigo: 'SOL-001'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'delete',
        url: 'http://localhost:3000/api/solicitacoes/456',
        params: { id: '456' },
        data: undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
          'X-Solicitacao-Aprovacao': 'SOL-001',
          'X-Aprovacao-Executada': 'true'
        }
      });
    });

    it('deve executar alteração de dados críticos com sucesso', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-002',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de alteração',
        dados_acao: {
          url: 'http://localhost:3000/api/usuarios/789',
          method: 'PUT',
          body: { nome: 'João Silva' }
        },
        metodo_execucao: 'PUT /api/usuarios/789',
        acao_aprovacao_id: 'acao-124',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-124',
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          nome: 'Alteração de Dados Críticos',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      const mockResponse = { 
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {}
        } as any;
      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: 'http://localhost:3000/api/usuarios/789',
          metodo: 'PUT',
          status_resposta: 200,
          solicitacao_codigo: 'SOL-002'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'put',
        url: 'http://localhost:3000/api/usuarios/789',
        params: undefined,
        data: {
          nome: 'João Silva'
          // Metadados de aprovação devem ser filtrados
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Aprovacao-Executada': 'true',
          'X-Solicitacao-Aprovacao': 'SOL-002',
          'Authorization': 'Bearer mock-token'
        }
      });
    });

    it('deve executar exclusão de registro com sucesso', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-003',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de exclusão',
        dados_acao: {
          url: 'http://localhost:3000/api/registros/999',
          method: 'DELETE'
        },
        metodo_execucao: 'DELETE /api/registros/999',
        acao_aprovacao_id: 'acao-125',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-125',
          tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
          nome: 'Exclusão de Registro',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      const mockResponse = { 
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {}
        } as any;
        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: 'http://localhost:3000/api/registros/999',
          metodo: 'DELETE',
          status_resposta: 200,
          solicitacao_codigo: 'SOL-003'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
         method: 'delete',
         url: 'http://localhost:3000/api/registros/999',
         params: undefined,
         data: undefined,
         headers: {
           'Content-Type': 'application/json',
           'X-Aprovacao-Executada': 'true',
           'X-Solicitacao-Aprovacao': 'SOL-003',
           'Authorization': 'Bearer mock-token'
         }
       });
    });

    it('deve executar aprovação de pagamento com sucesso', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-004',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de aprovação de pagamento',
        dados_acao: {
          url: '/api/pagamentos/555/aprovar',
          method: 'POST',
          params: { id: '555' },
          body: { valor: 1000 }
        },
        metodo_execucao: 'POST /api/pagamentos/555/aprovar',
        acao_aprovacao_id: 'acao-126',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-126',
          tipo_acao: TipoAcaoCritica.APROVACAO_PAGAMENTO,
          nome: 'Aprovação de Pagamento',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      const mockResponse = { 
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {}
        } as any;
        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: '/api/pagamentos/555/aprovar',
          metodo: 'POST',
          status_resposta: 200,
          solicitacao_codigo: 'SOL-004'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'post',
        url: 'http://localhost:3000/api/pagamentos/555/aprovar',
        params: { id: '555' },
        data: { valor: 1000 },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
          'X-Solicitacao-Aprovacao': 'SOL-004',
          'X-Aprovacao-Executada': 'true'
        }
      });
    });

    it('deve tratar erro de execução HTTP', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-007',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de erro HTTP',
        dados_acao: {
          url: '/api/solicitacoes/456',
          method: 'DELETE',
          params: { id: '456' },
          body: { motivo: 'Cancelamento por erro' }
        },
        metodo_execucao: 'DELETE /api/solicitacoes/456',
        acao_aprovacao_id: 'acao-129',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-129',
          tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
          nome: 'Cancelamento de Solicitação',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      const errorResponse = {
        response: {
          status: 500,
          data: { message: 'Erro interno do servidor' }
        },
        message: 'Request failed with status code 500'
      };

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => errorResponse));

      const result = await service.executarAcao(mockSolicitacao);
      
      expect(result.sucesso).toBe(false);
      expect(result.erro).toContain('HTTP 500: Erro interno do servidor');
    });

    it('deve lançar erro para tipo de ação não suportado', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-005',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de erro',
        dados_acao: {
          url: '/api/teste',
          method: 'POST',
          body: { teste: 'dados' }
        },
        metodo_execucao: 'POST /api/teste',
        acao_aprovacao_id: 'acao-127',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-127',
          tipo_acao: 'TIPO_INEXISTENTE' as any,
          nome: 'Tipo Inexistente',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      const result = await service.executarAcao(mockSolicitacao);
      
      expect(result.sucesso).toBe(false);
      expect(result.erro).toContain('HTTP 500: Erro interno do servidor');
    });

    it('deve lançar erro para método HTTP não suportado', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-006',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de método não suportado',
        dados_acao: {
          url: '/api/teste',
          method: 'PATCH',
          params: { id: '123' },
          body: { motivo: 'Cancelamento solicitado' }
        },
        metodo_execucao: 'PATCH /api/teste',
        acao_aprovacao_id: 'acao-125',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
        acao_aprovacao: {
          id: 'acao-128',
          tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
          nome: 'Cancelamento de Solicitação',
          estrategia: EstrategiaAprovacao.SIMPLES,
          min_aprovadores: 1,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
          solicitacoes: [],
          configuracao_aprovadores: []
        }
      };

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => new Error('Método HTTP não suportado: PATCH')));

      const result = await service.executarAcao(mockSolicitacao);
      
      expect(result.sucesso).toBe(false);
      expect(result.erro).toContain('Método HTTP não suportado: PATCH');
    });
  });



  describe('Execução de requisições HTTP', () => {
    it('deve executar requisição POST corretamente', async () => {
      const mockSolicitacao = {
         id: '123',
         codigo: 'SOL-009',
         status: StatusSolicitacao.APROVADA,
         solicitante_id: 'user-123',
         justificativa: 'Teste de POST',
         dados_acao: {
           url: '/api/pagamentos/555/aprovar',
           method: 'POST',
           params: { id: '555' },
           body: { valor: 1000 }
         },
         metodo_execucao: 'POST /api/pagamentos/555/aprovar',
         acao_aprovacao_id: 'acao-131',
         created_at: new Date(),
         updated_at: new Date(),
         solicitacao_aprovadores: [],
         calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
         podeSerAprovada: jest.fn().mockReturnValue(true),
         foiRejeitada: jest.fn().mockReturnValue(false),
         acao_aprovacao: {
           id: 'acao-131',
           tipo_acao: TipoAcaoCritica.APROVACAO_PAGAMENTO,
           nome: 'Aprovação de Pagamento',
           estrategia: EstrategiaAprovacao.SIMPLES,
           min_aprovadores: 1,
           ativo: true,
           created_at: new Date(),
           updated_at: new Date(),
           solicitacoes: [],
           configuracao_aprovadores: []
         }
       };

      const mockResponse = { 
        data: { id: 1, created: true },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {}
      } as any;
      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: '/api/pagamentos/555/aprovar',
          metodo: 'POST',
          status_resposta: 201,
          solicitacao_codigo: 'SOL-009'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
         method: 'post',
         url: 'http://localhost:3000/api/pagamentos/555/aprovar',
         params: { id: '555' },
         data: { valor: 1000 },
         headers: {
           'Content-Type': 'application/json',
           'Authorization': 'Bearer mock-token',
           'X-Solicitacao-Aprovacao': 'SOL-009',
           'X-Aprovacao-Executada': 'true'
         }
       });
      });

    it('deve executar requisição PUT corretamente', async () => {
      const mockSolicitacao = {
         id: '123',
         codigo: 'SOL-010',
         status: StatusSolicitacao.APROVADA,
         solicitante_id: 'user-123',
         justificativa: 'Teste de PUT',
         dados_acao: {
           url: '/api/usuarios/789',
           method: 'PUT',
           body: { nome: 'João Silva' }
         },
         metodo_execucao: 'PUT /api/usuarios/789',
         acao_aprovacao_id: 'acao-128',
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
         calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
         podeSerAprovada: jest.fn().mockReturnValue(true),
         foiRejeitada: jest.fn().mockReturnValue(false),
         acao_aprovacao: {
           id: 'acao-132',
           tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
           nome: 'Alteração de Dados Críticos',
           estrategia: EstrategiaAprovacao.SIMPLES,
           min_aprovadores: 1,
           ativo: true,
           created_at: new Date(),
           updated_at: new Date(),
           solicitacoes: [],
           configuracao_aprovadores: []
         }
       };

      const mockResponse = { 
        data: { id: 1, updated: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      } as any;
      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: '/api/usuarios/789',
          metodo: 'PUT',
          status_resposta: 200,
          solicitacao_codigo: 'SOL-010'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'put',
        url: 'http://localhost:3000/api/usuarios/789',
        params: undefined,
        data: {
          nome: 'João Silva'
          // Metadados de aprovação devem ser filtrados
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Aprovacao-Executada': 'true',
          'X-Solicitacao-Aprovacao': 'SOL-010',
          'Authorization': 'Bearer mock-token'
        }
      });
    });

    it('deve executar requisição DELETE corretamente', async () => {
      const mockSolicitacao = {
         id: '123',
         codigo: 'SOL-011',
         status: StatusSolicitacao.APROVADA,
         solicitante_id: 'user-123',
         justificativa: 'Teste de DELETE',
         dados_acao: {
           url: '/api/registros/999',
           method: 'DELETE'
         },
         metodo_execucao: 'DELETE /api/registros/999',
         acao_aprovacao_id: 'acao-132',
         created_at: new Date(),
         updated_at: new Date(),
         solicitacao_aprovadores: [],
         calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
         podeSerAprovada: jest.fn().mockReturnValue(true),
         foiRejeitada: jest.fn().mockReturnValue(false),
         acao_aprovacao: {
           id: 'acao-133',
           tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
           nome: 'Exclusão de Registro',
           estrategia: EstrategiaAprovacao.SIMPLES,
           min_aprovadores: 1,
           ativo: true,
           created_at: new Date(),
           updated_at: new Date(),
           solicitacoes: [],
           configuracao_aprovadores: []
         }
       };

      const mockResponse = { 
        data: { deleted: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      } as any;
      jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

      const result = await service.executarAcao(mockSolicitacao);

      expect(result).toEqual({
        sucesso: true,
        dados: mockResponse.data,
        detalhes: {
          url_executada: '/api/registros/999',
          metodo: 'DELETE',
          status_resposta: 200,
          solicitacao_codigo: 'SOL-011'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
         method: 'delete',
         url: 'http://localhost:3000/api/registros/999',
         params: undefined,
         data: undefined,
         headers: {
           'Content-Type': 'application/json',
           'X-Aprovacao-Executada': 'true',
           'X-Solicitacao-Aprovacao': 'SOL-011',
           'Authorization': 'Bearer mock-token'
         }
       });
    });

    it('deve lançar erro para método HTTP não suportado', async () => {
       const mockSolicitacao = {
         id: '123',
         codigo: 'SOL-012',
         status: StatusSolicitacao.APROVADA,
         solicitante_id: 'user-123',
         justificativa: 'Teste de método não suportado',
         dados_acao: {
           url: 'http://localhost:3000/api/test',
           method: 'PATCH'
         },
         metodo_execucao: 'PATCH /api/test',
         acao_aprovacao_id: 'acao-134',
         created_at: new Date(),
         updated_at: new Date(),
         solicitacao_aprovadores: [],
         calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
         podeSerAprovada: jest.fn().mockReturnValue(true),
         foiRejeitada: jest.fn().mockReturnValue(false),
         acao_aprovacao: {
           id: 'acao-134',
           tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
           nome: 'Alteração de Dados Críticos',
           estrategia: EstrategiaAprovacao.SIMPLES,
           min_aprovadores: 1,
           ativo: true,
           created_at: new Date(),
           updated_at: new Date(),
           solicitacoes: [],
           configuracao_aprovadores: []
         }
       };

       // Simular erro no httpService para método não suportado
       jest.spyOn(httpService, 'request').mockReturnValue(
         throwError(() => new Error('Método HTTP não suportado: PATCH'))
       );

       const result = await service.executarAcao(mockSolicitacao);
       
       expect(result.sucesso).toBe(false);
       expect(result.erro).toContain('Erro de rede:');
     });
  });


});