import { Test, TestingModule } from '@nestjs/testing';
import { ResilienceMonitoringController } from './resilience-monitoring.controller';
import { HybridCacheService } from '../services/hybrid-cache.service';
import { ResilientAuditoriaService } from '../services/resilient-auditoria.service';
import { HealthCheckService } from '../services/health-check.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

describe('ResilienceMonitoringController', () => {
  let controller: ResilienceMonitoringController;
  let hybridCacheService: jest.Mocked<HybridCacheService>;
  let auditoriaService: jest.Mocked<ResilientAuditoriaService>;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  const mockUser = {
    id: 1,
    email: 'admin@test.com',
    perfil: 'ADMINISTRADOR',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResilienceMonitoringController],
      providers: [
        {
          provide: HybridCacheService,
          useValue: {
            getMetrics: jest.fn(),
            getStatus: jest.fn(),
            performCacheWarming: jest.fn(),
            resetMetrics: jest.fn(),
            clear: jest.fn(),
          },
        },
        {
          provide: ResilientAuditoriaService,
          useValue: {
            getMetrics: jest.fn(),
            getStatus: jest.fn(),
            processBackupLogs: jest.fn(),
            resetMetrics: jest.fn(),
          },
        },
        {
          provide: HealthCheckService,
          useValue: {
            getServicesStatus: jest.fn(),
            checkRedisConnection: jest.fn(),
            checkDatabaseConnection: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ResilienceMonitoringController>(
      ResilienceMonitoringController,
    );
    hybridCacheService = module.get(HybridCacheService);
    auditoriaService = module.get(ResilientAuditoriaService);
    healthCheckService = module.get(HealthCheckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemStatus', () => {
    it('deve retornar status geral do sistema', async () => {
      // Arrange
      const mockServicesStatus = {
        redis: { status: 'up', responseTime: 10 },
        database: { status: 'up', responseTime: 5 },
        queue: { status: 'up', responseTime: 15 },
      };

      const mockCacheStatus = {
        l1Available: true,
        l2Available: true,
        circuitBreakerState: 'CLOSED',
      };

      const mockAuditoriaStatus = {
        queueEnabled: true,
        syncFallbackEnabled: true,
        fileFallbackEnabled: true,
        backupLogsCount: 0,
      };

      healthCheckService.getServicesStatus.mockReturnValue(mockServicesStatus);
      hybridCacheService.getStatus.mockReturnValue(mockCacheStatus);
      auditoriaService.getStatus.mockReturnValue(mockAuditoriaStatus);

      // Act
      const result = await controller.getSystemStatus();

      // Assert
      expect(result).toEqual({
        timestamp: expect.any(String),
        overallStatus: 'healthy',
        services: mockServicesStatus,
        cache: mockCacheStatus,
        auditoria: mockAuditoriaStatus,
      });
    });

    it('deve retornar status degraded quando há problemas', async () => {
      // Arrange
      const mockServicesStatus = {
        redis: { status: 'down', responseTime: null },
        database: { status: 'up', responseTime: 5 },
        queue: { status: 'down', responseTime: null },
      };

      const mockCacheStatus = {
        l1Available: true,
        l2Available: false,
        circuitBreakerState: 'OPEN',
      };

      const mockAuditoriaStatus = {
        queueEnabled: false,
        syncFallbackEnabled: true,
        fileFallbackEnabled: true,
        backupLogsCount: 5,
      };

      healthCheckService.getServicesStatus.mockReturnValue(mockServicesStatus);
      hybridCacheService.getStatus.mockReturnValue(mockCacheStatus);
      auditoriaService.getStatus.mockReturnValue(mockAuditoriaStatus);

      // Act
      const result = await controller.getSystemStatus();

      // Assert
      expect(result.overallStatus).toBe('degraded');
      expect(result.services).toEqual(mockServicesStatus);
      expect(result.cache).toEqual(mockCacheStatus);
      expect(result.auditoria).toEqual(mockAuditoriaStatus);
    });

    it('deve retornar status critical quando sistema principal está down', async () => {
      // Arrange
      const mockServicesStatus = {
        redis: { status: 'down', responseTime: null },
        database: { status: 'down', responseTime: null },
        queue: { status: 'down', responseTime: null },
      };

      const mockCacheStatus = {
        l1Available: false,
        l2Available: false,
        circuitBreakerState: 'OPEN',
      };

      const mockAuditoriaStatus = {
        queueEnabled: false,
        syncFallbackEnabled: false,
        fileFallbackEnabled: true,
        backupLogsCount: 10,
      };

      healthCheckService.getServicesStatus.mockReturnValue(mockServicesStatus);
      hybridCacheService.getStatus.mockReturnValue(mockCacheStatus);
      auditoriaService.getStatus.mockReturnValue(mockAuditoriaStatus);

      // Act
      const result = await controller.getSystemStatus();

      // Assert
      expect(result.overallStatus).toBe('critical');
    });
  });

  describe('getCacheMetrics', () => {
    it('deve retornar métricas detalhadas do cache', async () => {
      // Arrange
      const mockMetrics = {
        l1Hits: 100,
        l1Misses: 20,
        l2Hits: 15,
        l2Misses: 5,
        l1HitRate: 83.33,
        l2HitRate: 75.0,
        overallHitRate: 80.0,
        l1Size: 50,
        evictions: 3,
        warmingOperations: 2,
        failovers: 1,
        criticalKeysCount: 5,
      };

      hybridCacheService.getMetrics.mockReturnValue(mockMetrics);

      // Act
      const result = await controller.getCacheMetrics();

      // Assert
      expect(result).toEqual({
        timestamp: expect.any(String),
        metrics: mockMetrics,
      });
      expect(hybridCacheService.getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAuditoriaMetrics', () => {
    it('deve retornar métricas detalhadas da auditoria', async () => {
      // Arrange
      const mockMetrics = {
        totalLogs: 1000,
        queuedLogs: 50,
        processedLogs: 950,
        failedLogs: 5,
        syncFallbacks: 10,
        fileFallbacks: 2,
        backupLogsCount: 3,
        averageProcessingTime: 150,
        queueSuccessRate: 95.0,
        overallSuccessRate: 99.5,
      };

      auditoriaService.getMetrics.mockReturnValue(mockMetrics);

      // Act
      const result = await controller.getAuditoriaMetrics();

      // Assert
      expect(result).toEqual({
        timestamp: expect.any(String),
        metrics: mockMetrics,
      });
      expect(auditoriaService.getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('forceCacheWarming', () => {
    it('deve executar cache warming com sucesso', async () => {
      // Arrange
      hybridCacheService.performCacheWarming.mockResolvedValue(undefined);

      // Act
      const result = await controller.forceCacheWarming();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Cache warming iniciado com sucesso',
        timestamp: expect.any(String),
      });
      expect(hybridCacheService.performCacheWarming).toHaveBeenCalledTimes(1);
    });

    it('deve lidar com erro no cache warming', async () => {
      // Arrange
      const error = new Error('Cache warming failed');
      hybridCacheService.performCacheWarming.mockRejectedValue(error);

      // Act
      const result = await controller.forceCacheWarming();

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'Erro ao executar cache warming: Cache warming failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('processBackupLogs', () => {
    it('deve processar logs de backup com sucesso', async () => {
      // Arrange
      const processedCount = 15;
      auditoriaService.processBackupLogs.mockResolvedValue(processedCount);

      // Act
      const result = await controller.processBackupLogs();

      // Assert
      expect(result).toEqual({
        success: true,
        message: `${processedCount} logs de backup processados com sucesso`,
        processedCount,
        timestamp: expect.any(String),
      });
      expect(auditoriaService.processBackupLogs).toHaveBeenCalledTimes(1);
    });

    it('deve lidar com erro no processamento de logs', async () => {
      // Arrange
      const error = new Error('Backup processing failed');
      auditoriaService.processBackupLogs.mockRejectedValue(error);

      // Act
      const result = await controller.processBackupLogs();

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'Erro ao processar logs de backup: Backup processing failed',
        processedCount: 0,
        timestamp: expect.any(String),
      });
    });
  });

  describe('resetCacheMetrics', () => {
    it('deve resetar métricas do cache com sucesso', async () => {
      // Arrange
      hybridCacheService.resetMetrics.mockReturnValue(undefined);

      // Act
      const result = await controller.resetCacheMetrics();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Métricas do cache resetadas com sucesso',
        timestamp: expect.any(String),
      });
      expect(hybridCacheService.resetMetrics).toHaveBeenCalledTimes(1);
    });

    it('deve lidar com erro ao resetar métricas', async () => {
      // Arrange
      const error = new Error('Reset failed');
      hybridCacheService.resetMetrics.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = await controller.resetCacheMetrics();

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'Erro ao resetar métricas do cache: Reset failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('resetAuditoriaMetrics', () => {
    it('deve resetar métricas da auditoria com sucesso', async () => {
      // Arrange
      auditoriaService.resetMetrics.mockReturnValue(undefined);

      // Act
      const result = await controller.resetAuditoriaMetrics();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Métricas da auditoria resetadas com sucesso',
        timestamp: expect.any(String),
      });
      expect(auditoriaService.resetMetrics).toHaveBeenCalledTimes(1);
    });

    it('deve lidar com erro ao resetar métricas da auditoria', async () => {
      // Arrange
      const error = new Error('Auditoria reset failed');
      auditoriaService.resetMetrics.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = await controller.resetAuditoriaMetrics();

      // Assert
      expect(result).toEqual({
        success: false,
        message:
          'Erro ao resetar métricas da auditoria: Auditoria reset failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('clearCache', () => {
    it('deve limpar cache com sucesso', async () => {
      // Arrange
      hybridCacheService.clear.mockResolvedValue(undefined);

      // Act
      const result = await controller.clearCache();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Cache limpo com sucesso',
        timestamp: expect.any(String),
      });
      expect(hybridCacheService.clear).toHaveBeenCalledTimes(1);
    });

    it('deve lidar com erro ao limpar cache', async () => {
      // Arrange
      const error = new Error('Clear cache failed');
      hybridCacheService.clear.mockRejectedValue(error);

      // Act
      const result = await controller.clearCache();

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'Erro ao limpar cache: Clear cache failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('guards e decorators', () => {
    it('deve ter guards de autenticação e autorização configurados', () => {
      // Verificar se os guards estão aplicados através dos metadados
      const guards = Reflect.getMetadata(
        '__guards__',
        ResilienceMonitoringController,
      );
      expect(guards).toBeDefined();
    });

    it('deve ter role de ADMINISTRADOR configurada', () => {
      // Verificar se a role está aplicada através dos metadados
      const roles = Reflect.getMetadata(
        'roles',
        ResilienceMonitoringController,
      );
      expect(roles).toContain('ADMINISTRADOR');
    });
  });

  describe('tratamento de erros', () => {
    it('deve capturar e tratar erros inesperados', async () => {
      // Arrange
      hybridCacheService.getMetrics.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act & Assert
      await expect(controller.getCacheMetrics()).rejects.toThrow(
        'Unexpected error',
      );
    });

    it('deve manter consistência nos formatos de resposta', async () => {
      // Arrange
      const mockMetrics = {
        l1Hits: 0,
        l1Misses: 0,
        l2Hits: 0,
        l2Misses: 0,
        l1HitRate: 0,
        l2HitRate: 0,
        overallHitRate: 0,
        l1Size: 0,
        evictions: 0,
        warmingOperations: 0,
        failovers: 0,
        criticalKeysCount: 0,
      };

      hybridCacheService.getMetrics.mockReturnValue(mockMetrics);

      // Act
      const result = await controller.getCacheMetrics();

      // Assert
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metrics');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.metrics).toBe('object');
    });
  });

  describe('validação de entrada', () => {
    it('deve aceitar requisições válidas', async () => {
      // Arrange
      hybridCacheService.performCacheWarming.mockResolvedValue(undefined);

      // Act
      const result = await controller.forceCacheWarming();

      // Assert
      expect(result.success).toBe(true);
    });

    it('deve manter estado consistente após operações', async () => {
      // Arrange
      hybridCacheService.resetMetrics.mockReturnValue(undefined);
      auditoriaService.resetMetrics.mockReturnValue(undefined);

      // Act
      await controller.resetCacheMetrics();
      await controller.resetAuditoriaMetrics();

      // Assert
      expect(hybridCacheService.resetMetrics).toHaveBeenCalledTimes(1);
      expect(auditoriaService.resetMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance e timeout', () => {
    it('deve completar operações em tempo hábil', async () => {
      // Arrange
      const startTime = Date.now();
      hybridCacheService.getMetrics.mockReturnValue({
        l1Hits: 100,
        l1Misses: 20,
        l2Hits: 15,
        l2Misses: 5,
        l1HitRate: 83.33,
        l2HitRate: 75.0,
        overallHitRate: 80.0,
        l1Size: 50,
        evictions: 3,
        warmingOperations: 2,
        failovers: 1,
        criticalKeysCount: 5,
      });

      // Act
      await controller.getCacheMetrics();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo
    });

    it('deve lidar com operações assíncronas longas', async () => {
      // Arrange
      hybridCacheService.performCacheWarming.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simular operação lenta
      });

      // Act
      const result = await controller.forceCacheWarming();

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
