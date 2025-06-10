import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Interface para contexto de erro capturado automaticamente
 */
export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  operation: string;
  controller: string;
  method: string;
  requestId?: string;
  entityData?: any;
  requestBody?: any;
  requestParams?: any;
  requestQuery?: any;
}

/**
 * Interceptor que captura automaticamente contexto de erro para auditoria e debugging
 * Enriquece erros com informações do usuário, request e operação sendo executada
 */
@Injectable()
export class ErrorContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Captura contexto básico da requisição
    const errorContext = this.captureRequestContext(request, handler, controller);

    return next.handle().pipe(
      catchError((error) => {
        // Enriquece o erro com contexto capturado
        const enrichedError = this.enrichErrorWithContext(error, errorContext);
        
        // Log do erro com contexto completo
        this.logErrorWithContext(enrichedError, errorContext);
        
        // Propaga o erro enriquecido
        return throwError(() => enrichedError);
      }),
    );
  }

  /**
   * Captura contexto da requisição atual
   */
  private captureRequestContext(
    request: Request,
    handler: Function,
    controller: Function,
  ): ErrorContext {
    const user = (request as any).user; // Assumindo que user vem do JWT guard
    
    return {
      userId: user?.id || user?.sub,
      userEmail: user?.email,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers['user-agent'] || 'Unknown',
      timestamp: new Date(),
      operation: handler.name,
      controller: controller.name,
      method: request.method,
      requestId: request.headers['x-request-id'] as string,
      requestBody: this.sanitizeRequestData(request.body),
      requestParams: request.params,
      requestQuery: request.query,
    };
  }

  /**
   * Extrai endereço IP real considerando proxies
   */
  private extractIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'Unknown'
    );
  }

  /**
   * Sanitiza dados da requisição removendo informações sensíveis
   */
  private sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'senha',
      'token',
      'authorization',
      'cpf',
      'rg',
      'chave_pix',
      'conta_bancaria',
      'agencia',
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Enriquece erro com contexto capturado
   */
  private enrichErrorWithContext(error: any, context: ErrorContext): any {
    // Se o erro já tem contexto, não sobrescreve
    if (error.context) {
      return error;
    }

    // Adiciona contexto ao erro
    error.context = context;
    
    // Para erros HTTP do NestJS, adiciona contexto em metadata
    if (error.getResponse && typeof error.getResponse === 'function') {
      const response = error.getResponse();
      if (typeof response === 'object') {
        response.context = {
          operation: context.operation,
          controller: context.controller,
          timestamp: context.timestamp,
          requestId: context.requestId,
        };
      }
    }

    return error;
  }

  /**
   * Log estruturado do erro com contexto
   */
  private logErrorWithContext(error: any, context: ErrorContext): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status || error.statusCode,
      },
      context: {
        operation: `${context.controller}.${context.operation}`,
        user: {
          id: context.userId,
          email: context.userEmail,
        },
        request: {
          method: context.method,
          ip: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
        },
        timestamp: context.timestamp,
      },
      requestData: {
        params: context.requestParams,
        query: context.requestQuery,
        body: context.requestBody,
      },
    };

    // Log com nível apropriado baseado no tipo de erro
    if (error.status >= 500 || !error.status) {
      this.logger.error('Erro interno do servidor', JSON.stringify(logData, null, 2));
    } else if (error.status >= 400) {
      this.logger.warn('Erro de cliente', JSON.stringify(logData, null, 2));
    } else {
      this.logger.log('Erro capturado', JSON.stringify(logData, null, 2));
    }
  }
}

/**
 * Decorator para aplicar o interceptor de contexto de erro
 */
export const WithErrorContext = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // Implementação do decorator se necessário
    // Por enquanto, o interceptor será aplicado globalmente ou por controller
  };
};