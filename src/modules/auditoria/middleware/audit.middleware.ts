/**
 * AuditMiddleware
 * 
 * Middleware para configuração global de auditoria.
 * Integra o interceptor de auditoria na aplicação.
 */

import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditEventType,
  RiskLevel,
  BaseAuditEvent,
} from '../events/types/audit-event.types';
import { AUDIT_EVENTS } from '../constants/audit.constants';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;

    // Capturar informações da requisição
    const requestInfo = {
      method: req.method,
      url: req.url,
      ip: this.extractClientIp(req),
      userAgent: req.headers['user-agent'],
      userId: this.extractUserId(req),
      timestamp: new Date(),
    };

    // Emitir evento de início da requisição
    this.emitRequestStartEvent(requestInfo, startTime);

    // Interceptar resposta
    res.send = function(body) {
      const duration = Date.now() - startTime;
      res.locals.responseBody = body;
      res.locals.duration = duration;
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      const duration = Date.now() - startTime;
      res.locals.responseBody = body;
      res.locals.duration = duration;
      return originalJson.call(this, body);
    };

    // Interceptar fim da resposta
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.emitRequestEndEvent(requestInfo, res, duration);
    });

    // Interceptar erros
    res.on('error', (error) => {
      const duration = Date.now() - startTime;
      this.emitRequestErrorEvent(requestInfo, error, duration);
    });

    next();
  }

  /**
   * Emite evento de início da requisição
   */
  private emitRequestStartEvent(requestInfo: any, startTime: number) {
    try {
      const event: BaseAuditEvent = {
        eventType: AuditEventType.SYSTEM_INFO,
        entityName: 'Request',
        timestamp: new Date(startTime),
        userId: requestInfo.userId,
        riskLevel: RiskLevel.LOW,
        requestContext: {
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          method: requestInfo.method,
          endpoint: requestInfo.url,
        },
        metadata: {
          operation: 'request_start',
          method: requestInfo.method,
          url: requestInfo.url,
          timestamp: requestInfo.timestamp,
        },
      };

      this.eventEmitter.emit(AUDIT_EVENTS.REQUEST_START, event);
    } catch (error) {
      this.logger.error('Erro ao emitir evento de início da requisição:', error);
    }
  }

  /**
   * Emite evento de fim da requisição
   */
  private emitRequestEndEvent(requestInfo: any, res: Response, duration: number) {
    try {
      const event: BaseAuditEvent = {
        eventType: AuditEventType.SYSTEM_INFO,
        entityName: 'Request',
        timestamp: new Date(),
        userId: requestInfo.userId,
        riskLevel: this.calculateRiskLevel(res.statusCode, duration),
        requestContext: {
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          method: requestInfo.method,
          endpoint: requestInfo.url,
        },
        metadata: {
          operation: 'request_end',
          method: requestInfo.method,
          url: requestInfo.url,
          statusCode: res.statusCode,
          duration,
          responseSize: res.get('content-length'),
        },
      };

      this.eventEmitter.emit(AUDIT_EVENTS.REQUEST_END, event);
    } catch (error) {
      this.logger.error('Erro ao emitir evento de fim da requisição:', error);
    }
  }

  /**
   * Emite evento de erro da requisição
   */
  private emitRequestErrorEvent(requestInfo: any, error: any, duration: number) {
    try {
      const event: BaseAuditEvent = {
        eventType: AuditEventType.SYSTEM_ERROR,
        entityName: 'Request',
        timestamp: new Date(),
        userId: requestInfo.userId,
        riskLevel: RiskLevel.HIGH,
        requestContext: {
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          method: requestInfo.method,
          endpoint: requestInfo.url,
        },
        metadata: {
          operation: 'request_error',
          method: requestInfo.method,
          url: requestInfo.url,
          duration,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
      };

      this.eventEmitter.emit(AUDIT_EVENTS.REQUEST_ERROR, event);
    } catch (emitError) {
      this.logger.error('Erro ao emitir evento de erro da requisição:', emitError);
    }
  }

  /**
   * Calcula o nível de risco baseado no status code e duração
   */
  private calculateRiskLevel(statusCode: number, duration: number): RiskLevel {
    // Erros de servidor = alto risco
    if (statusCode >= 500) {
      return RiskLevel.CRITICAL;
    }

    // Erros de cliente = médio risco
    if (statusCode >= 400) {
      return RiskLevel.HIGH;
    }

    // Requisições muito lentas = médio risco
    if (duration > 5000) {
      return RiskLevel.MEDIUM;
    }

    // Requisições normais = baixo risco
    return RiskLevel.LOW;
  }

  /**
   * Extrai o ID do usuário da requisição
   */
  private extractUserId(request: Request): string | undefined {
    return (
      request.user?.['id'] ||
      request.user?.['userId'] ||
      request.headers['x-user-id'] as string ||
      undefined
    );
  }

  /**
   * Extrai o IP do cliente
   */
  private extractClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.headers['x-real-ip'] as string ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}