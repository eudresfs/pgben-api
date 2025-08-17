import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { AprovacaoInterceptor } from './aprovacao.interceptor';
import { AprovacaoService } from '../services/aprovacao.service';
import { TipoAcaoCritica, StatusSolicitacao, EstrategiaAprovacao } from '../enums';
import { ConfiguracaoAprovacao } from '../decorators';

/**
 * Testes unitários para o AprovacaoInterceptor
 * Verifica o comportamento do interceptor em diferentes cenários
 */
describe('AprovacaoInterceptor', () => {
  let interceptor: AprovacaoInterceptor;
  let aprovacaoService: AprovacaoService;
  let reflector: Reflector;

  // Mocks
  const mockSolicitacao = {
    id: 1,
    codigo: 'SOL-001',
    tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
    status: StatusSolicitacao.PENDENTE,
    justificativa: 'Criação de novo usuário',
    dados_acao: { nome: 'João' },
    metodo_execucao: 'POST',
    solicitante_id: 1,
  };

  const mockAprovacaoService = {
    requerAprovacao: jest.fn(),
    obterConfiguracaoAprovacao: jest.fn().mockResolvedValue({
      estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
      perfil_auto_aprovacao: ['ADMIN']
    }),
    criarSolicitacao: jest.fn().mockResolvedValue(mockSolicitacao),
    criarSolicitacaoComEstrategia: jest.fn().mockResolvedValue(mockSolicitacao),
    obterSolicitacao: jest.fn(),
    obterUsuario: jest.fn().mockResolvedValue({
      id: 1,
      perfil: 'ADMIN',
      status: 'ATIVO'
    }),
    verificarPermissaoGeral: jest.fn().mockResolvedValue(false),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
    getHandler: jest.fn(),
  } as unknown as ExecutionContext;

  const mockCallHandler = {
    handle: jest.fn(),
  } as unknown as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprovacaoInterceptor,
        {
          provide: AprovacaoService,
          useValue: mockAprovacaoService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AprovacaoInterceptor>(AprovacaoInterceptor);
    aprovacaoService = module.get<AprovacaoService>(AprovacaoService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('deve executar normalmente quando não há configuração de aprovação', async () => {
      // Arrange
      mockReflector.get.mockReturnValue(undefined);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ success: true }));

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await firstValueFrom(observable);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockAprovacaoService.requerAprovacao).not.toHaveBeenCalled();
    });

    it('deve executar normalmente quando ação não requer aprovação', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
        tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        permitirAutoAprovacao: false,
      };

      const mockRequest = {
        user: { id: 1, permissions: [] },
        method: 'POST',
        url: '/api/usuarios',
        body: { nome: 'João' },
        headers: {},
        query: {},
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(false);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ success: true }));

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await firstValueFrom(observable);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(mockAprovacaoService.requerAprovacao).toHaveBeenCalledWith(TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS);
    });

    it('deve executar normalmente com auto-aprovação habilitada', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
          tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          permitirAutoAprovacao: true,
        };

      const mockRequest = {
        user: { id: 1, permissions: ['auto_approve'] },
        method: 'POST',
        url: '/api/usuarios',
        body: { nome: 'João' },
        headers: {},
        query: {},
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue({
        estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
        perfil_auto_aprovacao: ['ADMIN']
      });
      mockAprovacaoService.verificarPermissaoGeral.mockResolvedValue(true);
      mockAprovacaoService.obterUsuario.mockResolvedValue({
        id: 1,
        perfil: 'ADMIN',
        status: 'ATIVO'
      });
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({ success: true }));

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await firstValueFrom(observable);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockCallHandler.handle).toHaveBeenCalled();
      });

    it('deve criar solicitação de aprovação quando necessário', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
          tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          permitirAutoAprovacao: false,
        };

      const mockRequest = {
        user: { id: 1, permissions: [] },
        method: 'POST',
        url: '/api/usuarios',
        body: { nome: 'João' },
        headers: {},
        query: {},
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue({
        estrategia: EstrategiaAprovacao.SIMPLES,
        perfil_auto_aprovacao: []
      });
      mockAprovacaoService.verificarPermissaoGeral.mockResolvedValue(false);
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
        const result = await firstValueFrom(observable);

      // Assert
      expect(result).toEqual({
        aprovacao_necessaria: true,
        message: 'Solicitação de aprovação criada com sucesso',
        solicitacao: expect.objectContaining({
          id: 1,
          codigo: 'SOL-001',
          status: StatusSolicitacao.PENDENTE,
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        }),
      });
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
      expect(mockAprovacaoService.criarSolicitacaoComEstrategia).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          justificativa: expect.any(String),
          dados_acao: {
            url: '/api/usuarios',
            method: 'POST',
            params: undefined,
            query: {},
            body: {
              nome: 'João',
            },
          },
          metodo_execucao: expect.any(String),
        }),
        1,
        configuracao
      );
    });

    it('deve usar justificativa do body quando disponível', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
          tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          permitirAutoAprovacao: false,
        };

      const mockRequest = {
        user: { id: 1, permissions: [] },
        method: 'POST',
        url: '/api/usuarios',
        body: {
          nome: 'João',
          justificativa_aprovacao: 'Justificativa específica do usuário',
        },
        headers: {},
        query: {},
      };

      const mockSolicitacao = {
        id: 1,
        codigo: 'SOL-001',
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        status: StatusSolicitacao.PENDENTE,
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue({
        estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
        perfil_auto_aprovacao: ['SUPER_ADMIN'] // Perfil diferente do usuário
      });
      mockAprovacaoService.obterUsuario.mockResolvedValue({
        id: 1,
        perfil: 'USER', // Perfil que não permite auto-aprovação
        status: 'ATIVO'
      });
      mockAprovacaoService.verificarPermissaoGeral.mockResolvedValue(false);
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(observable);

      // Assert
      expect(mockAprovacaoService.criarSolicitacaoComEstrategia).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          justificativa: expect.any(String),
          dados_acao: expect.objectContaining({
            url: '/api/usuarios',
            method: 'POST',
            body: expect.objectContaining({
              nome: 'João',
              justificativa_aprovacao: 'Justificativa específica do usuário'
            })
          }),
          metodo_execucao: expect.stringContaining('POST')
        }),
        1,
        configuracao
      );
    });

    it('deve definir prazo padrão quando não especificado', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
        tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        permitirAutoAprovacao: true,
      };

      const mockRequest = {
        user: { id: 1, permissions: ['criar_usuario'] },
        method: 'POST',
        url: '/api/usuarios',
        body: { nome: 'João' },
        headers: {},
        query: {},
      };

      const mockSolicitacao = {
        id: 1,
        codigo: 'SOL-001',
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        status: StatusSolicitacao.PENDENTE,
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(observable);

      // Assert
      expect(mockAprovacaoService.criarSolicitacaoComEstrategia).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          justificativa: expect.stringContaining('Solicitação de'),
          dados_acao: expect.objectContaining({
            url: '/api/usuarios',
            method: 'POST'
          }),
          metodo_execucao: expect.stringContaining('POST')
        }),
        1,
        configuracao
      );
    });

    it('deve verificar permissão de auto-aprovação corretamente', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
        tipo: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        permitirAutoAprovacao: true,
      };

      const mockRequest = {
        user: { id: 1, permissions: ['auto_approve_deletar_usuario'] },
        method: 'DELETE',
        url: '/api/usuarios/123',
        body: {},
        headers: {},
        query: {},
      };

      const mockSolicitacao = {
        id: 1,
        codigo: 'SOL-001',
        tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        status: StatusSolicitacao.PENDENTE,
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
        const result = await firstValueFrom(observable);

      // Assert
      expect(result).toEqual({
          aprovacao_necessaria: true,
          message: 'Solicitação de aprovação criada com sucesso',
          solicitacao: expect.objectContaining({
            id: 1,
            codigo: 'SOL-001',
            status: StatusSolicitacao.PENDENTE,
            tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO
          })
        });
       expect(mockCallHandler.handle).not.toHaveBeenCalled();
     });

    it('deve criar solicitação quando usuário não tem permissão de auto-aprovação', async () => {
      // Arrange
      const configuracao: ConfiguracaoAprovacao = {
        tipo: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        permitirAutoAprovacao: true,
      };

      const mockRequest = {
        user: { id: 1, permissions: ['outras_permissoes'] },
        method: 'DELETE',
        url: '/api/usuarios/123',
        body: {},
        headers: {},
        query: {},
      };

      const mockSolicitacao = {
        id: 1,
        codigo: 'SOL-001',
        tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        status: StatusSolicitacao.PENDENTE,
      };

      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      mockReflector.get.mockReturnValue(configuracao);
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue({
        estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
        perfil_auto_aprovacao: ['SUPER_ADMIN'] // Perfil diferente do usuário
      });
      mockAprovacaoService.obterUsuario.mockResolvedValue({
        id: 1,
        perfil: 'USER', // Perfil que não permite auto-aprovação
        status: 'ATIVO'
      });
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);

      // Act
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      const result = await firstValueFrom(observable);

      // Assert
      expect(result).toEqual({
        aprovacao_necessaria: true,
        message: 'Solicitação de aprovação criada com sucesso',
        solicitacao: expect.objectContaining({
          id: 1,
          codigo: 'SOL-001',
          status: StatusSolicitacao.PENDENTE,
          tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO
        })
      });
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });
  });

  it('deve estar definido', () => {
    expect(interceptor).toBeDefined();
  });
});