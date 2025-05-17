import { Injectable, Logger } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Serviço responsável por gerenciar as métricas do sistema para monitoramento
 * com Prometheus e Grafana.
 */
@Injectable()
export class MetricasService {
  private readonly logger = new Logger(MetricasService.name);
  private registry: client.Registry;

  // Métricas HTTP
  private httpRequestsTotal: client.Counter<string>;
  private httpRequestDuration: client.Histogram<string>;
  private httpRequestsSizeBytes: client.Histogram<string>;
  private httpResponsesSizeBytes: client.Histogram<string>;

  // Métricas de negócio
  private operacoesTotal: client.Counter<string>;
  private dadosSensiveisAcessosTotal: client.Counter<string>;

  // Métricas de sistema
  private memoryUsage: client.Gauge<string>;
  private cpuUsage: client.Gauge<string>;

  constructor() {
    // Inicializa o registro de métricas
    this.registry = new client.Registry();

    // Registra o coletor padrão (métricas do Node.js)
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'pgben_',
    });

    this.inicializarMetricas();
    this.logger.log('Serviço de métricas inicializado');
  }

  /**
   * Inicializa todas as métricas que serão coletadas pelo sistema
   */
  private inicializarMetricas(): void {
    // Métricas HTTP
    this.httpRequestsTotal = new client.Counter({
      name: 'pgben_http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'pgben_http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsSizeBytes = new client.Histogram({
      name: 'pgben_http_request_size_bytes',
      help: 'Tamanho das requisições HTTP em bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.httpResponsesSizeBytes = new client.Histogram({
      name: 'pgben_http_response_size_bytes',
      help: 'Tamanho das respostas HTTP em bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    // Métricas de negócio
    this.operacoesTotal = new client.Counter({
      name: 'pgben_operacoes_total',
      help: 'Total de operações por tipo',
      labelNames: ['tipo_operacao', 'entidade'],
      registers: [this.registry],
    });

    this.dadosSensiveisAcessosTotal = new client.Counter({
      name: 'pgben_dados_sensiveis_acessos_total',
      help: 'Total de acessos a dados sensíveis',
      labelNames: ['entidade', 'campo', 'usuario_id'],
      registers: [this.registry],
    });

    // Métricas de sistema
    this.memoryUsage = new client.Gauge({
      name: 'pgben_memory_usage_bytes',
      help: 'Uso de memória em bytes',
      registers: [this.registry],
    });

    this.cpuUsage = new client.Gauge({
      name: 'pgben_cpu_usage_percent',
      help: 'Uso de CPU em porcentagem',
      registers: [this.registry],
    });
  }

  /**
   * Registra uma requisição HTTP
   * @param method Método HTTP
   * @param path Caminho da requisição
   * @param status Código de status da resposta
   * @param duration Duração da requisição em segundos
   * @param requestSize Tamanho da requisição em bytes
   * @param responseSize Tamanho da resposta em bytes
   */
  registrarRequisicaoHttp(
    method: string,
    path: string,
    status: number,
    duration: number,
    requestSize: number,
    responseSize: number,
  ): void {
    const statusCode = status.toString();

    // Normaliza o path para evitar cardinalidade alta
    const normalizedPath = this.normalizarPath(path);

    this.httpRequestsTotal.inc({
      method,
      path: normalizedPath,
      status: statusCode,
    });
    this.httpRequestDuration.observe(
      { method, path: normalizedPath, status: statusCode },
      duration,
    );
    this.httpRequestsSizeBytes.observe(
      { method, path: normalizedPath },
      requestSize,
    );
    this.httpResponsesSizeBytes.observe(
      { method, path: normalizedPath, status: statusCode },
      responseSize,
    );
  }

  /**
   * Registra uma operação de negócio
   * @param tipoOperacao Tipo de operação (CREATE, READ, UPDATE, DELETE)
   * @param entidade Entidade afetada
   */
  registrarOperacao(tipoOperacao: string, entidade: string): void {
    this.operacoesTotal.inc({ tipo_operacao: tipoOperacao, entidade });
  }

  /**
   * Registra um acesso a dados sensíveis
   * @param entidade Entidade que contém os dados sensíveis
   * @param campo Campo sensível acessado
   * @param usuarioId ID do usuário que acessou os dados
   */
  registrarAcessoDadosSensiveis(
    entidade: string,
    campo: string,
    usuarioId: string,
  ): void {
    this.dadosSensiveisAcessosTotal.inc({
      entidade,
      campo,
      usuario_id: usuarioId,
    });
  }

  /**
   * Atualiza as métricas de uso de recursos do sistema
   */
  atualizarMetricasSistema(): void {
    const memoryUsage = process.memoryUsage();
    this.memoryUsage.set(memoryUsage.rss);

    // Nota: Para obter métricas precisas de CPU, seria necessário
    // implementar uma solução mais robusta usando bibliotecas como os-utils
    // Esta é uma implementação simplificada
    this.cpuUsage.set(process.cpuUsage().user / 1000000);
  }

  /**
   * Obtém todas as métricas registradas
   * @returns Métricas no formato do Prometheus
   */
  async obterMetricas(): Promise<string> {
    this.atualizarMetricasSistema();
    return this.registry.metrics();
  }

  /**
   * Normaliza o path da requisição para evitar cardinalidade alta nas métricas
   * @param path Caminho original da requisição
   * @returns Caminho normalizado
   */
  private normalizarPath(path: string): string {
    // Remove IDs e outros parâmetros variáveis do path
    // Exemplo: /api/v1/usuarios/123e4567-e89b-12d3-a456-426614174000 -> /api/v1/usuarios/:id
    return path
      .replace(
        /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        '/:id',
      )
      .replace(/\/[0-9]+/g, '/:id');
  }
}
