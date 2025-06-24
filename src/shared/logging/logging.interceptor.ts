import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { LoggingService } from './logging.service';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SENSITIVE_FIELDS, isSensitiveField } from '../constants/sensitive-fields.constants';

// Estender a interface Request
declare module 'express' {
  interface Request {
    user?: any;
    requestId?: string;
    startTime?: number;
  }
}

/**
 * Interceptor de Logging Otimizado
 * 
 * Intercepta requisições HTTP e registra informações detalhadas
 * com correlação de requests e métricas de performance.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Gerar ID único para rastreamento da requisição
    const requestId = uuidv4();
    request.requestId = requestId;
    request.startTime = Date.now();

    // Extrair informações da requisição
    const {
      method,
      url: originalUrl,
      ip,
      headers,
    } = request;

    const userAgent = headers['user-agent'] || '';
    const userId = request.user?.id || 'anonymous';
    const correlationId = headers['x-correlation-id'] as string || requestId;

    // Adicionar o requestId no header de resposta para facilitar debugging
    response.setHeader('X-Request-ID', requestId);

    // Log de início da requisição
    this.loggingService.logHttp({
      method,
      url: originalUrl,
      ip,
      userAgent,
      userId,
      requestId,
      correlationId,
    });

    return next.handle().pipe(
      tap(() => {
        this.logResponse(request, response, 'success');
      }),
      catchError((error) => {
        this.logResponse(request, response, 'error', error);
        return throwError(() => error);
      }),
    );
  }

  private logResponse(
    request: Request,
    response: Response,
    type: 'success' | 'error',
    error?: any,
  ): void {
    const duration = Date.now() - (request.startTime || 0);
    const statusCode = type === 'error' ? (error.status || 500) : response.statusCode;
    const contentLength = response.getHeader('content-length') as number || 0;

    const httpMeta = {
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      contentLength,
      userId: request.user?.id || 'anonymous',
      requestId: request.requestId,
      ip: request.ip,
    };

    // Sanitizar dados sensíveis antes de fazer log
    const sanitizeErrorData = (errorObj: any): any => {
      if (!errorObj || typeof errorObj !== 'object') {
        return errorObj;
      }

      // Função auxiliar para sanitizar recursivamente
      const sanitize = (obj: any, path = ''): any => {
        if (obj === null || obj === undefined) {
          return obj;
        }
        
        // Caso seja um objeto plano
        if (typeof obj === 'object' && !Array.isArray(obj)) {
          const result: any = {};
          
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            // Verifica se o campo atual é sensível
            const isSensitive = isSensitiveField(key);
            
            if (isSensitive && typeof value !== 'object') {
              // Redacted para campos sensíveis
              result[key] = '[REDACTED]';
            } else if (key === 'value' && path.split('.').some(part => 
              SENSITIVE_FIELDS.includes(part.toLowerCase())
            )) {
              // Caso especial para campo 'value' dentro da pilha de validação
              result[key] = '[REDACTED]';
            } else if (key === 'errors' || key === 'validationErrors' || key === 'details') {
              // Campos especiais que podem conter erros de validação
              result[key] = sanitize(value, currentPath);
            } else if (typeof value === 'object' && value !== null) {
              // Recursivamente sanitiza objetos aninhados
              result[key] = sanitize(value, currentPath);
            } else {
              result[key] = value;
            }
          }
          return result;
        }
        
        // Caso seja um array
        if (Array.isArray(obj)) {
          return obj.map((item, index) => sanitize(item, `${path}[${index}]`));
        }
        
        // Valores primitivos retornam sem alterações
        return obj;
      };

      return sanitize(errorObj);
    };

    if (type === 'error') {
      // Sanitizar o objeto de erro antes de logar
      const sanitizedError = sanitizeErrorData(error);
      const sanitizedMeta = {
        ...httpMeta,
        errorMessage: error.message,
        errorStack: error.stack,
      };
      
      // Sanitizar o response se existir
      if (error.response) {
        const sanitizedResponse = sanitizeErrorData(error.response);
        // Não permitir que o erro exponha valores sensíveis
        if (sanitizedResponse && typeof sanitizedResponse === 'object') {
          // Se houver erros de validação, sanitizar valores sensíveis
          if (sanitizedResponse.message && Array.isArray(sanitizedResponse.message)) {
            sanitizedResponse.message = sanitizedResponse.message.map((validationError: any) => {
              if (validationError && validationError.property) {
                const isSensitive = isSensitiveField(validationError.property);
                if (isSensitive && validationError.value !== undefined) {
                  validationError.value = '[REDACTED]';
                }
              }
              return validationError;
            });
          }
        }
        error.response = sanitizedResponse;
      }
      
      this.loggingService.error(
        `HTTP Request Failed: ${request.method} ${request.url}`,
        sanitizedError,
        'HTTP',
        sanitizedMeta,
      );

      // Log de segurança para erros 401/403
      if (statusCode === 401 || statusCode === 403) {
        this.loggingService.logSecurity(
          `Unauthorized access attempt: ${request.method} ${request.url}`,
          'medium',
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            requestId: request.requestId,
          },
        );
      }
    } else {
      this.loggingService.logHttp(httpMeta);
    }

    // Log de performance se necessário
    if (duration > 1000) {
      this.loggingService.logPerformance(
        `HTTP ${request.method} ${request.url}`,
        duration,
        'HTTP',
        { requestId: request.requestId },
      );
    }

    // Log de auditoria para operações críticas
    if (this.isCriticalOperation(request.method, request.url)) {
      this.loggingService.logAudit(
        request.method,
        request.url,
        request.user?.id || 'anonymous',
        type === 'success' ? 'success' : 'failure',
        {
          statusCode,
          duration,
          requestId: request.requestId,
        },
      );
    }
  }

  /**
   * Determina se a operação é crítica e precisa de auditoria
   */
  private isCriticalOperation(method: string, url: string): boolean {
    const criticalMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    const criticalPaths = ['/auth/', '/usuario/', '/pagamentos/'];
    
    return criticalMethods.includes(method) || 
           criticalPaths.some(path => url.includes(path));
  }
}