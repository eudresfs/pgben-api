import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PagamentoAccessGuard } from '../../../guards/pagamento-access.guard';
import { PagamentoService } from '../../../services/pagamento.service';
import { IntegracaoSolicitacaoService } from '../../../services/integracao-solicitacao.service';
import { IntegracaoCidadaoService } from '../../../services/integracao-cidadao.service';
import {
  PERFIS_PERMITIDOS_KEY,
  VERIFICAR_UNIDADE_KEY,
} from '../../../decorators/pagamento-access.decorator';

/**
 * Testes unitários para PagamentoAccessGuard
 *
 * Valida o correto funcionamento do controle de acesso baseado em perfis
 * e unidades para recursos do módulo de pagamento.
 *
 * @author Equipe PGBen
 */
describe('PagamentoAccessGuard', () => {
  let guard: PagamentoAccessGuard;
  let pagamentoService: PagamentoService;
  let solicitacaoService: IntegracaoSolicitacaoService;
  let cidadaoService: IntegracaoCidadaoService;
  let reflector: Reflector;

  // Mocks para os testes
  const mockPagamento = {
    id: 'pagamento-id-1',
    solicitacaoId: 'solicitacao-id-1',
    valor: 500,
    status: 'LIBERADO',
  };

  const mockSolicitacaoStatus = {
    id: 'solicitacao-id-1',
    unidadeId: 'unidade-id-1',
    status: 'APROVADA',
  };

  const mockCidadao = {
    id: 'cidadao-id-1',
    nome: 'Maria Silva',
    cpf: '123.456.789-09',
    unidadeId: 'unidade-id-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoAccessGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PagamentoService,
          useValue: {
            findOneWithRelations: jest.fn().mockResolvedValue(mockPagamento),
            findOne: jest.fn().mockResolvedValue(mockPagamento),
          },
        },
        {
          provide: IntegracaoSolicitacaoService,
          useValue: {
            verificarSolicitacaoAprovada: jest
              .fn()
              .mockResolvedValue(mockSolicitacaoStatus),
          },
        },
        {
          provide: IntegracaoCidadaoService,
          useValue: {
            obterDadosPessoais: jest.fn().mockResolvedValue(mockCidadao),
          },
        },
      ],
    }).compile();

    guard = module.get<PagamentoAccessGuard>(PagamentoAccessGuard);
    reflector = module.get<Reflector>(Reflector);
    pagamentoService = module.get<PagamentoService>(PagamentoService);
    solicitacaoService = module.get<IntegracaoSolicitacaoService>(
      IntegracaoSolicitacaoService,
    );
    cidadaoService = module.get<IntegracaoCidadaoService>(
      IntegracaoCidadaoService,
    );
  });

  it('deve estar definido', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    // Mock do contexto de execução
    const mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            id: 'usuario-id-1',
            perfil: 'operador',
            unidadeId: 'unidade-id-1',
          },
          params: {
            pagamentoId: 'pagamento-id-1',
          },
          method: 'GET',
          route: {
            path: '/pagamentos/:pagamentoId',
          },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    it('deve permitir acesso quando usuário tem perfil permitido', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      // Act
      const resultado = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(resultado).toBeTruthy();
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        PERFIS_PERMITIDOS_KEY,
        [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
      );
    });

    it('deve negar acesso quando usuário não tem perfil permitido', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin']) // PERFIS_PERMITIDOS_KEY - apenas admin pode acessar
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      // Mudar o perfil do usuário para um não permitido
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'usuario-id-1',
              perfil: 'atendente', // Perfil não presente na lista de permitidos
              unidadeId: 'unidade-id-1',
            },
            params: {
              pagamentoId: 'pagamento-id-1',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve permitir acesso para admin independente da unidade', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      // Admin de outra unidade
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'usuario-id-1',
              perfil: 'admin', // Admin pode acessar qualquer unidade
              unidadeId: 'unidade-id-2', // Unidade diferente
            },
            params: {
              pagamentoId: 'pagamento-id-1',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Act
      const resultado = await guard.canActivate(mockContext);

      // Assert
      expect(resultado).toBeTruthy();
    });

    it('deve negar acesso quando usuário não é da mesma unidade', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      // Operador de outra unidade
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'usuario-id-1',
              perfil: 'operador',
              unidadeId: 'unidade-id-2', // Unidade diferente
            },
            params: {
              pagamentoId: 'pagamento-id-1',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar erro quando pagamento não existe', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      jest
        .spyOn(pagamentoService, 'findOneWithRelations')
        .mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar erro quando solicitação não existe', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      jest
        .spyOn(solicitacaoService, 'verificarSolicitacaoAprovada')
        .mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve validar acesso baseado em beneficiário', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      // Request com beneficiário
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'usuario-id-1',
              perfil: 'operador',
              unidadeId: 'unidade-id-1',
            },
            params: {
              beneficiarioId: 'cidadao-id-1', // Agora usamos um beneficiário em vez de pagamento
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Act
      const resultado = await guard.canActivate(mockContext);

      // Assert
      expect(resultado).toBeTruthy();
      expect(cidadaoService.obterDadosPessoais).toHaveBeenCalledWith(
        'cidadao-id-1',
      );
    });

    it('deve lançar erro quando beneficiário não existe', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(true); // VERIFICAR_UNIDADE_KEY

      jest.spyOn(cidadaoService, 'obterDadosPessoais').mockResolvedValue(null);

      // Request com beneficiário
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'usuario-id-1',
              perfil: 'operador',
              unidadeId: 'unidade-id-1',
            },
            params: {
              beneficiarioId: 'cidadao-inexistente',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve permitir acesso quando verificação de unidade está desativada', async () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(['admin', 'operador']) // PERFIS_PERMITIDOS_KEY
        .mockReturnValueOnce(false); // VERIFICAR_UNIDADE_KEY - desativado

      // Operador de outra unidade (normalmente seria negado)
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'usuario-id-1',
              perfil: 'operador',
              unidadeId: 'unidade-id-2', // Unidade diferente
            },
            params: {
              pagamentoId: 'pagamento-id-1',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Act
      const resultado = await guard.canActivate(mockContext);

      // Assert
      expect(resultado).toBeTruthy();
    });
  });
});
