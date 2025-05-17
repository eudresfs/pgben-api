import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Serviço de Métricas
 *
 * Responsável por coletar e expor métricas da aplicação
 * utilizando o Prometheus Client
 */
@Injectable()
export class MetricsService {
  private readonly register: client.Registry;
  private readonly httpRequestsTotal: client.Counter;
  private readonly httpRequestDuration: client.Histogram;
  private readonly httpRequestsInProgress: client.Gauge;
  private readonly databaseQueriesTotal: client.Counter;
  private readonly databaseQueryDuration: client.Histogram;

  constructor() {
    // Criar registro de métricas
    this.register = new client.Registry();

    // Adicionar métricas padrão do Node.js
    client.collectDefaultMetrics({ register: this.register });

    // Contador de requisições HTTP
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // Histograma de duração das requisições HTTP
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // Gauge de requisições em andamento
    this.httpRequestsInProgress = new client.Gauge({
      name: 'http_requests_in_progress',
      help: 'Número de requisições HTTP em andamento',
      labelNames: ['method', 'route'],
      registers: [this.register],
    });

    // Contador de consultas ao banco de dados
    this.databaseQueriesTotal = new client.Counter({
      name: 'database_queries_total',
      help: 'Total de consultas ao banco de dados',
      labelNames: ['entity', 'operation'],
      registers: [this.register],
    });

    // Histograma de duração das consultas ao banco de dados
    this.databaseQueryDuration = new client.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duração das consultas ao banco de dados em segundos',
      labelNames: ['entity', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.register],
    });
  }

  /**
   * Incrementa o contador de requisições HTTP
   */
  recordHttpRequest(method: string, route: string, statusCode: number): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  /**
   * Registra a duração de uma requisição HTTP
   */
  recordHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      durationSeconds,
    );
  }

  /**
   * Incrementa o contador de requisições HTTP em andamento
   */
  incrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.inc({ method, route });
  }

  /**
   * Decrementa o contador de requisições HTTP em andamento
   */
  decrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.dec({ method, route });
  }

  /**
   * Incrementa o contador de consultas ao banco de dados
   */
  recordDatabaseQuery(entity: string, operation: string): void {
    this.databaseQueriesTotal.inc({ entity, operation });
  }

  /**
   * Registra a duração de uma consulta ao banco de dados
   */
  recordDatabaseQueryDuration(
    entity: string,
    operation: string,
    durationSeconds: number,
  ): void {
    this.databaseQueryDuration.observe({ entity, operation }, durationSeconds);
  }

  /**
   * Retorna todas as métricas no formato do Prometheus
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Retorna o registro de métricas
   */
  getRegister(): client.Registry {
    return this.register;
  }
}
