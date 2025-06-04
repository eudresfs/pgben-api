import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ResilientAuditoriaService } from './resilient-auditoria.service';
import { AuditoriaService } from '../../modules/auditoria/services/auditoria.service';
import { AuditoriaQueueService } from '../../modules/auditoria/services/auditoria-queue.service';
import { HealthCheckService } from './health-check.service';
import { CreateLogAuditoriaDto } from '../../modules/auditoria/dto/create-log-auditoria.dto';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mocks
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    appendFile: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('ResilientAuditoriaService', () => {
  let service: ResilientAuditoriaService;
  let auditoriaService: jest.Mocked<AuditoriaService>;
  let auditoriaQueueService: jest.Mocked<AuditoriaQueueService>;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let configService: jest.Mocked<ConfigService>;

  const mockLogData: CreateLogAuditoriaDto = {
    acao: 'CREATE',
    entidade: 'Usuario',
    entidadeId: '123',
    usuarioId: 'user-123',
    dadosAnteriores: null,
    dadosNovos: { nome: 'Teste' },
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResilientAuditoriaService,
        {
          provide: AuditoriaService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: AuditoriaQueueService,
          useValue: {
            enfileirarLogAuditoria: jest.fn(),
          },
        },
        {
          provide: HealthCheckService,
          useValue: {
            getServicesStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                AUDITORIA_BACKUP_PATH: './test-logs/audit-backup',
                AUDITORIA_ENABLE_SYNC_FALLBACK: 'true',
                AUDITORIA_ENABLE_FILE_BACKUP: 'true',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ResilientAuditoriaService>(ResilientAuditoriaService);
    auditoriaService = module.get(AuditoriaService);
    auditoriaQueueService = module.get(AuditoriaQueueService);
    healthCheckService = module.get(HealthCheckService);
    configService = module.get(ConfigService);

    // Limpar métricas antes de cada teste
    service.resetMetrics();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registrarLogResilient', () => {
    it('deve registrar log via fila quando disponível', async () => {
      // Arrange
      auditoriaQueueService.enfileirarLogAuditoria.mockResolvedValue(undefined);

      // Act
      await service.registrarLogResilient(mockLogData);

      // Assert
      expect(auditoriaQueueService.enfileirarLogAuditoria).toHaveBeenCalledWith(
        mockLogData,
      );
      expect(auditoriaService.create).not.toHaveBeenCalled();

      const metrics = service.getMetrics();
      expect(metrics.queueSuccesses).toBe(1);
      expect(metrics.queueFailures).toBe(0);
    });

    it('deve usar fallback síncrono quando fila falha', async () => {
      // Arrange
      const queueError = new Error('Fila indisponível');
      auditoriaQueueService.enfileirarLogAuditoria.mockRejectedValue(
        queueError,
      );
      auditoriaService.create.mockResolvedValue({ id: '123' } as any);

      // Act
      await service.registrarLogResilient(mockLogData);

      // Assert
      expect(auditoriaQueueService.enfileirarLogAuditoria).toHaveBeenCalledWith(
        mockLogData,
      );
      expect(auditoriaService.create).toHaveBeenCalledWith(mockLogData);

      const metrics = service.getMetrics();
      expect(metrics.queueFailures).toBe(1);
      expect(metrics.syncFallbacks).toBe(1);
    });

    it('deve usar backup em arquivo quando fila e sync falham', async () => {
      // Arrange
      const queueError = new Error('Fila indisponível');
      const syncError = new Error('Banco indisponível');

      auditoriaQueueService.enfileirarLogAuditoria.mockRejectedValue(
        queueError,
      );
      auditoriaService.create.mockRejectedValue(syncError);
      (fs.appendFile as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.registrarLogResilient(mockLogData);

      // Assert
      expect(auditoriaQueueService.enfileirarLogAuditoria).toHaveBeenCalledWith(
        mockLogData,
      );
      expect(auditoriaService.create).toHaveBeenCalledWith(mockLogData);
      expect(fs.appendFile).toHaveBeenCalled();

      const metrics = service.getMetrics();
      expect(metrics.queueFailures).toBe(1);
      expect(metrics.syncFallbacks).toBe(0); // Falhou antes de contar como sucesso
      expect(metrics.fileBackups).toBe(1);
    });

    it('deve falhar quando todas as estratégias falham', async () => {
      // Arrange
      const queueError = new Error('Fila indisponível');
      const syncError = new Error('Banco indisponível');
      const fileError = new Error('Disco cheio');

      auditoriaQueueService.enfileirarLogAuditoria.mockRejectedValue(
        queueError,
      );
      auditoriaService.create.mockRejectedValue(syncError);
      (fs.appendFile as jest.Mock).mockRejectedValue(fileError);

      // Act & Assert
      await expect(service.registrarLogResilient(mockLogData)).rejects.toThrow(
        'Falha total na auditoria',
      );

      const metrics = service.getMetrics();
      expect(metrics.queueFailures).toBe(1);
      expect(metrics.fileBackups).toBe(0);
    });

    it('deve respeitar timeout na fila', async () => {
      // Arrange
      auditoriaQueueService.enfileirarLogAuditoria.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 3000)), // 3 segundos
      );
      auditoriaService.create.mockResolvedValue({ id: '123' } as any);

      // Act
      await service.registrarLogResilient(mockLogData);

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(mockLogData);

      const metrics = service.getMetrics();
      expect(metrics.queueFailures).toBe(1);
      expect(metrics.syncFallbacks).toBe(1);
    });

    it('deve respeitar timeout no sync', async () => {
      // Arrange
      const queueError = new Error('Fila indisponível');
      auditoriaQueueService.enfileirarLogAuditoria.mockRejectedValue(
        queueError,
      );
      auditoriaService.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 6000)), // 6 segundos
      );
      (fs.appendFile as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.registrarLogResilient(mockLogData);

      // Assert
      expect(fs.appendFile).toHaveBeenCalled();

      const metrics = service.getMetrics();
      expect(metrics.fileBackups).toBe(1);
    });
  });

  describe('processBackupAuditLogs', () => {
    it('deve processar logs de backup com sucesso', async () => {
      // Arrange
      const backupLogs = [
        {
          id: 'backup_1',
          timestamp: new Date().toISOString(),
          data: mockLogData,
          status: 'pending_recovery' as const,
          attempts: 0,
        },
      ];

      (fs.readdir as jest.Mock).mockResolvedValue([
        'audit-backup-2024-01-01.jsonl',
      ]);
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(backupLogs[0]),
      );
      auditoriaService.create.mockResolvedValue({ id: '123' } as any);

      // Spy nos métodos privados
      const markAsProcessedSpy = jest
        .spyOn(service as any, 'markLogAsProcessed')
        .mockResolvedValue(undefined);

      // Act
      await service.processBackupAuditLogs();

      // Assert
      expect(auditoriaService.create).toHaveBeenCalledWith(mockLogData);
      expect(markAsProcessedSpy).toHaveBeenCalledWith('backup_1');

      const metrics = service.getMetrics();
      expect(metrics.recoveredLogs).toBe(1);
    });

    it('deve incrementar tentativas quando falha na recuperação', async () => {
      // Arrange
      const backupLogs = [
        {
          id: 'backup_1',
          timestamp: new Date().toISOString(),
          data: mockLogData,
          status: 'pending_recovery' as const,
          attempts: 1,
        },
      ];

      (fs.readdir as jest.Mock).mockResolvedValue([
        'audit-backup-2024-01-01.jsonl',
      ]);
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(backupLogs[0]),
      );
      auditoriaService.create.mockRejectedValue(new Error('Falha temporária'));

      // Spy nos métodos privados
      const updateAttemptsSpy = jest
        .spyOn(service as any, 'updateLogAttempts')
        .mockResolvedValue(undefined);

      // Act
      await service.processBackupAuditLogs();

      // Assert
      expect(updateAttemptsSpy).toHaveBeenCalledWith('backup_1', 2);

      const metrics = service.getMetrics();
      expect(metrics.recoveredLogs).toBe(0);
    });

    it('deve marcar como falha definitiva após máximo de tentativas', async () => {
      // Arrange
      const backupLogs = [
        {
          id: 'backup_1',
          timestamp: new Date().toISOString(),
          data: mockLogData,
          status: 'pending_recovery' as const,
          attempts: 2, // Próxima tentativa será a 3ª (máximo)
        },
      ];

      (fs.readdir as jest.Mock).mockResolvedValue([
        'audit-backup-2024-01-01.jsonl',
      ]);
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(backupLogs[0]),
      );
      auditoriaService.create.mockRejectedValue(new Error('Falha permanente'));

      // Spy nos métodos privados
      const markAsFailedSpy = jest
        .spyOn(service as any, 'markLogAsFailed')
        .mockResolvedValue(undefined);

      // Act
      await service.processBackupAuditLogs();

      // Assert
      expect(markAsFailedSpy).toHaveBeenCalledWith('backup_1');
    });

    it('deve lidar com arquivos de backup corrompidos', async () => {
      // Arrange
      (fs.readdir as jest.Mock).mockResolvedValue([
        'audit-backup-2024-01-01.jsonl',
      ]);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json content');

      // Act & Assert
      await expect(service.processBackupAuditLogs()).resolves.not.toThrow();

      // Deve continuar processamento mesmo com arquivo corrompido
      const metrics = service.getMetrics();
      expect(metrics.recoveredLogs).toBe(0);
    });

    it('deve ignorar logs que já excederam tentativas máximas', async () => {
      // Arrange
      const backupLogs = [
        {
          id: 'backup_1',
          timestamp: new Date().toISOString(),
          data: mockLogData,
          status: 'pending_recovery' as const,
          attempts: 5, // Excede o máximo de 3
        },
      ];

      (fs.readdir as jest.Mock).mockResolvedValue([
        'audit-backup-2024-01-01.jsonl',
      ]);
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(backupLogs[0]),
      );

      // Act
      await service.processBackupAuditLogs();

      // Assert
      expect(auditoriaService.create).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('deve retornar métricas corretas', () => {
      // Arrange - simular algumas operações
      service['metrics'] = {
        queueSuccesses: 80,
        queueFailures: 20,
        syncFallbacks: 15,
        fileBackups: 5,
        recoveredLogs: 10,
      };

      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics).toEqual({
        queueSuccesses: 80,
        queueFailures: 20,
        syncFallbacks: 15,
        fileBackups: 5,
        recoveredLogs: 10,
        queueSuccessRate: 80, // 80/100
        fallbackUsageRate: 15, // 15/100
        backupUsageRate: 5, // 5/100
      });
    });

    it('deve lidar com divisão por zero', () => {
      // Arrange - métricas zeradas
      service.resetMetrics();

      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.queueSuccessRate).toBe(0);
      expect(metrics.fallbackUsageRate).toBe(0);
      expect(metrics.backupUsageRate).toBe(0);
    });
  });

  describe('configurações', () => {
    it('deve respeitar configuração de fallback síncrono desabilitado', async () => {
      // Arrange
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'AUDITORIA_ENABLE_SYNC_FALLBACK') {
            return 'false';
          }
          return defaultValue;
        },
      );

      // Recriar serviço com nova configuração
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ResilientAuditoriaService,
          { provide: AuditoriaService, useValue: auditoriaService },
          { provide: AuditoriaQueueService, useValue: auditoriaQueueService },
          { provide: HealthCheckService, useValue: healthCheckService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const newService = module.get<ResilientAuditoriaService>(
        ResilientAuditoriaService,
      );

      const queueError = new Error('Fila indisponível');
      auditoriaQueueService.enfileirarLogAuditoria.mockRejectedValue(
        queueError,
      );

      // Act & Assert
      await expect(
        newService.registrarLogResilient(mockLogData),
      ).rejects.toThrow('Fila indisponível');

      expect(auditoriaService.create).not.toHaveBeenCalled();
    });

    it('deve respeitar configuração de backup em arquivo desabilitado', async () => {
      // Arrange
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'AUDITORIA_ENABLE_FILE_BACKUP') {
            return 'false';
          }
          if (key === 'AUDITORIA_ENABLE_SYNC_FALLBACK') {
            return 'true';
          }
          return defaultValue;
        },
      );

      // Recriar serviço com nova configuração
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ResilientAuditoriaService,
          { provide: AuditoriaService, useValue: auditoriaService },
          { provide: AuditoriaQueueService, useValue: auditoriaQueueService },
          { provide: HealthCheckService, useValue: healthCheckService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const newService = module.get<ResilientAuditoriaService>(
        ResilientAuditoriaService,
      );

      const queueError = new Error('Fila indisponível');
      const syncError = new Error('Banco indisponível');

      auditoriaQueueService.enfileirarLogAuditoria.mockRejectedValue(
        queueError,
      );
      auditoriaService.create.mockRejectedValue(syncError);

      // Act & Assert
      await expect(
        newService.registrarLogResilient(mockLogData),
      ).rejects.toThrow('Falha crítica na auditoria');

      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('integração com health check', () => {
    it('deve funcionar independentemente do status do health check', async () => {
      // Arrange
      healthCheckService.getServicesStatus.mockReturnValue({
        redis: { status: 'down' },
        database: { status: 'up' },
      });

      auditoriaQueueService.enfileirarLogAuditoria.mockResolvedValue(undefined);

      // Act
      await service.registrarLogResilient(mockLogData);

      // Assert
      expect(auditoriaQueueService.enfileirarLogAuditoria).toHaveBeenCalledWith(
        mockLogData,
      );

      const metrics = service.getMetrics();
      expect(metrics.queueSuccesses).toBe(1);
    });
  });
});
