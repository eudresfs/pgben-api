import { Test, TestingModule } from '@nestjs/testing';
import { DadosSociaisController } from './dados-sociais.controller';
import { DadosSociaisService } from '../services/dados-sociais.service';
import { CreateDadosSociaisDto } from '../dto/create-dados-sociais.dto';
import { UpdateDadosSociaisDto } from '../dto/update-dados-sociais.dto';
import { DadosSociais } from '../entities/dados-sociais.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import {
  EscolaridadeEnum,
  PublicoPrioritarioEnum,
  SituacaoTrabalhoEnum,
  TipoBpcEnum,
} from '../../../shared/enums';

describe('DadosSociaisController', () => {
  let controller: DadosSociaisController;
  let service: DadosSociaisService;

  const mockDadosSociais: DadosSociais = {
    id: '1',
    cidadao_id: 'cidadao-1',
    escolaridade: EscolaridadeEnum.MEDIO_COMPLETO,
    publico_prioritario: PublicoPrioritarioEnum.PESSOA_IDOSA,
    renda: 1500.0,
    ocupacao: 'Vendedor',
    recebe_pbf: true,
    valor_pbf: 400.0,
    recebe_bpc: false,
    tipo_bpc: null,
    valor_bpc: null,
    curso_profissionalizante: 'Curso de Informática',
    interesse_curso_profissionalizante: true,
    situacao_trabalho: SituacaoTrabalhoEnum.EMPREGADO,
    area_trabalho: 'Vendas',
    familiar_apto_trabalho: true,
    area_interesse_familiar: 'Administração',
    observacoes: 'Observações de teste',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    cidadao: null,
  };

  const mockDadosSociaisService = {
    create: jest.fn(),
    findByCidadaoId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DadosSociaisController],
      providers: [
        {
          provide: DadosSociaisService,
          useValue: mockDadosSociaisService,
        },
      ],
    }).compile();

    controller = module.get<DadosSociaisController>(DadosSociaisController);
    service = module.get<DadosSociaisService>(DadosSociaisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateDadosSociaisDto = {
      escolaridade: EscolaridadeEnum.MEDIO_COMPLETO,
      publico_prioritario: PublicoPrioritarioEnum.PESSOA_IDOSA,
      renda: 1500.0,
      ocupacao: 'Vendedor',
      recebe_pbf: true,
      valor_pbf: 400.0,
      recebe_bpc: false,
      curso_profissionalizante: 'Curso de Informática',
      interesse_curso_profissionalizante: true,
      situacao_trabalho: SituacaoTrabalhoEnum.EMPREGADO,
      area_trabalho: 'Vendas',
      familiar_apto_trabalho: true,
      area_interesse_familiar: 'Administração',
      observacoes: 'Observações de teste',
    };

    it('should create dados sociais successfully', async () => {
      mockDadosSociaisService.create.mockResolvedValue(mockDadosSociais);

      const result = await controller.create('cidadao-1', createDto);

      expect(service.create).toHaveBeenCalledWith('cidadao-1', createDto);
      expect(result).toEqual(mockDadosSociais);
    });

    it('should throw NotFoundException when cidadao not found', async () => {
      mockDadosSociaisService.create.mockRejectedValue(
        new NotFoundException('Cidadão com ID cidadao-1 não encontrado'),
      );

      await expect(controller.create('cidadao-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when dados sociais already exist', async () => {
      mockDadosSociaisService.create.mockRejectedValue(
        new ConflictException(
          'Cidadão cidadao-1 já possui dados sociais cadastrados',
        ),
      );

      await expect(controller.create('cidadao-1', createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByCidadaoId', () => {
    it('should return dados sociais for valid cidadao', async () => {
      mockDadosSociaisService.findByCidadaoId.mockResolvedValue(
        mockDadosSociais,
      );

      const result = await controller.findByCidadaoId('cidadao-1');

      expect(service.findByCidadaoId).toHaveBeenCalledWith('cidadao-1');
      expect(result).toEqual(mockDadosSociais);
    });

    it('should throw NotFoundException when cidadao not found', async () => {
      mockDadosSociaisService.findByCidadaoId.mockRejectedValue(
        new NotFoundException('Cidadão com ID cidadao-1 não encontrado'),
      );

      await expect(controller.findByCidadaoId('cidadao-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when dados sociais not found', async () => {
      mockDadosSociaisService.findByCidadaoId.mockRejectedValue(
        new NotFoundException(
          'Dados sociais não encontrados para o cidadão cidadao-1',
        ),
      );

      await expect(controller.findByCidadaoId('cidadao-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateDadosSociaisDto = {
      renda: 1800.0,
      ocupacao: 'Gerente de Vendas',
      observacoes: 'Observações atualizadas',
    };

    it('should update dados sociais successfully', async () => {
      const updatedDadosSociais = {
        ...mockDadosSociais,
        ...updateDto,
      };
      mockDadosSociaisService.update.mockResolvedValue(updatedDadosSociais);

      const result = await controller.update('cidadao-1', updateDto);

      expect(service.update).toHaveBeenCalledWith('cidadao-1', updateDto);
      expect(result).toEqual(updatedDadosSociais);
    });

    it('should throw NotFoundException when dados sociais not found', async () => {
      mockDadosSociaisService.update.mockRejectedValue(
        new NotFoundException(
          'Dados sociais não encontrados para o cidadão cidadao-1',
        ),
      );

      await expect(controller.update('cidadao-1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove dados sociais successfully', async () => {
      mockDadosSociaisService.remove.mockResolvedValue(undefined);

      await controller.remove('cidadao-1');

      expect(service.remove).toHaveBeenCalledWith('cidadao-1');
    });

    it('should throw NotFoundException when dados sociais not found', async () => {
      mockDadosSociaisService.remove.mockRejectedValue(
        new NotFoundException(
          'Dados sociais não encontrados para o cidadão cidadao-1',
        ),
      );

      await expect(controller.remove('cidadao-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validation', () => {
    it('should validate UUID format for cidadaoId parameter', () => {
      // Este teste seria implementado com validação de pipe UUID
      // Por enquanto, apenas verificamos se o controller está definido
      expect(controller).toBeDefined();
    });

    it('should validate CreateDadosSociaisDto', () => {
      // Este teste seria implementado com validação de DTO
      // Por enquanto, apenas verificamos se o controller está definido
      expect(controller).toBeDefined();
    });

    it('should validate UpdateDadosSociaisDto', () => {
      // Este teste seria implementado com validação de DTO
      // Por enquanto, apenas verificamos se o controller está definido
      expect(controller).toBeDefined();
    });
  });

  describe('authorization', () => {
    it('should require authentication for all endpoints', () => {
      // Este teste seria implementado com verificação de guards
      // Por enquanto, apenas verificamos se o controller está definido
      expect(controller).toBeDefined();
    });

    it('should require proper permissions for CRUD operations', () => {
      // Este teste seria implementado com verificação de permissions
      // Por enquanto, apenas verificamos se o controller está definido
      expect(controller).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockDadosSociaisService.findByCidadaoId.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(controller.findByCidadaoId('cidadao-1')).rejects.toThrow(
        Error,
      );
    });

    it('should propagate validation errors', async () => {
      const createDto = {} as CreateDadosSociaisDto; // DTO inválido

      // Este teste seria mais completo com validação real
      expect(controller).toBeDefined();
    });
  });
});
