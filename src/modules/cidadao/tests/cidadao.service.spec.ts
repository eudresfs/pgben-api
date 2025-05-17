import { Test, TestingModule } from '@nestjs/testing';
import { CidadaoService } from '../services/cidadao.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cidadao, Sexo } from '../entities/cidadao.entity';
import { CidadaoRepository } from '../repositories/cidadao.repository';

/**
 * Testes unitários para o serviço de cidadão
 *
 * Verifica o funcionamento das operações CRUD e regras de negócio
 * relacionadas aos cidadãos/beneficiários do sistema
 */
describe('CidadaoService', () => {
  let service: CidadaoService;

  // Mock do repositório de cidadãos
  const mockCidadaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByCpf: jest.fn(),
    findByNis: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAll: jest.fn(),
    addComposicaoFamiliar: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getOne: jest.fn(),
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CidadaoService,
        {
          provide: CidadaoRepository,
          useValue: mockCidadaoRepository,
        },
      ],
    }).compile();

    service = module.get<CidadaoService>(CidadaoService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista paginada de cidadãos', async () => {
      const mockCidadaos = [
        {
          id: '1',
          nome: 'João Silva',
          cpf: '123.456.789-00',
          dataNascimento: new Date('1990-01-01'),
        },
        {
          id: '2',
          nome: 'Maria Souza',
          cpf: '987.654.321-00',
          dataNascimento: new Date('1985-05-10'),
        },
      ];

      // Mock do método findAll do repositório
      mockCidadaoRepository.findAll.mockResolvedValue([mockCidadaos, 2]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockCidadaos,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(mockCidadaoRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
      });
    });

    it('deve aplicar filtros quando fornecidos', async () => {
      const mockCidadaos = [
        {
          id: '1',
          nome: 'João Silva',
          cpf: '123.456.789-00',
          dataNascimento: new Date('1990-01-01'),
        },
      ];

      // Mock do método findAll do repositório
      mockCidadaoRepository.findAll.mockResolvedValue([mockCidadaos, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'João',
        bairro: 'Centro',
      });

      expect(result).toEqual({
        items: mockCidadaos,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      // Verificar se o método findAll foi chamado com os parâmetros corretos
      expect(mockCidadaoRepository.findAll).toHaveBeenCalled();
      const callArgs = mockCidadaoRepository.findAll.mock.calls[0][0];
      expect(callArgs.skip).toBe(0);
      expect(callArgs.take).toBe(10);
      expect(callArgs.where).toBeDefined();
    });
  });

  describe('findById', () => {
    it('deve retornar um cidadão quando encontrado', async () => {
      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        cpf: '123.456.789-00',
        dataNascimento: new Date('1990-01-01'),
      };

      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);

      const result = await service.findById('1');

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('1');
    });

    it('deve lançar NotFoundException quando o cidadão não é encontrado', async () => {
      mockCidadaoRepository.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('findByCpf', () => {
    it('deve retornar um cidadão quando encontrado pelo CPF', async () => {
      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        cpf: '123.456.789-00',
        dataNascimento: new Date('1990-01-01'),
      };

      mockCidadaoRepository.findByCpf.mockResolvedValue(mockCidadao);

      const result = await service.findByCpf('123.456.789-00');

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '123.456.789-00',
      );
    });

    it('deve lançar NotFoundException quando o cidadão não é encontrado pelo CPF', async () => {
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);

      await expect(service.findByCpf('999.999.999-99')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '999.999.999-99',
      );
    });
  });

  describe('create', () => {
    it('deve criar um novo cidadão quando os dados são válidos', async () => {
      const createCidadaoDto = {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        rg: '1234567',
        data_nascimento: new Date('1990-01-01'),
        sexo: Sexo.MASCULINO,
        renda: 1500,
        telefone: '(84) 99999-9999',
        email: 'joao@example.com',
        endereco: {
          cep: '59000-000',
          logradouro: 'Rua Principal',
          numero: '123',
          bairro: 'Centro',
          cidade: 'Natal',
          estado: 'RN',
        },
      };

      const mockCidadao = {
        id: '1',
        ...createCidadaoDto,
      };

      // Simular que o CPF não existe
      mockCidadaoRepository.findByCpf.mockResolvedValue(null);
      mockCidadaoRepository.findByNis.mockResolvedValue(null);
      mockCidadaoRepository.create.mockResolvedValue(mockCidadao);

      const unidadeId = 'unidade-id-1';
      const result = await service.create(createCidadaoDto, unidadeId);

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '123.456.789-00',
      );
      expect(mockCidadaoRepository.create).toHaveBeenCalledWith({
        ...createCidadaoDto,
        // Adicionar unidadeId quando houver integração com unidades
      });
    });

    it('deve lançar ConflictException quando já existe um cidadão com o mesmo CPF', async () => {
      const createCidadaoDto = {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        rg: '1234567',
        data_nascimento: new Date('1990-01-01'),
        sexo: Sexo.MASCULINO,
        endereco: {
          cep: '59000-000',
          logradouro: 'Rua Principal',
          numero: '123',
          bairro: 'Centro',
          cidade: 'Natal',
          estado: 'RN',
        },
      };

      // Simular que o CPF já existe
      mockCidadaoRepository.findByCpf.mockResolvedValue({
        id: '2',
        cpf: '123.456.789-00',
        nome: 'Outro Usuário',
      });

      const unidadeId = 'unidade-id-1';

      await expect(service.create(createCidadaoDto, unidadeId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCidadaoRepository.findByCpf).toHaveBeenCalledWith(
        '123.456.789-00',
      );
      expect(mockCidadaoRepository.create).not.toHaveBeenCalled();
      expect(mockCidadaoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar um cidadão existente', async () => {
      const updateCidadaoDto = {
        nome: 'João Silva Atualizado',
        telefone: '(84) 88888-8888',
        email: 'joao.atualizado@example.com',
      };

      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        cpf: '123.456.789-00',
        telefone: '(84) 99999-9999',
        email: 'joao@example.com',
      };

      const mockUpdatedCidadao = {
        ...mockCidadao,
        ...updateCidadaoDto,
      };

      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.update.mockResolvedValue(mockUpdatedCidadao);

      const result = await service.update('1', updateCidadaoDto);

      expect(result).toEqual(mockUpdatedCidadao);
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('1');
      expect(mockCidadaoRepository.update).toHaveBeenCalledWith(
        '1',
        updateCidadaoDto,
      );
    });

    it('deve lançar NotFoundException quando o cidadão não existe', async () => {
      const updateCidadaoDto = {
        nome: 'João Silva Atualizado',
      };

      // Simular que o cidadão não existe
      mockCidadaoRepository.findById.mockResolvedValue(null);

      await expect(service.update('999', updateCidadaoDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('999');
      expect(mockCidadaoRepository.update).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException quando tenta atualizar para um NIS já existente', async () => {
      // Usar um DTO válido para atualização
      const updateCidadaoDto = {
        nome: 'João Silva',
        nis: '12345678901',
        telefone: '(84) 99999-9999',
      };

      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        nis: '98765432101',
      };

      // Buscar o cidadão a ser atualizado
      mockCidadaoRepository.findById.mockResolvedValue(mockCidadao);
      mockCidadaoRepository.findByNis.mockResolvedValue({
        id: '2',
        nome: 'Maria Souza',
        nis: '12345678901',
      });

      await expect(service.update('1', updateCidadaoDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('1');
      expect(mockCidadaoRepository.findByNis).toHaveBeenCalledWith(
        '12345678901',
      );
      expect(mockCidadaoRepository.update).not.toHaveBeenCalled();
    });
  });

  // O método remove foi substituído por softDelete
  describe('remove', () => {
    it('deve remover um cidadão existente (soft delete)', async () => {
      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        cpf: '123.456.789-00',
      };

      // Buscar o cidadão existente
      mockCidadaoRepository.findById = jest.fn().mockResolvedValue(mockCidadao);

      // Simular soft delete bem-sucedido
      mockCidadaoRepository.remove = jest.fn().mockResolvedValue(undefined);

      await service.remove('1');

      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('1');
      expect(mockCidadaoRepository.remove).toHaveBeenCalledWith('1');
    });

    it('deve lançar NotFoundException quando o cidadão não existe', async () => {
      // Simular que o cidadão não existe
      mockCidadaoRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
      expect(mockCidadaoRepository.findById).toHaveBeenCalledWith('999');
      expect(mockCidadaoRepository.remove).not.toHaveBeenCalled();
    });
  });
});
