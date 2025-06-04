import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Integrador } from '../entities/integrador.entity';
import { IntegradorService } from '../services/integrador.service';
import { CreateIntegradorDto } from '../dto/create-integrador.dto';
import { UpdateIntegradorDto } from '../dto/update-integrador.dto';

/**
 * Testes unitários para o serviço de integradores.
 * Valida as operações CRUD e regras de negócio específicas.
 */
describe('IntegradorService', () => {
  let service: IntegradorService;
  let repository: Repository<Integrador>;

  // Mock do repositório TypeORM
  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // Configuração do módulo de teste
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegradorService,
        {
          provide: getRepositoryToken(Integrador),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IntegradorService>(IntegradorService);
    repository = module.get<Repository<Integrador>>(
      getRepositoryToken(Integrador),
    );
  });

  // Limpar mocks após cada teste
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Testes para verificar se o serviço foi definido corretamente
  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar um novo integrador com sucesso', async () => {
      // Arrange
      const createDto: CreateIntegradorDto = {
        nome: 'Integrador Teste',
        descricao: 'Descrição do integrador de teste',
        responsavel: 'João da Silva',
        emailContato: 'joao@teste.com',
        telefoneContato: '84999999999',
        permissoesEscopo: ['read:dados_basicos'],
        ipPermitidos: ['192.168.1.1'],
        ativo: true,
      };

      const integrador = {
        id: 'uuid-teste',
        ...createDto,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
        ultimoAcesso: null,
        tokens: [],
      };

      // Configurar mock para retornar null (integrador não existe)
      mockRepository.findOne.mockResolvedValue(null);
      // Configurar mocks para criar e salvar integrador
      mockRepository.create.mockReturnValue(integrador);
      mockRepository.save.mockResolvedValue(integrador);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nome: createDto.nome },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(integrador);
      expect(result).toBeDefined();
      expect(result.id).toEqual(integrador.id);
      expect(result.nome).toEqual(integrador.nome);
    });

    it('deve lançar ConflictException quando tentar criar integrador com nome duplicado', async () => {
      // Arrange
      const createDto: CreateIntegradorDto = {
        nome: 'Integrador Duplicado',
        ativo: true,
      };

      // Configurar mock para retornar um integrador existente
      mockRepository.findOne.mockResolvedValue({
        id: 'uuid-existente',
        nome: 'Integrador Duplicado',
      });

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nome: createDto.nome },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar uma lista de integradores', async () => {
      // Arrange
      const integradores = [
        {
          id: 'uuid-1',
          nome: 'Integrador 1',
          dataCriacao: new Date(),
          dataAtualizacao: new Date(),
        },
        {
          id: 'uuid-2',
          nome: 'Integrador 2',
          dataCriacao: new Date(),
          dataAtualizacao: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(integradores);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(integradores[0].id);
      expect(result[1].id).toEqual(integradores[1].id);
    });
  });

  describe('findById', () => {
    it('deve encontrar um integrador pelo ID', async () => {
      // Arrange
      const integrador = {
        id: 'uuid-teste',
        nome: 'Integrador Teste',
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(integrador);

      // Act
      const result = await service.findById('uuid-teste');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-teste' },
      });
      expect(result).toEqual(integrador);
    });

    it('deve lançar NotFoundException quando integrador não for encontrado', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-inexistente' },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar um integrador com sucesso', async () => {
      // Arrange
      const integrador = {
        id: 'uuid-teste',
        nome: 'Integrador Antigo',
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
      };

      const updateDto: UpdateIntegradorDto = {
        nome: 'Integrador Atualizado',
        descricao: 'Nova descrição',
      };

      const integradorAtualizado = {
        ...integrador,
        ...updateDto,
        dataAtualizacao: new Date(),
      };

      // Mock para findById
      mockRepository.findOne.mockResolvedValueOnce(integrador);
      // Mock para verificar nome duplicado
      mockRepository.findOne.mockResolvedValueOnce(null);
      // Mock para salvar
      mockRepository.save.mockResolvedValue(integradorAtualizado);

      // Act
      const result = await service.update('uuid-teste', updateDto);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-teste' },
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nome: updateDto.nome },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.nome).toEqual(updateDto.nome);
      expect(result.descricao).toEqual(updateDto.descricao);
    });

    it('deve lançar ConflictException ao tentar atualizar para um nome duplicado', async () => {
      // Arrange
      const integrador = {
        id: 'uuid-teste',
        nome: 'Integrador Antigo',
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
      };

      const updateDto: UpdateIntegradorDto = {
        nome: 'Integrador Duplicado',
      };

      const integradorExistente = {
        id: 'outro-uuid',
        nome: 'Integrador Duplicado',
      };

      // Mock para findById
      mockRepository.findOne.mockResolvedValueOnce(integrador);
      // Mock para verificar nome duplicado - retorna outro integrador
      mockRepository.findOne.mockResolvedValueOnce(integradorExistente);

      // Act & Assert
      await expect(service.update('uuid-teste', updateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-teste' },
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nome: updateDto.nome },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover um integrador com sucesso', async () => {
      // Arrange
      const integrador = {
        id: 'uuid-teste',
        nome: 'Integrador para Remover',
      };

      mockRepository.findOne.mockResolvedValue(integrador);
      mockRepository.remove.mockResolvedValue(undefined);

      // Act
      await service.remove('uuid-teste');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-teste' },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(integrador);
    });
  });

  describe('toggleAtivo', () => {
    it('deve ativar um integrador inativo', async () => {
      // Arrange
      const integrador = {
        id: 'uuid-teste',
        nome: 'Integrador Test',
        ativo: false,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
      };

      const integradorAtivado = {
        ...integrador,
        ativo: true,
      };

      mockRepository.findOne.mockResolvedValue(integrador);
      mockRepository.save.mockResolvedValue(integradorAtivado);

      // Act
      const result = await service.toggleAtivo('uuid-teste', true);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-teste' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...integrador,
        ativo: true,
      });
      expect(result.ativo).toBe(true);
    });
  });

  describe('registrarAcesso', () => {
    it('deve atualizar o timestamp de último acesso', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await service.registrarAcesso('uuid-teste');

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'uuid-teste' },
        { ultimoAcesso: expect.any(Date) },
      );
    });
  });
});
