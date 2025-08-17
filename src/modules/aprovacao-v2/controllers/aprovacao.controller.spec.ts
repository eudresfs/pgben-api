import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AprovacaoController } from './aprovacao.controller';
import { AprovacaoService } from '../services';
import { CriarSolicitacaoDto, ProcessarAprovacaoDto } from '../dtos';
import { TipoAcaoCritica, StatusSolicitacao, EstrategiaAprovacao } from '../enums';

/**
 * Mock do AprovacaoService
 */
const mockAprovacaoService = {
  criarSolicitacao: jest.fn(),
  listarSolicitacoes: jest.fn(),
  obterSolicitacao: jest.fn(),
  processarAprovacao: jest.fn(),
  listarSolicitacoesPendentes: jest.fn(),
  cancelarSolicitacao: jest.fn(),
};

/**
 * Mock do request com usuário
 */
const mockRequest = {
  user: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    roles: ['CIDADAO']
  }
};

/**
 * Mock de solicitação
 */
const mockSolicitacao = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  codigo: 'SOL-2024-001',
  status: StatusSolicitacao.PENDENTE,
  solicitante_id: '123e4567-e89b-12d3-a456-426614174000',
  justificativa: 'Teste de aprovação',
  dados_acao: { teste: 'dados' },
  metodo_execucao: 'POST /api/test',
  prazo_aprovacao: null,
  criado_em: new Date(),
  atualizado_em: new Date(),
  acao_aprovacao_id: 'acao-123',
  acao_aprovacao: {
      id: 'acao-123',
      tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
      nome: 'Exclusão de Registro',
      descricao: 'Ação para exclusão de registros',
      estrategia: EstrategiaAprovacao.SIMPLES,
      min_aprovadores: 1,
      ativo: true,
      criado_em: new Date(),
      atualizado_em: new Date(),
      solicitacoes: [],
      aprovadores: []
    },
  aprovadores: [],
  calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
  podeSerAprovada: jest.fn().mockReturnValue(false),
  foiRejeitada: jest.fn().mockReturnValue(false)
};

describe('AprovacaoController', () => {
  let controller: AprovacaoController;
  let service: jest.Mocked<AprovacaoService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AprovacaoController],
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
    .overrideGuard(require('../../../auth/guards/jwt-auth.guard').JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(require('../../../auth/guards/permission.guard').PermissionGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(require('../../../auth/guards/roles.guard').RolesGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<AprovacaoController>(AprovacaoController);
    service = module.get<AprovacaoService>(AprovacaoService) as jest.Mocked<AprovacaoService>;

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('criarSolicitacao', () => {
    it('should create a new approval request', async () => {
      const dto: CriarSolicitacaoDto = {
        tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        justificativa: 'Teste de criação',
        dados_acao: { userId: '123' },
        metodo_execucao: 'DELETE /api/users/123'
      };

      service.criarSolicitacao.mockResolvedValue(mockSolicitacao);

      const result = await controller.criarSolicitacao(dto, mockRequest);

      expect(service.criarSolicitacao).toHaveBeenCalledWith(
        dto,
        mockRequest.user.id
      );
      expect(result).toEqual({
        message: 'Solicitação de aprovação criada com sucesso',
        data: mockSolicitacao
      });
    });

    it('should throw BadRequestException when service throws', async () => {
      const dto: CriarSolicitacaoDto = {
        tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        justificativa: 'Teste de criação',
        dados_acao: { userId: '123' },
        metodo_execucao: 'DELETE /api/users/123'
      };

      service.criarSolicitacao.mockRejectedValue(
        new BadRequestException('Erro na criação')
      );

      await expect(controller.criarSolicitacao(dto, mockRequest))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('listarSolicitacoes', () => {
    it('should list approval requests', async () => {
      const mockResult = {
        solicitacoes: [mockSolicitacao],
        total: 1
      };

      service.listarSolicitacoes.mockResolvedValue(mockResult);

      const result = await controller.listarSolicitacoes(
        mockRequest,
        StatusSolicitacao.PENDENTE,
        undefined,
        undefined,
        1,
        10
      );

      expect(service.listarSolicitacoes).toHaveBeenCalledWith(
        { status: StatusSolicitacao.PENDENTE },
        { page: 1, limit: 10 },
        mockRequest.user.id
      );
      expect(result).toEqual({
        message: 'Solicitações listadas com sucesso',
        data: mockResult.solicitacoes,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });
  });

  describe('obterSolicitacao', () => {
    it('should get a specific approval request', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      
      service.obterSolicitacao.mockResolvedValue(mockSolicitacao);

      const result = await controller.obterSolicitacao(id);

      expect(service.obterSolicitacao).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        message: 'Solicitação encontrada',
        data: mockSolicitacao
      });
    });

    it('should throw NotFoundException when request not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      
      service.obterSolicitacao.mockRejectedValue(
        new NotFoundException('Solicitação não encontrada')
      );

      await expect(controller.obterSolicitacao(id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('processarAprovacao', () => {
    it('should process approval (approve)', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      const dto: ProcessarAprovacaoDto = {
        aprovado: true,
        justificativa: 'Aprovado'
      };

      const mockProcessedSolicitacao = {
        ...mockSolicitacao,
        status: StatusSolicitacao.APROVADA
      };

      service.processarAprovacao.mockResolvedValue(mockProcessedSolicitacao);

      const result = await controller.processarAprovacao(id, dto, mockRequest);

      expect(service.processarAprovacao).toHaveBeenCalledWith(
        id,
        mockRequest.user.id,
        dto.aprovado,
        dto.justificativa,
        dto.anexos
      );
      expect(result).toEqual({
        message: 'Solicitação aprovada com sucesso',
        data: mockProcessedSolicitacao
      });
    });

    it('should process approval (reject)', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      const dto: ProcessarAprovacaoDto = {
        aprovado: false,
        justificativa: 'Rejeitado'
      };

      const mockProcessedSolicitacao = {
        ...mockSolicitacao,
        status: StatusSolicitacao.REJEITADA
      };

      service.processarAprovacao.mockResolvedValue(mockProcessedSolicitacao);

      const result = await controller.processarAprovacao(id, dto, mockRequest);

      expect(service.processarAprovacao).toHaveBeenCalledWith(
        id,
        mockRequest.user.id,
        dto.aprovado,
        dto.justificativa,
        dto.anexos
      );
      expect(result).toEqual({
        message: 'Solicitação rejeitada com sucesso',
        data: mockProcessedSolicitacao
      });
    });

    it('should throw BadRequestException when already processed', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      const dto: ProcessarAprovacaoDto = {
        aprovado: true,
        justificativa: 'Aprovado'
      };

      service.processarAprovacao.mockRejectedValue(
        new BadRequestException('Solicitação já foi processada')
      );

      await expect(controller.processarAprovacao(id, dto, mockRequest))
        .rejects.toThrow(BadRequestException);
    });
  });
});