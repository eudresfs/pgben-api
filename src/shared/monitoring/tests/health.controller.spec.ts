import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import {
  DiskHealthIndicator,
  MemoryHealthIndicator,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { HealthCheckService as AppHealthCheckService } from '../../services/health-check.service';
import { StorageHealthService } from '../../../modules/documento/services/storage-health.service';
import { UnifiedLoggerService } from '../../logging/unified-logger.service';

/**
 * Testes unitários para o controlador de saúde
 *
 * Verifica o funcionamento dos endpoints de verificação de saúde
 * da aplicação, incluindo verificações de banco de dados, disco e memória
 */
describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let diskHealthIndicator: DiskHealthIndicator;
  let memoryHealthIndicator: MemoryHealthIndicator;

  // Mocks para os serviços de verificação de saúde
  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };

  // Mock para o TypeOrmHealthIndicator
  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn(),
  };

  // Mock para o HttpHealthIndicator
  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  // Mock para o AppHealthCheckService
  const mockAppHealthCheckService = {
    isRedisAvailable: jest.fn(),
  };

  // Mock para o StorageHealthService
  const mockStorageHealthService = {
    checkHealth: jest.fn(),
  };

  // Mock para o UnifiedLoggerService
  const mockUnifiedLoggerService = {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: AppHealthCheckService,
          useValue: mockAppHealthCheckService,
        },
        {
          provide: StorageHealthService,
          useValue: mockStorageHealthService,
        },
        {
          provide: UnifiedLoggerService,
          useValue: mockUnifiedLoggerService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    diskHealthIndicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
    memoryHealthIndicator = module.get<MemoryHealthIndicator>(
      MemoryHealthIndicator,
    );
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('deve verificar a saúde do banco de dados', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockTypeOrmHealthIndicator.pingCheck).not.toHaveBeenCalled(); // Chamado dentro da função check
    });
  });

  describe('checkSystem', () => {
    it('deve verificar o espaço em disco e memória', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          disk: {
            status: 'up',
            details: {
              free: 100000000,
              total: 500000000,
            },
          },
          memory_heap: {
            status: 'up',
          },
          memory_rss: {
            status: 'up',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.checkSystem();

      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockDiskHealthIndicator.checkStorage).not.toHaveBeenCalled(); // Chamado dentro da função check
      expect(mockMemoryHealthIndicator.checkHeap).not.toHaveBeenCalled(); // Chamado dentro da função check
      expect(mockMemoryHealthIndicator.checkRSS).not.toHaveBeenCalled(); // Chamado dentro da função check
    });
  });

  describe('checkDatabase', () => {
    it('deve verificar a conexão com o banco de dados', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.checkDatabase();

      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockTypeOrmHealthIndicator.pingCheck).not.toHaveBeenCalled(); // Chamado dentro da função check
    });
  });

  describe('liveness', () => {
    it('deve retornar status ok para liveness check', () => {
      const result = controller.liveness();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(mockUnifiedLoggerService.debug).toHaveBeenCalledWith('Liveness check');
    });

    it('deve retornar timestamp como Date object', () => {
      const result = controller.liveness();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('readiness', () => {
    it('deve executar readiness check com sucesso', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          frontend: { status: 'up' },
          memory_heap: { status: 'up' },
          disk: { status: 'up' },
          redis: { status: 'disabled' },
          storage: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);
      mockAppHealthCheckService.isRedisAvailable.mockResolvedValue(false);
      
      // Mock da variável de ambiente
      process.env.DISABLE_REDIS = 'true';

      const result = await controller.readiness();

      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockUnifiedLoggerService.debug).toHaveBeenCalledWith('Readiness check iniciado');
      
      // Limpar mock da variável de ambiente
      delete process.env.DISABLE_REDIS;
    });
  });

  describe('ping', () => {
    it('deve retornar status ok e informações básicas', () => {
      const result = controller.ping();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'pgben-api');
      expect(result).toHaveProperty('version');
    });

    it('deve retornar timestamp como string ISO', () => {
      const result = controller.ping();
      expect(typeof result.timestamp).toBe('string');
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  describe('checkRedis', () => {
    it('deve verificar Redis quando habilitado', async () => {
      mockAppHealthCheckService.isRedisAvailable.mockResolvedValue(true);
      delete process.env.DISABLE_REDIS;

      const result = await controller.checkRedis();

      expect(result.status).toBe('up');
      expect(result.info.redis.status).toBe('up');
      expect(result.info.redis.message).toBe('Conexão com Redis estabelecida');
    });

    it('deve retornar status disabled quando Redis está desabilitado', async () => {
      process.env.DISABLE_REDIS = 'true';

      const result = await controller.checkRedis();

      expect(result.status).toBe('disabled');
      expect(result.info.redis.status).toBe('disabled');
      expect(result.info.redis.message).toBe('Redis desabilitado por configuração');
      
      delete process.env.DISABLE_REDIS;
    });
  });

  describe('checkStorage', () => {
    it('deve verificar status do storage', async () => {
      const mockStorageStatus = {
        isHealthy: true,
        provider: 'minio',
        details: {},
        timestamp: new Date(),
      };

      mockStorageHealthService.checkHealth.mockResolvedValue(mockStorageStatus);

      const result = await controller.checkStorage();

      expect(result.storage.status).toBe('up');
      expect(result.storage.provider).toBe('minio');
      expect(result.storage.message).toBe('OK');
    });

    it('deve retornar status down quando storage não está saudável', async () => {
      const mockStorageStatus = {
        isHealthy: false,
        provider: 'minio',
        details: { error: 'Connection failed' },
        timestamp: new Date(),
      };

      mockStorageHealthService.checkHealth.mockResolvedValue(mockStorageStatus);

      const result = await controller.checkStorage();

      expect(result.storage.status).toBe('down');
      expect(result.storage.message).toBe('Connection failed');
    });
  });
});
