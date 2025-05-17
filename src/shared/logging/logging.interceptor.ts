import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { LoggingService } from './logging.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

// Estender a interface Request para incluir a propriedade user
declare module 'express' {
  interface Request {
    user?: any;
  }
}

/**
 * Interceptor de Logging
 *
 * Intercepta todas as requisições HTTP e registra informações como:
 * - Método HTTP
 * - URL
 * - IP do cliente
 * - Código de status da resposta
 * - Tempo de resposta
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const userAgent =
      request.headers?.['user-agent'] || request.get?.('user-agent') || '';
    const ip = request.ip;
    const method = request.method;
    const originalUrl = request.url || request.originalUrl;
    const userId = request.user ? request.user.id : 'anônimo';

    const startTime = Date.now();

    this.loggingService.info(
      `Requisição iniciada: ${method} ${originalUrl}`,
      'HTTP',
      {
        method,
        url: originalUrl,
        ip,
        userAgent,
        userId,
      },
    );

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const response = ctx.getResponse<Response>();
          const { statusCode } = response;
          const contentLength =
            response.getHeader?.('content-length') ||
            response.get?.('content-length') ||
            0;
          const responseTime = Date.now() - startTime;

          this.loggingService.info(
            `Requisição concluída: ${method} ${originalUrl} - Status: ${statusCode} - Tempo: ${responseTime}ms`,
            'HTTP',
            {
              method,
              url: originalUrl,
              statusCode,
              contentLength,
              duration: responseTime,
              userId,
            },
          );
        },
        error: (error) => {
          const response = ctx.getResponse<Response>();
          const statusCode = error.status || 500;
          const responseTime = Date.now() - startTime;

          this.loggingService.error(
            `Requisição falhou: ${method} ${originalUrl} - Status: ${statusCode} - Tempo: ${responseTime}ms - Erro: ${error.message}`,
            error.stack,
            'HTTP',
            {
              method,
              url: originalUrl,
              statusCode,
              duration: responseTime,
              userId,
              error: error.message,
            },
          );
        },
      }),
    );
  }
}
