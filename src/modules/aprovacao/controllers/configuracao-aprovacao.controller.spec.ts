import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfiguracaoAprovacaoController } from './configuracao-aprovacao.controller';
import { AprovacaoService } from '../services';
import { CriarAcaoAprovacaoDto } from '../dtos';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { Status } from '../../../enums/status.enum';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

/**
 * Testes unitários para o ConfiguracaoAprovacaoController
 * Verifica o comportamento dos endpoints de configuração de aprovação
 */
describe('ConfiguracaoAprovacaoController', () => {
  let controller: ConfiguracaoAprovacaoController;
  let aprovacaoService: AprovacaoService;

  // Mock do AprovacaoService
  const mockAprovacaoService = {
    criarAcaoAprovacao: jest.fn(),
    listarAcoesAprovacao: jest.fn(),
    obterAcaoAprovacao: jest.fn(),
    atualizarAcaoAprovacao: jest.fn(),
    removerAcaoAprovacao: jest.fn(),
    adicionarAprovador: jest.fn(),
    listarAprovadores: jest.fn(),
    removerAprovador: jest.fn(),
    requerAprovacao: jest.fn(),
    obterConfiguracaoAprovacao: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfiguracaoAprovacaoController],
      providers: [
        {
          provide: AprovacaoService,
          useValue: mockAprovacaoService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: 'PermissionService',
          useValue: {
            hasPermission: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PermissionGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<ConfiguracaoAprovacaoController>(ConfiguracaoAprovacaoController);
    aprovacaoService = module.get<AprovacaoService>(AprovacaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criarConfiguracao', () => {
    it('deve criar configuração de aprovação com sucesso', async () => {
      // Arrange
      const dto: CriarAcaoAprovacaoDto = {
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        nome: 'Criação de Usuário',
        descricao: 'Aprovação para criação de novos usuários',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2,
        status: Status.ATIVO,
      };

      const mockAcaoAprovacao = {
        id: '1',
        ...dto,
        criado_em: new Date(),
        atualizado_em: new Date(),
      };

      mockAprovacaoService.criarAcaoAprovacao.mockResolvedValue(mockAcaoAprovacao);

      // Act
      const resultado = await controller.criarConfiguracao(dto);

      // Assert
      expect(resultado.message).toBe('Configuração de aprovação criada com sucesso');
      expect(resultado.data).toEqual(mockAcaoAprovacao);
      expect(mockAprovacaoService.criarAcaoAprovacao).toHaveBeenCalledWith(dto);
    });

    it('deve propagar erro do serviço', async () => {
      // Arrange
      const dto: CriarAcaoAprovacaoDto = {
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        nome: 'Teste',
        descricao: 'Teste',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 1,
        status: Status.ATIVO,
      };

      const erro = new BadRequestException('Erro na validação');
      mockAprovacaoService.criarAcaoAprovacao.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.criarConfiguracao(dto)).rejects.toThrow(erro);
    });
  });

  describe('listarConfiguracoes', () => {
    it('deve listar todas as configurações de aprovação', async () => {
      // Arrange
      const mockConfiguracoes = [
        {
          id: '1',
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          nome: 'Criação de Usuário',
          estrategia: EstrategiaAprovacao.MAIORIA,
          min_aprovadores: 2,
          status: Status.ATIVO,
        },
        {
          id: '2',
          tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
          nome: 'Exclusão de Usuário',
          estrategia: EstrategiaAprovacao.MAIORIA,
          min_aprovadores: 3,
          status: Status.ATIVO,
        },
      ];

      mockAprovacaoService.listarAcoesAprovacao.mockResolvedValue(mockConfiguracoes);

      // Act
      const resultado = await controller.listarConfiguracoes();

      // Assert
      expect(resultado.message).toBe('Configurações listadas com sucesso');
      expect(resultado.data).toEqual(mockConfiguracoes);
      expect(mockAprovacaoService.listarAcoesAprovacao).toHaveBeenCalled();
    });

    it('deve retornar lista vazia quando não há configurações', async () => {
      // Arrange
      mockAprovacaoService.listarAcoesAprovacao.mockResolvedValue([]);

      // Act
      const resultado = await controller.listarConfiguracoes();

      // Assert
      expect(resultado.data).toEqual([]);
    });
  });

  describe('obterConfiguracao', () => {
    it('deve retornar configuração por ID', async () => {
      // Arrange
      const acaoId = '1';
      const mockConfiguracao = {
        id: acaoId,
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        nome: 'Criação de Usuário',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2,
        status: Status.ATIVO,
        aprovadores: [
          {
            id: '1',
            usuario_id: '2',
            status: Status.ATIVO,
          },
        ],
      };

      mockAprovacaoService.obterAcaoAprovacao.mockResolvedValue(mockConfiguracao);

      // Act
      const resultado = await controller.obterConfiguracao(acaoId);

      // Assert
      expect(resultado.message).toBe('Configuração encontrada');
      expect(resultado.data).toEqual(mockConfiguracao);
      expect(mockAprovacaoService.obterAcaoAprovacao).toHaveBeenCalledWith(acaoId);
    });

    it('deve lançar erro quando configuração não encontrada', async () => {
      // Arrange
      const acaoId = '999';
      const erro = new NotFoundException('Configuração não encontrada');

      mockAprovacaoService.obterAcaoAprovacao.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.obterConfiguracao(acaoId)).rejects.toThrow(erro);
    });
  });

  describe('atualizarConfiguracao', () => {
    it('deve atualizar configuração com sucesso', async () => {
      // Arrange
      const acaoId = '1';
      const dto: Partial<CriarAcaoAprovacaoDto> = {
        nome: 'Nome Atualizado',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 3,
      };

     const mockConfiguracaoAtualizada = {
          id: acaoId,
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          nome: 'Nome Atualizado',
          estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 3,
        status: Status.ATIVO,
        atualizado_em: new Date(),
      };

      mockAprovacaoService.atualizarAcaoAprovacao.mockResolvedValue(mockConfiguracaoAtualizada);

      // Act
      const resultado = await controller.atualizarConfiguracao(acaoId, dto);

      // Assert
      expect(resultado.message).toBe('Configuração atualizada com sucesso');
      expect(resultado.data).toEqual(mockConfiguracaoAtualizada);
      expect(mockAprovacaoService.atualizarAcaoAprovacao).toHaveBeenCalledWith(acaoId, dto);
    });

    it('deve propagar erro quando configuração não encontrada', async () => {
      // Arrange
      const acaoId = '999';
      const dto: Partial<CriarAcaoAprovacaoDto> = {
        nome: 'Teste',
      };

      const erro = new NotFoundException('Configuração não encontrada');
      mockAprovacaoService.atualizarAcaoAprovacao.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.atualizarConfiguracao(acaoId, dto)).rejects.toThrow(erro);
    });
  });

  describe('removerConfiguracao', () => {
    it('deve remover configuração com sucesso', async () => {
      // Arrange
      const acaoId = '1';
      mockAprovacaoService.removerAcaoAprovacao.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.removerConfiguracao(acaoId);

      // Assert
      expect(resultado.message).toBe('Configuração removida com sucesso');
      expect(mockAprovacaoService.removerAcaoAprovacao).toHaveBeenCalledWith(acaoId);
    });

    it('deve propagar erro quando configuração não encontrada', async () => {
      // Arrange
      const acaoId = '999';
      const erro = new NotFoundException('Configuração não encontrada');

      mockAprovacaoService.removerAcaoAprovacao.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.removerConfiguracao(acaoId)).rejects.toThrow(erro);
    });
  });

  describe('adicionarAprovador', () => {
    it('deve adicionar aprovador com sucesso', async () => {
      // Arrange
      const acaoId = '1';
      const usuarioId = '2';

      const mockAprovador = {
        id: '1',
        acao_aprovacao_id: acaoId,
        usuario_id: usuarioId,
        status: Status.ATIVO,
        criado_em: new Date(),
      };

      mockAprovacaoService.adicionarAprovador.mockResolvedValue(mockAprovador);

      // Act
      const resultado = await controller.adicionarAprovador(acaoId, usuarioId);

      // Assert
      expect(resultado.message).toBe('Aprovador adicionado com sucesso');
      expect(resultado.data).toEqual(mockAprovador);
      expect(mockAprovacaoService.adicionarAprovador).toHaveBeenCalledWith(acaoId, usuarioId);
    });

    it('deve propagar erro quando aprovador já existe', async () => {
      // Arrange
      const acaoId = '1';
      const usuarioId = '2';
      const erro = new BadRequestException('Aprovador já existe');

      mockAprovacaoService.adicionarAprovador.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.adicionarAprovador(acaoId, usuarioId))
        .rejects.toThrow(erro);
    });
  });

  describe('listarAprovadores', () => {
    it('deve listar aprovadores de uma configuração', async () => {
      // Arrange
      const acaoId = '1';
      const mockAprovadores = [
        {
          id: '1',
          acao_aprovacao_id: acaoId,
          usuario_id: '1',
          status: Status.ATIVO,
        },
        {
          id: '2',
          acao_aprovacao_id: acaoId,
          usuario_id: '2',
          status: Status.ATIVO,
        },
      ];

      mockAprovacaoService.listarAprovadores.mockResolvedValue(mockAprovadores);

      // Act
      const resultado = await controller.listarAprovadores(acaoId);

      // Assert
      expect(resultado.message).toBe('Aprovadores listados com sucesso');
      expect(resultado.data).toEqual(mockAprovadores);
      expect(mockAprovacaoService.listarAprovadores).toHaveBeenCalledWith(acaoId, undefined);
    });

    it('deve retornar lista vazia quando não há aprovadores', async () => {
      // Arrange
      const acaoId = '1';
      mockAprovacaoService.listarAprovadores.mockResolvedValue([]);

      // Act
      const resultado = await controller.listarAprovadores(acaoId);

      // Assert
      expect(resultado.message).toBe('Aprovadores listados com sucesso');
      expect(resultado.data).toEqual([]);
    });
  });

  describe('removerAprovador', () => {
    it('deve remover aprovador com sucesso', async () => {
      // Arrange
      const acaoId = '1';
      const aprovadorId = '1';
      const mockResultado = { message: 'Aprovador removido com sucesso' };

      mockAprovacaoService.removerAprovador.mockResolvedValue(mockResultado);

      // Act
      const resultado = await controller.removerAprovador(acaoId, aprovadorId);

      // Assert
      expect(resultado.message).toBe('Aprovador removido com sucesso');
      expect(mockAprovacaoService.removerAprovador).toHaveBeenCalledWith(acaoId, aprovadorId);
    });

    it('deve propagar erro quando aprovador não encontrado', async () => {
      // Arrange
      const acaoId = '1';
      const aprovadorId = '999';
      const erro = new NotFoundException('Aprovador não encontrado');

      mockAprovacaoService.removerAprovador.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.removerAprovador(acaoId, aprovadorId))
        .rejects.toThrow(erro);
    });
  });

  describe('verificarAprovacao', () => {
    it('deve retornar true quando ação requer aprovação', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS;
      const mockConfiguracao = {
        id: '1',
        tipo_acao: tipoAcao,
        nome: 'Teste',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2,
      };
      
      mockAprovacaoService.requerAprovacao.mockResolvedValue(true);
      mockAprovacaoService.obterConfiguracaoAprovacao.mockResolvedValue(mockConfiguracao);

      // Act
      const resultado = await controller.verificarAprovacao(tipoAcao);

      // Assert
      expect(resultado.message).toBe('Verificação realizada com sucesso');
      expect(resultado.data).toEqual({
        tipo_acao: tipoAcao,
        requer_aprovacao: true,
        configuracao: mockConfiguracao,
      });
      expect(mockAprovacaoService.requerAprovacao).toHaveBeenCalledWith(tipoAcao);
      expect(mockAprovacaoService.obterConfiguracaoAprovacao).toHaveBeenCalledWith(tipoAcao);
    });

    it('deve retornar false quando ação não requer aprovação', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS;
      mockAprovacaoService.requerAprovacao.mockResolvedValue(false);

      // Act
      const resultado = await controller.verificarAprovacao(tipoAcao);

      // Assert
      expect(resultado.message).toBe('Verificação realizada com sucesso');
      expect(resultado.data).toEqual({
        tipo_acao: tipoAcao,
        requer_aprovacao: false,
        configuracao: null,
      });
      expect(mockAprovacaoService.requerAprovacao).toHaveBeenCalledWith(tipoAcao);
    });
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });
});