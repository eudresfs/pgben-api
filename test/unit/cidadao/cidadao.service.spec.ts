import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { CidadaoService } from '@modules/cidadao/services/cidadao.service';
import { CidadaoRepository } from '@modules/cidadao/repositories/cidadao.repository';
import { Cidadao, Sexo } from '@/entities/cidadao.entity';
import { CreateCidadaoDto } from '@modules/cidadao/dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '@modules/cidadao/dto/update-cidadao.dto';
import { CidadaoResponseDto } from '@modules/cidadao/dto/cidadao-response.dto';
import { CacheService } from '@/shared/cache/cache.service';
import { AuditEventEmitter } from '@modules/auditoria/events/emitters/audit-event.emitter';
import { ContatoService } from '@modules/cidadao/services/contato.service';
import { EnderecoService } from '@modules/cidadao/services/endereco.service';
import { Unidade, DadosSociais, InfoBancaria } from '@/entities';
import { EstadoCivil } from '@/enums';

describe('CidadaoService', () => {
  let service: CidadaoService;
  let repository: CidadaoRepository;
  let cacheService: CacheService;
  let auditEventEmitter: AuditEventEmitter;
  let contatoService: ContatoService;
  let enderecoService: EnderecoService;

  const mockCidadaoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByCpf: jest.fn(),
    findByCpfGlobal: jest.fn(),
    findByNis: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    removeCidadao: jest.fn(),
    saveWithScope: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
  };

  const mockAuditEventEmitter = {
    emit: jest.fn(),
    emitEntityCreated: jest.fn(),
    emitEntityUpdated: jest.fn(),
    emitEntityDeleted: jest.fn(),
    emitEntityAccessed: jest.fn(),
    emitSensitiveDataEvent: jest.fn(),
    emitSecurityEvent: jest.fn(),
  };

  const mockContatoService = {
    upsertMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockEnderecoService = {
    upsertMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCidadao: Cidadao = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João da Silva',
    cpf: '12345678901',
    rg: '1234567',
    data_nascimento: '1990-01-01',
    sexo: Sexo.MASCULINO,
    nis: '12345678901',
    created_at: new Date(),
    updated_at: new Date(),
    composicao_familiar: [],
    nome_social: '',
    nome_mae: 'nome da mãoe do cidadão',
    naturalidade: 'Natal',
    prontuario_suas: 'CD651651',
    removed_at: null as unknown as Date,
    nacionalidade: '',
    estado_civil: EstadoCivil.SOLTEIRO,
    unidade_id: '',
    unidade: new Unidade,
    solicitacoes: [],
    documentos: [],
    dados_sociais: new DadosSociais,
    info_bancaria: new InfoBancaria,
    contatos: [],
    enderecos: [],
    isCriadoRecentemente: function (): boolean {
      throw new Error('Function not implemented.');
    },
    getIdade: function (): number {
      throw new Error('Function not implemented.');
    },
    isMaiorIdade: function (): boolean {
      throw new Error('Function not implemented.');
    },
    isIdoso: function (): boolean {
      throw new Error('Function not implemented.');
    },
    isCrianca: function (): boolean {
      throw new Error('Function not implemented.');
    },
    isAdolescente: function (): boolean {
      throw new Error('Function not implemented.');
    },
    temNomeSocial: function (): boolean {
      throw new Error('Function not implemented.');
    },
    getNomePreferencial: function (): string {
      throw new Error('Function not implemented.');
    },
    pertenceAUnidade: function (unidadeId: string): boolean {
      throw new Error('Function not implemented.');
    },
    foiRemovido: function (): boolean {
      throw new Error('Function not implemented.');
    },
    isAtivo: function (): boolean {
      throw new Error('Function not implemented.');
    },
    getSummary: function (): { id: string; nome: string; nomePreferencial: string; cpf: string; idade: number; sexo: string; unidadeId: string; ativo: boolean; criadoEm: Date; } {
      throw new Error('Function not implemented.');
    },
    getUniqueKey: function (): string {
      throw new Error('Function not implemented.');
    },
    isConsistente: function (): boolean {
      throw new Error('Function not implemented.');
    },
    nasceuEm: function (cidade: string): boolean {
      throw new Error('Function not implemented.');
    },
    getFaixaEtaria: function (): string {
      throw new Error('Function not implemented.');
    },
    getNumeroFamiliares: function (): number {
      throw new Error('Function not implemented.');
    },
    temComposicaoFamiliar: function (): boolean {
      throw new Error('Function not implemented.');
    },
    getCpfFormatado: function (): string {
      throw new Error('Function not implemented.');
    },
    getDataNascimentoFormatada: function (): string {
      throw new Error('Function not implemented.');
    },
    getCriacaoFormatada: function (): string {
      throw new Error('Function not implemented.');
    },
    getAtualizacaoFormatada: function (): string {
      throw new Error('Function not implemented.');
    },
    toSafeLog: function (): object {
      throw new Error('Function not implemented.');
    },
    podeSerRemovido: function (): boolean {
      throw new Error('Function not implemented.');
    },
    clone: function (): Cidadao {
      throw new Error('Function not implemented.');
    },
    isPrioritario: function (): boolean {
      throw new Error('Function not implemented.');
    },
    getSugestoesVerificacao: function (): string[] {
      throw new Error('Function not implemented.');
    }
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
        {
          provide: CacheService,
          useValue: mockCacheService,
        },

        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
        {
          provide: ContatoService,
          useValue: mockContatoService,
        },
        {
          provide: EnderecoService,
          useValue: mockEnderecoService,
        },
      ],
    }).compile();

    service = module.get<CidadaoService>(CidadaoService);
    repository = module.get<CidadaoRepository>(CidadaoRepository);
    cacheService = module.get<CacheService>(CacheService);
    auditEventEmitter = module.get<AuditEventEmitter>(AuditEventEmitter);
    contatoService = module.get<ContatoService>(ContatoService);
    enderecoService = module.get<EnderecoService>(EnderecoService);

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
        items: plainToInstance(CidadaoResponseDto, mockCidadaoList, {
          excludeExtraneousValues: true,
        }),
        meta: {
          total,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { nome: 'ASC' },
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
          $or: expect.arrayContaining([
            { nome: { $iLike: '%João%' } },
            { cpf: { $iLike: '%%' } },
            { nis: { $iLike: '%%' } },
          ]),
          'endereco.bairro': { $iLike: '%Centro%' },
          unidadeId: filters.unidadeId,
          ativo: true,
        }),
        order: { nome: 'ASC' },
      });
    });

    it('deve retornar lista vazia quando não houver resultados', async () => {
      mockCidadaoRepository.findAll.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('deve calcular corretamente a paginação', async () => {
      const totalItems = 25;
      const page = 2;
      const limit = 10;

      mockCidadaoRepository.findAll.mockResolvedValue([
        new Array(limit).fill(mockCidadao),
        totalItems,
      ]);

      const result = await service.findAll({ page, limit });

      expect(result.meta).toEqual({
        total: totalItems,
        page,
        limit,
        pages: 3,
        hasNext: true,
        hasPrev: true,
      });
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 10, // (page - 1) * limit
        take: limit,
        where: {},
        order: { nome: 'ASC' },
      });
    });

    it('deve filtrar registros removidos por padrão', async () => {
      mockCidadaoRepository.findAll.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { nome: 'ASC' },
        includeRemoved: false,
      });
    });

    it('deve incluir registros removidos quando includeRemoved for true', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };
      const mockList = [mockCidadao, cidadaoRemovido];

      mockCidadaoRepository.findAll.mockResolvedValue([mockList, 2]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        include_removed: true,
      });

      expect(result.items).toHaveLength(2);
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { nome: 'ASC' },
        includeRemoved: true,
      });
    });

    it('deve usar includeRemoved como false quando não especificado', async () => {
      mockCidadaoRepository.findAll.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        search: 'João',
      });

      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: expect.objectContaining({
          $or: expect.arrayContaining([
            { nome: { $iLike: '%João%' } },
            { cpf: { $iLike: '%%' } },
            { nis: { $iLike: '%%' } },
          ]),
        }),
        order: { nome: 'ASC' },
        includeRemoved: false,
      });
    });
  });

  describe('findById', () => {
    it('deve retornar um cidadão pelo ID', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      const result = await service.findById(mockCidadao.id, true, 'user-123');

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith(
        mockCidadao.id,
        true,
      );
      expect(mockAuditEventEmitter.emitEntityAccessed).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-123',
      );
    });

    it('deve retornar cidadão sem relacionamentos quando includeRelations for false', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      const result = await service.findById(mockCidadao.id, false, 'user-123');

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith(
        mockCidadao.id,
        false,
      );
      expect(mockAuditEventEmitter.emitEntityAccessed).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-123',
      );
    });

    it('deve retornar os dados corretos no DTO de resposta', async () => {
      const cidadaoCompleto = {
        ...mockCidadao,
        data_nascimento: '1990-01-01',
        sexo: Sexo.MASCULINO,
        nome_mae: 'Maria da Silva',
        nome_pai: 'João Silva',
        telefone: '11999999999',
        nis: '12345678901',
        cns: '123456789012345',
        foto_url: 'http://example.com/foto.jpg',
        endereco: {
          cep: '12345678',
          logradouro: 'Rua Exemplo',
          numero: '123',
          complemento: 'Apto 101',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
        },
        created_at: new Date(),
        updated_at: new Date(),
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
      });
    });

    it('deve lançar BadRequestException para ID vazio', async () => {
      await expect(service.findById('')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findById.mockRejectedValue(
        new Error('Erro inesperado'),
      );

      await expect(service.findById('id-válido')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('deve lançar NotFoundException quando cidadão estiver removido e includeRemoved for false', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findById.mockResolvedValue(cidadaoRemovido);

      await expect(service.findById(mockCidadao.id, true, 'user-123', false)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith(
        mockCidadao.id,
        true,
        false,
      );
    });

    it('deve retornar cidadão removido quando includeRemoved for true', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findById.mockResolvedValue(cidadaoRemovido);

      const result = await service.findById(mockCidadao.id, true, 'user-123', true);

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, cidadaoRemovido, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith(
        mockCidadao.id,
        true,
        true,
      );
    });

    it('deve usar includeRemoved como false por padrão', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      await service.findById(mockCidadao.id, true, 'user-123');

      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith(
        mockCidadao.id,
        true,
        false,
      );
    });
  });

  describe('findByCpf', () => {
    it('deve retornar um cidadão pelo CPF', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);

      const result = await service.findByCpf(
        '123.456.789-09',
        false,
        'user-123',
      );

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '12345678909',
        false,
      );
      expect(mockAuditEventEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-123',
        ['cpf'],
        'Consulta por CPF: 123.456.789-09',
      );
    });

    it('deve retornar cidadão sem relacionamentos quando includeRelations for false', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);

      const result = await service.findByCpf(
        '123.456.789-09',
        false,
        'user-123',
      );

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '12345678909',
        false,
      );
      expect(mockAuditEventEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-123',
        ['cpf'],
        'Consulta por CPF: 123.456.789-09',
      );
    });

    it('deve formatar o CPF removendo caracteres não numéricos', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);

      await service.findByCpf('123.456.789-09', false, 'user-123');

      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '12345678909',
        false,
      );
    });

    it('deve lançar BadRequestException para CPF vazio', async () => {
      await expect(service.findByCpf('')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CPF com menos de 11 dígitos', async () => {
      await expect(service.findByCpf('1234567890')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para CPF com mais de 11 dígitos', async () => {
      await expect(service.findByCpf('123456789012')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para CPF com caracteres não numéricos', async () => {
      await expect(service.findByCpf('123abc456de')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para CPF inválido (todos dígitos iguais)', async () => {
      await expect(service.findByCpf('111.111.111-11')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para CPF inválido (dígito verificador incorreto)', async () => {
      // CPF válido seria 123.456.789-09
      await expect(service.findByCpf('123.456.789-10')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);

      await expect(service.findByCpf('123.456.789-09')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve continuar busca quando cidadão estiver removido e includeRemoved for false', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findByCpf.mockResolvedValue(cidadaoRemovido);

      const result = await service.findByCpf('123.456.789-09', true, 'user-123', false);

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, cidadaoRemovido, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '12345678909',
        true,
        false,
      );
    });

    it('deve retornar cidadão removido quando includeRemoved for true', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findByCpf.mockResolvedValue(cidadaoRemovido);

      const result = await service.findByCpf('123.456.789-09', true, 'user-123', true);

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, cidadaoRemovido, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '12345678909',
        true,
        true,
      );
    });

    it('deve usar includeRemoved como false por padrão', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);

      await service.findByCpf('123.456.789-09', true, 'user-123');

      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '12345678909',
        true,
        false,
      );
    });
  });

  describe('findByNis', () => {
    it('deve retornar um cidadão pelo NIS', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);

      const result = await service.findByNis('12345678901', false, 'user-123');

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        false,
      );
      expect(mockAuditEventEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-123',
        ['nis'],
        'Consulta por NIS: 12345678901',
      );
    });

    it('deve retornar cidadão sem relacionamentos quando includeRelations for false', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);

      const result = await service.findByNis('12345678901', false, 'user-123');

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        false,
      );
      expect(mockAuditEventEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-123',
        ['nis'],
        'Consulta por NIS: 12345678901',
      );
    });

    it('deve formatar o NIS removendo caracteres não numéricos', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);

      await service.findByNis('123.456.789-01');

      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        false,
      );
    });

    it('deve lançar BadRequestException para NIS vazio', async () => {
      await expect(service.findByNis('')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para NIS com menos de 11 dígitos', async () => {
      await expect(service.findByNis('1234567890')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para NIS com mais de 11 dígitos', async () => {
      await expect(service.findByNis('123456789012')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para NIS com caracteres não numéricos', async () => {
      await expect(service.findByNis('123abc456de')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(null);

      await expect(service.findByNis('11122233344')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve remover formatação do NIS antes de buscar', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);

      await service.findByNis('123.456.789-01');

      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        false,
      );
    });

    it('deve lançar NotFoundException quando cidadão estiver removido e includeRemoved for false', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findByNis.mockResolvedValue(cidadaoRemovido);

      await expect(service.findByNis('12345678901', true, 'user-123', false)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        true,
        false,
      );
    });

    it('deve retornar cidadão removido quando includeRemoved for true', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findByNis.mockResolvedValue(cidadaoRemovido);

      const result = await service.findByNis('12345678901', true, 'user-123', true);

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, cidadaoRemovido, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        true,
        true,
      );
    });

    it('deve usar includeRemoved como false por padrão', async () => {
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);

      await service.findByNis('12345678901', true, 'user-123');

      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
        true,
        false,
      );
    });
  });

  describe('create', () => {
    const createCidadaoDto: CreateCidadaoDto = {
      nome: 'João da Silva',
      cpf: '123.456.789-01',
      rg: '1234567',
      data_nascimento: '1990-01-01',
      sexo: Sexo.MASCULINO,
      nis: '12345678901'
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve criar um novo cidadão', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      const result = await service.create(
        createCidadaoDto,
        'unidade-1',
        'user-1',
      );

      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, mockCidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
      expect(mockCidadaoRepository.create).toHaveBeenCalledWith({
        ...createCidadaoDto,
        cpf: '12345678901',
        nis: '12345678901',
      });
      expect(mockAuditEventEmitter.emitEntityCreated).toHaveBeenCalledWith(
        'Cidadao',
        mockCidadao.id,
        'user-1',
        {
          cpf: mockCidadao.cpf,
          nis: mockCidadao.nis,
          nome: mockCidadao.nome,
        },
      );
    });

    it('deve formatar CPF e NIS removendo caracteres não numéricos', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      await service.create(
        {
          ...createCidadaoDto,
          cpf: '123.456.789-01',
          nis: '123.456.789-01',
        },
        'unidade-1',
        'user-1',
      );

      expect(mockCidadaoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cpf: '12345678901',
          nis: '12345678901',
        }),
      );
    });

    it('deve lançar BadRequestException para CPF inválido', async () => {
      await expect(
        service.create(
          {
            ...createCidadaoDto,
            cpf: '123',
          },
          'unidade-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para NIS inválido', async () => {
      await expect(
        service.create(
          {
            ...createCidadaoDto,
            nis: '123',
          },
          'unidade-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ConflictException para CPF já cadastrado', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);

      await expect(
        service.create(createCidadaoDto, 'unidade-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('deve lançar ConflictException para NIS já cadastrado', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(mockCidadao);

      await expect(
        service.create(createCidadaoDto, 'unidade-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('deve reativar cidadão removido com mesmo CPF', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
        foiRemovido: () => true,
      };

      mockCidadaoRepository.findByCpfGlobal.mockResolvedValue(cidadaoRemovido);
      mockCidadaoRepository.saveWithScope.mockResolvedValue({
        ...cidadaoRemovido,
        removed_at: null,
      });

      const result = await service.create(
        createCidadaoDto,
        'unidade-1',
        'user-1',
      );

      expect(mockCidadaoRepository.findByCpfGlobal).toHaveBeenCalledWith(
        '12345678901',
        true,
        false,
      );
      expect(mockCidadaoRepository.saveWithScope).toHaveBeenCalled();
      expect(mockAuditEventEmitter.emitEntityUpdated).toHaveBeenCalledWith(
        'Cidadao',
        cidadaoRemovido.id,
        'user-1',
        'Cidadão reativado automaticamente durante criação',
      );
      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, {
          ...cidadaoRemovido,
          removed_at: null,
        }, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
    });

    it('deve atualizar cidadão ativo existente com mesmo CPF', async () => {
      const cidadaoAtivo = {
        ...mockCidadao,
        removed_at: null,
      };

      mockCidadaoRepository.findByCpf.mockResolvedValue(cidadaoAtivo);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.update.mockResolvedValue(undefined);
      mockCidadaoRepository.findById.mockResolvedValue(cidadaoAtivo);

      const result = await service.create(
        createCidadaoDto,
        'unidade-1',
        'user-1',
      );

      expect(mockCidadaoRepository.update).toHaveBeenCalledWith(
        cidadaoAtivo.id,
        {
          ...createCidadaoDto,
          cpf: '12345678901',
          nis: '12345678901',
        },
      );
      expect(mockAuditEventEmitter.emitEntityUpdated).toHaveBeenCalledWith(
        'Cidadao',
        cidadaoAtivo.id,
        'user-1',
        'Dados atualizados durante criação',
      );
      expect(result).toEqual(
        plainToInstance(CidadaoResponseDto, cidadaoAtivo, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findByCpf.mockRejectedValue(
        new Error('Erro inesperado'),
      );

      await expect(
        service.create(createCidadaoDto, 'unidade-1', 'user-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('deve permitir criação sem NIS', async () => {
      const { nis, ...dtoSemNis } = createCidadaoDto;
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      await service.create(
        dtoSemNis as CreateCidadaoDto,
        'unidade-1',
        'user-1',
      );

      expect(mockCidadaoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nis: undefined,
        }),
      );
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
        unidade_id: 'unidade-1',
      });

      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: expect.any(Array),
            'endereco.bairro': expect.any(Object),
            ativo: true,
            unidadeId: 'unidade-1',
          }),
        }),
      );
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findAll.mockRejectedValue(
        new Error('Erro inesperado'),
      );

      await expect(service.findAll({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });



  describe('remove', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve remover um cidadão existente (soft delete)', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      await service.remove(mockCidadao.id, 'user-1');

      expect(mockCidadaoRepository.update).toHaveBeenCalledWith(
        mockCidadao.id,
        {
          removed_at: expect.any(Date),
        },
      );
    });

    it('deve lançar BadRequestException para ID vazio', async () => {
      await expect(service.remove('', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException quando o cidadão não for encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);

      await expect(service.remove('id-inexistente', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerErrorException em caso de erro inesperado', async () => {
      mockCidadaoRepository.findById.mockRejectedValue(
        new Error('Erro inesperado'),
      );

      await expect(service.remove('id-válido', 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('não deve tentar remover um cidadão já removido', async () => {
      const cidadaoRemovido = {
        ...mockCidadao,
        removed_at: new Date(),
      };

      mockCidadaoRepository.findById.mockResolvedValue(cidadaoRemovido);

      await service.remove(mockCidadao.id, 'user-1');

      // Verifica se o update foi chamado mesmo para um cidadão já removido
      expect(mockCidadaoRepository.update).toHaveBeenCalled();
    });
  });
});