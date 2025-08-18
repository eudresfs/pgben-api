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
          params: { id: '456' }
        },
        metodo_execucao: 'DELETE /api/solicitacoes/456',
        acao_aprovacao_id: 'acao-123',
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
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
          solicitacao_cancelada: '456',
          metodo_original: 'DELETE /api/solicitacoes/456'
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'put',
        url: 'http://localhost:3000/api/v1/beneficio/solicitacoes/456/cancelar',
        params: undefined,
        data: {
          motivo_cancelamento: 'Cancelamento aprovado via sistema de aprovação',
          justificativa: 'Teste de cancelamento',
          aprovado_por: 'SISTEMA_APROVACAO'
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
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
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
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
          dados_alterados: { nome: 'João Silva' }
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
          url: 'http://localhost:3000/api/registros/999'
        },
        metodo_execucao: 'DELETE /api/registros/999',
        acao_aprovacao_id: 'acao-125',
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
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
          registro_excluido: 'http://localhost:3000/api/registros/999',
          metodo_original: 'DELETE /api/registros/999'
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
          params: { id: '555' },
          body: { valor: 1000 }
        },
        metodo_execucao: 'POST /api/pagamentos/555/aprovar',
        acao_aprovacao_id: 'acao-126',
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
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
          pagamento_aprovado: '555',
          valor: 1000
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'put',
        url: 'http://localhost:3000/api/v1/pagamento/555/aprovar',
        params: undefined,
        data: {
          aprovado: true,
          aprovado_por: 'SISTEMA_APROVACAO',
          codigo_solicitacao: 'SOL-004'
          // justificativa_aprovacao filtrada pelos metadados
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
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
          params: { id: '456' },
          body: { motivo: 'Cancelamento por erro' }
        },
        metodo_execucao: 'DELETE /api/solicitacoes/456',
        acao_aprovacao_id: 'acao-129',
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
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
      expect(result.erro).toContain('Falha no cancelamento da solicitação');
    });

    it('deve lançar erro para tipo de ação não suportado', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-005',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de erro',
        dados_acao: { teste: 'dados' },
        metodo_execucao: 'POST /api/teste',
        acao_aprovacao_id: 'acao-127',
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
        }
      };

      const result = await service.executarAcao(mockSolicitacao);
      
      expect(result.sucesso).toBe(false);
      expect(result.erro).toContain('Tipo de ação não suportado: TIPO_INEXISTENTE');
    });

    it('deve lançar erro para método HTTP não suportado', async () => {
      const mockSolicitacao = {
        id: '123',
        codigo: 'SOL-006',
        status: StatusSolicitacao.APROVADA,
        solicitante_id: 'user-123',
        justificativa: 'Teste de método não suportado',
        dados_acao: {
          params: { id: '123' },
          body: { motivo: 'Cancelamento solicitado' }
        },
        metodo_execucao: 'PATCH /api/teste',
        acao_aprovacao_id: 'acao-128',
        criado_em: new Date(),
        atualizado_em: new Date(),
        aprovadores: [],
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
          criado_em: new Date(),
          atualizado_em: new Date(),
          solicitacoes: [],
          aprovadores: []
        }
      };

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => new Error('Método HTTP não suportado: PATCH')));

      const result = await service.executarAcao(mockSolicitacao);
      
      expect(result.sucesso).toBe(false);
      expect(result.erro).toContain('Método HTTP não suportado: PATCH');
    });
  });

  describe('validarDadosAcao', () => {
    it('deve validar dados de cancelamento de solicitação', () => {
      const dadosValidos = {
        params: { id: '123' },
        body: {
          motivo: 'Cancelamento solicitado'
        }
      };

      expect(() => {
        (service as any).validarDadosAcao(dadosValidos, TipoAcaoCritica.CANCELAMENTO_SOLICITACAO);
      }).not.toThrow();
    });

    it('deve lançar erro para dados inválidos de cancelamento', () => {
      const dadosInvalidos = {
        motivo: 'Cancelamento solicitado'
        // faltando solicitacao_id
      };

      expect(() => {
        (service as any).validarDadosAcao(dadosInvalidos, TipoAcaoCritica.CANCELAMENTO_SOLICITACAO);
      }).toThrow('ID da solicitação é obrigatório para cancelamento');
    });

    it('deve validar dados de alteração de dados críticos', () => {
      const dadosValidos = {
        url: 'http://localhost:3000/api/usuarios/456',
        method: 'PUT',
        body: { email: 'novo@email.com' }
      };

      expect(() => {
        (service as any).validarDadosAcao(dadosValidos, TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS);
      }).not.toThrow();
    });

    it('deve validar dados de aprovação de pagamento', () => {
      const dadosValidos = {
        params: { id: '101' },
        body: {
          valor: 1500.00,
          beneficiario: 'João Silva'
        }
      };

      expect(() => {
        (service as any).validarDadosAcao(dadosValidos, TipoAcaoCritica.APROVACAO_PAGAMENTO);
      }).not.toThrow();
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
           params: { id: '555' },
           body: { valor: 1000 }
         },
         metodo_execucao: 'POST /api/pagamentos/555/aprovar',
         acao_aprovacao_id: 'acao-131',
         criado_em: new Date(),
         atualizado_em: new Date(),
         aprovadores: [],
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
           criado_em: new Date(),
           atualizado_em: new Date(),
           solicitacoes: [],
           aprovadores: []
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
          pagamento_aprovado: '555',
          valor: 1000
        }
      });
      expect(httpService.request).toHaveBeenCalledWith({
         method: 'put',
         url: 'http://localhost:3000/api/v1/pagamento/555/aprovar',
         params: undefined,
         data: {
           aprovado: true,
           aprovado_por: 'SISTEMA_APROVACAO',
           codigo_solicitacao: 'SOL-009'
           // justificativa_aprovacao filtrada pelos metadados
         },
         headers: {
           'Content-Type': 'application/json',
           'Authorization': 'Bearer mock-token'
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
         acao_aprovacao_id: 'acao-132',
         criado_em: new Date(),
         atualizado_em: new Date(),
         aprovadores: [],
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
           criado_em: new Date(),
           atualizado_em: new Date(),
           solicitacoes: [],
           aprovadores: []
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
          dados_alterados: { nome: 'João Silva' }
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
           url: '/api/registros/999'
         },
         metodo_execucao: 'DELETE /api/registros/999',
         acao_aprovacao_id: 'acao-133',
         criado_em: new Date(),
         atualizado_em: new Date(),
         aprovadores: [],
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
           criado_em: new Date(),
           atualizado_em: new Date(),
           solicitacoes: [],
           aprovadores: []
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
          registro_excluido: '/api/registros/999',
          metodo_original: 'DELETE /api/registros/999'
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
         criado_em: new Date(),
         atualizado_em: new Date(),
         aprovadores: [],
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
           criado_em: new Date(),
           atualizado_em: new Date(),
           solicitacoes: [],
           aprovadores: []
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

  describe('filtrarMetadadosAprovacao', () => {
    it('deve remover metadados de aprovação do objeto', () => {
      const bodyComMetadados = {
        nome: 'João Silva',
        email: 'joao@email.com',
        _aprovacao_metadata: {
          solicitacao_id: '123',
          codigo_aprovacao: 'SOL-001'
        },
        justificativa_aprovacao: 'Teste',
        codigo_aprovacao: 'SOL-001',
        solicitacao_aprovacao_id: '456'
      };

      // Usar reflexão para acessar método privado
      const metodoPrivado = service['filtrarMetadadosAprovacao'].bind(service);
      const resultado = metodoPrivado(bodyComMetadados);

      expect(resultado).toEqual({
        nome: 'João Silva',
        email: 'joao@email.com'
      });
      expect(resultado._aprovacao_metadata).toBeUndefined();
      expect(resultado.justificativa_aprovacao).toBeUndefined();
      expect(resultado.codigo_aprovacao).toBeUndefined();
      expect(resultado.solicitacao_aprovacao_id).toBeUndefined();
    });

    it('deve filtrar metadados em objetos aninhados', () => {
      const bodyComObjetosAninhados = {
        usuario: {
          nome: 'João',
          _aprovacao_metadata: { test: 'value' },
          justificativa_aprovacao: 'teste'
        },
        dados: {
          valor: 100,
          codigo_aprovacao: 'SOL-001'
        }
      };

      const metodoPrivado = service['filtrarMetadadosAprovacao'].bind(service);
      const resultado = metodoPrivado(bodyComObjetosAninhados);

      expect(resultado.usuario._aprovacao_metadata).toBeUndefined();
      expect(resultado.usuario.justificativa_aprovacao).toBeUndefined();
      expect(resultado.dados.codigo_aprovacao).toBeUndefined();
      expect(resultado.usuario.nome).toBe('João');
      expect(resultado.dados.valor).toBe(100);
    });

    it('deve filtrar metadados em arrays', () => {
      const bodyComArray = [
        {
          nome: 'Item 1',
          _aprovacao_metadata: { test: 'value' }
        },
        {
          nome: 'Item 2',
          justificativa_aprovacao: 'teste'
        }
      ];

      const metodoPrivado = service['filtrarMetadadosAprovacao'].bind(service);
      const resultado = metodoPrivado(bodyComArray);

      expect(resultado[0]._aprovacao_metadata).toBeUndefined();
      expect(resultado[1].justificativa_aprovacao).toBeUndefined();
      expect(resultado[0].nome).toBe('Item 1');
      expect(resultado[1].nome).toBe('Item 2');
    });

    it('deve retornar valores primitivos inalterados', () => {
      const metodoPrivado = service['filtrarMetadadosAprovacao'].bind(service);
      
      expect(metodoPrivado('string')).toBe('string');
      expect(metodoPrivado(123)).toBe(123);
      expect(metodoPrivado(true)).toBe(true);
      expect(metodoPrivado(null)).toBe(null);
      expect(metodoPrivado(undefined)).toBe(undefined);
    });
  });
});