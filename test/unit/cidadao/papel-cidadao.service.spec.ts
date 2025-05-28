import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PapelCidadaoService } from '@modules/cidadao/services/papel-cidadao.service';
import { CidadaoService } from '@modules/cidadao/services/cidadao.service';
import { VerificacaoPapelService } from '@modules/cidadao/services/verificacao-papel.service';
import { PapelCidadao } from '@modules/cidadao/entities/papel-cidadao.entity';
import { TipoPapel } from '@modules/cidadao/enums/tipo-papel.enum';
import { CreatePapelCidadaoDto } from '@modules/cidadao/dto/create-papel-cidadao.dto';
import { CidadaoResponseDto } from '@modules/cidadao/dto/cidadao-response.dto';

describe('PapelCidadaoService', () => {
  let service: PapelCidadaoService;
  let repository: Repository<PapelCidadao>;
  let cidadaoService: CidadaoService;
  let verificacaoPapelService: VerificacaoPapelService;
  let dataSource: DataSource;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCidadaoService = {
    findById: jest.fn(),
  };

  const mockVerificacaoPapelService = {
    verificarConflitoPapeis: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    transaction: jest.fn(),
  };

  const mockCidadaoResponse: CidadaoResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João da Silva',
    cpf: '12345678901',
    email: 'joao@example.com',
  } as CidadaoResponseDto;

  const mockPapelCidadao: PapelCidadao = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo_papel: TipoPapel.BENEFICIARIO,
    ativo: true,
    metadados: {},
    created_at: new Date(),
    updated_at: new Date(),
  } as PapelCidadao;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PapelCidadaoService,
        {
          provide: getRepositoryToken(PapelCidadao),
          useValue: mockRepository,
        },
        {
          provide: CidadaoService,
          useValue: mockCidadaoService,
        },
        {
          provide: VerificacaoPapelService,
          useValue: mockVerificacaoPapelService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PapelCidadaoService>(PapelCidadaoService);
    repository = module.get<Repository<PapelCidadao>>(getRepositoryToken(PapelCidadao));
    cidadaoService = module.get<CidadaoService>(CidadaoService);
    verificacaoPapelService = module.get<VerificacaoPapelService>(VerificacaoPapelService);
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPapelDto: CreatePapelCidadaoDto = {
      cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo_papel: TipoPapel.BENEFICIARIO,
      metadados: {},
    };

    it('deve criar um papel com sucesso', async () => {
      // Mock para verificação de cidadão existente
      mockCidadaoService.findById.mockResolvedValue(mockCidadaoResponse);
      // Mock para verificação inicial de papel existente
      mockRepository.findOne.mockResolvedValue(null);
      
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockCidadaoResponse), // Cidadão encontrado na transação
          create: jest.fn().mockReturnValue(mockPapelCidadao),
          save: jest.fn().mockResolvedValue(mockPapelCidadao),
        };
        return callback(manager);
      });

      const result = await service.create(createPapelDto);

      expect(mockCidadaoService.findById).toHaveBeenCalledWith(
        createPapelDto.cidadao_id,
        false,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          cidadao_id: createPapelDto.cidadao_id,
          tipo_papel: createPapelDto.tipo_papel,
          ativo: true,
        },
      });
      expect(result).toEqual(mockPapelCidadao);
    });

    it('deve lançar NotFoundException quando cidadão não existir', async () => {
      mockCidadaoService.findById.mockResolvedValue(null);

      await expect(service.create(createPapelDto)).rejects.toThrow(NotFoundException);
      
      expect(mockCidadaoService.findById).toHaveBeenCalledWith(
        createPapelDto.cidadao_id,
        false,
      );
    });

    it('deve lançar ConflictException quando cidadão já possuir o papel', async () => {
      // Mock para verificação de cidadão existente
      mockCidadaoService.findById.mockResolvedValue(mockCidadaoResponse);
      // Mock para verificação inicial de papel existente - retorna papel existente
      mockRepository.findOne.mockResolvedValue(mockPapelCidadao);

      await expect(service.create(createPapelDto)).rejects.toThrow(ConflictException);
      
      expect(mockCidadaoService.findById).toHaveBeenCalledWith(
        createPapelDto.cidadao_id,
        false,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          cidadao_id: createPapelDto.cidadao_id,
          tipo_papel: createPapelDto.tipo_papel,
          ativo: true,
        },
      });
    });

    it('deve lançar NotFoundException quando cidadão não existir na transação', async () => {
      // Mock para verificação inicial de papel existente
      mockRepository.findOne.mockResolvedValue(null);
      
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(null), // Cidadão não encontrado na transação
          create: jest.fn(),
          save: jest.fn(),
        };
        return callback(manager);
      });

      await expect(service.create(createPapelDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMany', () => {
    const cidadaoId = '550e8400-e29b-41d4-a716-446655440000';
    const papeis = [
      {
        tipo_papel: TipoPapel.BENEFICIARIO,
        metadados: {},
      },
      {
        tipo_papel: TipoPapel.MEMBRO_COMPOSICAO,
        metadados: {},
      },
    ];

    it('deve criar múltiplos papéis com sucesso', async () => {
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn()
            .mockResolvedValueOnce(null) // Primeiro papel não existe
            .mockResolvedValueOnce(mockCidadaoResponse) // Cidadão encontrado para verificação de conflitos do primeiro papel
            .mockResolvedValueOnce(null) // Segundo papel não existe
            .mockResolvedValueOnce(mockCidadaoResponse), // Cidadão encontrado para verificação de conflitos do segundo papel
          create: jest.fn().mockReturnValue([mockPapelCidadao]),
          save: jest.fn().mockResolvedValue([mockPapelCidadao]),
        };
        return callback(manager);
      });

      mockCidadaoService.findById.mockResolvedValue(mockCidadaoResponse);
      mockVerificacaoPapelService.verificarConflitoPapeis.mockResolvedValue({
        temConflito: false,
        detalhes: '',
      });

      const result = await service.createMany(cidadaoId, papeis);

      expect(mockCidadaoService.findById).toHaveBeenCalledWith(cidadaoId, false);
      expect(result).toEqual([mockPapelCidadao]);
    });

    it('deve lançar BadRequestException quando lista estiver vazia', async () => {
      await expect(service.createMany(cidadaoId, [])).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando houver papéis duplicados', async () => {
      const papeisDuplicados = [
        {
          tipo_papel: TipoPapel.BENEFICIARIO,
          metadados: {},
        },
        {
          tipo_papel: TipoPapel.BENEFICIARIO,
          metadados: {},
        },
      ];

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        };
        return callback(manager);
      });

      mockCidadaoService.findById.mockResolvedValue(mockCidadaoResponse);

      await expect(service.createMany(cidadaoId, papeisDuplicados)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException quando cidadão não existir', async () => {
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        };
        return callback(manager);
      });

      mockCidadaoService.findById.mockResolvedValue(null);

      await expect(service.createMany(cidadaoId, papeis)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCidadaoId', () => {
    it('deve retornar papéis do cidadão', async () => {
      const papeis = [mockPapelCidadao];
      mockRepository.find.mockResolvedValue(papeis);

      const result = await service.findByCidadaoId('550e8400-e29b-41d4-a716-446655440000');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { cidadao_id: '550e8400-e29b-41d4-a716-446655440000', ativo: true },
      });
      expect(result).toEqual(papeis);
    });

    it('deve filtrar por status ativo quando especificado', async () => {
      const papeis = [mockPapelCidadao];
      mockRepository.find.mockResolvedValue(papeis);

      const result = await service.findByCidadaoId(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
          ativo: true,
        },
      });
      expect(result).toEqual(papeis);
    });
  });

  describe('verificarPapel', () => {
    it('deve retornar true quando cidadão possuir o papel ativo', async () => {
      mockRepository.findOne.mockResolvedValue(mockPapelCidadao);

      const result = await service.verificarPapel(
        '550e8400-e29b-41d4-a716-446655440000',
        TipoPapel.BENEFICIARIO,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
          tipo_papel: TipoPapel.BENEFICIARIO,
          ativo: true,
        },
      });
      expect(result).toBe(true);
    });

    it('deve retornar false quando cidadão não possuir o papel', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.verificarPapel(
        '550e8400-e29b-41d4-a716-446655440000',
        TipoPapel.BENEFICIARIO,
      );

      expect(result).toBe(false);
    });
  });
});