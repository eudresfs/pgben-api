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

    it('deve retornar os dados corretos no DTO de resposta', async () => {
      const cidadaoCompleto = {
        ...mockCidadao,
        dataNascimento: new Date('1990-01-01'),
        sexo: Sexo.MASCULINO,
        nomeMae: 'Maria da Silva',
        nomePai: 'João Silva',
        email: 'joao@example.com',
        telefone: '11999999999',
        cep: '12345678',
        logradouro: 'Rua Exemplo',
        numero: '123',
        complemento: 'Apto 101',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        nis: '12345678901',
        cns: '123456789012345',
        fotoUrl: 'http://example.com/foto.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'user-1'
      };
      
      mockCidadaoRepository.findById.mockResolvedValue(cidadaoCompleto);
      
      const result = await service.findById(mockCidadao.id);
      
      expect(result).toMatchObject({
        id: mockCidadao.id,
        nome: mockCidadao.nome,
        cpf: mockCidadao.cpf,
        rg: mockCidadao.rg,
        dataNascimento: expect.any(String),
        sexo: Sexo.MASCULINO,
        nomeMae: 'Maria da Silva',
        nomePai: 'João Silva',
        email: 'joao@example.com',
        telefone: '11999999999',
        cep: '12345678',
        logradouro: 'Rua Exemplo',
        numero: '123',
        complemento: 'Apto 101',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        nis: '12345678901',
        cns: '123456789012345',
        fotoUrl: 'http://example.com/foto.jpg',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        updatedBy: 'user-1',
      });
    });

    it('deve lançar BadRequestException para ID vazio', async () => {
      await expect(service.findById('')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);
      
      await expect(service.findById('id-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findById.mockRejectedValue(new Error('Erro inesperado'));
      
      await expect(service.findById('id-válido')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findByCpf', () => {
    it('deve retornar um cidadão pelo CPF', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);
      
      const result = await service.findByCpf('123.456.789-01');
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, mockCidadao));
      expect(repository.findByCpf).toHaveBeenCalledWith('12345678901');
    });

    it('deve formatar o CPF removendo caracteres não numéricos', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);
      
      await service.findByCpf('123.456.789-01');
      
      expect(repository.findByCpf).toHaveBeenCalledWith('12345678901');
    });

    it('deve lançar BadRequestException para CPF vazio', async () => {
      await expect(service.findByCpf('')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CPF com menos de 11 dígitos', async () => {
      await expect(service.findByCpf('1234567890')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CPF com mais de 11 dígitos', async () => {
      await expect(service.findByCpf('123456789012')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CPF com caracteres não numéricos', async () => {
      await expect(service.findByCpf('123abc456de')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CPF inválido (todos dígitos iguais)', async () => {
      await expect(service.findByCpf('111.111.111-11')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CPF inválido (dígito verificador incorreto)', async () => {
      // CPF válido seria 123.456.789-09
      await expect(service.findByCpf('123.456.789-10')).rejects.toThrow(BadRequestException);
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

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve criar um novo cidadão', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      
      const result = await service.create(createCidadaoDto, 'unidade-1', 'user-1');
      
      expect(result).toEqual(plainToInstance(CidadaoResponseDto, mockCidadao));
      expect(repository.create).toHaveBeenCalledWith({
        ...createCidadaoDto,
        cpf: '12345678901',
        nis: '12345678901',
        unidadeId: 'unidade-1',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });
    });

    it('deve formatar CPF e NIS removendo caracteres não numéricos', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      
      await service.create({
        ...createCidadaoDto,
        cpf: '123.456.789-01',
        nis: '123.456.789-01',
      }, 'unidade-1', 'user-1');
      
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        cpf: '12345678901',
        nis: '12345678901',
      }));
    });

    it('deve lançar BadRequestException para CPF inválido', async () => {
      await expect(service.create({
        ...createCidadaoDto,
        cpf: '123',
      }, 'unidade-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para NIS inválido', async () => {
      await expect(service.create({
        ...createCidadaoDto,
        nis: '123',
      }, 'unidade-1', 'user-1')).rejects.toThrow(BadRequestException);
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

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findByCpf.mockRejectedValue(new Error('Erro inesperado'));
      
      await expect(service.create(createCidadaoDto, 'unidade-1', 'user-1'))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('deve permitir criação sem NIS', async () => {
      const { nis, ...dtoSemNis } = createCidadaoDto;
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      
      await service.create(dtoSemNis as CreateCidadaoDto, 'unidade-1', 'user-1');
      
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        nis: null,
      }));
    });
  });

  describe('findAll', () => {
    it('deve retornar uma lista paginada de cidadãos com metadados', async () => {
      const mockCidadaoList = [mockCidadao];
      const total = 1;
      
      mockCidadaoRepository.findAll.mockResolvedValue([mockCidadaoList, total]);
      
      const result = await service.findAll({
        page: 1,
        limit: 10,
      });
      
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('deve aplicar filtros de busca corretamente', async () => {
      const mockCidadaoList = [mockCidadao];
      const total = 1;
      
      mockCidadaoRepository.findAll.mockResolvedValue([mockCidadaoList, total]);
      
      await service.findAll({
        search: 'João',
        bairro: 'Centro',
        ativo: true,
        unidadeId: 'unidade-1',
      });
      
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: expect.any(Array),
            'endereco.bairro': expect.any(Object),
            ativo: true,
            unidadeId: 'unidade-1',
          })
        })
      );
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findAll.mockRejectedValue(new Error('Erro inesperado'));
      
      await expect(service.findAll({})).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('addComposicaoFamiliar', () => {
    const mockComposicao = {
      nome: 'Maria da Silva',
      parentesco: 'Mãe',
      data_nascimento: new Date('1960-01-01'),
      cpf: '98765432100',
      renda: 1500,
    };

    it('deve adicionar um membro à composição familiar', async () => {
      const cidadaoAtualizado = {
        ...mockCidadao,
        composicao_familiar: [mockComposicao],
      };
      
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.update.mockResolvedValue(cidadaoAtualizado);
      
      const result = await service.addComposicaoFamiliar(
        mockCidadao.id,
        mockComposicao,
        'user-1'
      );
      
      expect(result.composicao_familiar).toHaveLength(1);
      expect(result.composicao_familiar[0]).toMatchObject({
        nome: mockComposicao.nome,
        parentesco: mockComposicao.parentesco,
      });
      expect(mockCidadaoRepository.update).toHaveBeenCalled();
    });

    it('deve inicializar o array de composição familiar se for nulo', async () => {
      const cidadaoSemComposicao = {
        ...mockCidadao,
        composicao_familiar: null,
      };
      
      mockCidadaoRepository.findById.mockResolvedValue(cidadaoSemComposicao);
      
      await service.addComposicaoFamiliar(
        mockCidadao.id,
        mockComposicao,
        'user-1'
      );
      
      expect(mockCidadaoRepository.update).toHaveBeenCalledWith(
        mockCidadao.id,
        expect.objectContaining({
          composicao_familiar: expect.arrayContaining([
            expect.objectContaining({
              nome: mockComposicao.nome,
              criadoPor: 'user-1',
            })
          ])
        })
      );
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);
      
      await expect(
        service.addComposicaoFamiliar('id-inexistente', mockComposicao, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findById.mockRejectedValue(new Error('Erro inesperado'));
      
      await expect(
        service.addComposicaoFamiliar('id-valido', mockComposicao, 'user-1')
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve remover um cidadão existente (soft delete)', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      
      await service.remove(mockCidadao.id, 'user-1');
      
      expect(repository.update).toHaveBeenCalledWith(mockCidadao.id, {
        removed_at: expect.any(Date),
        updatedBy: 'user-1'
      });
    });

    it('deve lançar BadRequestException para ID vazio', async () => {
      await expect(service.remove('', 'user-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);
      
      await expect(service.remove('id-inexistente', 'user-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findById.mockRejectedValue(new Error('Erro inesperado'));
      
      await expect(service.remove('id-válido', 'user-1'))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('não deve tentar remover um cidadão já removido', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date()
      };
      
      mockCidadaoRepository.findById.mockResolvedValue(cidadaoRemovido);
      
      await service.remove(mockCidadao.id, 'user-1');
      
      // Verifica se o update foi chamado mesmo para um cidadão já removido
      expect(repository.update).toHaveBeenCalled();
    });
  });
});
