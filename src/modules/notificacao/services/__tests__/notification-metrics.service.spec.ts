import { Test, TestingModule } from '@nestjs/testing';
import { NotificationMetricsService } from '../notification-metrics.service';
import { NotificationLoggerService } from '../notification-logger.service';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType
} from '../../interfaces/base-notification.interface';

describe('NotificationMetricsService', () => {
  let service: NotificationMetricsService;
  let mockLoggerService: jest.Mocked<NotificationLoggerService>;

  beforeEach(async () => {
    // Mock do NotificationLoggerService
    mockLoggerService = {
      logMetrics: jest.fn(),
      logDebug: jest.fn(),
      logError: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationMetricsService,
        {
          provide: NotificationLoggerService,
          useValue: mockLoggerService
        }
      ]
    }).compile();

    service = module.get<NotificationMetricsService>(NotificationMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset métricas para cada teste
    (service as any).metricas = {
      total_enviadas: 0,
      total_sucessos: 0,
      total_falhas: 0,
      taxa_sucesso: 0,
      tempo_medio_processamento: 0,
      metricas_por_canal: {},
      metricas_por_tipo: {},
      metricas_por_prioridade: {},
      rate_limiting: {
        requests_bloqueados: 0,
        requests_permitidos: 0
      },
      sistema: {
        memoria_utilizada: 0,
        cpu_utilizada: 0,
        conexoes_ativas: 0
      },
      ultima_atualizacao: expect.any(Date)
    };
    (service as any).historico = [];
  });

  describe('registrarNotificacao', () => {
    it('deve registrar notificação enviada com sucesso', () => {
      // Arrange
      const canal = NotificationChannel.EMAIL;
      const tipo = NotificationType.SOLICITACAO;
      const prioridade = NotificationPriority.HIGH;
      const tempoProcessamento = 1500;
      const sucesso = true;

      // Act
      service.registrarNotificacao(canal, tipo, prioridade, tempoProcessamento, sucesso);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.total_enviadas).toBe(1);
      expect(metricas.total_sucessos).toBe(1);
      expect(metricas.total_falhas).toBe(0);
      expect(metricas.taxa_sucesso).toBe(1);
      expect(metricas.tempo_medio_processamento).toBe(1500);
      
      expect(metricas.metricas_por_canal[NotificationChannel.EMAIL]).toEqual({
        enviadas: 1,
        sucessos: 1,
        falhas: 0,
        tempo_medio: 1500,
        taxa_sucesso: 1
      });
      
      expect(metricas.metricas_por_tipo[NotificationType.SOLICITACAO]).toEqual({
        enviadas: 1,
        sucessos: 1,
        falhas: 0,
        tempo_medio: 1500,
        taxa_sucesso: 1
      });
      
      expect(metricas.metricas_por_prioridade[NotificationPriority.HIGH]).toEqual({
        enviadas: 1,
        sucessos: 1,
        falhas: 0,
        tempo_medio: 1500,
        taxa_sucesso: 1
      });
    });

    it('deve registrar notificação com falha', () => {
      // Arrange
      const canal = NotificationChannel.ABLY;
      const tipo = NotificationType.PAGAMENTO;
      const prioridade = NotificationPriority.MEDIUM;
      const tempoProcessamento = 2000;
      const sucesso = false;

      // Act
      service.registrarNotificacao(canal, tipo, prioridade, tempoProcessamento, sucesso);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.total_enviadas).toBe(1);
      expect(metricas.total_sucessos).toBe(0);
      expect(metricas.total_falhas).toBe(1);
      expect(metricas.taxa_sucesso).toBe(0);
      expect(metricas.tempo_medio_processamento).toBe(2000);
      
      expect(metricas.metricas_por_canal[NotificationChannel.ABLY]).toEqual({
        enviadas: 1,
        sucessos: 0,
        falhas: 1,
        tempo_medio: 2000,
        taxa_sucesso: 0
      });
    });

    it('deve calcular médias corretamente com múltiplas notificações', () => {
      // Arrange & Act
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 2000, true);
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 3000, false);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.total_enviadas).toBe(3);
      expect(metricas.total_sucessos).toBe(2);
      expect(metricas.total_falhas).toBe(1);
      expect(metricas.taxa_sucesso).toBe(2/3);
      expect(metricas.tempo_medio_processamento).toBe(2000); // (1000 + 2000 + 3000) / 3
      
      expect(metricas.metricas_por_canal[NotificationChannel.EMAIL]).toEqual({
        enviadas: 3,
        sucessos: 2,
        falhas: 1,
        tempo_medio: 2000,
        taxa_sucesso: 2/3
      });
    });
  });

  describe('registrarRateLimit', () => {
    it('deve registrar request bloqueado', () => {
      // Act
      service.registrarRateLimit('user-123', true);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.rate_limiting.requests_bloqueados).toBe(1);
      expect(metricas.rate_limiting.requests_permitidos).toBe(0);
    });

    it('deve registrar request permitido', () => {
      // Act
      service.registrarRateLimit('user-123', false);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.rate_limiting.requests_bloqueados).toBe(0);
      expect(metricas.rate_limiting.requests_permitidos).toBe(1);
    });

    it('deve registrar múltiplos requests', () => {
      // Act
      service.registrarRateLimit('user-123', false);
      service.registrarRateLimit('user-456', false);
      service.registrarRateLimit('user-789', true);
      service.registrarRateLimit('user-123', true);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.rate_limiting.requests_bloqueados).toBe(2);
      expect(metricas.rate_limiting.requests_permitidos).toBe(2);
    });
  });

  describe('atualizarMetricasSistema', () => {
    it('deve atualizar métricas do sistema', () => {
      // Arrange
      const metricasSistema = {
        memoria_utilizada: 1024,
        cpu_utilizada: 75.5,
        conexoes_ativas: 10
      };

      // Act
      service.atualizarMetricasSistema(metricasSistema);

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.sistema).toEqual(metricasSistema);
    });
  });

  describe('obterSnapshot', () => {
    it('deve retornar snapshot das métricas atuais', () => {
      // Arrange
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);
      service.registrarRateLimit('user-123', false);
      service.atualizarMetricasSistema({ memoria_utilizada: 512, cpu_utilizada: 25.0, conexoes_ativas: 5 });

      // Act
      const snapshot = service.obterSnapshot();

      // Assert
      expect(snapshot).toEqual({
        total_enviadas: 1,
        total_sucessos: 1,
        total_falhas: 0,
        taxa_sucesso: 1,
        tempo_medio_processamento: 1000,
        metricas_por_canal: {
          [NotificationChannel.EMAIL]: {
            enviadas: 1,
            sucessos: 1,
            falhas: 0,
            tempo_medio: 1000,
            taxa_sucesso: 1
          }
        },
        metricas_por_tipo: {
          [NotificationType.SOLICITACAO]: {
            enviadas: 1,
            sucessos: 1,
            falhas: 0,
            tempo_medio: 1000,
            taxa_sucesso: 1
          }
        },
        metricas_por_prioridade: {
          [NotificationPriority.HIGH]: {
            enviadas: 1,
            sucessos: 1,
            falhas: 0,
            tempo_medio: 1000,
            taxa_sucesso: 1
          }
        },
        rate_limiting: {
          requests_bloqueados: 0,
          requests_permitidos: 1
        },
        sistema: {
          memoria_utilizada: 512,
          cpu_utilizada: 25.0,
          conexoes_ativas: 5
        },
        ultima_atualizacao: expect.any(Date)
      });
    });
  });

  describe('obterHistorico', () => {
    it('deve retornar histórico vazio inicialmente', () => {
      // Act
      const historico = service.obterHistorico();

      // Assert
      expect(historico).toEqual([]);
    });

    it('deve retornar histórico limitado', () => {
      // Arrange
      // Simular adição de entradas no histórico
      for (let i = 0; i < 150; i++) {
        (service as any).adicionarAoHistorico();
      }

      // Act
      const historico = service.obterHistorico();

      // Assert
      expect(historico.length).toBeLessThanOrEqual(100); // Limite máximo
    });
  });

  describe('detectarAnomalias', () => {
    it('deve detectar anomalia de taxa de sucesso baixa', () => {
      // Arrange
      // Registrar muitas falhas
      for (let i = 0; i < 10; i++) {
        service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, false);
      }
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);

      // Act
      const anomalias = service.detectarAnomalias();

      // Assert
      expect(anomalias).toContainEqual({
        tipo: 'TAXA_SUCESSO_BAIXA',
        descricao: expect.stringContaining('Taxa de sucesso muito baixa'),
        valor_atual: expect.any(Number),
        threshold: 0.8,
        severidade: 'HIGH',
        timestamp: expect.any(Date)
      });
    });

    it('deve detectar anomalia de tempo de processamento alto', () => {
      // Arrange
      // Registrar notificações com tempo alto
      for (let i = 0; i < 5; i++) {
        service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 15000, true);
      }

      // Act
      const anomalias = service.detectarAnomalias();

      // Assert
      expect(anomalias).toContainEqual({
        tipo: 'TEMPO_PROCESSAMENTO_ALTO',
        descricao: expect.stringContaining('Tempo médio de processamento muito alto'),
        valor_atual: 15000,
        threshold: 10000,
        severidade: 'MEDIUM',
        timestamp: expect.any(Date)
      });
    });

    it('deve detectar anomalia de uso de CPU alto', () => {
      // Arrange
      service.atualizarMetricasSistema({
        memoria_utilizada: 1024,
        cpu_utilizada: 95.0,
        conexoes_ativas: 5
      });

      // Act
      const anomalias = service.detectarAnomalias();

      // Assert
      expect(anomalias).toContainEqual({
        tipo: 'CPU_ALTA',
        descricao: expect.stringContaining('Uso de CPU muito alto'),
        valor_atual: 95.0,
        threshold: 80,
        severidade: 'HIGH',
        timestamp: expect.any(Date)
      });
    });

    it('deve detectar anomalia de uso de memória alto', () => {
      // Arrange
      service.atualizarMetricasSistema({
        memoria_utilizada: 2048,
        cpu_utilizada: 50.0,
        conexoes_ativas: 5
      });

      // Act
      const anomalias = service.detectarAnomalias();

      // Assert
      expect(anomalias).toContainEqual({
        tipo: 'MEMORIA_ALTA',
        descricao: expect.stringContaining('Uso de memória muito alto'),
        valor_atual: 2048,
        threshold: 1536,
        severidade: 'MEDIUM',
        timestamp: expect.any(Date)
      });
    });

    it('deve retornar array vazio quando não há anomalias', () => {
      // Arrange
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);
      service.atualizarMetricasSistema({
        memoria_utilizada: 512,
        cpu_utilizada: 30.0,
        conexoes_ativas: 5
      });

      // Act
      const anomalias = service.detectarAnomalias();

      // Assert
      expect(anomalias).toEqual([]);
    });
  });

  describe('exportarMetricas', () => {
    it('deve exportar métricas no formato correto', () => {
      // Arrange
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);
      service.registrarRateLimit('user-123', false);

      // Act
      const exportacao = service.exportarMetricas();

      // Assert
      expect(exportacao).toEqual({
        timestamp_exportacao: expect.any(Date),
        periodo: {
          inicio: expect.any(Date),
          fim: expect.any(Date)
        },
        metricas_atuais: expect.objectContaining({
          total_enviadas: 1,
          total_sucessos: 1,
          total_falhas: 0
        }),
        historico: expect.any(Array),
        anomalias_detectadas: expect.any(Array),
        resumo: {
          total_notificacoes_periodo: expect.any(Number),
          canais_mais_utilizados: expect.any(Array),
          tipos_mais_frequentes: expect.any(Array),
          performance_geral: expect.any(String)
        }
      });
    });
  });

  describe('resetarMetricas', () => {
    it('deve resetar todas as métricas', () => {
      // Arrange
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);
      service.registrarRateLimit('user-123', false);
      service.atualizarMetricasSistema({ memoria_utilizada: 1024, cpu_utilizada: 50.0, conexoes_ativas: 10 });

      // Act
      service.resetarMetricas();

      // Assert
      const metricas = service.obterSnapshot();
      expect(metricas.total_enviadas).toBe(0);
      expect(metricas.total_sucessos).toBe(0);
      expect(metricas.total_falhas).toBe(0);
      expect(metricas.taxa_sucesso).toBe(0);
      expect(metricas.tempo_medio_processamento).toBe(0);
      expect(metricas.metricas_por_canal).toEqual({});
      expect(metricas.metricas_por_tipo).toEqual({});
      expect(metricas.metricas_por_prioridade).toEqual({});
      expect(metricas.rate_limiting.requests_bloqueados).toBe(0);
      expect(metricas.rate_limiting.requests_permitidos).toBe(0);
      expect(metricas.sistema.memoria_utilizada).toBe(0);
      expect(metricas.sistema.cpu_utilizada).toBe(0);
      expect(metricas.sistema.conexoes_ativas).toBe(0);
      
      const historico = service.obterHistorico();
      expect(historico).toEqual([]);
    });
  });

  describe('coletarMetricasPeriodicamente', () => {
    it('deve ser chamado periodicamente (teste de estrutura)', () => {
      // Este teste verifica se o método existe e pode ser chamado
      // Em um ambiente real, seria testado com um scheduler mock
      
      // Act & Assert
      expect(() => service.coletarMetricasPeriodicamente()).not.toThrow();
      expect(mockLoggerService.logMetrics).toHaveBeenCalled();
    });
  });

  describe('calcularMetricasCanal', () => {
    it('deve calcular métricas de canal corretamente', () => {
      // Arrange
      const metricas = {
        enviadas: 10,
        sucessos: 8,
        falhas: 2,
        tempos: [1000, 1500, 2000, 1200, 1800, 1100, 1300, 1600]
      };

      // Act
      const resultado = (service as any).calcularMetricasCanal(metricas);

      // Assert
      expect(resultado).toEqual({
        enviadas: 10,
        sucessos: 8,
        falhas: 2,
        tempo_medio: 1437.5, // Média dos tempos
        taxa_sucesso: 0.8
      });
    });

    it('deve lidar com métricas vazias', () => {
      // Arrange
      const metricas = {
        enviadas: 0,
        sucessos: 0,
        falhas: 0,
        tempos: []
      };

      // Act
      const resultado = (service as any).calcularMetricasCanal(metricas);

      // Assert
      expect(resultado).toEqual({
        enviadas: 0,
        sucessos: 0,
        falhas: 0,
        tempo_medio: 0,
        taxa_sucesso: 0
      });
    });
  });

  describe('adicionarAoHistorico', () => {
    it('deve adicionar entrada ao histórico', () => {
      // Arrange
      service.registrarNotificacao(NotificationChannel.EMAIL, NotificationType.SOLICITACAO, NotificationPriority.HIGH, 1000, true);

      // Act
      (service as any).adicionarAoHistorico();

      // Assert
      const historico = service.obterHistorico();
      expect(historico.length).toBe(1);
      expect(historico[0]).toEqual({
        timestamp: expect.any(Date),
        metricas: expect.objectContaining({
          total_enviadas: 1,
          total_sucessos: 1
        })
      });
    });

    it('deve manter limite máximo do histórico', () => {
      // Arrange & Act
      for (let i = 0; i < 150; i++) {
        (service as any).adicionarAoHistorico();
      }

      // Assert
      const historico = service.obterHistorico();
      expect(historico.length).toBe(100); // Limite máximo
    });
  });
});