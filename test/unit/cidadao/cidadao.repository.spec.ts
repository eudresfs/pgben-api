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

      const result = await repository.findById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockTypeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        relations: ['papeis', 'composicao_familiar'],
      });
      expect(result).toEqual(mockCidadao);
    });

    it('deve buscar cidadão por ID sem relacionamentos quando especificado', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockCidadao);

      const result = await repository.findById('550e8400-e29b-41d4-a716-446655440000', false);

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
      mockTypeormRepository.findOne.mockResolvedValue({ ...mockCidadao, ...updateData });

      const result = await repository.update('550e8400-e29b-41d4-a716-446655440000', updateData);

      expect(mockTypeormRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        updateData,
      );
      expect(result.nome).toBe('João Silva Atualizado');
    });

    it('deve normalizar CPF antes de atualizar', async () => {
      const updateData = { cpf: '987.654.321-00' };
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepository.findOne.mockResolvedValue({ ...mockCidadao, cpf: '98765432100' });

      await repository.update('550e8400-e29b-41d4-a716-446655440000', updateData);

      expect(mockTypeormRepository.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { cpf: '98765432100' },
      );
    });

    it('deve normalizar NIS antes de atualizar', async () => {
      const updateData = { nis: '987.654.321-00' };
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepository.findOne.mockResolvedValue({ ...mockCidadao, nis: '98765432100' });

      await repository.update('550e8400-e29b-41d4-a716-446655440000', updateData);

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
        repository.update('550e8400-e29b-41d4-a716-446655440000', { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});