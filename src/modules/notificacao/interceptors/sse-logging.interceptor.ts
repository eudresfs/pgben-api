import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { Request, Response } from 'express';
import { SseStructuredLoggingService, LogLevel } from '../services/sse-structured-logging.service';
import { SseGracefulDegradationService } from '../services/sse-graceful-degradation.service';
import { SseErrorBoundaryService } from '../services/sse-error-boundary.service';

/**
 * Interface para contexto de request
 */
interface RequestContext {
  requestId: string;
  userId?: string;
  clientIp: string;
  userAgent: string;
  method: string;
  url: string;
  startTime: number;
}

/**
 * Interface para métricas de performance
 */
interface PerformanceMetrics {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

/**
 * Interceptor para logging e monitoramento de operações SSE
 */
@Injectable()
export class SseLoggingInterceptor implements NestInterceptor {
  private readonly performanceThresholds = {
    slow: 1000, // 1 segundo
    verySlow: 5000, // 5 segundos
  };

  constructor(
    private readonly loggingService: SseStructuredLoggingService,
    private readonly gracefulDegradationService: SseGracefulDegradationService,
    private readonly errorBoundaryService: SseErrorBoundaryService,
  ) {}

  /**
   * Interceptar requests e responses
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    
    // Criar contexto do request
    const requestContext = this.createRequestContext(request);
    
    // Iniciar monitoramento de CPU
    const cpuUsageStart = process.cpuUsage();
    
    // Log do início do request
    this.logRequestStart(requestContext, context);
    
    return next.handle().pipe(
      tap((data) => {
        // Log de sucesso
        this.logRequestSuccess(requestContext, response, data, cpuUsageStart);
      }),
      catchError((error) => {
        // Log de erro
        this.logRequestError(requestContext, response, error, cpuUsageStart);
        
        // Capturar erro com error boundary
        this.captureErrorWithBoundary(error, requestContext);
        
        return throwError(() => error);
      }),
      finalize(() => {
        // Log de finalização
        this.logRequestFinalization(requestContext, cpuUsageStart);
      })
    );
  }

  /**
   * Criar contexto do request
   */
  private createRequestContext(request: Request): RequestContext {
    return {
      requestId: this.generateRequestId(),
      userId: this.getUserId(request),
      clientIp: this.getClientIp(request),
      userAgent: request.get('User-Agent') || 'unknown',
      method: request.method,
      url: request.url,
      startTime: Date.now(),
    };
  }

  /**
   * Log do início do request
   */
  private logRequestStart(context: RequestContext, executionContext: ExecutionContext) {
    // Verificar se logging está disponível
    const isLoggingAvailable = this.gracefulDegradationService.isFeatureAvailable('logging');
    
    if (!isLoggingAvailable) {
      return; // Skip logging se não disponível
    }

    const request = executionContext.switchToHttp().getRequest<Request>();
    const response = executionContext.switchToHttp().getResponse<Response>();
    const duration = Date.now() - context.startTime;
    
    this.loggingService.logHttpRequest(request, response, duration);
  }

  /**
   * Log de request bem-sucedido
   */
  private logRequestSuccess(
    context: RequestContext,
    response: Response,
    data: any,
    cpuUsageStart: NodeJS.CpuUsage
  ) {
    const metrics = this.calculatePerformanceMetrics(context.startTime, cpuUsageStart);
    
    // Determinar nível de log baseado na performance
    const logLevel = this.determineLogLevel(metrics.duration);
    
    const logData = {
      userId: Number(context.userId) || 0,
      component: 'sse-interceptor',
      operation: `${context.method}_${this.sanitizeUrl(context.url)}`,
      duration: metrics.duration,
      metadata: {
        requestId: context.requestId,
        statusCode: response.statusCode,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        responseSize: this.getResponseSize(data),
        degradationLevel: this.gracefulDegradationService.getCurrentStatus().currentLevel,
      },
    };

    // Log baseado no nível determinado
    switch (logLevel) {
      case 'performance':
        this.loggingService.logPerformance('Request processado com sucesso', logData);
        break;
      case 'warning':
        this.loggingService.logConnection(LogLevel.WARN, 'Request lento processado', logData);
        break;
      case 'error':
        this.loggingService.logError(
          new Error('Request muito lento'),
          {
            ...logData,
            metadata: {
              ...logData.metadata,
              performanceIssue: 'very_slow_request',
            },
          }
        );
        break;
      default:
        this.loggingService.logPerformance('Request processado', logData);
    }
  }

  /**
   * Log de erro no request
   */
  private logRequestError(
    context: RequestContext,
    response: Response,
    error: any,
    cpuUsageStart: NodeJS.CpuUsage
  ) {
    const metrics = this.calculatePerformanceMetrics(context.startTime, cpuUsageStart);
    
    this.loggingService.logError(error, {
      userId: Number(context.userId) || 0,
      component: 'sse-interceptor',
      operation: `${context.method}_${this.sanitizeUrl(context.url)}_error`,
      metadata: {
        requestId: context.requestId,
        statusCode: response.statusCode || 500,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        duration: metrics.duration,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        errorType: error.constructor.name,
        errorMessage: error.message,
        degradationLevel: this.gracefulDegradationService.getCurrentStatus().currentLevel,
      },
    });
  }

  /**
   * Log de finalização do request
   */
  private logRequestFinalization(
    context: RequestContext,
    cpuUsageStart: NodeJS.CpuUsage
  ) {
    const metrics = this.calculatePerformanceMetrics(context.startTime, cpuUsageStart);
    
    // Log apenas se a duração for significativa ou se houver problemas de performance
    if (metrics.duration > this.performanceThresholds.slow) {
      this.loggingService.logPerformance('Request finalizado', {
        userId: context.userId ? Number(context.userId) : undefined,
        component: 'sse-interceptor',
        operation: `${context.method}_${this.sanitizeUrl(context.url)}_finalize`,
        duration: metrics.duration,
        metadata: {
          requestId: context.requestId,
          memoryUsage: metrics.memoryUsage,
          cpuUsage: metrics.cpuUsage,
          performanceCategory: this.categorizePerformance(metrics.duration),
        },
      });
    }
  }

  /**
   * Capturar erro com error boundary
   */
  private async captureErrorWithBoundary(error: any, context: RequestContext) {
    try {
      await this.errorBoundaryService.captureError(error, {
        userId: context.userId ? Number(context.userId) : undefined,
        additionalData: {
          component: 'sse-interceptor',
          operation: `${context.method}_${this.sanitizeUrl(context.url)}`,
          requestId: context.requestId,
          clientIp: context.clientIp,
          userAgent: context.userAgent,
          duration: Date.now() - context.startTime,
        },
      });
    } catch (boundaryError) {
      // Se o error boundary falhar, log direto
      console.error('Error boundary falhou:', boundaryError);
      console.error('Erro original:', error);
    }
  }

  /**
   * Calcular métricas de performance
   */
  private calculatePerformanceMetrics(
    startTime: number,
    cpuUsageStart: NodeJS.CpuUsage
  ): PerformanceMetrics {
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(cpuUsageStart);
    
    return {
      duration,
      memoryUsage,
      cpuUsage,
    };
  }

  /**
   * Determinar nível de log baseado na duração
   */
  private determineLogLevel(duration: number): 'performance' | 'warning' | 'error' {
    if (duration > this.performanceThresholds.verySlow) {
      return 'error';
    } else if (duration > this.performanceThresholds.slow) {
      return 'warning';
    }
    return 'performance';
  }

  /**
   * Categorizar performance
   */
  private categorizePerformance(duration: number): string {
    if (duration > this.performanceThresholds.verySlow) {
      return 'very_slow';
    } else if (duration > this.performanceThresholds.slow) {
      return 'slow';
    } else if (duration > 500) {
      return 'moderate';
    }
    return 'fast';
  }

  /**
   * Obter tamanho da resposta
   */
  private getResponseSize(data: any): number {
    if (!data) return 0;
    
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Sanitizar URL para logging
   */
  private sanitizeUrl(url: string): string {
    // Remover query parameters sensíveis
    return url.split('?')[0].replace(/[^a-zA-Z0-9\/\-_]/g, '_');
  }

  /**
   * Gerar ID único para o request
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obter ID do usuário do request
   */
  private getUserId(request: Request): string | undefined {
    return (request as any).user?.id || (request as any).user?.sub;
  }

  /**
   * Obter IP do cliente
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}