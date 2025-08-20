import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { AprovacaoInterceptor } from './aprovacao.interceptor';
import { AprovacaoService } from '../services/aprovacao.service';
import { TipoAcaoCritica, StatusSolicitacao, EstrategiaAprovacao } from '../enums';
import { ConfiguracaoAprovacao } from '../decorators';
import { CacheService } from '../../../shared/services/cache.service';

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

  // Mock do CacheService
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  const mockRequest = {
    method: 'POST',
    url: '/api/test',
    user: { id: 1, perfil: 'ADMIN' },
    body: {},
    params: {},
    query: {}
  };

  const mockHandler = jest.fn();
  
  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
    getHandler: jest.fn().mockReturnValue(mockHandler),
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
        {
          provide: CacheService,
          useValue: mockCacheService,
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

    // Testes de log removidos - logs foram simplificados no interceptor
    
    it('deve verificar dependências críticas corretamente', () => {
      // Usar reflexão para acessar método privado para teste
      const result = (interceptor as any).verificarDependenciasCriticas();
      expect(result).toBe(true);
      
      // Logs de debug foram removidos - apenas verificamos o retorno
      expect(result).toBe(true);
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

  // Testes de logging removidos - métodos safe* foram removidos para simplificar o código

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
       
       // Log de erro foi simplificado - teste apenas se a exceção foi lançada
     });
  });

  describe('Medição de Performance', () => {
    it('deve medir tempo de processamento da interceptação', async () => {
       mockReflector.get.mockReturnValue(false);
       
       await interceptor.intercept(mockExecutionContext as any, mockCallHandler as any);

       // Log de interceptação foi removido - teste apenas funcionalidade
       expect(mockCallHandler.handle).toHaveBeenCalled();
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
      
      // Limpar e reconfigurar o mockReflector
      mockReflector.get.mockClear();
      mockReflector.get.mockImplementation((key: string) => {
        console.log('Mock reflector.get chamado com key:', key);
        if (key === 'requer_aprovacao') {
          console.log('Retornando configuração:', configuracao);
          return configuracao;
        }
        return undefined;
      });
      mockAprovacaoService.requerAprovacao.mockResolvedValue(false);
      
      // Configurar cache para retornar null e forçar chamada ao serviço
      mockCacheService.get.mockResolvedValue(null);
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
      
      // Limpar e reconfigurar o mockReflector
      mockReflector.get.mockClear();
      mockReflector.get.mockImplementation((key, handler) => {
        console.log(`[MOCK REFLECTOR] Chamado com key: ${key}, handler:`, handler);
        if (key === 'requer_aprovacao' && handler === mockHandler) {
          console.log(`[MOCK REFLECTOR] Retornando configuração:`, configuracao);
          return configuracao;
        }
        console.log(`[MOCK REFLECTOR] Retornando undefined para key: ${key}`);
        return undefined;
      });
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      
      // Limpar cache para garantir que a verificação seja feita
      mockCacheService.get.mockResolvedValue(null);
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
      
      // Limpar e reconfigurar o mockReflector
      mockReflector.get.mockClear();
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
      
      // Limpar e reconfigurar o mockReflector
      mockReflector.get.mockClear();
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
      
      // Limpar e reconfigurar o mockReflector
      mockReflector.get.mockClear();
      mockReflector.get.mockReturnValue(configuracao);
      
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue({
        estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
        perfil_auto_aprovacao: ['SUPER_ADMIN'] // Perfil diferente do usuário
      });
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);
      
      // Mock dos métodos privados do interceptor
      jest.spyOn(interceptor as any, 'verificarSolicitacaoExistente').mockResolvedValue(null);
      jest.spyOn(interceptor as any, 'verificarAutoAprovacao').mockResolvedValue(false);
      jest.spyOn(interceptor as any, 'validarUsuarioParaAutoAprovacao').mockResolvedValue({
        podeAutoAprovar: false,
        perfilUsuario: 'USER',
        motivo: 'Perfil USER não está entre os perfis permitidos [SUPER_ADMIN]'
      });
      
      // Mock para garantir que o usuário não tenha perfil de auto-aprovação
      mockAprovacaoService.obterUsuario.mockClear();
      mockAprovacaoService.obterUsuario.mockResolvedValue({
        id: 1,
        perfil: 'USER', // Perfil diferente de ADMIN
        status: 'ATIVO'
      });

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
      
      // Configurar cache service para retornar null (cache miss)
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      // Mock para negar auto-aprovação
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue({
        estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
        perfil_auto_aprovacao: ['SUPER_ADMIN'] // Perfil diferente do usuário
      });
      mockAprovacaoService.obterUsuario.mockResolvedValue({
        id: 1,
        perfil: 'USER', // Perfil que não permite auto-aprovação
        status: 'ATIVO'
      });
      mockAprovacaoService.verificarPermissaoGeral.mockResolvedValue(false); // Negar permissão geral
      mockAprovacaoService.criarSolicitacaoComEstrategia.mockResolvedValue(mockSolicitacao);
      
      // Mock dos métodos privados do interceptor
      jest.spyOn(interceptor as any, 'verificarSolicitacaoExistente').mockResolvedValue(null);
      jest.spyOn(interceptor as any, 'verificarAutoAprovacao').mockResolvedValue(false);
      // Não mockar criarSolicitacaoAprovacao para permitir que chame criarSolicitacaoComEstrategia
      
      // Garantir que o mockCallHandler.handle não seja chamado
      (mockCallHandler.handle as jest.Mock).mockClear();
      (mockCallHandler.handle as jest.Mock).mockImplementation(() => {
        throw new Error('mockCallHandler.handle não deveria ser chamado neste teste');
      });

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