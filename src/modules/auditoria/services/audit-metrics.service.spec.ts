import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditMetricsService } from './audit-metrics.service';
import * as promClient from 'prom-client';

// Mock do Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

// Mock do prom-client
jest.mock('prom-client', () => ({
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
  })),
  Registry: jest.fn().mockImplementation(() => ({
    metrics: jest.fn().mockReturnValue('mocked-metrics'),
    clear: jest.fn(),
  })),
  register: {
    metrics: jest.fn().mockReturnValue('mocked-metrics'),
    clear: jest.fn(),
  },
}));

describe('AuditMetricsService', () => {
  let service: AuditMetricsService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset the mock implementations
    (promClient.Counter as jest.Mock).mockImplementation(() => ({
      inc: jest.fn(),
    }));
    (promClient.Histogram as jest.Mock).mockImplementation(() => ({
      observe: jest.fn(),
    }));
    (promClient.Gauge as jest.Mock).mockImplementation(() => ({
      set: jest.fn(),
    }));
    
    service = new AuditMetricsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve inicializar todas as métricas', () => {
      // Verifica se os contadores foram criados (múltiplas chamadas)
      expect(promClient.Counter).toHaveBeenCalled();
      expect(promClient.Counter).toHaveBeenCalledTimes(10); // 10 contadores diferentes

      // Verifica se os histogramas foram criados
      expect(promClient.Histogram).toHaveBeenCalled();
      expect(promClient.Histogram).toHaveBeenCalledTimes(3); // 3 histogramas diferentes

      // Verifica se os gauges foram criados
      expect(promClient.Gauge).toHaveBeenCalled();
      expect(promClient.Gauge).toHaveBeenCalledTimes(3); // 3 gauges diferentes

      // Verifica se o registry foi criado
      expect(promClient.Registry).toHaveBeenCalled();
    });
  });

  describe('Registro de Eventos', () => {
    it('deve registrar evento do emitter', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada auditEmitterEvents
      (service as any).auditEmitterEvents = { inc: mockInc };
      
      service.recordEmitterEvent('OPERATION_START', 'success');

      expect(mockInc).toHaveBeenCalledWith({
        event_type: 'OPERATION_START',
        status: 'success',
      });
    });

    it('deve registrar evento da fila', () => {
      const mockInc = jest.fn();
      const mockObserve = jest.fn();
      // Mock das propriedades privadas auditQueueEvents e auditQueueDuration
      (service as any).auditQueueEvents = { inc: mockInc };
      (service as any).auditQueueDuration = { observe: mockObserve };
      
      service.recordQueueEvent('auditoria', 'added', 0.05);

      expect(mockInc).toHaveBeenCalledWith({
        queue_name: 'auditoria',
        status: 'added',
      });
      
      expect(mockObserve).toHaveBeenCalledWith(
        { event_type: 'auditoria' },
        0.05,
      );
    });
  });

  describe('Métricas de Pipeline', () => {
    it('deve registrar evento do processador', () => {
      const mockInc = jest.fn();
      const mockObserve = jest.fn();
      // Mock das propriedades privadas auditProcessorEvents e auditProcessingDuration
      (service as any).auditProcessorEvents = { inc: mockInc };
      (service as any).auditProcessingDuration = { observe: mockObserve };
      
      service.recordProcessorEvent('audit-processor', 'processed', 0.05, 'OPERATION_START');

      expect(mockInc).toHaveBeenCalledWith({
        processor: 'audit-processor',
        status: 'processed',
      });
      
      expect(mockObserve).toHaveBeenCalledWith(
        {
          event_type: 'OPERATION_START',
          stage: 'processor',
        },
        0.05,
      );
    });

    it('deve registrar evento do banco de dados', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada auditDatabaseEvents
      (service as any).auditDatabaseEvents = { inc: mockInc };
      
      service.recordDatabaseEvent('audit_logs', 'insert', 'success');

      expect(mockInc).toHaveBeenCalledWith({
        table: 'audit_logs',
        operation: 'insert',
        status: 'success',
      });
    });
  });

  describe('Métricas de Performance', () => {
    it('deve atualizar métricas de performance', () => {
      const mockSet = jest.fn();
      // Mock das propriedades privadas de performance
      (service as any).auditQueueSize = { set: mockSet };
      (service as any).auditErrorRate = { set: mockSet };
      (service as any).auditThroughput = { set: mockSet };
      
      service.updatePerformanceMetrics(25, 0.05, 100, 'audit-processor');

      expect(mockSet).toHaveBeenCalledWith({ queue_name: 'audit-processor' }, 25);
      expect(mockSet).toHaveBeenCalledWith({ component: 'audit-processor' }, 0.05);
      expect(mockSet).toHaveBeenCalledWith({ component: 'audit-processor' }, 100);
    });



    it('deve obter métricas do Prometheus', async () => {
      const mockMetrics = jest.fn().mockResolvedValue('mocked-metrics');
      // Mock da propriedade privada registry
      (service as any).registry = { metrics: mockMetrics };
      
      const metrics = await service.getMetrics();

      expect(metrics).toBe('mocked-metrics');
      expect(mockMetrics).toHaveBeenCalled();
    });
  });

  describe('Métricas de Conformidade LGPD', () => {
    it('deve registrar acesso a dados sensíveis', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada sensitiveDataAccess
      (service as any).sensitiveDataAccess = { inc: mockInc };
      
      service.recordSensitiveDataAccess('user_profile', 'email', 'read', 'admin');

      expect(mockInc).toHaveBeenCalledWith({
        entity: 'user_profile',
        field: 'email',
        access_type: 'read',
        user_role: 'admin',
      });
    });

    it('deve registrar evento de conformidade LGPD', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada lgpdComplianceEvents
      (service as any).lgpdComplianceEvents = { inc: mockInc };
      
      service.recordLGPDComplianceEvent('data_access', 'personal_data', 'compliant');

      expect(mockInc).toHaveBeenCalledWith({
        event_type: 'data_access',
        data_category: 'personal_data',
        compliance_status: 'compliant',
      });
    });
  });

  describe('Métricas de Database', () => {
    it('deve registrar sucesso no banco de dados', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada auditDatabaseEvents
      (service as any).auditDatabaseEvents = { inc: mockInc };
      
      service.recordDatabaseSuccess();

      expect(mockInc).toHaveBeenCalledWith({
        table: 'audit_logs',
        operation: 'insert',
        status: 'success',
      });
    });

    it('deve registrar falha no banco de dados', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada auditEventsFailed
      (service as any).auditEventsFailed = { inc: mockInc };
      
      service.recordDatabaseFailure('Connection lost');

      expect(mockInc).toHaveBeenCalledWith({
        event_type: 'database_operation',
        error_type: 'Connection lost',
        stage: 'database',
      });
    });
  });

  describe('Coleta de Métricas', () => {
    it('deve retornar registry do Prometheus', () => {
      const registry = service.getRegistry();

      expect(registry).toBeDefined();
    });

    it('deve resetar métricas', () => {
      const mockClear = jest.fn();
      // Mock da propriedade privada registry
      (service as any).registry = { clear: mockClear };
      
      service.resetMetrics();

      expect(mockClear).toHaveBeenCalled();
    });
  });

  describe('Cenários de Erro', () => {
    it('deve propagar erro ao registrar evento do emitter', () => {
      const mockInc = jest.fn().mockImplementation(() => {
        throw new Error('Metric error');
      });
      // Mock da propriedade privada auditEmitterEvents
      (service as any).auditEmitterEvents = { inc: mockInc };

      // Deve lançar erro pois não há tratamento
      expect(() => {
        service.recordEmitterEvent('OPERATION_START', 'success');
      }).toThrow('Metric error');
    });

    it('deve propagar erro ao registrar evento da fila', () => {
      const mockInc = jest.fn();
      const mockObserve = jest.fn().mockImplementation(() => {
        throw new Error('Histogram error');
      });
      // Mock das propriedades privadas auditQueueEvents e auditQueueDuration
      (service as any).auditQueueEvents = { inc: mockInc };
      (service as any).auditQueueDuration = { observe: mockObserve };

      // Deve lançar erro pois não há tratamento
      expect(() => {
        service.recordQueueEvent('audit-queue', 'added', 0.1);
      }).toThrow('Histogram error');
    });

    it('deve propagar erro ao registrar evento do banco', () => {
      const mockInc = jest.fn().mockImplementation(() => {
        throw new Error('Database metric error');
      });
      // Mock da propriedade privada auditDatabaseEvents
      (service as any).auditDatabaseEvents = { inc: mockInc };

      // Deve lançar erro pois não há tratamento
      expect(() => {
        service.recordDatabaseEvent('audit_logs', 'insert', 'success');
      }).toThrow('Database metric error');
    });
  });

  describe('Integração com Labels', () => {
    it('deve usar labels corretos para eventos do emitter', () => {
      const mockInc = jest.fn();
      // Mock da propriedade privada auditEmitterEvents
      (service as any).auditEmitterEvents = { inc: mockInc };
      
      const eventTypes = ['OPERATION_START', 'OPERATION_SUCCESS', 'OPERATION_ERROR'];
      const statuses: ('success' | 'failed')[] = ['success', 'failed'];

      eventTypes.forEach(eventType => {
        statuses.forEach(status => {
          service.recordEmitterEvent(eventType, status);

          expect(mockInc).toHaveBeenCalledWith({
            event_type: eventType,
            status: status,
          });
        });
      });
    });

    it('deve usar labels corretos para eventos do processador', () => {
      const mockInc = jest.fn();
      const mockObserve = jest.fn();
      // Mock das propriedades privadas
      (service as any).auditProcessorEvents = { inc: mockInc };
      (service as any).auditProcessingDuration = { observe: mockObserve };
      
      const processors = ['audit-processor', 'compliance-processor'];
      const statuses: ('processed' | 'failed')[] = ['processed', 'failed'];
      const eventTypes = ['OPERATION_START', 'OPERATION_SUCCESS', 'OPERATION_ERROR'];

      processors.forEach(processor => {
        statuses.forEach(status => {
          eventTypes.forEach(eventType => {
            service.recordProcessorEvent(processor, status, 0.1, eventType);

            expect(mockInc).toHaveBeenCalledWith({
              processor: processor,
              status: status,
            });
            
            expect(mockObserve).toHaveBeenCalledWith(
              {
                event_type: eventType,
                stage: 'processor',
              },
              0.1,
            );
          });
        });
      });
    });
  });
});