# Checklist de Implementação para o Módulo de Métricas

## 1. Melhoria das Métricas de CPU e Memória

- [ ] Instalar dependências:
  ```bash
  npm install os-utils
  npm install @types/os-utils --save-dev
  ```

- [ ] Melhorar implementação de métricas de CPU:
  ```typescript
  // src/modules/metricas/services/metricas.service.ts
  import * as os from 'os';
  import * as osUtils from 'os-utils';

  // Adicionar ao construtor
  private readonly cpuUsageGauge: client.Gauge<string>;
  private readonly cpuLoadGauge: client.Gauge<string>;
  private readonly cpuCoresGauge: client.Gauge<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de CPU melhoradas
    this.cpuUsageGauge = new client.Gauge({
      name: 'node_cpu_usage_percentage',
      help: 'CPU usage percentage',
      labelNames: ['core']
    });

    this.cpuLoadGauge = new client.Gauge({
      name: 'node_cpu_load',
      help: 'CPU load average',
      labelNames: ['interval']
    });

    this.cpuCoresGauge = new client.Gauge({
      name: 'node_cpu_cores',
      help: 'Number of CPU cores'
    });

    // Iniciar coleta periódica
    this.iniciarColetaPeriodica();
  }

  private iniciarColetaPeriodica(): void {
    // Atualizar número de cores (estático)
    const numCores = os.cpus().length;
    this.cpuCoresGauge.set(numCores);

    // Atualizar métricas a cada 15 segundos
    setInterval(() => {
      // CPU usage por core
      const cpus = os.cpus();
      cpus.forEach((cpu, index) => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        const usage = 100 - (idle / total * 100);
        this.cpuUsageGauge.set({ core: `core${index}` }, usage);
      });

      // CPU load averages
      osUtils.cpuUsage((v) => {
        this.cpuUsageGauge.set({ core: 'total' }, v * 100);
      });

      const loadAvg = os.loadavg();
      this.cpuLoadGauge.set({ interval: '1m' }, loadAvg[0]);
      this.cpuLoadGauge.set({ interval: '5m' }, loadAvg[1]);
      this.cpuLoadGauge.set({ interval: '15m' }, loadAvg[2]);
    }, 15000);
  }
  ```

- [ ] Melhorar métricas de memória:
  ```typescript
  // Adicionar ao construtor
  private readonly memoryGauge: client.Gauge<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de memória melhoradas
    this.memoryGauge = new client.Gauge({
      name: 'node_memory',
      help: 'Memory information in bytes',
      labelNames: ['type']
    });

    // Atualizar métricas a cada 15 segundos
    setInterval(() => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      this.memoryGauge.set({ type: 'total' }, totalMem);
      this.memoryGauge.set({ type: 'free' }, freeMem);
      this.memoryGauge.set({ type: 'used' }, usedMem);
      this.memoryGauge.set({ type: 'used_percentage' }, (usedMem / totalMem) * 100);
    }, 15000);
  }
  ```

## 2. Adição de Métricas Específicas de Negócio

- [ ] Implementar métricas para solicitações de benefícios:
  ```typescript
  // Adicionar ao construtor
  private readonly solicitacoesCounter: client.Counter<string>;
  private readonly solicitacoesStatusGauge: client.Gauge<string>;
  private readonly solicitacoesDuracaoHistogram: client.Histogram<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de solicitações
    this.solicitacoesCounter = new client.Counter({
      name: 'pgben_solicitacoes_total',
      help: 'Total de solicitações de benefícios',
      labelNames: ['tipo_beneficio', 'unidade', 'status']
    });

    this.solicitacoesStatusGauge = new client.Gauge({
      name: 'pgben_solicitacoes_por_status',
      help: 'Quantidade de solicitações por status',
      labelNames: ['status']
    });

    this.solicitacoesDuracaoHistogram = new client.Histogram({
      name: 'pgben_solicitacoes_duracao_dias',
      help: 'Duração das solicitações em dias',
      labelNames: ['tipo_beneficio', 'status'],
      buckets: [1, 3, 5, 7, 14, 30, 60, 90]
    });
  }

  // Métodos para registrar métricas de solicitações
  registrarNovaSolicitacao(tipoBeneficio: string, unidade: string): void {
    this.solicitacoesCounter.inc({ tipo_beneficio: tipoBeneficio, unidade, status: 'PENDENTE' });
  }

  registrarMudancaStatusSolicitacao(tipoBeneficio: string, unidade: string, statusAnterior: string, novoStatus: string): void {
    this.solicitacoesCounter.inc({ tipo_beneficio: tipoBeneficio, unidade, status: novoStatus });
  }

  atualizarContadoresPorStatus(): void {
    // Este método deve ser chamado periodicamente para atualizar os gauges
    // Exemplo de implementação:
    this.solicitacaoRepository.createQueryBuilder('solicitacao')
      .select('solicitacao.status, COUNT(*) as count')
      .groupBy('solicitacao.status')
      .getRawMany()
      .then(results => {
        results.forEach(result => {
          this.solicitacoesStatusGauge.set({ status: result.status }, result.count);
        });
      })
      .catch(err => {
        console.error('Erro ao atualizar métricas de solicitações:', err);
      });
  }
  ```

- [ ] Implementar métricas para ocorrências:
  ```typescript
  // Adicionar ao construtor
  private readonly ocorrenciasCounter: client.Counter<string>;
  private readonly ocorrenciasPrioridadeGauge: client.Gauge<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de ocorrências
    this.ocorrenciasCounter = new client.Counter({
      name: 'pgben_ocorrencias_total',
      help: 'Total de ocorrências',
      labelNames: ['tipo', 'prioridade', 'status']
    });

    this.ocorrenciasPrioridadeGauge = new client.Gauge({
      name: 'pgben_ocorrencias_por_prioridade',
      help: 'Quantidade de ocorrências por prioridade',
      labelNames: ['prioridade', 'status']
    });
  }
  ```

- [ ] Implementar métricas para relatórios:
  ```typescript
  // Adicionar ao construtor
  private readonly relatoriosCounter: client.Counter<string>;
  private readonly relatoriosDuracaoHistogram: client.Histogram<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de relatórios
    this.relatoriosCounter = new client.Counter({
      name: 'pgben_relatorios_total',
      help: 'Total de relatórios gerados',
      labelNames: ['tipo', 'formato', 'status']
    });

    this.relatoriosDuracaoHistogram = new client.Histogram({
      name: 'pgben_relatorios_duracao_segundos',
      help: 'Duração da geração de relatórios em segundos',
      labelNames: ['tipo', 'formato'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120]
    });
  }
  ```

## 3. Integração com Sistema de Alertas

- [ ] Configurar regras de alerta no Prometheus:
  ```yaml
  # prometheus/rules/pgben.yml
  groups:
  - name: pgben
    rules:
    # Alertas de sistema
    - alert: HighCpuUsage
      expr: node_cpu_usage_percentage{core="total"} > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Alta utilização de CPU"
        description: "A utilização de CPU está acima de 80% por mais de 5 minutos."

    - alert: HighMemoryUsage
      expr: node_memory{type="used_percentage"} > 85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Alta utilização de memória"
        description: "A utilização de memória está acima de 85% por mais de 5 minutos."

    # Alertas de aplicação
    - alert: HighHttpErrorRate
      expr: sum(rate(http_requests_total{status=~"5.*"}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Alta taxa de erros HTTP"
        description: "A taxa de erros HTTP está acima de 5% por mais de 2 minutos."

    - alert: SlowHttpRequests
      expr: http_request_duration_seconds{quantile="0.9"} > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Requisições HTTP lentas"
        description: "90% das requisições HTTP estão demorando mais de 1 segundo."
  ```

- [ ] Configurar Alertmanager:
  ```yaml
  # alertmanager/config.yml
  global:
    resolve_timeout: 5m
    smtp_smarthost: 'smtp.example.org:587'
    smtp_from: 'alertmanager@example.org'
    smtp_auth_username: 'alertmanager'
    smtp_auth_password: 'password'

  route:
    group_by: ['alertname', 'severity']
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    receiver: 'email'
    routes:
    - match:
        severity: critical
      receiver: 'email'
      repeat_interval: 1h

  receivers:
  - name: 'email'
    email_configs:
    - to: 'team@example.org'
      send_resolved: true
  ```

## 4. Criação de Dashboards

- [ ] Criar dashboard para métricas de sistema:
  ```json
  {
    "title": "Sistema - PGBEN",
    "panels": [
      {
        "title": "Utilização de CPU",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "node_cpu_usage_percentage{core=\"total\"}",
            "legendFormat": "Total"
          },
          {
            "expr": "node_cpu_usage_percentage{core=~\"core.*\"}",
            "legendFormat": "{{core}}"
          }
        ]
      },
      {
        "title": "Utilização de Memória",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "node_memory{type=\"used_percentage\"}",
            "legendFormat": "Utilizada (%)"
          }
        ]
      }
    ]
  }
  ```

- [ ] Criar dashboard para métricas de HTTP:
  ```json
  {
    "title": "HTTP - PGBEN",
    "panels": [
      {
        "title": "Requisições por segundo",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[1m])) by (method, path)",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "title": "Duração das requisições (p90)",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "histogram_quantile(0.9, sum(rate(http_request_duration_seconds_bucket[1m])) by (le, path))",
            "legendFormat": "{{path}}"
          }
        ]
      }
    ]
  }
  ```

- [ ] Criar dashboard para métricas de negócio:
  ```json
  {
    "title": "Negócio - PGBEN",
    "panels": [
      {
        "title": "Solicitações por status",
        "type": "pie",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "pgben_solicitacoes_por_status",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Duração média das solicitações",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "sum(pgben_solicitacoes_duracao_dias_sum) by (tipo_beneficio) / sum(pgben_solicitacoes_duracao_dias_count) by (tipo_beneficio)",
            "legendFormat": "{{tipo_beneficio}}"
          }
        ]
      }
    ]
  }
  ```

## 5. Padronização da Instrumentação de Código

- [ ] Criar decoradores para instrumentação de métodos:
  ```typescript
  // src/modules/metricas/decorators/metric.decorator.ts
  import { MetricasService } from '../services/metricas.service';

  export function Metric(options: { name: string; help: string; labelNames?: string[] }) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const metricasService = global.app.get(MetricasService);
        const timer = metricasService.startTimer(options.name, options.help, options.labelNames || []);

        try {
          const result = await originalMethod.apply(this, args);
          timer.end();
          return result;
        } catch (error) {
          timer.end({ success: 'false' });
          throw error;
        }
      };

      return descriptor;
    };
  }
  ```

- [ ] Criar interceptor para métricas HTTP:
  ```typescript
  // src/modules/metricas/interceptors/metrics.interceptor.ts
  import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { MetricasService } from '../services/metricas.service';

  @Injectable()
  export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricasService: MetricasService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const { method, path } = req;
      
      const timer = this.metricasService.startHttpTimer(method, path);
      
      return next.handle().pipe(
        tap({
          next: () => {
            const res = context.switchToHttp().getResponse();
            timer.end({ status: res.statusCode });
          },
          error: (error) => {
            timer.end({ status: error.status || 500 });
          }
        })
      );
    }
  }
  ```

- [ ] Criar utilitários para facilitar a instrumentação:
  ```typescript
  // src/modules/metricas/utils/metrics.util.ts
  import { MetricasService } from '../services/metricas.service';

  export class MetricsUtil {
    private static metricasService: MetricasService;

    static initialize(metricasService: MetricasService) {
      this.metricasService = metricasService;
    }

    static incrementCounter(name: string, labels: Record<string, string> = {}) {
      if (!this.metricasService) {
        console.error('MetricsUtil não inicializado');
        return;
      }
      
      this.metricasService.incrementCounter(name, labels);
    }

    static setGauge(name: string, value: number, labels: Record<string, string> = {}) {
      if (!this.metricasService) {
        console.error('MetricsUtil não inicializado');
        return;
      }
      
      this.metricasService.setGauge(name, value, labels);
    }

    static observeHistogram(name: string, value: number, labels: Record<string, string> = {}) {
      if (!this.metricasService) {
        console.error('MetricsUtil não inicializado');
        return;
      }
      
      this.metricasService.observeHistogram(name, value, labels);
    }
  }
  ```

## 6. Documentação

- [ ] Criar guia de instrumentação para desenvolvedores:
  ```markdown
  # Guia de Instrumentação de Métricas

  Este guia descreve como instrumentar código para coleta de métricas no Sistema de Gestão de Benefícios Eventuais.

  ## Tipos de Métricas

  - **Counter**: Valor que só aumenta (ex: número de requisições)
  - **Gauge**: Valor que pode aumentar ou diminuir (ex: memória em uso)
  - **Histogram**: Distribuição de valores (ex: duração de requisições)

  ## Como Instrumentar Código

  ### Usando Decoradores

  ```typescript
  import { Metric } from '../modules/metricas/decorators/metric.decorator';

  export class MeuServico {
    @Metric({
      name: 'minha_operacao_total',
      help: 'Total de operações realizadas',
      labelNames: ['tipo', 'resultado']
    })
    async minhaOperacao(tipo: string) {
      // Implementação...
    }
  }
  ```

  ### Usando Utilitários

  ```typescript
  import { MetricsUtil } from '../modules/metricas/utils/metrics.util';

  export class MeuServico {
    async minhaOperacao(tipo: string) {
      // Incrementar contador
      MetricsUtil.incrementCounter('minha_operacao_total', { tipo });

      // Implementação...

      // Registrar duração
      MetricsUtil.observeHistogram('minha_operacao_duracao', duracao, { tipo });
    }
  }
  ```

  ## Convenções de Nomenclatura

  - Nomes de métricas: `pgben_<modulo>_<metrica>_<unidade>`
  - Labels: snake_case
  - Unidades: segundos, bytes, etc.

  ## Exemplos

  - `pgben_solicitacoes_total`: Total de solicitações
  - `pgben_solicitacoes_duracao_dias`: Duração das solicitações em dias
  - `pgben_ocorrencias_por_prioridade`: Quantidade de ocorrências por prioridade
  ```

## 7. Adição de Métricas de Negócio Específicas

- [ ] Implementar métricas para acompanhamento de benefícios por tipo:
  ```typescript
  // Adicionar ao construtor
  private readonly beneficiosPorTipoGauge: client.Gauge<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de benefícios por tipo
    this.beneficiosPorTipoGauge = new client.Gauge({
      name: 'pgben_beneficios_por_tipo',
      help: 'Quantidade de benefícios concedidos por tipo',
      labelNames: ['tipo_beneficio', 'unidade']
    });
  }

  // Método para atualizar métricas de benefícios
  atualizarMetricasBeneficios(): void {
    this.solicitacaoRepository.createQueryBuilder('solicitacao')
      .select('solicitacao.tipo_beneficio_id, tb.nome as tipo_beneficio, solicitacao.unidade_id, u.nome as unidade, COUNT(*) as count')
      .innerJoin('solicitacao.tipoBeneficio', 'tb')
      .innerJoin('solicitacao.unidade', 'u')
      .where('solicitacao.status = :status', { status: 'CONCLUIDA' })
      .groupBy('solicitacao.tipo_beneficio_id, tb.nome, solicitacao.unidade_id, u.nome')
      .getRawMany()
      .then(results => {
        results.forEach(result => {
          this.beneficiosPorTipoGauge.set(
            { tipo_beneficio: result.tipo_beneficio, unidade: result.unidade },
            result.count
          );
        });
      })
      .catch(err => {
        console.error('Erro ao atualizar métricas de benefícios:', err);
      });
  }
  ```

- [ ] Implementar métricas para tempo médio de aprovação:
  ```typescript
  // Adicionar ao construtor
  private readonly tempoAprovacaoGauge: client.Gauge<string>;

  constructor() {
    // Inicialização existente...

    // Métricas de tempo médio de aprovação
    this.tempoAprovacaoGauge = new client.Gauge({
      name: 'pgben_tempo_aprovacao_dias',
      help: 'Tempo médio de aprovação de solicitações em dias',
      labelNames: ['tipo_beneficio', 'unidade']
    });
  }

  // Método para atualizar métricas de tempo de aprovação
  atualizarMetricasTempoAprovacao(): void {
    // Implementação da consulta para calcular tempo médio de aprovação
    // ...
  }
  ```
