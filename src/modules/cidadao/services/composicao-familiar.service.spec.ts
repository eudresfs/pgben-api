import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ComposicaoFamiliarService } from './composicao-familiar.service';
import { ComposicaoFamiliar } from '../entities/composicao-familiar.entity';
import { Cidadao } from '../entities/cidadao.entity';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { UpdateComposicaoFamiliarDto } from '../dto/update-composicao-familiar.dto';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CacheService } from '../../../shared/cache';
import { EscolaridadeEnum } from '../enums/escolaridade.enum';
import { ParentescoEnum } from '../enums/parentesco.enum';

describe('ComposicaoFamiliarService', () => {
  let service: ComposicaoFamiliarService;
  let composicaoFamiliarRepository: Repository<ComposicaoFamiliar>;
  let cidadaoRepository: Repository<Cidadao>;
  let cacheService: CacheService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockComposicaoFamiliarRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockCidadaoRepository = {
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockCidadao = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    cpf: '98765432100',
    nome: 'Maria Silva',
  };

  const mockComposicaoFamiliar = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    cidadao_id: '123e4567-e89b-12d3-a456-426614174001',
    nome: 'João Silva',
    cpf: '12345678900',
    nis: '12345678901',
    idade: 25,
    ocupacao: 'Estudante',
    escolaridade: EscolaridadeEnum.MEDIO_COMPLETO,
    parentesco: ParentescoEnum.FILHO,
    renda: 1500.0,
    observacoes: 'Observações de teste',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    removed_at: null,
    cidadao: mockCidadao,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComposicaoFamiliarService,
        {
          provide: getRepositoryToken(ComposicaoFamiliar),
          useValue: mockComposicaoFamiliarRepository,
        },
        {
          provide: getRepositoryToken(Cidadao),
          useValue: mockCidadaoRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ComposicaoFamiliarService>(ComposicaoFamiliarService);
    composicaoFamiliarRepository = module.get<Repository<ComposicaoFamiliar>>(
      getRepositoryToken(ComposicaoFamiliar),
    );
    cidadaoRepository = module.get<Repository<Cidadao>>(
      getRepositoryToken(Cidadao),
    );
    cacheService = module.get<CacheService>(CacheService);
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateComposicaoFamiliarDto = {
      cidadao_id: '123e4567-e89b-12d3-a456-426614174001',
      nome: 'João Silva',
      cpf: '123.456.789-00',
      nis: '12345678901',
      idade: 25,
      ocupacao: 'Estudante',
      escolaridade: EscolaridadeEnum.MEDIO_COMPLETO,
      parentesco: ParentescoEnum.FILHO,
      renda: 1500.0,
      observacoes: 'Observações de teste',
    };

    const userId = 'user123';

    beforeEach(() => {
      mockCidadaoRepository.findOne.mockResolvedValue(mockCidadao);
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(null);
      mockComposicaoFamiliarRepository.create.mockReturnValue(
        mockComposicaoFamiliar,
      );
      mockQueryRunner.manager.save.mockResolvedValue(mockComposicaoFamiliar);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.del.mockResolvedValue(undefined);
    });

    it('should create a new composicao familiar member successfully', async () => {
      const result = await service.create(createDto, userId);

      expect(cidadaoRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.cidadao_id },
      });
      expect(composicaoFamiliarRepository.create).toHaveBeenCalledWith({
        ...createDto,
        cpf: '12345678900',
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.nome).toBe(createDto.nome);
    });

    it('should throw NotFoundException when cidadao does not exist', async () => {
      mockCidadaoRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid CPF', async () => {
      const invalidCpfDto = { ...createDto, cpf: '123' };

      await expect(service.create(invalidCpfDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when member with same CPF exists', async () => {
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(
        mockComposicaoFamiliar,
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when CPF is same as cidadao CPF', async () => {
      const sameCpfDto = { ...createDto, cpf: '987.654.321-00' };

      await expect(service.create(sameCpfDto, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when member with same name exists', async () => {
      mockComposicaoFamiliarRepository.findOne
        .mockResolvedValueOnce(null) // CPF check
        .mockResolvedValueOnce(mockComposicaoFamiliar); // Name check

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        'Database error',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException with proper error details when citizen is already a beneficiary', async () => {
      const constraintError = new Error(
        'Cidadão não pode ser adicionado à composição familiar, pois já é beneficiário',
      );
      
      mockComposicaoFamiliarRepository.save.mockRejectedValue(constraintError);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        expect.objectContaining({
          message: expect.objectContaining({
            code: 'VAL_2004',
            message: 'Conflito de papéis: não pode ser beneficiário e membro familiar simultaneamente',
            details: expect.objectContaining({
              cpf: '12345678901',
              reason: 'O cidadão já possui papel de beneficiário ativo no sistema',
              action: 'Remova o papel de beneficiário antes de adicionar à composição familiar',
            }),
            localizedMessage: 'Cidadão não pode ser beneficiário principal e membro da composição familiar simultaneamente',
          }),
        }),
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findByCidadao', () => {
    const cidadaoId = '123e4567-e89b-12d3-a456-426614174001';
    const options = { page: 1, limit: 10 };

    beforeEach(() => {
      mockCidadaoRepository.findOne.mockResolvedValue(mockCidadao);
      mockCacheService.get.mockResolvedValue(null);
      mockComposicaoFamiliarRepository.findAndCount.mockResolvedValue([
        [mockComposicaoFamiliar],
        1,
      ]);
      mockComposicaoFamiliarRepository.find.mockResolvedValue([
        mockComposicaoFamiliar,
      ]);
      mockCacheService.set.mockResolvedValue(undefined);
    });

    it('should return paginated composicao familiar members', async () => {
      const result = await service.findByCidadao(cidadaoId, options);

      expect(cidadaoRepository.findOne).toHaveBeenCalledWith({
        where: { id: cidadaoId },
      });
      expect(composicaoFamiliarRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          cidadao_id: cidadaoId,
          removed_at: null,
        },
        order: {
          created_at: 'DESC',
        },
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.estatisticas).toBeDefined();
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        data: [mockComposicaoFamiliar],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        estatisticas: {
          totalMembros: 1,
          rendaTotal: 1500,
          rendaMedia: 1500,
          idadeMedia: 25,
          membrosComRenda: 1,
        },
      };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.findByCidadao(cidadaoId, options);

      expect(result).toEqual(cachedResult);
      expect(composicaoFamiliarRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when cidadao does not exist', async () => {
      mockCidadaoRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCidadao(cidadaoId, options)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate correct pagination metadata', async () => {
      mockComposicaoFamiliarRepository.findAndCount.mockResolvedValue([
        [mockComposicaoFamiliar, mockComposicaoFamiliar],
        25,
      ]);

      const result = await service.findByCidadao(cidadaoId, {
        page: 2,
        limit: 10,
      });

      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(
        mockComposicaoFamiliar,
      );
      mockCacheService.set.mockResolvedValue(undefined);
    });

    it('should return a composicao familiar member', async () => {
      const result = await service.findOne(id);

      expect(composicaoFamiliarRepository.findOne).toHaveBeenCalledWith({
        where: {
          id,
          removed_at: null,
        },
        relations: ['cidadao'],
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(id);
    });

    it('should return cached result when available', async () => {
      const cachedResult = { id, nome: 'João Silva' };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.findOne(id);

      expect(result).toEqual(cachedResult);
      expect(composicaoFamiliarRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const updateDto: UpdateComposicaoFamiliarDto = {
      nome: 'João Silva Atualizado',
      renda: 2000.0,
    };
    const userId = 'user123';

    beforeEach(() => {
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(
        mockComposicaoFamiliar,
      );
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockComposicaoFamiliar,
        ...updateDto,
      });
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.del.mockResolvedValue(undefined);
    });

    it('should update a composicao familiar member successfully', async () => {
      const result = await service.update(id, updateDto, userId);

      expect(composicaoFamiliarRepository.findOne).toHaveBeenCalledWith({
        where: {
          id,
          removed_at: null,
        },
        relations: ['cidadao'],
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.nome).toBe(updateDto.nome);
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(null);

      await expect(service.update(id, updateDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should validate CPF when updating', async () => {
      const updateWithCpf = { ...updateDto, cpf: '123' };

      await expect(service.update(id, updateWithCpf, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should check for duplicate CPF when updating', async () => {
      const updateWithCpf = { ...updateDto, cpf: '111.111.111-11' };
      mockComposicaoFamiliarRepository.findOne
        .mockResolvedValueOnce(mockComposicaoFamiliar) // Initial find
        .mockResolvedValueOnce({
          ...mockComposicaoFamiliar,
          id: 'different-id',
        }); // Duplicate check

      await expect(service.update(id, updateWithCpf, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should check for duplicate name when updating', async () => {
      const updateWithName = { ...updateDto, nome: 'Nome Duplicado' };
      mockComposicaoFamiliarRepository.findOne
        .mockResolvedValueOnce(mockComposicaoFamiliar) // Initial find
        .mockResolvedValueOnce(null) // CPF check (not applicable)
        .mockResolvedValueOnce({
          ...mockComposicaoFamiliar,
          id: 'different-id',
        }); // Name check

      await expect(service.update(id, updateWithName, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const userId = 'user123';

    beforeEach(() => {
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(
        mockComposicaoFamiliar,
      );
      mockComposicaoFamiliarRepository.save.mockResolvedValue({
        ...mockComposicaoFamiliar,
        removed_at: new Date(),
      });
      mockCacheService.del.mockResolvedValue(undefined);
    });

    it('should remove a composicao familiar member (soft delete)', async () => {
      await service.remove(id, userId);

      expect(composicaoFamiliarRepository.findOne).toHaveBeenCalledWith({
        where: {
          id,
          removed_at: null,
        },
      });
      expect(composicaoFamiliarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockComposicaoFamiliar,
          removed_at: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(id, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCpf', () => {
    const cpf = '12345678900';

    beforeEach(() => {
      mockComposicaoFamiliarRepository.find.mockResolvedValue([
        mockComposicaoFamiliar,
      ]);
    });

    it('should return composicao familiar members by CPF', async () => {
      const result = await service.findByCpf(cpf);

      expect(composicaoFamiliarRepository.find).toHaveBeenCalledWith({
        where: {
          cpf,
          removed_at: null,
        },
        relations: ['cidadao'],
        order: {
          created_at: 'DESC',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].cpf).toBe('123.456.789-00');
    });

    it('should throw BadRequestException for invalid CPF length', async () => {
      await expect(service.findByCpf('123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty array when no members found', async () => {
      mockComposicaoFamiliarRepository.find.mockResolvedValue([]);

      const result = await service.findByCpf(cpf);

      expect(result).toEqual([]);
    });

    it('should clean CPF format before search', async () => {
      await service.findByCpf('123.456.789-00');

      expect(composicaoFamiliarRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cpf: '12345678900',
          }),
        }),
      );
    });
  });

  describe('Cache management', () => {
    it('should invalidate related cache when creating member', async () => {
      const createDto: CreateComposicaoFamiliarDto = {
        cidadao_id: '123e4567-e89b-12d3-a456-426614174001',
        nome: 'João Silva',
        cpf: '123.456.789-00',
        nis: '12345678901',
        idade: 25,
        ocupacao: 'Estudante',
        escolaridade: EscolaridadeEnum.MEDIO_COMPLETO,
        parentesco: ParentescoEnum.FILHO,
      };

      mockCidadaoRepository.findOne.mockResolvedValue(mockCidadao);
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(null);
      mockComposicaoFamiliarRepository.create.mockReturnValue(
        mockComposicaoFamiliar,
      );
      mockQueryRunner.manager.save.mockResolvedValue(mockComposicaoFamiliar);

      await service.create(createDto, 'user123');

      expect(cacheService.del).toHaveBeenCalledWith(
        expect.stringContaining('composicao_familiar:cidadao:'),
      );
    });

    it('should set cache after successful operations', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockComposicaoFamiliarRepository.findOne.mockResolvedValue(
        mockComposicaoFamiliar,
      );

      await service.findOne('123e4567-e89b-12d3-a456-426614174000');

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('composicao_familiar:id:'),
        expect.any(Object),
        3600,
      );
    });
  });

  describe('Statistics calculation', () => {
    it('should calculate correct statistics', async () => {
      const membrosComRenda = [
        { ...mockComposicaoFamiliar, renda: 1000, idade: 20 },
        { ...mockComposicaoFamiliar, renda: 2000, idade: 30 },
        { ...mockComposicaoFamiliar, renda: null, idade: 25 },
      ];

      mockCidadaoRepository.findOne.mockResolvedValue(mockCidadao);
      mockComposicaoFamiliarRepository.findAndCount.mockResolvedValue([
        membrosComRenda,
        3,
      ]);
      mockComposicaoFamiliarRepository.find.mockResolvedValue(membrosComRenda);

      const result = await service.findByCidadao('cidadao-id', {
        page: 1,
        limit: 10,
      });

      expect(result.estatisticas.totalMembros).toBe(3);
      expect(result.estatisticas.rendaTotal).toBe(3000);
      expect(result.estatisticas.rendaMedia).toBe(1500);
      expect(result.estatisticas.idadeMedia).toBe(25);
      expect(result.estatisticas.membrosComRenda).toBe(2);
    });
  });
});
