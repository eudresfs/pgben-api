import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics.service';
import * as client from 'prom-client';

/**
 * Testes unitários para o serviço de métricas
 * 
 * Verifica o funcionamento dos métodos de coleta e exposição de métricas
 * da aplicação usando Prometheus
 */
describe('MetricsService', () => {
  let service: MetricsService;
  
  // Mocks para os contadores e medidores do Prometheus
  const mockCounter = {
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  };
  
  const mockGauge = {
    inc: jest.fn(),
    dec: jest.fn(),
    set: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  };
  
  const mockHistogram = {
    observe: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  };
  
  const mockRegistry = {
    metrics: jest.fn().mockResolvedValue('metrics_data'),
    registerMetric: jest.fn(),
    clear: jest.fn(),
  };

  // Mock das classes do Prometheus
  jest.mock('prom-client', () => ({
    Counter: jest.fn().mockImplementation(() => mockCounter),
    Gauge: jest.fn().mockImplementation(() => mockGauge),
    Histogram: jest.fn().mockImplementation(() => mockHistogram),
    Registry: jest.fn().mockImplementation(() => mockRegistry),
    collectDefaultMetrics: jest.fn(),
  }));

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Restaurar os mocks originais
    jest.spyOn(client, 'Counter').mockImplementation(() => mockCounter as any);
    jest.spyOn(client, 'Gauge').mockImplementation(() => mockGauge as any);
    jest.spyOn(client, 'Histogram').mockImplementation(() => mockHistogram as any);
    jest.spyOn(client, 'Registry').mockImplementation(() => mockRegistry as any);
    jest.spyOn(client, 'collectDefaultMetrics').mockImplementation(() => {});
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('deve inicializar o registro e as métricas padrão', () => {
      expect(client.Registry).toHaveBeenCalled();
      expect(client.collectDefaultMetrics).toHaveBeenCalledWith({
        register: mockRegistry,
      });
      expect(client.Counter).toHaveBeenCalledWith({
        name: 'http_requests_total',
        help: 'Total de requisições HTTP',
        labelNames: ['method', 'route', 'status_code'],
      });
      expect(client.Histogram).toHaveBeenCalledWith({
        name: 'http_request_duration_seconds',
        help: 'Duração das requisições HTTP em segundos',
        labelNames: ['method', 'route', 'status_code'],
        buckets: expect.any(Array),
      });
      expect(client.Gauge).toHaveBeenCalledWith({
        name: 'http_requests_in_progress',
        help: 'Requisições HTTP em andamento',
        labelNames: ['method', 'route'],
      });
    });
  });

  describe('recordHttpRequest', () => {
    it('deve incrementar o contador de requisições HTTP', () => {
      service.recordHttpRequest('GET', '/api/cidadaos', 200);
      
      expect(mockCounter.labels).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/cidadaos',
        status_code: '200',
      });
      expect(mockCounter.inc).toHaveBeenCalled();
    });
  });

  describe('recordHttpRequestDuration', () => {
    it('deve registrar a duração de uma requisição HTTP', () => {
      service.recordHttpRequestDuration('POST', '/api/cidadaos', 200, 0.5);
      
      expect(mockHistogram.labels).toHaveBeenCalledWith({
        method: 'POST',
        route: '/api/cidadaos',
        status_code: '200',
      });
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.5);
    });
  });

  describe('incrementHttpRequestsInProgress', () => {
    it('deve incrementar o medidor de requisições em andamento', () => {
      service.incrementHttpRequestsInProgress('PUT', '/api/cidadaos/1');
      
      expect(mockGauge.labels).toHaveBeenCalledWith({
        method: 'PUT',
        route: '/api/cidadaos/1',
      });
      expect(mockGauge.inc).toHaveBeenCalled();
    });
  });

  describe('decrementHttpRequestsInProgress', () => {
    it('deve decrementar o medidor de requisições em andamento', () => {
      service.decrementHttpRequestsInProgress('DELETE', '/api/cidadaos/1');
      
      expect(mockGauge.labels).toHaveBeenCalledWith({
        method: 'DELETE',
        route: '/api/cidadaos/1',
      });
      expect(mockGauge.dec).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('deve retornar as métricas coletadas', async () => {
      const result = await service.getMetrics();
      
      expect(result).toBe('metrics_data');
      expect(mockRegistry.metrics).toHaveBeenCalled();
    });
  });

  describe('clearMetrics', () => {
    it('deve limpar todas as métricas registradas', () => {
      service.clearMetrics();
      
      expect(mockRegistry.clear).toHaveBeenCalled();
    });
  });

  describe('recordDbQuery', () => {
    it('deve registrar a duração de uma consulta ao banco de dados', () => {
      // Configurar o mock do histograma para consultas de banco de dados
      const mockDbHistogram = {
        observe: jest.fn(),
        labels: jest.fn().mockReturnThis(),
      };
      
      jest.spyOn(client, 'Histogram').mockImplementationOnce(() => mockDbHistogram as any);
      
      // Recriar o serviço para inicializar o histograma de banco de dados
      const module = Test.createTestingModule({
        providers: [MetricsService],
      }).compile();
      
      service = module.get<MetricsService>(MetricsService);
      
      // Testar o método
      service.recordDbQuery('SELECT', 'Usuario', 0.3);
      
      expect(mockDbHistogram.labels).toHaveBeenCalledWith({
        operation: 'SELECT',
        entity: 'Usuario',
      });
      expect(mockDbHistogram.observe).toHaveBeenCalledWith(0.3);
    });
  });

  describe('setMemoryUsage', () => {
    it('deve definir o valor do uso de memória', () => {
      service.setMemoryUsage(256);
      
      expect(mockGauge.set).toHaveBeenCalledWith(256);
    });
  });

  describe('setCpuUsage', () => {
    it('deve definir o valor do uso de CPU', () => {
      service.setCpuUsage(50);
      
      expect(mockGauge.set).toHaveBeenCalledWith(50);
    });
  });
});
