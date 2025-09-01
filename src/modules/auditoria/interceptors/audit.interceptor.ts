/**
 * AuditInterceptor
 *
 * Interceptor para auditoria automática baseada em decorators.
 * Captura execução de métodos e emite eventos de auditoria.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request as ExpressRequest, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditEventEmitter } from '../events/emitters/audit-event.emitter';
import {
  AUDIT_METADATA_KEY,
  SENSITIVE_DATA_METADATA_KEY,
  AUTO_AUDIT_METADATA_KEY,
  AuditDecoratorConfig,
  SensitiveDataConfig,
  AutoAuditConfig,
} from '../decorators/audit.decorators';
import {
  AuditEventType,
  RiskLevel,
  BaseAuditEvent,
} from '../events/types/audit-event.types';
import { AUDIT_EVENTS } from '../constants/audit.constants';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<ExpressRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extrair metadados dos decorators
    const auditConfig = this.reflector.get<AuditDecoratorConfig>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    const sensitiveConfig = this.reflector.get<SensitiveDataConfig>(
      SENSITIVE_DATA_METADATA_KEY,
      context.getHandler(),
    );

    const autoAuditConfig = this.reflector.getAllAndOverride<AutoAuditConfig>(
      AUTO_AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há configuração de auditoria, prosseguir sem interceptar
    if (!auditConfig && !sensitiveConfig && !autoAuditConfig?.enabled) {
      return next.handle();
    }

    // Preparar contexto da auditoria
    const auditContext = this.prepareAuditContext(
      context,
      request,
      auditConfig,
      sensitiveConfig,
      autoAuditConfig,
    );

    // Verificar condições de skip
    if (auditConfig?.skipIf && auditConfig.skipIf(auditContext)) {
      return next.handle();
    }

    // Emitir evento de início (se configurado)
    this.emitStartEvent(auditContext, startTime);

    return next.handle().pipe(
      tap((result) => {
        // Sucesso - emitir evento de auditoria
        this.emitSuccessEvent(auditContext, result, startTime);
      }),
      catchError((error) => {
        // Erro - emitir evento de erro
        this.emitErrorEvent(auditContext, error, startTime);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Prepara o contexto da auditoria
   */
  private prepareAuditContext(
    context: ExecutionContext,
    request: ExpressRequest,
    auditConfig?: AuditDecoratorConfig,
    sensitiveConfig?: SensitiveDataConfig,
    autoAuditConfig?: AutoAuditConfig,
  ) {
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    const userId = this.extractUserId(request);
    const userAgent = this.extractUserAgent(request);
    const ip = this.extractClientIP(request);

    return {
      controller: controllerName,
      method: methodName,
      userId,
      userAgent,
      ip,
      url: request.url,
      httpMethod: request.method,
      params: (request as unknown as ExpressRequest).params,
      query: (request as unknown as ExpressRequest).query,
      body: this.sanitizeBody(request.body, sensitiveConfig),
      auditConfig,
      sensitiveConfig,
      autoAuditConfig,
      timestamp: new Date(),
      request, // Adicionar o request completo para uso no normalizeEndpoint
    };
  }

  /**
   * Emite evento de início da operação
   */
  private emitStartEvent(auditContext: any, startTime: number) {
    try {
      const baseEvent: BaseAuditEvent = {
        eventId: uuidv4(),
        eventType: AuditEventType.SYSTEM_ERROR,
        entityName: auditContext.controller || 'unknown',
        timestamp: new Date(startTime),
        userId: auditContext.userId,
        riskLevel: RiskLevel.LOW,
        requestContext: {
          ip: auditContext.ip,
          userAgent: auditContext.userAgent,
          endpoint: this.normalizeEndpoint(auditContext.request),
          method: auditContext.httpMethod,
        },
        metadata: {
          operation: 'method_start',
          controller: auditContext.controller,
          method: auditContext.method,
          url: this.normalizeEndpoint(auditContext.request),
          httpMethod: auditContext.httpMethod,
        },
      };

      this.auditEventEmitter.emit(baseEvent);
    } catch (error) {
      this.logger.error('Erro ao emitir evento de início:', error);
    }
  }

  /**
   * Emite evento de sucesso da operação
   */
  private emitSuccessEvent(auditContext: any, result: any, startTime: number) {
    try {
      const duration = Date.now() - startTime;
      const { auditConfig, sensitiveConfig, autoAuditConfig } = auditContext;

      // Evento específico baseado no decorator @Audit
      if (auditConfig) {
        this.emitConfiguredAuditEvent(
          auditContext,
          auditConfig,
          result,
          duration,
        );
      }

      // Evento de dados sensíveis baseado no decorator @SensitiveData
      if (sensitiveConfig) {
        this.emitSensitiveDataEvent(
          auditContext,
          sensitiveConfig,
          result,
          duration,
        );
      }

      // Evento automático baseado no decorator @AutoAudit
      if (autoAuditConfig?.enabled) {
        this.emitAutoAuditEvent(
          auditContext,
          autoAuditConfig,
          result,
          duration,
        );
      }
    } catch (error) {
      this.logger.error('Erro ao emitir evento de sucesso:', error);
    }
  }

  /**
   * Emite evento de erro da operação
   */
  private emitErrorEvent(auditContext: any, error: any, startTime: number) {
    try {
      const duration = Date.now() - startTime;

      const errorEvent: BaseAuditEvent = {
        eventId: uuidv4(),
        eventType: AuditEventType.SYSTEM_ERROR,
        entityName: auditContext.controller || 'unknown',
        timestamp: new Date(),
        userId: auditContext.userId,
        riskLevel: RiskLevel.HIGH,
        requestContext: {
          ip: auditContext.ip,
          userAgent: auditContext.userAgent,
          endpoint: this.normalizeEndpoint(auditContext.request),
          method: auditContext.httpMethod,
        },
        metadata: {
          operation: 'method_error',
          controller: auditContext.controller,
          method: auditContext.method,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          duration,
        },
      };

      this.auditEventEmitter.emit(errorEvent);
    } catch (emitError) {
      this.logger.error('Erro ao emitir evento de erro:', emitError);
    }
  }

  /**
   * Emite evento configurado pelo decorator @Audit
   */
  private emitConfiguredAuditEvent(
    auditContext: any,
    config: AuditDecoratorConfig,
    result: any,
    duration: number,
  ) {
    const event: BaseAuditEvent = {
      eventId: uuidv4(),
      eventType: config.eventType,
      entityName: config.entity || auditContext.controller || 'unknown',
      timestamp: new Date(),
      userId: auditContext.userId,
      riskLevel: config.riskLevel || RiskLevel.MEDIUM,
      requestContext: {
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        endpoint: this.normalizeEndpoint(auditContext.request),
        method: auditContext.httpMethod,
      },
      metadata: {
        entity: config.entity,
        operation: config.operation,
        controller: auditContext.controller,
        method: auditContext.method,
        httpMethod: auditContext.httpMethod,
        duration,
        params: auditContext.params,
        query: auditContext.query,
        body: auditContext.body,
        result: this.sanitizeResult(result, config.sensitiveFields),
      },
    };

    if (config.async) {
      this.auditEventEmitter.emit(event, { synchronous: false });
    } else {
      this.auditEventEmitter.emit(event);
    }
  }

  /**
   * Emite evento de dados sensíveis
   */
  private emitSensitiveDataEvent(
    auditContext: any,
    config: SensitiveDataConfig,
    result: any,
    duration: number,
  ) {
    const event: BaseAuditEvent = {
      eventId: uuidv4(),
      eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
      entityName: auditContext.controller || 'unknown',
      timestamp: new Date(),
      userId: auditContext.userId,
      riskLevel: RiskLevel.HIGH,
      requestContext: {
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        endpoint: this.normalizeEndpoint(auditContext.request),
        method: auditContext.httpMethod,
      },
      metadata: {
        operation: 'sensitive_data_access',
        controller: auditContext.controller,
        method: auditContext.method,
        url: auditContext.url,
        httpMethod: auditContext.httpMethod,
        duration,
        sensitiveFields: config.fields,
        maskInLogs: config.maskInLogs,
        requiresConsent: config.requiresConsent,
        retentionDays: config.retentionDays,
      },
    };

    // NOTA: Evento de dados sensíveis desabilitado para evitar duplicação
    // Os dados sensíveis são registrados no log principal pelo middleware
    // this.auditEventEmitter.emitSensitiveDataEvent(
    //   AuditEventType.SENSITIVE_DATA_ACCESSED,
    //   'sensitive_data',
    //   'unknown',
    //   event.userId,
    //   config.fields || [],
    // );
  }

  /**
   * Emite evento automático
   */
  private emitAutoAuditEvent(
    auditContext: any,
    config: AutoAuditConfig,
    result: any,
    duration: number,
  ) {
    const event: BaseAuditEvent = {
      eventId: uuidv4(),
      eventType: AuditEventType.SYSTEM_INFO,
      entityName: auditContext.controller || 'unknown',
      timestamp: new Date(),
      userId: auditContext.userId,
      riskLevel: RiskLevel.LOW,
      requestContext: {
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        endpoint: auditContext.url,
        method: auditContext.httpMethod,
      },
      metadata: {
        operation: 'auto_audit',
        controller: auditContext.controller,
        method: auditContext.method,
        duration,
        includeRequest: config.includeRequest,
        includeResponse: config.includeResponse,
        request: config.includeRequest
          ? {
              params: auditContext.params,
              query: auditContext.query,
              body: auditContext.body,
            }
          : undefined,
        response: config.includeResponse
          ? this.sanitizeResult(result, config.excludeFields)
          : undefined,
      },
    };

    if (config.async) {
      this.auditEventEmitter.emit(event, { synchronous: false });
    } else {
      this.auditEventEmitter.emit(event);
    }
  }

  /**
   * Extrai o ID do usuário da requisição
   */
  private extractUserId(request: ExpressRequest): string | undefined {
    // Tentar extrair de diferentes fontes
    return (
      (request as any).user?.['id'] ||
      (request as any).user?.['userId'] ||
      (request.headers['x-user-id'] as string) ||
      undefined
    );
  }

  /**
   * Extrai o IP do cliente considerando proxies e load balancers
   * Implementação padronizada para auditoria
   */
  private extractClientIP(request: any): string {
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

    const socketIP = request.socket?.remoteAddress;
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
  private extractUserAgent(request: any): string {
    const userAgent = request.headers['user-agent'];
    return userAgent && userAgent.trim() !== '' ? userAgent : 'unknown';
  }

  /**
   * Normaliza o endpoint removendo parâmetros dinâmicos
   * Implementação padronizada para auditoria
   */
  private normalizeEndpoint(request: ExpressRequest): string {
    let endpoint = request.url || request.path || '/';
    
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
   * Sanitiza o body removendo campos sensíveis
   */
  private sanitizeBody(body: any, sensitiveConfig?: SensitiveDataConfig): any {
    if (!body || !sensitiveConfig?.fields) {
      return body;
    }

    const sanitized = { ...body };

    for (const field of sensitiveConfig.fields) {
      if (sanitized[field]) {
        sanitized[field] = sensitiveConfig.maskInLogs
          ? '***MASKED***'
          : '[SENSITIVE]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitiza o resultado removendo campos sensíveis
   */
  private sanitizeResult(result: any, excludeFields?: string[]): any {
    if (!result || !excludeFields) {
      return result;
    }

    const sanitized = { ...result };

    for (const field of excludeFields) {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    }

    return sanitized;
  }
}
