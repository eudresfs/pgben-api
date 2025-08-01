import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { ScopedRepository } from './scoped-repository';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { CacheService } from '../../shared/cache/cache.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';

// Mock entity para testes
class TestEntity {
  id: number;
  unidade_id: number;
  user_id: number;
  created_at: Date;
  nome: string;
}

describe('ScopedRepository - Performance Optimizations', () => {
  let scopedRepository: ScopedRepository<TestEntity>;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockRequestContextHolder: jest.Mocked<RequestContextHolder>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<TestEntity>>;

  const mockContext: IScopeContext = {
    tipo: ScopeType.UNIDADE,
    user_id: '123',
    unidade_id: '1'
  };

  beforeEach(async () => {
    // Mock do QueryBuilder
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      comment: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue('SELECT * FROM test_entity'),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0)
    } as any;

    // Mock do EntityManager
    mockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      getRepository: jest.fn()
    } as any;

    // Mock do CacheService
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      has: jest.fn()
    } as any;

    // Mock do RequestContextHolder (métodos estáticos)
    mockRequestContextHolder = {} as any;
    
    // Mock dos métodos estáticos
    jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);
    jest.spyOn(RequestContextHolder, 'getRequired').mockReturnValue(mockContext);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(TestEntity),
          useValue: {
            metadata: {
              name: 'TestEntity',
              tableName: 'test_entity',
              columns: [
                { propertyName: 'id' },
                { propertyName: 'unidade_id' },
                { propertyName: 'user_id' },
                { propertyName: 'created_at' },
                { propertyName: 'nome' }
              ]
            },
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
          }
        },
        {
          provide: RequestContextHolder,
          useValue: mockRequestContextHolder
        },
        {
          provide: CacheService,
          useValue: mockCacheService
        }
      ]
    }).compile();

    const baseRepository = module.get<Repository<TestEntity>>(getRepositoryToken(TestEntity));
    
    // Criar ScopedRepository com opções de performance
    scopedRepository = new ScopedRepository(
      TestEntity,
      mockEntityManager,
      undefined,
      {
        enableMetadataCache: true,
        enableQueryHints: true,
        forceIndexUsage: true,
        metadataCacheTTL: 3600
      },
      mockCacheService
    );

    // Configurar metadata mock usando Object.defineProperty
    Object.defineProperty(scopedRepository, 'metadata', {
      value: baseRepository.metadata,
      writable: false,
      configurable: true
    });
  });

  describe('Cache de Metadados', () => {
    it('deve usar cache para verificação de colunas', () => {
      // Primeira chamada - deve construir cache
      const hasColumn1 = (scopedRepository as any).hasColumn('unidade_id');
      expect(hasColumn1).toBe(true);

      // Segunda chamada - deve usar cache
      const hasColumn2 = (scopedRepository as any).hasColumn('unidade_id');
      expect(hasColumn2).toBe(true);

      // Verificar que o cache foi usado
      const cacheStats = ScopedRepository.getCacheStats();
      expect(cacheStats.l1Size).toBeGreaterThan(0);
      expect(cacheStats.entities).toContain('TestEntity');
    });

    it('deve invalidar cache quando solicitado', () => {
      // Construir cache
      (scopedRepository as any).hasColumn('unidade_id');
      
      // Verificar que cache existe
      let cacheStats = ScopedRepository.getCacheStats();
      expect(cacheStats.l1Size).toBeGreaterThan(0);

      // Limpar cache
      scopedRepository.clearMetadataCache();
      
      // Verificar que cache foi limpo
      cacheStats = ScopedRepository.getCacheStats();
      expect(cacheStats.l1Size).toBe(0);
    });

    it('deve usar cache L1 para melhorar performance', () => {
      // Primeira chamada - deve construir o cache
      const hasColumn1 = (scopedRepository as any).hasColumn('unidade_id');
      expect(hasColumn1).toBe(true);
      
      // Segunda chamada - deve usar o cache L1
      const hasColumn2 = (scopedRepository as any).hasColumn('unidade_id');
      expect(hasColumn2).toBe(true);
      
      // Verificar que o cache L1 está sendo usado
      const stats = ScopedRepository.getCacheStats();
      expect(stats.l1Size).toBeGreaterThan(0);
    });

    it('deve funcionar sem cache quando desabilitado', () => {
      const repoWithoutCache = new ScopedRepository(
        TestEntity,
        mockEntityManager,
        undefined,
        { enableMetadataCache: false }
      );
      
      Object.defineProperty(repoWithoutCache, 'metadata', {
        value: (scopedRepository as any).metadata,
        writable: false,
        configurable: true
      });
      
      const hasColumn = (repoWithoutCache as any).hasColumn('unidade_id');
      expect(hasColumn).toBe(true);
      
      // Cache não deve ter sido usado
      const cacheStats = ScopedRepository.getCacheStats();
      expect(cacheStats.entities).not.toContain('TestEntity');
    });
  });

  describe('Query Hints e Otimizações', () => {
    it('deve aplicar query hints para escopo UNIDADE', () => {
      const queryBuilder = scopedRepository.createOptimizedQueryBuilder('entity', {
        useScopeIdIndex: true,
        useOptimizedPagination: true
      });
      
      expect(mockQueryBuilder.comment).toHaveBeenCalledWith(
        expect.stringContaining('USE INDEX: scope_id_composite')
      );
      expect(mockQueryBuilder.comment).toHaveBeenCalledWith(
        expect.stringContaining('HINT: Optimized for pagination')
      );
    });

    it('deve aplicar otimizações de paginação', () => {
      mockQueryBuilder.getQuery.mockReturnValue('SELECT * FROM test_entity LIMIT 10 OFFSET 20');
      
      (scopedRepository as any).applyPaginationOptimizations(mockQueryBuilder);
      
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('entity.id', 'ASC');
      expect(mockQueryBuilder.comment).toHaveBeenCalledWith(
        expect.stringContaining('cursor-based pagination')
      );
    });

    it('deve aplicar hints específicos por tipo de escopo', () => {
      const contextUnidade: IScopeContext = {
        tipo: ScopeType.UNIDADE,
        user_id: '123',
        unidade_id: '1'
      };
      
      (scopedRepository as any).applyQueryHints(mockQueryBuilder, contextUnidade, 'entity');
      
      expect(mockQueryBuilder.comment).toHaveBeenCalledWith(
        expect.stringContaining('idx_test_entity_unidade_id')
      );
    });

    it('deve aplicar hints para escopo PROPRIO', () => {
      const contextProprio: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123'
      };
      
      (scopedRepository as any).applyQueryHints(mockQueryBuilder, contextProprio, 'entity');
      
      expect(mockQueryBuilder.comment).toHaveBeenCalledWith(
        expect.stringContaining('idx_test_entity_user_id')
      );
    });

    it('deve configurar threshold para LIMIT otimizado', () => {
      const queryBuilder = scopedRepository.createOptimizedQueryBuilder('entity', {
        optimizedLimitThreshold: 1000
      });
      
      expect(mockQueryBuilder.comment).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT_THRESHOLD: 1000')
      );
    });
  });

  describe('Performance Metrics', () => {
    it('deve fornecer estatísticas de cache', () => {
      // Construir alguns caches
      (scopedRepository as any).hasColumn('unidade_id');
      (scopedRepository as any).hasColumn('user_id');
      
      const stats = ScopedRepository.getCacheStats();
      
      expect(stats).toHaveProperty('l1Size');
      expect(stats).toHaveProperty('entities');
      expect(stats).toHaveProperty('oldestCache');
      expect(stats).toHaveProperty('newestCache');
      expect(stats.l1Size).toBeGreaterThan(0);
    });

    it('deve limpar todo o cache de metadados', () => {
      // Construir cache
      (scopedRepository as any).hasColumn('unidade_id');
      
      // Verificar que existe
      let stats = ScopedRepository.getCacheStats();
      expect(stats.l1Size).toBeGreaterThan(0);
      
      // Limpar tudo
      ScopedRepository.clearAllMetadataCache();
      
      // Verificar que foi limpo
      stats = ScopedRepository.getCacheStats();
      expect(stats.l1Size).toBe(0);
    });
  });

  describe('Configuração de Cache Service', () => {
    it('deve configurar cache service globalmente', () => {
      const newCacheService = {} as CacheService;
      
      ScopedRepository.setCacheService(newCacheService);
      
      // Verificar que foi configurado (através de efeito colateral)
      expect(() => ScopedRepository.setCacheService(newCacheService)).not.toThrow();
    });
  });

  describe('Integração com RequestContextHolder', () => {
    it('deve usar query hints em operações com contexto', async () => {
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);
      
      await scopedRepository.findAll();
      
      // Verificar que query hints foram aplicados
      expect(mockQueryBuilder.comment).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    // Limpar cache entre testes
    ScopedRepository.clearAllMetadataCache();
    jest.clearAllMocks();
  });
});