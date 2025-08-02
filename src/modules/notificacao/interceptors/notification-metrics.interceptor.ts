import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EnhancedMetricsService } from '../../../shared/monitoring/enhanced-metrics.service';

/**
 * Interceptor para capturar métricas específicas do módulo de notificação
 *
 * Responsabilidades:
 * - Capturar métricas de requests para endpoints de notificação
 * - Monitorar performance de operações de notificação
 * - Registrar eventos de erro específicos do módulo
 * - Integrar com o sistema de métricas global da aplicação
 */
@Injectable()
export class NotificationMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NotificationMetricsInterceptor.name);

  constructor(private readonly metricsService: EnhancedMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.url;
    const userId = request.user?.id;

    // Incrementar contador de requests de notificação em progresso
    this.metricsService.incrementHttpRequestsInProgress(method, route);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Registrar métricas de sucesso
        this.recordNotificationMetrics({
          method,
          route,
          statusCode,
          duration,
          userId,
          success: true,
        });

        // Decrementar contador de requests em progresso
        this.metricsService.decrementHttpRequestsInProgress(method, route);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Registrar métricas de erro
        this.recordNotificationMetrics({
          method,
          route,
          statusCode,
          duration,
          userId,
          success: false,
          error: error.message,
        });

        // Decrementar contador de requests em progresso
        this.metricsService.decrementHttpRequestsInProgress(method, route);

        // Re-throw o erro para não interferir no fluxo normal
        throw error;
      }),
    );
  }

  /**
   * Registra métricas específicas de notificação
   */
  private recordNotificationMetrics(data: {
    method: string;
    route: string;
    statusCode: number;
    duration: number;
    userId?: string;
    success: boolean;
    error?: string;
  }) {
    const { method, route, statusCode, duration, userId, success, error } =
      data;

    try {
      // Registrar request HTTP padrão
      this.metricsService.recordHttpRequest(method, route, statusCode);
      this.metricsService.recordHttpRequestDuration(
        method,
        route,
        statusCode,
        duration,
      );

      // Registrar métricas específicas de notificação
      if (route.includes('/notificacao')) {
        // Identificar tipo de operação
        const operationType = this.getOperationType(route, method);

        // Registrar operação de notificação
        this.recordNotificationOperation(operationType, success, duration);

        // Se houver erro, registrar evento de segurança
        if (!success && error) {
          this.metricsService.recordSecurityEvent(
            'notification_error',
            'error',
            'notification_module',
          );
        }
      }
    } catch (metricsError) {
      // Log do erro sem interromper o fluxo
      this.logger.warn(
        `Erro ao registrar métricas de notificação: ${metricsError.message}`,
        { originalError: error, route, method },
      );
    }
  }

  /**
   * Identifica o tipo de operação baseado na rota e método
   */
  private getOperationType(route: string, method: string): string {
    if (route.includes('/template')) {
      if (method === 'POST') return 'template_create';
      if (method === 'PUT') return 'template_update';
      if (method === 'DELETE') return 'template_delete';
      if (method === 'GET') return 'template_read';
      return 'template_operation';
    }

    switch (method) {
      case 'POST':
        return 'notification_create';
      case 'GET':
        return 'notification_read';
      case 'PUT':
      case 'PATCH':
        return 'notification_update';
      case 'DELETE':
        return 'notification_delete';
      default:
        return 'notification_operation';
    }
  }

  /**
   * Registra métricas específicas de operações de notificação
   */
  private recordNotificationOperation(
    operationType: string,
    success: boolean,
    duration: number,
  ) {
    // Registrar como operação de sistema
    this.metricsService.recordSecurityEvent(
      operationType,
      success ? 'info' : 'error',
      'notification_module',
    );
  }
}
