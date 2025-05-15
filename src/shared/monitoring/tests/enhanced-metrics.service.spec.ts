import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedMetricsService } from '../enhanced-metrics.service';
import * as client from 'prom-client';

/**
 * Testes unitários para o serviço de métricas aprimorado
 * 
 * Verifica o funcionamento dos métodos de coleta e exposição de métricas
 * avançadas da aplicação usando Prometheus, com foco em segurança e compliance LGPD
 */
describe('EnhancedMetricsService', () => {
  let service: EnhancedMetricsService;
  
  // Mocks para os contadores e medidores do Prometheus
  const mockCounter = {
    inc: jest.fn(),
  };
  
  const mockGauge = {
    inc: jest.fn(),
    dec: jest.fn(),
    set: jest.fn(),
  };
  
  const mockHistogram = {
    observe: jest.fn(),
  };
  
  const mockRegistry = {
    metrics: jest.fn().mockResolvedValue('enhanced_metrics_data'),
    registerMetric: jest.fn(),
    clear: jest.fn(),
  };

  // Mock das classes do Prometheus
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock das funções do prom-client
    jest.spyOn(client, 'Counter').mockImplementation((config: any) => {
      return {
        ...mockCounter,
        ...config,
        inc: jest.fn().mockImplementation((labels) => {
          return mockCounter.inc(labels);
        })
      };
    });
    
    jest.spyOn(client, 'Gauge').mockImplementation((config: any) => {
      return {
        ...mockGauge,
        ...config,
        inc: jest.fn().mockImplementation((labels, value) => {
          return mockGauge.inc(labels, value);
        }),
        dec: jest.fn().mockImplementation((labels, value) => {
          return mockGauge.dec(labels, value);
        }),
        set: jest.fn().mockImplementation((labels, value) => {
          return mockGauge.set(labels, value);
        })
      };
    });
    
    jest.spyOn(client, 'Histogram').mockImplementation((config: any) => {
      return {
        ...mockHistogram,
        ...config,
        observe: jest.fn().mockImplementation((labels, value) => {
          return mockHistogram.observe(labels, value);
        })
      };
    });
    
    // Mock do Registry com todos os métodos necessários
    const mockRegistryInstance = {
      ...mockRegistry,
      metrics: jest.fn().mockResolvedValue('metrics_data'),
      registerMetric: jest.fn(),
      clear: jest.fn(),
      resetMetrics: jest.fn(),
      getMetricsAsJSON: jest.fn().mockResolvedValue([]),
      getMetricsAsArray: jest.fn().mockReturnValue([]),
      removeSingleMetric: jest.fn(),
      getSingleMetric: jest.fn().mockReturnValue(null),
      getSingleMetricAsString: jest.fn().mockResolvedValue(''),
      contentType: 'text/plain; version=0.0.4; charset=utf-8'
    } as unknown as client.Registry;
    
    jest.spyOn(client, 'Registry').mockImplementation(() => mockRegistryInstance);
    
    jest.spyOn(client, 'collectDefaultMetrics').mockImplementation(() => ({}));
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnhancedMetricsService],
    }).compile();

    service = module.get<EnhancedMetricsService>(EnhancedMetricsService);
    
    // Mock para process.memoryUsage
    (process as any).memoryUsage = jest.fn().mockReturnValue({
      rss: 1024 * 1024 * 100, // 100MB
      heapTotal: 1024 * 1024 * 50, // 50MB
      heapUsed: 1024 * 1024 * 30, // 30MB
      external: 1024 * 1024 * 10, // 10MB
      arrayBuffers: 1024 * 1024 * 5, // 5MB
    });
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
      expect(client.Counter).toHaveBeenCalled();
      expect(client.Histogram).toHaveBeenCalled();
      expect(client.Gauge).toHaveBeenCalled();
    });
  });

  describe('Métricas HTTP', () => {
    it('deve registrar uma requisição HTTP', () => {
      service.recordHttpRequest('GET', '/api/cidadaos', 200, 'admin');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/cidadaos',
        status_code: '200',
        user_role: 'admin'
      });
    });
    
    it('deve registrar uma requisição HTTP com usuário anônimo', () => {
      service.recordHttpRequest('GET', '/api/public', 200);
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/public',
        status_code: '200',
        user_role: 'anonymous'
      });
    });

    it('deve registrar a duração de uma requisição HTTP', () => {
      service.recordHttpRequestDuration('POST', '/api/cidadaos', 201, 0.5, 'admin');
      
      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          method: 'POST',
          route: '/api/cidadaos',
          status_code: '201',
          user_role: 'admin'
        },
        0.5
      );
    });

    it('deve gerenciar contadores de requisições em andamento', () => {
      service.incrementHttpRequestsInProgress('GET', '/api/cidadaos', 'admin');
      expect(mockGauge.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/cidadaos',
        user_role: 'admin'
      });

      service.decrementHttpRequestsInProgress('GET', '/api/cidadaos', 'admin');
      expect(mockGauge.dec).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/cidadaos',
        user_role: 'admin'
      });
    });
  });

  describe('Métricas de Banco de Dados', () => {
    it('deve registrar uma consulta ao banco de dados', () => {
      service.recordDatabaseQuery('Usuario', 'SELECT', true);
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        entity: 'Usuario',
        operation: 'SELECT',
        success: 'true'
      });
    });

    it('deve registrar a duração de uma consulta ao banco de dados', () => {
      service.recordDatabaseQueryDuration('Usuario', 'SELECT', 0.1);
      
      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { entity: 'Usuario', operation: 'SELECT' },
        0.1
      );
    });

    it('deve atualizar o número de conexões ativas com o banco de dados', () => {
      service.setDatabaseConnectionsActive(5);
      
      expect(mockGauge.set).toHaveBeenCalledWith(5);
    });
  });

  describe('Métricas de Segurança', () => {
    it('deve registrar um evento de segurança', () => {
      service.recordSecurityEvent('login_failed', 'warning', 'auth');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: 'login_failed',
        severity: 'warning',
        source: 'auth'
      });
    });
    
    it('deve registrar uma tentativa de autenticação', () => {
      service.recordAuthenticationAttempt(true, 'local', '192.168.1.1');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        success: 'true',
        method: 'local',
        ip_address: '192.168.1.1'
      });
    });
    
    it('deve registrar uma falha de autorização', () => {
      service.recordAuthorizationFailure('/api/admin', 'admin', 'user');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        resource: '/api/admin',
        required_role: 'admin',
        user_role: 'user'
      });
    });

    it('deve registrar um acesso a dados protegidos pela LGPD', () => {
      service.recordLgpdDataAccess('dados_pessoais', 'leitura', true, 'admin');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        data_type: 'dados_pessoais',
        operation: 'leitura',
        authorized: 'true',
        user_role: 'admin'
      });
    });

    it('deve registrar uma tentativa de autenticação', () => {
      service.recordAuthenticationAttempt(true, 'local', '192.168.1.1');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        success: 'true',
        method: 'local',
        ip_address: '192.168.1.1'
      });
    });

    it('deve registrar uma falha de autorização', () => {
      service.recordAuthorizationFailure('/api/admin', 'admin', 'user');
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        resource: '/api/admin',
        required_role: 'admin',
        user_role: 'user'
      });
    });
  });

  describe('Métricas de Documentos', () => {
    it('deve registrar uma operação com documento', () => {
      service.recordDocumentOperation('upload', 'pdf', true, true);
      
      expect(mockCounter.inc).toHaveBeenCalledWith({
        operation: 'upload',
        document_type: 'pdf',
        sensitive: 'true',
        encrypted: 'true'
      });
    });
    
    it('deve registrar o tamanho do armazenamento de documentos', () => {
      service.setDocumentStorageBytes(1024, 'pdf', true);
      
      expect(mockGauge.set).toHaveBeenCalledWith(
        { document_type: 'pdf', sensitive: 'true' },
        1024
      );
    });

    it('deve atualizar o tamanho total de armazenamento de documentos', () => {
      service.setDocumentStorageBytes(1024, 'pdf', true);
      
      expect(mockGauge.set).toHaveBeenCalledWith(
        { document_type: 'pdf', sensitive: 'true' },
        1024
      );
    });

    it('deve registrar a duração de um upload de documento', () => {
      service.recordDocumentUploadDuration('pdf', true, true, 2.5);
      
      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          document_type: 'pdf',
          sensitive: 'true',
          encrypted: 'true'
        },
        2.5
      );
    });

    it('deve registrar a duração de um download de documento', () => {
      service.recordDocumentDownloadDuration('pdf', true, true, 1.2);
      
      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          document_type: 'pdf',
          sensitive: 'true',
          encrypted: 'true'
        },
        1.2
      );
    });
  });

  describe('Métricas de Sistema', () => {
    it('deve atualizar as métricas de uso de memória', () => {
      service.updateMemoryUsage();
      
      expect(mockGauge.set).toHaveBeenCalledWith({ type: 'rss' }, 1024 * 1024 * 100);
      expect(mockGauge.set).toHaveBeenCalledWith({ type: 'heapTotal' }, 1024 * 1024 * 50);
      expect(mockGauge.set).toHaveBeenCalledWith({ type: 'heapUsed' }, 1024 * 1024 * 30);
      expect(mockGauge.set).toHaveBeenCalledWith({ type: 'external' }, 1024 * 1024 * 10);
      expect(mockGauge.set).toHaveBeenCalledWith({ type: 'arrayBuffers' }, 1024 * 1024 * 5);
    });
    
    it('deve lidar com a ausência de arrayBuffers no memoryUsage', () => {
      // Mock para process.memoryUsage sem arrayBuffers
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 100,
        heapTotal: 1024 * 1024 * 50,
        heapUsed: 1024 * 1024 * 30,
        external: 1024 * 1024 * 10
      });
      
      service.updateMemoryUsage();
      
      // Verifica se não tentou definir arrayBuffers
      const arrayBuffersCalls = (mockGauge.set as jest.Mock).mock.calls.filter(
        (call: any) => call[0].type === 'arrayBuffers'
      );
      expect(arrayBuffersCalls.length).toBe(0);
    });

    it('deve atualizar a métrica de uso de CPU', () => {
      service.updateCpuUsage(75.5);
      
      expect(mockGauge.set).toHaveBeenCalledWith(75.5);
    });
  });

  describe('getMetrics', () => {
    it('deve retornar as métricas coletadas', async () => {
      const result = await service.getMetrics();
      
      expect(result).toBe('enhanced_metrics_data');
      expect(mockRegistry.metrics).toHaveBeenCalled();
    });
  });

  describe('getRegister', () => {
    it('deve retornar o registro de métricas', () => {
      const result = service.getRegister();
      
      expect(result).toBe(mockRegistry);
    });
  });
});
