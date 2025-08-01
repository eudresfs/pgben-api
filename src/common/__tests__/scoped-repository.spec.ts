import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ScopedRepository } from '../repositories/scoped-repository';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { ScopeContextRequiredException } from '../exceptions/scope.exceptions';

// Mock entity para testes
class TestEntity {
  id: string;
  name: string;
  user_id: string;
  unidade_id: string;
  created_at: Date;
  updated_at: Date;
}

// Mock do RequestContextHolder
jest.mock('../services/request-context-holder.service');

describe('ScopedRepository', () => {
  let scopedRepository: ScopedRepository<TestEntity>;
  let mockRepository: jest.Mocked<Repository<TestEntity>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<TestEntity>>;
  let mockRequestContextHolder: jest.Mocked<typeof RequestContextHolder>;

  beforeEach(async () => {
    // Mock do QueryBuilder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn(),
      getManyAndCount: jest.fn(),
    } as any;

    // Mock do Repository
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      metadata: {
        tableName: 'test_entity',
        columns: [
          { propertyName: 'id' },
          { propertyName: 'name' },
          { propertyName: 'user_id' },
          { propertyName: 'unidade_id' },
          { propertyName: 'created_at' },
          { propertyName: 'updated_at' }
        ]
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(TestEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    // Criar instância do ScopedRepository usando Object.create para evitar problemas de construtor
    scopedRepository = Object.create(ScopedRepository.prototype);
    // Copiar métodos do mockRepository para o scopedRepository
    Object.assign(scopedRepository, {
      createQueryBuilder: mockRepository.createQueryBuilder,
      findOne: mockRepository.findOne,
      find: mockRepository.find,
      count: mockRepository.count,
      save: mockRepository.save,
      update: mockRepository.update,
      delete: mockRepository.delete,
    });
    
    // Definir metadata usando defineProperty para evitar erro de read-only
    Object.defineProperty(scopedRepository, 'metadata', {
      value: mockRepository.metadata,
      writable: false,
      enumerable: true,
      configurable: true
    });
    
    // Configurar opções para permitir métodos globais
    Object.defineProperty(scopedRepository, 'options', {
      value: {
        strictMode: false,
        allowGlobalScope: true
      },
      writable: false,
      enumerable: true,
      configurable: true
    });
    
    // Bind dos métodos do ScopedRepository para manter o contexto correto
    scopedRepository.findAll = ScopedRepository.prototype.findAll.bind(scopedRepository);
    scopedRepository.findById = ScopedRepository.prototype.findById.bind(scopedRepository);
    scopedRepository.countScoped = ScopedRepository.prototype.countScoped.bind(scopedRepository);
    scopedRepository.saveWithScope = ScopedRepository.prototype.saveWithScope.bind(scopedRepository);
    scopedRepository.updateWithScope = ScopedRepository.prototype.updateWithScope.bind(scopedRepository);
    scopedRepository.deleteWithScope = ScopedRepository.prototype.deleteWithScope.bind(scopedRepository);
    scopedRepository.findAllGlobal = ScopedRepository.prototype.findAllGlobal.bind(scopedRepository);
    scopedRepository.findByIdGlobal = ScopedRepository.prototype.findByIdGlobal.bind(scopedRepository);
    scopedRepository.countGlobal = ScopedRepository.prototype.countGlobal.bind(scopedRepository);
    scopedRepository.createScopedQueryBuilder = ScopedRepository.prototype.createScopedQueryBuilder.bind(scopedRepository);

    mockRequestContextHolder = RequestContextHolder as jest.Mocked<typeof RequestContextHolder>;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve aplicar filtro de escopo PROPRIO', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await scopedRepository.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('entity');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entity.user_id = :userId', {
        userId: 'user-123',
      });
    });

    it('deve aplicar filtro de escopo UNIDADE', async () => {
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'operator-123',
        unidade_id: 'unidade-789',
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await scopedRepository.findAll();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entity.unidade_id = :unidadeId', {
        unidadeId: 'unidade-789',
      });
    });

    it('deve não aplicar filtro para escopo GLOBAL', async () => {
      const context = {
        tipo: ScopeType.GLOBAL,
        user_id: 'admin-123',
        unidade_id: 'unidade-admin',
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await scopedRepository.findAll();

      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });

    it('deve aplicar ordenação padrão', async () => {
      const context = {
        tipo: ScopeType.GLOBAL,
        user_id: 'admin-123',
        unidade_id: null,
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await scopedRepository.findAll();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('entity.created_at', 'DESC');
    });
  });

  describe('findById', () => {
    it('deve buscar por ID com escopo PROPRIO', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await scopedRepository.findById('entity-id');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entity.id = :id', { id: 'entity-id' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entity.user_id = :userId', {
        userId: 'user-123',
      });
    });

    it('deve buscar por ID com escopo UNIDADE', async () => {
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'operator-123',
        unidade_id: 'unidade-789',
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await scopedRepository.findById('entity-id');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entity.id = :id', { id: 'entity-id' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entity.unidade_id = :unidadeId', {
        unidadeId: 'unidade-789',
      });
    });

    it('deve buscar por ID sem filtro adicional para escopo GLOBAL', async () => {
      const context = {
        tipo: ScopeType.GLOBAL,
        user_id: 'admin-123',
        unidade_id: null,
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await scopedRepository.findById('entity-id');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entity.id = :id', { id: 'entity-id' });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('countScoped', () => {
    it('deve contar com filtro de escopo', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getCount.mockResolvedValue(5);

      const count = await scopedRepository.countScoped();

      expect(count).toBe(5);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entity.user_id = :userId', {
        userId: 'user-123',
      });
    });
  });

  describe('saveWithScope', () => {
    it('deve salvar entidade com campos de escopo para PROPRIO', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      const entity = { name: 'Test Entity' } as TestEntity;
      const savedEntity = { ...entity, id: 'new-id', user_id: 'user-123', unidade_id: 'unidade-456' };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockRepository.save.mockResolvedValue(savedEntity);

      const result = await scopedRepository.saveWithScope(entity);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...entity,
        user_id: 'user-123',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(result).toEqual(savedEntity);
    });

    it('deve salvar entidade com campos de escopo para UNIDADE', async () => {
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'operator-123',
        unidade_id: 'unidade-789',
      };

      const entity = { name: 'Test Entity' } as TestEntity;
      const savedEntity = { ...entity, id: 'new-id', user_id: 'operator-123', unidade_id: 'unidade-789' };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockRepository.save.mockResolvedValue(savedEntity);

      const result = await scopedRepository.saveWithScope(entity);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...entity,
        user_id: 'operator-123',
        unidade_id: 'unidade-789',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(result).toEqual(savedEntity);
    });

    it('deve salvar entidade sem modificar campos para escopo GLOBAL', async () => {
      const context = {
        tipo: ScopeType.GLOBAL,
        user_id: 'admin-123',
        unidade_id: null,
      };

      const entity = { name: 'Test Entity' } as TestEntity;
      const savedEntity = { ...entity, id: 'new-id' };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockRepository.save.mockResolvedValue(savedEntity);

      const result = await scopedRepository.saveWithScope(entity);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...entity,
        user_id: 'admin-123',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(result).toEqual(savedEntity);
    });
  });

  describe('updateWithScope', () => {
    it('deve atualizar com filtro de escopo PROPRIO', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      const existingEntity = { 
        id: 'entity-id', 
        name: 'Original Name', 
        user_id: 'user-123',
        unidade_id: 'unidade-456',
        created_at: new Date(),
        updated_at: new Date()
      };
      const updateData = { name: 'Updated Name' };
      const updatedEntity = { ...existingEntity, ...updateData };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getOne.mockResolvedValueOnce(existingEntity).mockResolvedValueOnce(updatedEntity);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await scopedRepository.updateWithScope('entity-id', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('entity-id', updateData);
      expect(result).toEqual(updatedEntity);
    });

    it('deve atualizar com filtro de escopo UNIDADE', async () => {
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'operator-123',
        unidade_id: 'unidade-789',
      };

      const existingEntity = { 
        id: 'entity-id', 
        name: 'Original Name', 
        user_id: 'operator-123',
        unidade_id: 'unidade-789',
        created_at: new Date(),
        updated_at: new Date()
      };
      const updateData = { name: 'Updated Name' };
      const updatedEntity = { ...existingEntity, ...updateData };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getOne.mockResolvedValueOnce(existingEntity).mockResolvedValueOnce(updatedEntity);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await scopedRepository.updateWithScope('entity-id', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('entity-id', updateData);
      expect(result).toEqual(updatedEntity);
    });
  });

  describe('deleteWithScope', () => {
    it('deve deletar com filtro de escopo', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      const existingEntity = { 
        id: 'entity-id', 
        name: 'Test Entity', 
        user_id: 'user-123',
        unidade_id: 'unidade-456',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRequestContextHolder.get.mockReturnValue(context);
      mockQueryBuilder.getOne.mockResolvedValue(existingEntity);
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await scopedRepository.deleteWithScope('entity-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('entity-id');
    });
  });

  describe('métodos Global', () => {
    it('findAllGlobal deve não aplicar filtros de escopo', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await scopedRepository.findAllGlobal();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('entity');
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('entity.created_at', 'DESC');
    });

    it('findByIdGlobal deve buscar por ID sem filtros de escopo', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await scopedRepository.findByIdGlobal('entity-id');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('entity.id = :id', { id: 'entity-id' });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('countGlobal deve contar sem filtros de escopo', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(10);

      const count = await scopedRepository.countGlobal();

      expect(count).toBe(10);
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe('createScopedQueryBuilder', () => {
    it('deve criar query builder com filtros de escopo aplicados', () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-123',
        unidade_id: 'unidade-456',
      };

      mockRequestContextHolder.get.mockReturnValue(context);

      const queryBuilder = scopedRepository.createScopedQueryBuilder('test');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('test');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('test.user_id = :userId', {
        userId: 'user-123',
      });
    });
  });

  describe('tratamento de contexto ausente', () => {
    it('deve lançar ScopeContextRequiredException quando não há contexto de requisição', async () => {
      mockRequestContextHolder.get.mockReturnValue(undefined);

      await expect(scopedRepository.findAll()).rejects.toThrow(
        ScopeContextRequiredException
      );
      await expect(scopedRepository.findById('test-id')).rejects.toThrow(
        ScopeContextRequiredException
      );
      await expect(scopedRepository.countScoped()).rejects.toThrow(
        ScopeContextRequiredException
      );
    });
  });
});