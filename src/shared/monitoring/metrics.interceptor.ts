import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Interceptor de Métricas
 *
 * Intercepta todas as requisições HTTP e registra métricas como:
 * - Contador de requisições
 * - Duração das requisições
 * - Requisições em andamento
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url } = request;

    // Extrair a rota base sem parâmetros para evitar cardinalidade alta
    const route = this.normalizeRoute(url);

    // Incrementar contador de requisições em andamento
    this.metricsService.incrementHttpRequestsInProgress(method, route);

    const startTime = process.hrtime();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse();
          const statusCode = response.statusCode;

          // Calcular duração da requisição
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationSeconds = seconds + nanoseconds / 1e9;

          // Registrar métricas
          this.metricsService.recordHttpRequest(method, route, statusCode);
          this.metricsService.recordHttpRequestDuration(
            method,
            route,
            statusCode,
            durationSeconds,
          );

          // Decrementar contador de requisições em andamento
          this.metricsService.decrementHttpRequestsInProgress(method, route);
        },
        error: (error) => {
          const statusCode = error.status || 500;

          // Calcular duração da requisição
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationSeconds = seconds + nanoseconds / 1e9;

          // Registrar métricas
          this.metricsService.recordHttpRequest(method, route, statusCode);
          this.metricsService.recordHttpRequestDuration(
            method,
            route,
            statusCode,
            durationSeconds,
          );

          // Decrementar contador de requisições em andamento
          this.metricsService.decrementHttpRequestsInProgress(method, route);
        },
      }),
    );
  }

  /**
   * Normaliza a rota para evitar cardinalidade alta nas métricas
   * Exemplo: /users/123 -> /users/:id
   */
  private normalizeRoute(url: string): string {
    // Remover query string
    const path = url.split('?')[0];

    // Substituir IDs numéricos e UUIDs por placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:uuid',
      );
  }
}
