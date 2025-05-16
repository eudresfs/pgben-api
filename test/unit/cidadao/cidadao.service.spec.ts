import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { CidadaoService } from '@modules/cidadao/services/cidadao.service';
import { CidadaoRepository } from '@modules/cidadao/repositories/cidadao.repository';
import { Cidadao, Sexo, TipoCidadao } from '@modules/cidadao/entities/cidadao.entity';
import { CreateCidadaoDto } from '@modules/cidadao/dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '@modules/cidadao/dto/update-cidadao.dto';
import { CidadaoResponseDto } from '@modules/cidadao/dto/cidadao-response.dto';

describe('CidadaoService', () => {
  let service: CidadaoService;
  let repository: CidadaoRepository;

  const mockCidadaoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByCpf: jest.fn(),
    findByNis: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
  };

  const mockCidadao: Cidadao = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João da Silva',
    cpf: '12345678901',
    rg: '1234567',
    data_nascimento: new Date('1990-01-01'),
    sexo: Sexo.MASCULINO,
    email: 'joao@example.com',
    telefone: '84999999999',
    nis: '12345678901',
    endereco: {
      logradouro: 'Rua Exemplo',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000000',
    },
    created_at: new Date(),
    updated_at: new Date(),
    tipo_cidadao: TipoCidadao.BENEFICIARIO,
    renda: 0,
    composicao_familiar: [],
    removed_at: null as unknown as Date,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CidadaoService,
        {
          provide: getRepositoryToken(Cidadao),
          useValue: {},
        },
        {
          provide: CidadaoRepository,
          useValue: mockCidadaoRepository,
        },
      ],
    }).compile();

    service = module.get<CidadaoService>(CidadaoService);
    repository = module.get<CidadaoRepository>(CidadaoRepository);

    // Resetar mocks
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista paginada de cidadãos', async () => {
      const mockCidadaoList = [mockCidadao];
      const total = 1;
      
      mockCidadaoRepository.findAll.mockResolvedValue([mockCidadaoList, total]);
      
      const result = await service.findAll({
        page: 1,
        limit: 10,
      });
      
      expect(result).toEqual({
        data: plainToInstance(CidadaoResponseDto, mockCidadaoList, {
          excludeExtraneousValues: true,
        }),
        meta: {
          total,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { created_at: 'DESC' },
      });
    });

    it('deve aplicar filtros de busca', async () => {
      const filters = {
        search: 'João',
        bairro: 'Centro',
        unidadeId: 'unidade-1',
        ativo: true,
        page: 1,
        limit: 10,
      };
      
      mockCidadaoRepository.findAll.mockResolvedValue([[], 0]);
      
      await service.findAll(filters);
      
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: expect.objectContaining({
          nome: expect.any(Object),
          bairro: filters.bairro,
          unidadeId: filters.unidadeId,
          ativo: filters.ativo,
        }),
        order: { created_at: 'DESC' },
      });
    });

    it('deve retornar lista vazia quando não houver resultados', async () => {
      mockCidadaoRepository.findAll.mockResolvedValue([[], 0]);
      
      const result = await service.findAll({});
      
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('deve calcular corretamente a paginação', async () => {
      const totalItems = 25;
      const page = 2;
      const limit = 10;
      
      mockCidadaoRepository.findAll.mockResolvedValue([new Array(limit).fill(mockCidadao), totalItems]);
      
      const result = await service.findAll({ page, limit });
      
      expect(result.meta).toEqual({
        total: totalItems,
        page,
        limit,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 10, // (page - 1) * limit
        take: limit,
        where: {},
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findById', () => {
    it('deve retornar um cidadão pelo ID', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      
      const result = await service.findById(mockCidadao.id);
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, mockCidadao));
      expect(repository.findById).toHaveBeenCalledWith(mockCidadao.id);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);
      
      await expect(service.findById('id-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCpf', () => {
    it('deve retornar um cidadão pelo CPF', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);
      
      const result = await service.findByCpf('123.456.789-01');
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, mockCidadao));
      expect(repository.findByCpf).toHaveBeenCalledWith('12345678901');
    });

    it('deve lançar BadRequestException para CPF inválido', async () => {
      await expect(service.findByCpf('123')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      
      await expect(service.findByCpf('111.222.333-44')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNis', () => {
    it('deve retornar um cidadão pelo NIS', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);
      
      const result = await service.findByNis('12345678901');
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, mockCidadao));
      expect(repository.findByNis).toHaveBeenCalledWith('12345678901');
    });

    it('deve formatar o NIS removendo caracteres não numéricos', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);
      
      await service.findByNis('123.456.789-01');
      
      expect(repository.findByNis).toHaveBeenCalledWith('12345678901');
    });

    it('deve lançar BadRequestException para NIS vazio', async () => {
      await expect(service.findByNis('')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para NIS com menos de 11 dígitos', async () => {
      await expect(service.findByNis('1234567890')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para NIS com mais de 11 dígitos', async () => {
      await expect(service.findByNis('123456789012')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para NIS com caracteres não numéricos', async () => {
      await expect(service.findByNis('123abc456de')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      
      await expect(service.findByNis('11122233344')).rejects.toThrow(NotFoundException);
    });

    it('deve remover formatação do NIS antes de buscar', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);
      
      await service.findByNis('123.456.789-01');
      
      expect(repository.findByNis).toHaveBeenCalledWith('12345678901');
    });
  });

  describe('create', () => {
    const createCidadaoDto: CreateCidadaoDto = {
      nome: 'João da Silva',
      cpf: '123.456.789-01',
      rg: '1234567',
      data_nascimento: new Date('1990-01-01'),
      sexo: Sexo.MASCULINO,
      email: 'joao@example.com',
      telefone: '84999999999',
      nis: '12345678901',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '123',
        complemento: 'Apto 101',
        bairro: 'Centro',
        cidade: 'Natal',
        estado: 'RN',
        cep: '59000-000',
      },
      renda: 5000,
    };

    it('deve criar um novo cidadão', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      
      const result = await service.create(createCidadaoDto, 'unidade-1', 'user-1');
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, mockCidadao));
      expect(repository.create).toHaveBeenCalledWith({
        ...createCidadaoDto,
        cpf: '12345678901',
        nis: '12345678901'
      });
    });

    it('deve lançar ConflictException para CPF já cadastrado', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);
      
      await expect(service.create(createCidadaoDto, 'unidade-1', 'user-1'))
        .rejects.toThrow(ConflictException);
    });

    it('deve lançar ConflictException para NIS já cadastrado', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);
      
      await expect(service.create(createCidadaoDto, 'unidade-1', 'user-1'))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateCidadaoDto: UpdateCidadaoDto = {
      nome: 'João da Silva Atualizado',
      email: 'joao.atualizado@example.com',
    };

    it('deve atualizar um cidadão existente', async () => {
      const cidadaoAtualizado = { ...mockCidadao, ...updateCidadaoDto };
      
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.update.mockResolvedValue(cidadaoAtualizado);
      
      const result = await service.update(
        mockCidadao.id, 
        updateCidadaoDto, 
        'user-1'
      );
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, cidadaoAtualizado));
      expect(repository.update).toHaveBeenCalledWith(mockCidadao.id, {
        ...updateCidadaoDto,
        updatedBy: 'user-1',
      });
    });

    it('deve formatar o CPF ao atualizar', async () => {
      const updateWithCpf = { ...updateCidadaoDto, cpf: '111.222.333-44' };
      const cidadaoAtualizado = { ...mockCidadao, ...updateWithCpf, cpf: '11122233344' };
      
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.update.mockResolvedValue(cidadaoAtualizado);
      
      await service.update(mockCidadao.id, updateWithCpf, 'user-1');
      
      expect(repository.update).toHaveBeenCalledWith(mockCidadao.id, {
        ...updateCidadaoDto,
        cpf: '11122233344',
        updatedBy: 'user-1',
      });
    });

    it('deve formatar o NIS ao atualizar', async () => {
      const updateWithNis = { ...updateCidadaoDto, nis: '123.456.789-01' };
      const cidadaoAtualizado = { ...mockCidadao, ...updateWithNis, nis: '12345678901' };
      
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.update.mockResolvedValue(cidadaoAtualizado);
      
      await service.update(mockCidadao.id, updateWithNis, 'user-1');
      
      expect(repository.update).toHaveBeenCalledWith(mockCidadao.id, {
        ...updateCidadaoDto,
        nis: '12345678901',
        updatedBy: 'user-1',
      });
    });

    it('deve lançar ConflictException para CPF já cadastrado', async () => {
      const outroCidadao = { ...mockCidadao, id: 'outro-id' };
      const updateWithCpf = { ...updateCidadaoDto, cpf: '111.222.333-44' };
      
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findByCpf.mockResolvedValue(outroCidadao);
      
      await expect(service.update(mockCidadao.id, updateWithCpf, 'user-1'))
        .rejects.toThrow(ConflictException);
    });

    it('deve lançar ConflictException para NIS já cadastrado', async () => {
      const outroCidadao = { ...mockCidadao, id: 'outro-id' };
      const updateWithNis = { ...updateCidadaoDto, nis: '123.456.789-01' };
      
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(outroCidadao);
      
      await expect(service.update(mockCidadao.id, updateWithNis, 'user-1'))
        .rejects.toThrow(ConflictException);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);
      
      await expect(service.update('id-inexistente', {}, 'user-1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve remover um cidadão existente (soft delete)', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      
      await service.remove(mockCidadao.id, 'user-1');
      
      expect(repository.update).toHaveBeenCalledWith(mockCidadao.id, {
        removed_at: expect.any(Date)
      });
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);
      
      await expect(service.remove('id-inexistente', 'user-1'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
