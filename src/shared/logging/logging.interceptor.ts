import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

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
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const userAgent = request.get('user-agent') || '';
    const { ip, method, originalUrl } = request;
    const userId = request.user ? (request.user as any).id : 'anônimo';
    
    const startTime = Date.now();
    
    this.logger.log(
      `Requisição iniciada: ${method} ${originalUrl} - Usuário: ${userId} - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const response = ctx.getResponse<Response>();
          const { statusCode } = response;
          const contentLength = response.get('content-length') || 0;
          const responseTime = Date.now() - startTime;
          
          this.logger.log(
            `Requisição concluída: ${method} ${originalUrl} - Status: ${statusCode} - Tamanho: ${contentLength} - Tempo: ${responseTime}ms - Usuário: ${userId}`,
          );
        },
        error: (error) => {
          const response = ctx.getResponse<Response>();
          const statusCode = error.status || 500;
          const responseTime = Date.now() - startTime;
          
          this.logger.error(
            `Requisição falhou: ${method} ${originalUrl} - Status: ${statusCode} - Tempo: ${responseTime}ms - Usuário: ${userId} - Erro: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
