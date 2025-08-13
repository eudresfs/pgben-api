import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CidadaoRepository } from '@modules/cidadao/repositories/cidadao.repository';
import { Cidadao, Sexo } from '@modules/cidadao/entities/cidadao.entity';

describe('CidadaoRepository', () => {
  let repository: CidadaoRepository;
  let dataSource: DataSource;
  let typeormRepository: Repository<Cidadao>;

  const mockTypeormRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockTypeormRepository),
  };

  const mockCidadao: Cidadao = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João da Silva',
    nome_social: 'João',
    cpf: '12345678901',
    rg: '123456789',
    nis: '12345678901',
    nome_mae: 'Maria da Silva',
    naturalidade: 'São Paulo',
    prontuario_suas: 'SUAS123456',
    data_nascimento: new Date('1990-01-01'),
    sexo: Sexo.MASCULINO,
    telefone: '11999999999',
    email: 'joao@example.com',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234567',
    },
    papeis: [],
    composicao_familiar: [],
    ativo: true,
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
  } as unknown as Cidadao;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CidadaoRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<CidadaoRepository>(CidadaoRepository);
    dataSource = module.get<DataSource>(DataSource);
    typeormRepository = mockTypeormRepository as any;

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('deve buscar cidadão por ID com relacionamentos por padrão', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findById(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        relations: ['papeis', 'composicao_familiar'],
      });
      expect(result).toEqual(mockCidadao);
    });

    it('deve buscar cidadão por ID sem relacionamentos quando especificado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findById(
        '550e8400-e29b-41d4-a716-446655440000',
        false,
      );

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      expect(result).toEqual(mockCidadao);
    });

    it('deve retornar null quando cidadão não for encontrado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('findByCpf', () => {
    it('deve buscar cidadão por CPF normalizado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findByCpf('123.456.789-01');

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { cpf: '12345678901' },
      });
      expect(result).toEqual(mockCidadao);
    });

    it('deve buscar cidadão por CPF com relacionamentos quando especificado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findByCpf('12345678901', true);

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { cpf: '12345678901' },
        relations: ['papeis', 'composicao_familiar'],
      });
      expect(result).toEqual(mockCidadao);
    });
  });

  describe('findByNis', () => {
    it('deve buscar cidadão por NIS normalizado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findByNis('123.456.789-01');

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { nis: '12345678901' },
      });
      expect(result).toEqual(mockCidadao);
    });

    it('deve buscar cidadão por NIS com relacionamentos quando especificado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findByNis('12345678901', true);

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { nis: '12345678901' },
        relations: ['papeis', 'composicao_familiar'],
      });
      expect(result).toEqual(mockCidadao);
    });
  });

  describe('update', () => {
    it('deve atualizar cidadão e retornar dados atualizados', async () => {
      const updateData = { nome: 'João Silva Atualizado' };
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepository.findOne.mockResolvedValue({
        ...mockCidadao,
        ...updateData,
      });

      const result = await repository.update(
        '550e8400-e29b-41d4-a716-446655440000',
        updateData,
      );

      expect(mockTypeormRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        updateData,
      );
      expect(result.nome).toBe('João Silva Atualizado');
    });

    it('deve normalizar CPF antes de atualizar', async () => {
      const updateData = { cpf: '987.654.321-00' };
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepository.findOne.mockResolvedValue({
        ...mockCidadao,
        cpf: '98765432100',
      });

      await repository.update(
        '550e8400-e29b-41d4-a716-446655440000',
        updateData,
      );

      expect(mockTypeormRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { cpf: '98765432100' },
      );
    });

    it('deve normalizar NIS antes de atualizar', async () => {
      const updateData = { nis: '987.654.321-00' };
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepository.findOne.mockResolvedValue({
        ...mockCidadao,
        nis: '98765432100',
      });

      await repository.update(
        '550e8400-e29b-41d4-a716-446655440000',
        updateData,
      );

      expect(mockTypeormRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { nis: '98765432100' },
      );
    });

    it('deve lançar NotFoundException quando cidadão não for encontrado', async () => {
      mockTypeormRepository.update.mockResolvedValue({ affected: 0 });

      await expect(
        repository.update('id-inexistente', { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando cidadão não for encontrado após atualização', async () => {
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.update('550e8400-e29b-41d4-a716-446655440000', {
          nome: 'Teste',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllWithFilters', () => {
    const mockQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    beforeEach(() => {
      jest
        .spyOn(repository, 'createScopedQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
    });

    it('deve incluir flag encontrado_por_composicao_familiar quando buscar por CPF', async () => {
      const mockCidadaoComFlag = {
        ...mockCidadao,
        encontrado_por_composicao_familiar: true,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockCidadaoComFlag],
        1,
      ]);

      const result = await repository.findAllWithFilters({
        search: '98765432100', // CPF de membro familiar
        skip: 0,
        take: 10,
      });

      // Verifica se a query foi construída corretamente
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'composicao_familiar_search',
        'composicao_familiar_search',
        'composicao_familiar_search.cidadao_id = cidadao.id AND composicao_familiar_search.cpf = :searchCpf',
        { searchCpf: '98765432100' },
      );

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'CASE WHEN :searchCpf != cidadao.cpf AND composicao_familiar_search.cpf IS NOT NULL THEN true ELSE false END',
        'encontrado_por_composicao_familiar',
      );

      expect(result[0][0]).toHaveProperty(
        'encontrado_por_composicao_familiar',
        true,
      );
      expect(result[1]).toBe(1);
    });

    it('deve retornar flag false quando cidadão for encontrado pelo próprio CPF', async () => {
      const mockCidadaoSemFlag = {
        ...mockCidadao,
        encontrado_por_composicao_familiar: false,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockCidadaoSemFlag],
        1,
      ]);

      const result = await repository.findAllWithFilters({
        search: '12345678901', // CPF próprio do cidadão
        skip: 0,
        take: 10,
      });

      expect(result[0][0]).toHaveProperty(
        'encontrado_por_composicao_familiar',
        false,
      );
    });

    it('não deve incluir flag quando buscar por nome', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCidadao], 1]);

      const result = await repository.findAllWithFilters({
        search: 'João da Silva',
        skip: 0,
        take: 10,
      });

      // Verifica que não foi adicionado o leftJoin para composição familiar
      expect(mockQueryBuilder.leftJoin).not.toHaveBeenCalledWith(
        expect.stringContaining('composicao_familiar_search'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
