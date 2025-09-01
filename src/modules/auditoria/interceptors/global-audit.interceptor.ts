/**
 * GlobalAuditInterceptor
 *
 * Interceptor global para auditoria de TODAS as requisições HTTP.
 * Captura 100% das requisições independentemente de decorators,
 * garantindo cobertura completa para compliance LGPD.
 *
 * Arquitetura:
 * - Intercepta TODAS as requisições HTTP
 * - Emite eventos de auditoria para cada operação
 * - Integra com AuditEventEmitter para processamento assíncrono
 * - Mantém contexto de auditoria durante toda a requisição
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request as ExpressRequest, Response } from 'express';
import { AuditEventEmitter } from '../events/emitters/audit-event.emitter';
import { AuditMetricsService } from '../services/audit-metrics.service';
import { RequestDeduplicationService } from '../services/request-deduplication.service';
import {
  AuditEventType,
  RiskLevel,
  BaseAuditEvent,
  EntityAuditEvent,
  OperationAuditEvent,
} from '../events/types/audit-event.types';
import { AuditContextHolder } from '../../../common/interceptors/audit-context.interceptor';

/**
 * Configuração para auditoria global
 */
interface GlobalAuditConfig {
  /** Se deve auditar esta requisição */
  enabled: boolean;
  /** Nível de risco da operação */
  riskLevel: RiskLevel;
  /** Se deve capturar o corpo da requisição */
  captureRequestBody: boolean;
  /** Se deve capturar a resposta */
  captureResponse: boolean;
  /** Campos sensíveis a serem mascarados */
  sensitiveFields: string[];
}

@Injectable()
export class GlobalAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalAuditInterceptor.name);

  constructor(
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly auditMetricsService: AuditMetricsService,
    private readonly requestDeduplicationService: RequestDeduplicationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<ExpressRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Verificar se deve auditar esta requisição
    const auditConfig = this.getAuditConfig(request);
    if (!auditConfig.enabled) {
      return next.handle();
    }

    // Verificar se esta requisição já foi processada (deduplicação)
    const requestContext = {
      method: request.method,
      url: request.url,
      userId: this.extractUserId(request),
      ip: this.extractClientIP(request),
      timestamp: startTime,
    };

    if (this.requestDeduplicationService.isRequestProcessed(requestContext)) {
      this.logger.debug(
        `Skipping duplicate audit for ${request.method} ${request.url}`,
      );
      return next.handle();
    }

    // Marcar requisição como processada
    const requestId = this.requestDeduplicationService.markRequestAsProcessed(requestContext);

    // Preparar contexto de auditoria
    const auditContext = this.prepareAuditContext(
      context,
      request,
      auditConfig,
    );

    // Adicionar requestId ao contexto para rastreamento
    auditContext.requestId = requestId;

    // Emitir evento de início da operação
    this.emitOperationStartEvent(auditContext, startTime);

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - startTime;
        this.emitOperationSuccessEvent(
          auditContext,
          result,
          duration,
          auditConfig,
        );
        
        // Registrar métricas de sucesso
        this.auditMetricsService.recordInterceptorEvent('OPERATION_SUCCESS', auditContext.method, auditContext.riskLevel, duration);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.emitOperationErrorEvent(auditContext, error, duration);
        
        // Registrar métricas de erro
        this.auditMetricsService.recordInterceptorEvent('OPERATION_ERROR', auditContext.method, auditContext.riskLevel, duration);
        
        return throwError(() => error);
      }),
    );
  }

  /**
   * Determina a configuração de auditoria para a requisição
   */
  private getAuditConfig(request: ExpressRequest): GlobalAuditConfig {
    const method = request.method;
    const path = request.route?.path || request.path;

    // Pular rotas de sistema/health
    if (this.isSystemRoute(path)) {
      return { enabled: false } as GlobalAuditConfig;
    }

    // Configuração baseada no método HTTP
    const config: GlobalAuditConfig = {
      enabled: true,
      riskLevel: this.determineRiskLevel(method, path),
      captureRequestBody: ['POST', 'PUT', 'PATCH'].includes(method),
      captureResponse: this.shouldCaptureResponse(method, path),
      sensitiveFields: this.getSensitiveFields(path),
    };

    return config;
  }

  /**
   * Verifica se é uma rota de sistema que não deve ser auditada
   */
  private isSystemRoute(path: string): boolean {
    const systemRoutes = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/api-docs',
      '/swagger',
      '/_next',
      '/static',
    ];

    return systemRoutes.some((route) => path.startsWith(route));
  }

  /**
   * Determina o nível de risco da operação
   */
  private determineRiskLevel(method: string, path: string): RiskLevel {
    // Operações críticas
    if (method === 'DELETE' || path.includes('/admin/')) {
      return RiskLevel.CRITICAL;
    }

    // Operações de alto risco
    if (
      ['POST', 'PUT', 'PATCH'].includes(method) ||
      path.includes('/auth/') ||
      path.includes('/usuario/')
    ) {
      return RiskLevel.HIGH;
    }

    // Operações de médio risco
    if (
      method === 'GET' && (
        this.containsSensitiveData(path) ||
        path.includes('/cidadao/')
      )
    ) {
      return RiskLevel.MEDIUM;
    }

    // Operações de baixo risco
    return RiskLevel.LOW;
  }

  /**
   * Verifica se deve capturar a resposta
   */
  private shouldCaptureResponse(method: string, path: string): boolean {
    // Sempre capturar para operações críticas
    if (method === 'DELETE') return true;

    // Capturar para operações com dados sensíveis
    if (this.containsSensitiveData(path)) return true;

    // Não capturar para GETs simples
    return false;
  }

  /**
   * Obtém campos sensíveis baseado na rota
   */
  private getSensitiveFields(path: string): string[] {
    const sensitiveFieldsMap: Record<string, string[]> = {
      '/cidadao': ['cpf', 'rg', 'telefone', 'email', 'endereco'],
      '/usuario': ['email', 'telefone', 'cpf'],
      '/beneficio': ['valor', 'conta_bancaria'],
      '/pagamento': ['valor', 'conta_destino', 'pix_key'],
    };

    for (const [route, fields] of Object.entries(sensitiveFieldsMap)) {
      if (path.includes(route)) {
        return fields;
      }
    }

    return [];
  }

  /**
   * Verifica se a rota contém dados sensíveis
   */
  private containsSensitiveData(path: string): boolean {
    const sensitiveRoutes = [
      '/cidadao',
      '/usuario',
      '/beneficio',
      '/pagamento',
      '/documento',
    ];

    return sensitiveRoutes.some((route) => path.includes(route));
  }

  /**
   * Prepara o contexto de auditoria
   */
  private prepareAuditContext(
    context: ExecutionContext,
    request: ExpressRequest,
    config: GlobalAuditConfig,
  ) {
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    const auditContext = AuditContextHolder.get();

    return {
      controller: controllerName,
      method: methodName,
      userId: auditContext?.userId || this.extractUserId(request),
      userAgent: this.extractUserAgent(request),
      ip: auditContext?.ip || this.extractClientIP(request),
      url: this.normalizeEndpoint(request),
      httpMethod: request.method,
      params: request.params,
      query: request.query,
      body: config.captureRequestBody
        ? this.sanitizeBody(request.body, config.sensitiveFields)
        : undefined,
      timestamp: new Date(),
      correlationId: auditContext?.correlationId || this.generateCorrelationId(),
      riskLevel: config.riskLevel,
      requestId: '', // Será definido após a deduplicação
    };
  }

  /**
   * Emite evento de início da operação
   */
  private emitOperationStartEvent(auditContext: any, startTime: number): void {
    try {
      const event: OperationAuditEvent = {
        eventId: this.generateEventId(),
        eventType: AuditEventType.OPERATION_START,
        entityName: this.extractEntityName(auditContext.controller),
        timestamp: new Date(startTime),
        userId: auditContext.userId,
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        correlationId: auditContext.correlationId,
        riskLevel: auditContext.riskLevel,
        metadata: {
          controller: auditContext.controller,
          method: auditContext.method,
          url: auditContext.url,
          httpMethod: auditContext.httpMethod,
          params: auditContext.params,
          query: auditContext.query,
          body: auditContext.body,
          requestId: auditContext.requestId,
        },
      };

      this.auditEventEmitter.emit(event);
      
      // Registrar métricas de início de operação
      this.auditMetricsService.recordInterceptorEvent('OPERATION_START', auditContext.httpMethod, auditContext.riskLevel, 0);
    } catch (error) {
      this.logger.error(
        `Erro ao emitir evento de início: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emite evento de sucesso da operação
   */
  private emitOperationSuccessEvent(
    auditContext: any,
    result: any,
    duration: number,
    config: GlobalAuditConfig,
  ): void {
    try {
      const event: OperationAuditEvent = {
        eventId: this.generateEventId(),
        eventType: AuditEventType.OPERATION_SUCCESS,
        timestamp: new Date(),
        userId: auditContext.userId,
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        correlationId: auditContext.correlationId,
        riskLevel: auditContext.riskLevel,
        entityName: this.extractEntityName(auditContext.controller),
        entityId: this.extractEntityId(auditContext.params, result),
        operation: this.mapHttpMethodToOperation(auditContext.httpMethod),
        metadata: {
          controller: auditContext.controller,
          method: auditContext.method,
          url: auditContext.url,
          httpMethod: auditContext.httpMethod,
          duration,
          requestId: auditContext.requestId,
          response: config.captureResponse
            ? this.sanitizeResult(result, config.sensitiveFields)
            : undefined,
        },
      };

      this.auditEventEmitter.emit(event);
    } catch (error) {
      this.logger.error(
        `Erro ao emitir evento de sucesso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emite evento de erro da operação
   */
  private emitOperationErrorEvent(
    auditContext: any,
    error: any,
    duration: number,
  ): void {
    try {
      const event: OperationAuditEvent = {
        eventId: this.generateEventId(),
        eventType: AuditEventType.OPERATION_ERROR,
        entityName: this.extractEntityName(auditContext.controller),
        timestamp: new Date(),
        userId: auditContext.userId,
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        correlationId: auditContext.correlationId,
        riskLevel: RiskLevel.HIGH, // Erros sempre são de alto risco
        metadata: {
          controller: auditContext.controller,
          method: auditContext.method,
          url: auditContext.url,
          httpMethod: auditContext.httpMethod,
          duration,
          requestId: auditContext.requestId,
          error: {
            message: error.message,
            status: error.status || 500,
            stack: error.stack,
          },
        },
      };

      this.auditEventEmitter.emit(event);
    } catch (emitError) {
      this.logger.error(
        `Erro ao emitir evento de erro: ${emitError.message}`,
        emitError.stack,
      );
    }
  }

  /**
   * Extrai o ID do usuário da requisição
   */
  private extractUserId(request: ExpressRequest): string | undefined {
    return (
      (request as any).user?.id ||
      (request as any).user?.sub ||
      request.headers['x-user-id'] as string
    );
  }

  /**
   * Extrai o IP do cliente considerando proxies e load balancers
   * Implementação padronizada para auditoria
   */
  private extractClientIP(request: ExpressRequest): string {
    // Ordem de prioridade para extração do IP real do cliente
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // Pega o primeiro IP da lista (cliente original)
      const firstIP = forwardedFor.split(',')[0].trim();
      if (firstIP && firstIP !== 'unknown') {
        return firstIP;
      }
    }

    // Headers alternativos comuns em diferentes proxies
    const realIP = request.headers['x-real-ip'] as string;
    if (realIP && realIP !== 'unknown') {
      return realIP;
    }

    const clientIP = request.headers['x-client-ip'] as string;
    if (clientIP && clientIP !== 'unknown') {
      return clientIP;
    }

    // Conexão direta
    const connectionIP = request.connection?.remoteAddress;
    if (connectionIP) {
      return connectionIP;
    }

    const socketIP = (request as any).socket?.remoteAddress;
    if (socketIP) {
      return socketIP;
    }

    // Fallback obrigatório
    return 'unknown';
  }

  /**
   * Extrai o User-Agent da requisição
   * Implementação padronizada para auditoria
   */
  private extractUserAgent(request: ExpressRequest): string {
    const userAgent = request.headers['user-agent'];
    return userAgent && userAgent.trim() !== '' ? userAgent : 'unknown';
  }

  /**
   * Normaliza o endpoint removendo parâmetros dinâmicos
   * Implementação padronizada para auditoria
   */
  private normalizeEndpoint(request: ExpressRequest): string {
    let endpoint = request.url || (request as any).path || '/';
    
    // Remove query parameters
    const queryIndex = endpoint.indexOf('?');
    if (queryIndex !== -1) {
      endpoint = endpoint.substring(0, queryIndex);
    }
    
    // Normaliza IDs numéricos para :id
    endpoint = endpoint.replace(/\/\d+/g, '/:id');
    
    // Normaliza UUIDs para :uuid
    endpoint = endpoint.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
    
    return endpoint;
  }

  /**
   * Sanitiza o corpo da requisição
   */
  private sanitizeBody(body: any, sensitiveFields: string[]): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***MASKED***';
      }
    });

    return sanitized;
  }

  /**
   * Sanitiza o resultado
   */
  private sanitizeResult(result: any, sensitiveFields: string[]): any {
    if (!result || typeof result !== 'object') return result;

    const sanitized = { ...result };
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***MASKED***';
      }
    });

    return sanitized;
  }

  /**
   * Extrai o nome da entidade do controlador
   */
  private extractEntityName(controllerName: string): string {
    return controllerName.replace('Controller', '').toLowerCase();
  }

  /**
   * Extrai o ID da entidade
   */
  private extractEntityId(params: any, result: any): string | undefined {
    return params?.id || result?.id || undefined;
  }

  /**
   * Mapeia método HTTP para operação
   */
  private mapHttpMethodToOperation(method: string): string {
    const operationMap: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    return operationMap[method] || 'unknown';
  }

  /**
   * Gera ID único para o evento
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera ID de correlação
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}