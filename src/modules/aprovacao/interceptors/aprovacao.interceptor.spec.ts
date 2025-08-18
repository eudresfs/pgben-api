import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, BadRequestException, Logger } from '@nestjs/common';
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

  // Mock do Logger para testar logging detalhado
  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockRequest = {
    method: 'POST',
    url: '/api/test',
    user: { id: 1, perfil: 'ADMIN' },
    body: {},
    params: {},
    query: {}
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
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
        {
          provide: Logger,
          useValue: mockLogger,
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

  describe('Inicialização e Injeção de Dependências', () => {
    it('deve ser definido corretamente', () => {
      expect(interceptor).toBeDefined();
    });

    it('deve ter todas as dependências injetadas no construtor', () => {
      expect(reflector).toBeDefined();
      expect(aprovacaoService).toBeDefined();
    });

    it('deve registrar log de inicialização', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('AprovacaoInterceptor inicializado')
      );
    });

    it('deve verificar dependências críticas corretamente', () => {
      // Usar reflexão para acessar método privado para teste
      const result = (interceptor as any).verificarDependenciasCriticas();
      expect(result).toBe(true);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Iniciando verificação de dependências críticas',
        undefined
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Todas as dependências críticas estão disponíveis',
        expect.objectContaining({
          reflector: true,
          aprovacaoService: true,
          timestamp: expect.any(String)
        })
      );
    });

    it('deve detectar falha quando Reflector não está disponível', () => {
       // Simular interceptor com dependência nula
       const interceptorComFalha = new AprovacaoInterceptor(null, aprovacaoService, mockLogger as any);
       const result = (interceptorComFalha as any).verificarDependenciasCriticas();
       
       expect(result).toBe(false);
     });

     it('deve detectar falha quando AprovacaoService não está disponível', () => {
       // Simular interceptor com dependência nula
       const interceptorComFalha = new AprovacaoInterceptor(reflector, null, mockLogger as any);
       const result = (interceptorComFalha as any).verificarDependenciasCriticas();
       
       expect(result).toBe(false);
     });
  });

  describe('Logging Detalhado e Seguro', () => {
    it('safeWarn deve usar logger e fallback para console', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Teste com logger funcionando
      (interceptor as any).safeWarn('Teste warning', { context: 'test' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Teste warning',
        { context: 'test' }
      );

      // Teste com logger falhando
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger falhou');
      });
      
      (interceptor as any).safeWarn('Teste warning fallback', { context: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Teste warning fallback',
        { context: 'test' }
      );
      
      consoleSpy.mockRestore();
    });

    it('safeError deve usar logger e fallback para console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Teste com logger funcionando
      (interceptor as any).safeError('Teste error', { error: 'test' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Teste error',
        { error: 'test' }
      );

      // Teste com logger falhando
      mockLogger.error.mockImplementationOnce(() => {
        throw new Error('Logger falhou');
      });
      
      (interceptor as any).safeError('Teste error fallback', { error: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Teste error fallback',
        { error: 'test' }
      );
      
      consoleSpy.mockRestore();
    });

    it('safeInfo deve registrar logs informativos', () => {
      (interceptor as any).safeInfo('Teste info', { context: 'test' });
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Teste info',
        { context: 'test' }
      );
    });

    it('safeDebug deve registrar logs de debug', () => {
      (interceptor as any).safeDebug('Teste debug', { context: 'test' });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AprovacaoInterceptor] Teste debug',
        { context: 'test' }
      );
    });
  });

  describe('Tratamento de Erros Críticos', () => {
    it('deve bloquear execução quando dependências críticas falham', async () => {
       // Simular falha na verificação de dependências
       const interceptorComFalha = new AprovacaoInterceptor(null, aprovacaoService, mockLogger as any);
       
       await expect(async () => {
         const observable = await interceptorComFalha.intercept(mockExecutionContext as any, mockCallHandler as any);
         return firstValueFrom(observable);
       }).rejects.toThrow(BadRequestException);
       
       expect(mockCallHandler.handle).not.toHaveBeenCalled();
     });

    it('deve registrar logs detalhados em caso de erro crítico', async () => {
       // Simular erro no reflector
       mockReflector.get.mockImplementation(() => {
         throw new Error('Erro crítico no Reflector');
       });

       await expect(async () => {
         const observable = await interceptor.intercept(mockExecutionContext as any, mockCallHandler as any);
         return firstValueFrom(observable);
       }).rejects.toThrow(BadRequestException);
       
       expect(mockLogger.error).toHaveBeenCalledWith(
         '[AprovacaoInterceptor] Erro crítico no interceptor de aprovação: Erro crítico no Reflector',
         expect.any(String)
       );
     });
  });

  describe('Medição de Performance', () => {
    it('deve medir tempo de processamento da interceptação', async () => {
       mockReflector.get.mockReturnValue(false);
       
       await interceptor.intercept(mockExecutionContext as any, mockCallHandler as any);

       expect(mockLogger.log).toHaveBeenCalledWith(
         '[AprovacaoInterceptor] Iniciando interceptação de aprovação',
         expect.objectContaining({
           method: 'POST',
           url: '/api/test',
           userId: 1,
           timestamp: expect.any(String),
           requestId: 'unknown'
         })
       );
     });
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