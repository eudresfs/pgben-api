import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Serviço de Métricas Aprimorado
 *
 * Responsável por coletar e expor métricas avançadas da aplicação
 * utilizando o Prometheus Client, com foco em segurança e compliance LGPD
 */
@Injectable()
export class EnhancedMetricsService {
  private readonly register: client.Registry;

  // Métricas HTTP
  private httpRequestsTotal!: client.Counter;
  private httpRequestDuration!: client.Histogram;
  private httpRequestsInProgress!: client.Gauge;

  // Métricas de Banco de Dados
  private databaseQueriesTotal!: client.Counter;
  private databaseQueryDuration!: client.Histogram;
  private databaseConnectionsActive!: client.Gauge;

  // Métricas de Cache/Redis
  private cacheOperationsTotal!: client.Counter;
  private cacheHitRatio!: client.Gauge;
  private cacheSize!: client.Gauge;
  private cacheOperationDuration!: client.Histogram;

  // Métricas de Segurança e Compliance
  private securityEventsTotal!: client.Counter;
  private lgpdDataAccessTotal!: client.Counter;
  private authenticationAttemptsTotal!: client.Counter;
  private authorizationFailuresTotal!: client.Counter;

  // Métricas de Documentos
  private documentOperationsTotal!: client.Counter;
  private documentStorageBytes!: client.Gauge;
  private documentUploadDuration!: client.Histogram;
  private documentDownloadDuration!: client.Histogram;

  // Métricas de Sistema
  private systemMemoryUsage!: client.Gauge;
  private systemCpuUsage!: client.Gauge;

  constructor() {
    // Criar registro de métricas
    this.register = new client.Registry();

    // Adicionar métricas padrão do Node.js
    client.collectDefaultMetrics({ register: this.register });

    // Inicializar métricas HTTP
    this.initHttpMetrics();

    // Inicializar métricas de banco de dados
    this.initDatabaseMetrics();

    // Inicializar métricas de cache/Redis
    this.initCacheMetrics();

    // Inicializar métricas de segurança e compliance
    this.initSecurityMetrics();

    // Inicializar métricas de documentos
    this.initDocumentMetrics();

    // Inicializar métricas de sistema
    this.initSystemMetrics();
  }

  /**
   * Inicializa métricas relacionadas a requisições HTTP
   */
  private initHttpMetrics(): void {
    // Contador de requisições HTTP
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
      registers: [this.register],
    });

    // Histograma de duração das requisições HTTP
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // Gauge de requisições em andamento
    this.httpRequestsInProgress = new client.Gauge({
      name: 'http_requests_in_progress',
      help: 'Número de requisições HTTP em andamento',
      labelNames: ['method', 'route', 'user_role'],
      registers: [this.register],
    });
  }

  /**
   * Inicializa métricas relacionadas ao banco de dados
   */
  private initDatabaseMetrics(): void {
    // Contador de consultas ao banco de dados
    this.databaseQueriesTotal = new client.Counter({
      name: 'database_queries_total',
      help: 'Total de consultas ao banco de dados',
      labelNames: ['entity', 'operation', 'success'],
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

    // Gauge de conexões ativas com o banco de dados
    this.databaseConnectionsActive = new client.Gauge({
      name: 'database_connections_active',
      help: 'Número de conexões ativas com o banco de dados',
      registers: [this.register],
    });
  }

  /**
   * Inicializa métricas relacionadas ao cache distribuído (Redis)
   */
  private initCacheMetrics(): void {
    // Contador de operações de cache
    this.cacheOperationsTotal = new client.Counter({
      name: 'cache_operations_total',
      help: 'Total de operações de cache',
      labelNames: ['operation', 'success', 'cache_type'],
      registers: [this.register],
    });

    // Gauge de taxa de acertos do cache
    this.cacheHitRatio = new client.Gauge({
      name: 'cache_hit_ratio',
      help: 'Taxa de acertos do cache (0-1)',
      labelNames: ['cache_type'],
      registers: [this.register],
    });

    // Gauge de tamanho do cache
    this.cacheSize = new client.Gauge({
      name: 'cache_size_bytes',
      help: 'Tamanho do cache em bytes',
      labelNames: ['cache_type'],
      registers: [this.register],
    });

    // Histograma de duração das operações de cache
    this.cacheOperationDuration = new client.Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duração das operações de cache em segundos',
      labelNames: ['operation', 'cache_type'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [this.register],
    });
  }

  /**
   * Inicializa métricas relacionadas à segurança e compliance LGPD
   */
  private initSecurityMetrics(): void {
    // Contador de eventos de segurança
    this.securityEventsTotal = new client.Counter({
      name: 'security_events_total',
      help: 'Total de eventos de segurança',
      labelNames: ['type', 'severity', 'source'],
      registers: [this.register],
    });

    // Contador de acessos a dados protegidos pela LGPD
    this.lgpdDataAccessTotal = new client.Counter({
      name: 'lgpd_data_access_total',
      help: 'Total de acessos a dados protegidos pela LGPD',
      labelNames: ['data_type', 'operation', 'authorized', 'user_role'],
      registers: [this.register],
    });

    // Contador de tentativas de autenticação
    this.authenticationAttemptsTotal = new client.Counter({
      name: 'authentication_attempts_total',
      help: 'Total de tentativas de autenticação',
      labelNames: ['success', 'method', 'ip_address'],
      registers: [this.register],
    });

    // Contador de falhas de autorização
    this.authorizationFailuresTotal = new client.Counter({
      name: 'authorization_failures_total',
      help: 'Total de falhas de autorização',
      labelNames: ['resource', 'required_role', 'user_role'],
      registers: [this.register],
    });
  }

  /**
   * Inicializa métricas relacionadas a operações com documentos
   */
  private initDocumentMetrics(): void {
    // Contador de operações com documentos
    this.documentOperationsTotal = new client.Counter({
      name: 'document_operations_total',
      help: 'Total de operações com documentos',
      labelNames: ['operation', 'document_type', 'sensitive', 'encrypted'],
      registers: [this.register],
    });

    // Gauge de armazenamento de documentos
    this.documentStorageBytes = new client.Gauge({
      name: 'document_storage_bytes',
      help: 'Armazenamento total de documentos em bytes',
      labelNames: ['document_type', 'sensitive'],
      registers: [this.register],
    });

    // Histograma de duração de upload de documentos
    this.documentUploadDuration = new client.Histogram({
      name: 'document_upload_duration_seconds',
      help: 'Duração do upload de documentos em segundos',
      labelNames: ['document_type', 'sensitive', 'encrypted'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    // Histograma de duração de download de documentos
    this.documentDownloadDuration = new client.Histogram({
      name: 'document_download_duration_seconds',
      help: 'Duração do download de documentos em segundos',
      labelNames: ['document_type', 'sensitive', 'encrypted'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });
  }

  /**
   * Inicializa métricas relacionadas ao sistema
   */
  private initSystemMetrics(): void {
    // Gauge de uso de memória
    this.systemMemoryUsage = new client.Gauge({
      name: 'system_memory_usage_bytes',
      help: 'Uso de memória do sistema em bytes',
      labelNames: ['type'],
      registers: [this.register],
    });

    // Gauge de uso de CPU
    this.systemCpuUsage = new client.Gauge({
      name: 'system_cpu_usage_percent',
      help: 'Uso de CPU do sistema em porcentagem',
      registers: [this.register],
    });
  }

  /**
   * Incrementa o contador de requisições HTTP
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    userRole: string = 'anonymous',
  ): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      user_role: userRole,
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
    userRole: string = 'anonymous',
  ): void {
    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
        user_role: userRole,
      },
      durationSeconds,
    );
  }

  /**
   * Incrementa o contador de requisições HTTP em andamento
   */
  incrementHttpRequestsInProgress(
    method: string,
    route: string,
    userRole: string = 'anonymous',
  ): void {
    this.httpRequestsInProgress.inc({ method, route, user_role: userRole });
  }

  /**
   * Decrementa o contador de requisições HTTP em andamento
   */
  decrementHttpRequestsInProgress(
    method: string,
    route: string,
    userRole: string = 'anonymous',
  ): void {
    this.httpRequestsInProgress.dec({ method, route, user_role: userRole });
  }

  /**
   * Incrementa o contador de consultas ao banco de dados
   */
  recordDatabaseQuery(
    entity: string,
    operation: string,
    success: boolean = true,
  ): void {
    this.databaseQueriesTotal.inc({
      entity,
      operation,
      success: success.toString(),
    });
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
   * Atualiza o número de conexões ativas com o banco de dados
   */
  setDatabaseConnectionsActive(connections: number): void {
    this.databaseConnectionsActive.set(connections);
  }

  /**
   * Registra um evento de segurança
   */
  recordSecurityEvent(type: string, severity: string, source: string): void {
    this.securityEventsTotal.inc({ type, severity, source });
  }

  /**
   * Registra um acesso a dados protegidos pela LGPD
   */
  recordLgpdDataAccess(
    dataType: string,
    operation: string,
    authorized: boolean = true,
    userRole: string = 'anonymous',
  ): void {
    this.lgpdDataAccessTotal.inc({
      data_type: dataType,
      operation,
      authorized: authorized.toString(),
      user_role: userRole,
    });
  }

  /**
   * Registra uma tentativa de autenticação
   */
  recordAuthenticationAttempt(
    success: boolean,
    method: string,
    ipAddress: string,
  ): void {
    this.authenticationAttemptsTotal.inc({
      success: success.toString(),
      method,
      ip_address: ipAddress,
    });
  }

  /**
   * Registra uma falha de autorização
   */
  recordAuthorizationFailure(
    resource: string,
    requiredRole: string,
    userRole: string,
  ): void {
    this.authorizationFailuresTotal.inc({
      resource,
      required_role: requiredRole,
      user_role: userRole,
    });
  }

  /**
   * Registra uma operação com documento
   */
  recordDocumentOperation(
    operation: string,
    documentType: string,
    sensitive: boolean = false,
    encrypted: boolean = false,
  ): void {
    this.documentOperationsTotal.inc({
      operation,
      document_type: documentType,
      sensitive: sensitive.toString(),
      encrypted: encrypted.toString(),
    });
  }

  /**
   * Atualiza o tamanho total de armazenamento de documentos
   */
  setDocumentStorageBytes(
    bytes: number,
    documentType: string,
    sensitive: boolean = false,
  ): void {
    this.documentStorageBytes.set(
      { document_type: documentType, sensitive: sensitive.toString() },
      bytes,
    );
  }

  /**
   * Registra a duração de um upload de documento
   */
  recordDocumentUploadDuration(
    documentType: string,
    sensitive: boolean,
    encrypted: boolean,
    durationSeconds: number,
  ): void {
    this.documentUploadDuration.observe(
      {
        document_type: documentType,
        sensitive: sensitive.toString(),
        encrypted: encrypted.toString(),
      },
      durationSeconds,
    );
  }

  /**
   * Registra a duração de um download de documento
   */
  recordDocumentDownloadDuration(
    documentType: string,
    sensitive: boolean,
    encrypted: boolean,
    durationSeconds: number,
  ): void {
    this.documentDownloadDuration.observe(
      {
        document_type: documentType,
        sensitive: sensitive.toString(),
        encrypted: encrypted.toString(),
      },
      durationSeconds,
    );
  }

  /**
   * Atualiza as métricas de uso de memória
   */
  updateMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    this.systemMemoryUsage.set({ type: 'rss' }, memoryUsage.rss);
    this.systemMemoryUsage.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
    this.systemMemoryUsage.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
    this.systemMemoryUsage.set({ type: 'external' }, memoryUsage.external);

    if (memoryUsage.arrayBuffers) {
      this.systemMemoryUsage.set(
        { type: 'arrayBuffers' },
        memoryUsage.arrayBuffers,
      );
    }
  }

  /**
   * Atualiza a métrica de uso de CPU
   */
  updateCpuUsage(cpuPercent: number): void {
    this.systemCpuUsage.set(cpuPercent);
  }

  /**
   * Registra uma operação de cache
   */
  recordCacheOperation(
    operation: string,
    success: boolean,
    cacheType: string = 'redis',
  ): void {
    this.cacheOperationsTotal.inc({
      operation,
      success: success.toString(),
      cache_type: cacheType,
    });
  }

  /**
   * Registra a duração de uma operação de cache
   */
  recordCacheOperationDuration(
    operation: string,
    durationSeconds: number,
    cacheType: string = 'redis',
  ): void {
    this.cacheOperationDuration.observe(
      { operation, cache_type: cacheType },
      durationSeconds,
    );
  }

  /**
   * Atualiza a taxa de acertos do cache
   */
  updateCacheHitRatio(ratio: number, cacheType: string = 'redis'): void {
    this.cacheHitRatio.set({ cache_type: cacheType }, ratio);
  }

  /**
   * Atualiza o tamanho do cache
   */
  updateCacheSize(sizeBytes: number, cacheType: string = 'redis'): void {
    this.cacheSize.set({ cache_type: cacheType }, sizeBytes);
  }

  /**
   * Retorna todas as métricas no formato do Prometheus
   */
  async getMetrics(): Promise<string> {
    // Atualizar métricas de sistema antes de retornar
    this.updateMemoryUsage();

    return this.register.metrics();
  }

  /**
   * Retorna o registro de métricas
   */
  getRegister(): client.Registry {
    return this.register;
  }
}
