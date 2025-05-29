import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HybridCacheService } from './hybrid-cache.service';
import { HealthCheckService } from './health-check.service';
import { CacheService } from '../cache/cache.service';

describe('HybridCacheService', () => {
  let service: HybridCacheService;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                'CACHE_L1_MAX_SIZE': '100',
                'CACHE_DEFAULT_TTL': '60000',
                'CACHE_ENABLE_L2': 'true',
                'CACHE_ENABLE_WARMING': 'true',
                'CACHE_WARMING_INTERVAL': '30000'
              };
              return config[key] || defaultValue;
            })
          }
        },
        {
          provide: HealthCheckService,
          useValue: {
            isRedisAvailable: jest.fn()
          }
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            has: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<HybridCacheService>(HybridCacheService);
    healthCheckService = module.get(HealthCheckService);
    cacheService = module.get(CacheService);
    configService = module.get(ConfigService);

    // Reset metrics before each test
    service.resetMetrics();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('deve retornar valor do cache L1 quando disponível', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      // Simular valor no L1
      await service.set(key, value, 60000, 'medium');
      
      // Act
      const result = await service.get(key);
      
      // Assert
      expect(result).toEqual(value);
    });

    it('deve buscar no cache L2 quando L1 miss e L2 disponível', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(value);
      
      // Act
      const result = await service.get(key);
      
      // Assert
      expect(result).toEqual(value);
      expect(cacheService.get).toHaveBeenCalledWith(key);
    });

    it('deve retornar null quando não encontrado em nenhum cache', async () => {
      // Arrange
      const key = 'test-key';
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      
      // Act
      const result = await service.get(key);
      
      // Assert
      expect(result).toBeNull();
    });

    it('deve funcionar apenas com L1 quando L2 indisponível', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(false);
      
      // Adicionar ao L1
      await service.set(key, value, 60000, 'medium');
      
      // Act
      const result = await service.get(key);
      
      // Assert
      expect(result).toEqual(value);
      expect(cacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('deve armazenar no cache L1', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      
      // Act
      await service.set(key, value, 60000, 'medium');
      
      // Assert
      const result = await service.get(key);
      expect(result).toEqual(value);
    });

    it('deve armazenar no cache L2 quando disponível', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.set.mockResolvedValue(undefined);
      
      // Act
      await service.set(key, value, 60000, 'medium');
      
      // Assert
      expect(cacheService.set).toHaveBeenCalledWith(
        key,
        value,
        60000
      );
    });

    it('deve funcionar apenas com L1 quando L2 indisponível', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(false);
      
      // Act
      await service.set(key, value, 60000, 'medium');
      
      // Assert
      const result = await service.get(key);
      expect(result).toEqual(value);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('deve remover do cache L1', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      await service.set(key, value, 60000, 'medium');
      
      // Act
      await service.del(key);
      
      // Assert
      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('deve remover do cache L2 quando disponível', async () => {
      // Arrange
      const key = 'test-key';
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.del.mockResolvedValue(undefined);
      
      // Act
      await service.del(key);
      
      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(key);
    });
  });

  describe('has', () => {
    it('deve retornar true quando chave existe no L1', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      await service.set(key, value, 60000, 'medium');
      
      // Act
      const result = await service.has(key);
      
      // Assert
      expect(result).toBe(true);
    });

    it('deve verificar no L2 quando não existe no L1', async () => {
      // Arrange
      const key = 'test-key';
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.has.mockResolvedValue(true);
      
      // Act
      const result = await service.has(key);
      
      // Assert
      expect(result).toBe(true);
      expect(cacheService.has).toHaveBeenCalledWith(key);
    });

    it('deve retornar false quando não existe em nenhum cache', async () => {
      // Arrange
      const key = 'test-key';
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.has.mockResolvedValue(false);
      
      // Act
      const result = await service.has(key);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('deve retornar valor existente do cache', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'cached-value' };
      const factory = jest.fn().mockResolvedValue({ data: 'new-value' });
      
      await service.set(key, value, 60000, 'medium');
      
      // Act
      const result = await service.getOrSet(key, factory, 60000, 'medium');
      
      // Assert
      expect(result).toEqual(value);
      expect(factory).not.toHaveBeenCalled();
    });

    it('deve executar factory e armazenar quando valor não existe', async () => {
      // Arrange
      const key = 'test-key';
      const newValue = { data: 'new-value' };
      const factory = jest.fn().mockResolvedValue(newValue);
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      
      // Act
      const result = await service.getOrSet(key, factory, 60000, 'medium');
      
      // Assert
      expect(result).toEqual(newValue);
      expect(factory).toHaveBeenCalled();
    });
  });

  describe('eviction', () => {
    it('deve remover entradas expiradas durante limpeza', async () => {
      // Arrange
      const key1 = 'expired-key';
      const key2 = 'valid-key';
      const value1 = 'value1';
      const value2 = 'value2';
      
      // Simular entrada expirada
      await service.set(key1, value1, -1000, 'low'); // TTL negativo = expirado
      await service.set(key2, value2, 60000, 'medium');
      
      // Act
      await service['cleanupExpiredCache']();
      
      // Assert
      expect(await service.get(key1)).toBeNull();
      expect(await service.get(key2)).toBe(value2);
    });
  });

  describe('métricas', () => {
    it('deve calcular métricas corretamente', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      
      // Simular algumas operações
      await service.get(key); // L1 miss, L2 miss
      await service.set(key, value, 60000, 'medium');
      await service.get(key); // L1 hit

      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.l1Hits).toBe(1);
      expect(metrics.l1Misses).toBe(1);
      expect(metrics.l2Misses).toBe(1);
      expect(metrics.l1HitRate).toBe(50);
      expect(metrics.overallHitRate).toBeCloseTo(33.33, 2);
    });

    it('deve resetar métricas corretamente', () => {
      // Arrange - simular algumas operações
      service['metrics'] = {
        l1Hits: 10,
        l1Misses: 5,
        l2Hits: 3,
        l2Misses: 2,
        evictions: 1,
        warmingOperations: 2,
        failovers: 1
      };
      
      // Act
      service.resetMetrics();
      
      // Assert
      const metrics = service.getMetrics();
      expect(metrics.l1Hits).toBe(0);
      expect(metrics.l1Misses).toBe(0);
      expect(metrics.l2Hits).toBe(0);
      expect(metrics.l2Misses).toBe(0);
      expect(metrics.evictions).toBe(0);
      expect(metrics.warmingOperations).toBe(0);
      expect(metrics.failovers).toBe(0);
    });
  });

  describe('clear', () => {
    it('deve limpar todos os caches', async () => {
      // Arrange
      const key1 = 'key1';
      const key2 = 'key2';
      const value1 = 'value1';
      const value2 = 'value2';
      
      await service.set(key1, value1, 60000, 'medium');
      await service.set(key2, value2, 60000, 'medium');
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      
      // Act
      await service.clear();
      
      // Assert
      expect(await service.get(key1)).toBeUndefined();
      expect(await service.get(key2)).toBeUndefined();
    });
  });

  describe('warming', () => {
    it('deve aquecer cache com chaves críticas', async () => {
      // Arrange
      const criticalKey = 'critical-key';
      const value = { data: 'critical-value' };
      
      // Marcar como crítica
      await service.set(criticalKey, value, 60000, 'critical');
      
      // Simular que não está no L1 mas está no L2
      service['l1Cache'].clear();
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(value);
      
      // Act
      await service['performCacheWarming']();
      
      // Assert
      const result = await service.get(criticalKey);
      expect(result).toEqual(value);
    });
  });

  describe('error handling', () => {
    it('deve lidar com erros do L2 graciosamente', async () => {
      // Arrange
      const key = 'test-key';
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockRejectedValue(new Error('Redis error'));
      
      // Act & Assert
      const result = await service.get(key);
      expect(result).toBeNull();
      
      // Verificar se erro foi registrado nas métricas
       const metrics = service.getMetrics();
       expect(metrics.failovers).toBeGreaterThan(0);
    });

    it('deve continuar funcionando com L1 quando L2 falha', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.set.mockRejectedValue(new Error('Redis error'));
      
      // Act
      await service.set(key, value, 60000, 'medium');
      
      // Assert - deve funcionar com L1
      const result = await service.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('priority handling', () => {
    it('deve tratar prioridades corretamente', async () => {
      // Arrange
      const criticalKey = 'critical-key';
      const lowKey = 'low-key';
      const value = { data: 'test' };
      const factory = async () => value;
      
      // Act
      service.registerCriticalKey(criticalKey, factory);
      await service.getOrSet(lowKey, factory, 60000, 'low');
      
      // Assert - chave crítica deve estar marcada
      expect(service['criticalKeys'].has(criticalKey)).toBe(true);
      expect(service['criticalKeys'].has(lowKey)).toBe(false);
    });
  });

  describe('concurrent operations', () => {
    it('deve lidar com operações concorrentes', async () => {
      // Arrange
      const key = 'concurrent-key';
      const factory = jest.fn().mockResolvedValue({ data: 'factory-value' });
      
      healthCheckService.isRedisAvailable.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      
      // Act - múltiplas chamadas simultâneas
      const promises = [
        service.getOrSet(key, factory, 60000, 'medium'),
        service.getOrSet(key, factory, 60000, 'medium'),
        service.getOrSet(key, factory, 60000, 'medium')
      ];
      
      const results = await Promise.all(promises);
      
      // Assert - factory deve ser chamado apenas uma vez
      expect(factory).toHaveBeenCalledTimes(1);
      results.forEach(result => {
        expect(result).toEqual({ data: 'factory-value' });
      });
    });
  });
});