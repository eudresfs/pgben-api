import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bull';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AuditHealthService, HealthStatus } from './audit-health.service';
import { AuditMetricsService } from './audit-metrics.service';
import { AUDIT_QUEUE_NAMES } from '../constants/audit.constants';

/**
 * Testes unitários para AuditHealthService
 * 
 * Verifica:
 * - Inicialização correta do serviço
 * - Verificações de saúde de componentes individuais
 * - Cálculo de status geral do sistema
 * - Geração de alertas
 * - Métricas de performance
 * - Integração com outros serviços
 */
describe('AuditHealthService', () => {
  let service: AuditHealthService;
  let mockDataSource: any;
  let mockQueue: any;
  let mockConfigService: any;
  let mockEventEmitter: any;
  let mockAuditMetricsService: any;

  // Mocks para dependências
  const createMockDataSource = () => ({
    query: jest.fn(),
    isInitialized: true,
  });

  const createMockQueue = () => ({
    getJobCounts: jest.fn(),
    getWorkers: jest.fn(),
    getWaiting: jest.fn(),
    isReady: jest.fn().mockResolvedValue(true),
  });

  const createMockConfigService = () => ({
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        AUDIT_ERROR_RATE_WARNING: 0.05,
        AUDIT_ERROR_RATE_CRITICAL: 0.15,
        AUDIT_RESPONSE_TIME_WARNING: 1000,
        AUDIT_RESPONSE_TIME_CRITICAL: 3000,
        AUDIT_QUEUE_SIZE_WARNING: 100,
        AUDIT_QUEUE_SIZE_CRITICAL: 500,
        AUDIT_MIN_THROUGHPUT: 10,
        AUDIT_HEALTH_CHECK_INTERVAL: 30000,
      };
      return config[key] || defaultValue;
    }),
  });

  const createMockEventEmitter = () => ({
    emit: jest.fn(),
  });

  const createMockAuditMetricsService = () => ({
    getMetrics: jest.fn(),
  });

  beforeEach(async () => {
    // Criar mocks
    mockDataSource = createMockDataSource();
    mockQueue = createMockQueue();
    mockConfigService = createMockConfigService();
    mockEventEmitter = createMockEventEmitter();
    mockAuditMetricsService = createMockAuditMetricsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditHealthService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: getQueueToken(AUDIT_QUEUE_NAMES.PROCESSING),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: AuditMetricsService,
          useValue: mockAuditMetricsService,
        },
      ],
    }).compile();

    service = module.get<AuditHealthService>(AuditHealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve inicializar com estado de saúde padrão', () => {
      const health = service.getCurrentHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.components).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.alerts).toEqual([]);
    });

    it('deve configurar thresholds corretamente', () => {
      // Verificar se os thresholds foram configurados através do ConfigService
      expect(mockConfigService.get).toHaveBeenCalledWith('AUDIT_ERROR_RATE_WARNING', 0.05);
      expect(mockConfigService.get).toHaveBeenCalledWith('AUDIT_ERROR_RATE_CRITICAL', 0.15);
      expect(mockConfigService.get).toHaveBeenCalledWith('AUDIT_RESPONSE_TIME_WARNING', 1000);
      expect(mockConfigService.get).toHaveBeenCalledWith('AUDIT_RESPONSE_TIME_CRITICAL', 3000);
    });
  });

  describe('Verificação de Saúde do Redis', () => {
    it('deve retornar status healthy quando Redis está funcionando', async () => {
      // Configurar mock para Redis saudável
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
      });

      const health = await service.performHealthCheck();
      
      expect(health.components.redis.status).toBe('healthy');
      expect(health.components.redis.message).toContain('Redis respondendo');
      expect(health.components.redis.responseTime).toBeDefined();
      expect(health.components.redis.details.connectionStatus).toBe('connected');
    });

    it('deve retornar status critical quando Redis falha', async () => {
      // Configurar mock para Redis com falha
      mockQueue.getJobCounts.mockRejectedValue(new Error('Connection refused'));

      const health = await service.performHealthCheck();
      
      expect(health.components.redis.status).toBe('critical');
      expect(health.components.redis.message).toContain('Redis inacessível');
      expect(health.components.redis.details.connectionStatus).toBe('disconnected');
    });

    it('deve retornar status degraded quando Redis está lento', async () => {
      // Simular resposta lenta do Redis
      mockQueue.getJobCounts.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ waiting: 0, active: 0 }), 2000)
        )
      );

      const health = await service.performHealthCheck();
      
      expect(health.components.redis.status).toBe('degraded');
      expect(health.components.redis.responseTime).toBeGreaterThan(1000);
    });
  });

  describe('Verificação de Saúde do PostgreSQL', () => {
    it('deve retornar status healthy quando PostgreSQL está funcionando', async () => {
      // Configurar mock para PostgreSQL saudável
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1, timestamp: new Date() }])
        .mockResolvedValueOnce([{ total_records: 1000, recent_records: 50 }]);

      const health = await service.performHealthCheck();
      
      expect(health.components.database.status).toBe('healthy');
      expect(health.components.database.message).toContain('PostgreSQL respondendo');
      expect(health.components.database.details.connectionStatus).toBe('connected');
      expect(health.components.database.details.auditStats).toBeDefined();
    });

    it('deve retornar status critical quando PostgreSQL falha', async () => {
      // Configurar mock para PostgreSQL com falha
      mockDataSource.query.mockRejectedValue(new Error('Connection timeout'));

      const health = await service.performHealthCheck();
      
      expect(health.components.database.status).toBe('critical');
      expect(health.components.database.message).toContain('PostgreSQL inacessível');
      expect(health.components.database.details.connectionStatus).toBe('disconnected');
    });
  });

  describe('Verificação de Saúde da Fila', () => {
    it('deve retornar status healthy quando fila está normal', async () => {
      // Configurar mock para fila saudável
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 10,
        active: 5,
        completed: 100,
        failed: 2,
      });
      mockQueue.getWorkers.mockResolvedValue([{ id: 'worker1' }, { id: 'worker2' }]);
      mockQueue.getWaiting.mockResolvedValue([]);

      const health = await service.performHealthCheck();
      
      expect(health.components.queue.status).toBe('healthy');
      expect(health.components.queue.message).toContain('Fila operacional');
      expect(health.components.queue.details.activeWorkers).toBe(2);
    });

    it('deve retornar status degraded quando fila tem alta carga', async () => {
      // Configurar mock para fila com alta carga
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 150, // Acima do warning threshold (100)
        active: 10,
        completed: 100,
        failed: 5,
      });
      mockQueue.getWorkers.mockResolvedValue([{ id: 'worker1' }]);
      mockQueue.getWaiting.mockResolvedValue([]);

      const health = await service.performHealthCheck();
      
      expect(health.components.queue.status).toBe('degraded');
      expect(health.components.queue.message).toContain('alta carga');
    });

    it('deve retornar status critical quando fila está sobrecarregada', async () => {
      // Configurar mock para fila sobrecarregada
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 600, // Acima do critical threshold (500)
        active: 20,
        completed: 100,
        failed: 10,
      });
      mockQueue.getWorkers.mockResolvedValue([]);
      mockQueue.getWaiting.mockResolvedValue([]);

      const health = await service.performHealthCheck();
      
      expect(health.components.queue.status).toBe('critical');
      expect(health.components.queue.message).toContain('crítica');
    });
  });

  describe('Verificação de Saúde do Processador', () => {
    it('deve retornar status healthy quando processador está funcionando', async () => {
      // Configurar mock para métricas saudáveis do processador
      const mockMetrics = `
        audit_processor_events_total{status="processed"} 1000
        audit_processor_events_total{status="failed"} 10
        audit_processor_duration_seconds_sum 50
      `;
      mockAuditMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const health = await service.performHealthCheck();
      
      expect(health.components.processor.status).toBe('healthy');
      expect(health.components.processor.message).toContain('funcionando normalmente');
    });

    it('deve retornar status degraded quando métricas não estão disponíveis', async () => {
      // Configurar mock para falha nas métricas
      mockAuditMetricsService.getMetrics.mockRejectedValue(new Error('Metrics unavailable'));

      const health = await service.performHealthCheck();
      
      expect(health.components.processor.status).toBe('degraded');
      expect(health.components.processor.message).toContain('indisponíveis');
    });
  });

  describe('Verificação de Saúde do Interceptor', () => {
    it('deve retornar status healthy quando interceptor está capturando eventos', async () => {
      // Configurar mock para métricas saudáveis do interceptor
      const mockMetrics = `
        audit_interceptor_events_total{type="operation_start"} 500
        audit_interceptor_events_total{type="operation_success"} 480
        audit_interceptor_events_total{type="operation_error"} 20
      `;
      mockAuditMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const health = await service.performHealthCheck();
      
      expect(health.components.interceptor.status).toBe('healthy');
      expect(health.components.interceptor.message).toContain('capturando eventos normalmente');
    });

    it('deve retornar status degraded quando não há eventos recentes', async () => {
      // Configurar mock para interceptor sem eventos recentes
      const mockMetrics = `
        audit_interceptor_events_total{type="operation_start"} 0
      `;
      mockAuditMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const health = await service.performHealthCheck();
      
      expect(health.components.interceptor.status).toBe('degraded');
      expect(health.components.interceptor.message).toContain('Nenhum evento capturado');
    });
  });

  describe('Cálculo de Status Geral', () => {
    it('deve retornar status healthy quando todos os componentes estão saudáveis', async () => {
      // Configurar todos os mocks para retornar status saudável
      mockQueue.getJobCounts.mockResolvedValue({ waiting: 5, active: 2 });
      mockQueue.getWorkers.mockResolvedValue([{ id: 'worker1' }]);
      mockQueue.getWaiting.mockResolvedValue([]);
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue(`
        audit_processor_events_total{status="processed"} 100
        audit_interceptor_events_total{type="operation_start"} 50
        audit_interceptor_events_total{type="operation_success"} 45
      `);

      const health = await service.performHealthCheck();
      
      expect(health.status).toBe('healthy');
    });

    it('deve retornar status degraded quando algum componente está degradado', async () => {
      // Configurar um componente como degradado
      mockQueue.getJobCounts.mockResolvedValue({ waiting: 150, active: 10 }); // Alta carga
      mockQueue.getWorkers.mockResolvedValue([]);
      mockQueue.getWaiting.mockResolvedValue([]);
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      const health = await service.performHealthCheck();
      
      expect(health.status).toBe('degraded');
    });

    it('deve retornar status critical quando algum componente está crítico', async () => {
      // Configurar um componente como crítico
      mockQueue.getJobCounts.mockRejectedValue(new Error('Redis down'));
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      const health = await service.performHealthCheck();
      
      expect(health.status).toBe('critical');
    });
  });

  describe('Geração de Alertas', () => {
    it('deve gerar alertas para componentes críticos', async () => {
      // Configurar componente crítico
      mockQueue.getJobCounts.mockRejectedValue(new Error('Connection failed'));
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      const health = await service.performHealthCheck();
      
      expect(health.alerts.length).toBeGreaterThan(0);
      expect(health.alerts.some(alert => alert.includes('🚨 CRÍTICO'))).toBe(true);
    });

    it('deve gerar alertas para componentes degradados', async () => {
      // Configurar componente degradado
      mockQueue.getJobCounts.mockResolvedValue({ waiting: 150, active: 10 });
      mockQueue.getWorkers.mockResolvedValue([]);
      mockQueue.getWaiting.mockResolvedValue([]);
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      const health = await service.performHealthCheck();
      
      expect(health.alerts.length).toBeGreaterThan(0);
      expect(health.alerts.some(alert => alert.includes('⚠️ ALERTA'))).toBe(true);
    });

    it('deve emitir evento para alertas críticos', async () => {
      // Configurar componente crítico
      mockQueue.getJobCounts.mockRejectedValue(new Error('Critical failure'));
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      await service.performHealthCheck();
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'audit.health.critical',
        expect.objectContaining({
          alerts: expect.any(Array),
          health: expect.any(Object),
        })
      );
    });
  });

  describe('Métodos de Consulta', () => {
    it('deve retornar saúde atual sem executar nova verificação', () => {
      const health = service.getCurrentHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.components).toBeDefined();
    });

    it('deve retornar saúde de componente específico', () => {
      const redisHealth = service.getComponentHealth('redis');
      
      expect(redisHealth).toBeDefined();
      expect(redisHealth.status).toBeDefined();
      expect(redisHealth.message).toBeDefined();
    });

    it('deve verificar se sistema está saudável', () => {
      const isHealthy = service.isHealthy();
      
      expect(typeof isHealthy).toBe('boolean');
    });

    it('deve retornar alertas ativos', () => {
      const alerts = service.getActiveAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Eventos', () => {
    it('deve emitir evento quando health check é concluído', async () => {
      // Configurar mocks para verificação bem-sucedida
      mockQueue.getJobCounts.mockResolvedValue({ waiting: 5, active: 2 });
      mockQueue.getWorkers.mockResolvedValue([]);
      mockQueue.getWaiting.mockResolvedValue([]);
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      await service.performHealthCheck();
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'audit.health.checked',
        expect.objectContaining({
          health: expect.any(Object),
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro geral durante health check', async () => {
      // Forçar erro geral
      mockQueue.getJobCounts.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const health = await service.performHealthCheck();
      
      expect(health.status).toBe('critical');
      expect(health.alerts.some(alert => alert.includes('Redis inacessível'))).toBe(true);
    });

    it('deve continuar verificação mesmo com falha em componente individual', async () => {
      // Configurar falha em um componente específico
      mockQueue.getJobCounts.mockRejectedValue(new Error('Redis error'));
      mockDataSource.query
        .mockResolvedValueOnce([{ health_check: 1 }])
        .mockResolvedValueOnce([{ total_records: 1000 }]);
      mockAuditMetricsService.getMetrics.mockResolvedValue('audit_processor_events_total{status="processed"} 100');

      const health = await service.performHealthCheck();
      
      // Deve ter verificado outros componentes mesmo com falha no Redis
      expect(health.components.database.status).toBe('healthy');
      expect(health.components.redis.status).toBe('critical');
    });
  });
});