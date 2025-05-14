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
  };
  
  const mockGauge = {
    inc: jest.fn(),
    dec: jest.fn(),
  };
  
  const mockHistogram = {
    observe: jest.fn(),
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
      expect(client.collectDefaultMetrics).toHaveBeenCalled();
      
      // Verificar se os contadores e medidores foram criados com os parâmetros corretos
      // Sem verificar os valores exatos, pois a implementação pode mudar
      expect(client.Counter).toHaveBeenCalled();
      expect(client.Histogram).toHaveBeenCalled();
      expect(client.Gauge).toHaveBeenCalled();
    });
  });

  describe('recordHttpRequest', () => {
    it('deve incrementar o contador de requisições HTTP', () => {
      service.recordHttpRequest('GET', '/api/cidadaos', 200);
      
      expect(mockCounter.inc).toHaveBeenCalled();
    });
  });

  describe('recordHttpRequestDuration', () => {
    it('deve registrar a duração de uma requisição HTTP', () => {
      service.recordHttpRequestDuration('POST', '/api/cidadaos', 200, 0.5);
      
      expect(mockHistogram.observe).toHaveBeenCalled();
    });
  });

  describe('incrementHttpRequestsInProgress', () => {
    it('deve incrementar o medidor de requisições em andamento', () => {
      service.incrementHttpRequestsInProgress('PUT', '/api/cidadaos/1');
      
      expect(mockGauge.inc).toHaveBeenCalled();
    });
  });

  describe('decrementHttpRequestsInProgress', () => {
    it('deve decrementar o medidor de requisições em andamento', () => {
      service.decrementHttpRequestsInProgress('DELETE', '/api/cidadaos/1');
      
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

  describe('recordDatabaseQuery', () => {
    it('deve incrementar o contador de consultas ao banco de dados', () => {
      service.recordDatabaseQuery('Usuario', 'SELECT');
      
      expect(mockCounter.inc).toHaveBeenCalled();
    });
  });

  describe('recordDatabaseQueryDuration', () => {
    it('deve registrar a duração de uma consulta ao banco de dados', () => {
      service.recordDatabaseQueryDuration('Usuario', 'SELECT', 0.3);
      
      expect(mockHistogram.observe).toHaveBeenCalled();
    });
  });

  describe('getRegister', () => {
    it('deve retornar o registro de métricas', () => {
      const result = service.getRegister();
      
      expect(result).toBe(mockRegistry);
    });
  });


});
