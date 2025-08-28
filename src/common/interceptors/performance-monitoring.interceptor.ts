import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Interceptor para monitoramento de performance dos filtros avançados
 * 
 * Funcionalidades:
 * - Mede tempo de execução de endpoints
 * - Registra queries lentas
 * - Monitora uso de filtros
 * - Gera métricas para análise
 */
@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitoringInterceptor.name);
  
  // Threshold para considerar uma query como lenta (em ms)
  private readonly SLOW_QUERY_THRESHOLD = 1000;
  
  // Threshold para considerar uma query como muito lenta (em ms)
  private readonly VERY_SLOW_QUERY_THRESHOLD = 3000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    
    // Extrair informações da requisição
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('User-Agent') || 'unknown';
    const ip = request.ip || request.connection.remoteAddress;
    const userId = (request as any).user?.id || 'anonymous';
    
    // Verificar se é um endpoint de filtros avançados
    const isFiltrosAvancados = this.isFiltrosAvancadosEndpoint(url);
    
    // Extrair parâmetros de filtros se existirem
    const filtros = this.extractFiltros(request);
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Log básico para todas as requisições
          this.logRequest({
            method,
            url,
            duration,
            statusCode: response.statusCode,
            userId,
            ip,
            userAgent,
            isFiltrosAvancados,
            filtros,
            responseSize: this.calculateResponseSize(data),
          });
          
          // Log detalhado para queries lentas
          if (duration > this.SLOW_QUERY_THRESHOLD) {
            this.logSlowQuery({
              method,
              url,
              duration,
              userId,
              filtros,
              data,
            });
          }
          
          // Alerta para queries muito lentas
          if (duration > this.VERY_SLOW_QUERY_THRESHOLD) {
            this.logVerySlowQuery({
              method,
              url,
              duration,
              userId,
              filtros,
            });
          }
          
          // Métricas específicas para filtros avançados
          if (isFiltrosAvancados) {
            this.logFiltrosAvancadosMetrics({
              url,
              duration,
              filtros,
              resultCount: this.extractResultCount(data),
            });
          }
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          this.logError({
            method,
            url,
            duration,
            error: error.message,
            stack: error.stack,
            userId,
            filtros,
          });
        },
      }),
    );
  }

  /**
   * Verifica se o endpoint é relacionado aos filtros avançados
   */
  private isFiltrosAvancadosEndpoint(url: string): boolean {
    const filtrosEndpoints = [
      '/solicitacoes',
      '/cidadaos',
      '/usuarios',
      '/pagamentos',
      '/beneficios',
      '/unidades',
      '/auditorias',
      '/documentos',
    ];
    
    return filtrosEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Extrai parâmetros de filtros da requisição
   */
  private extractFiltros(request: Request): any {
    const query = request.query;
    const body = request.body;
    
    // Combinar query params e body para capturar todos os filtros
    const filtros = {
      ...query,
      ...body,
    };
    
    // Remover campos sensíveis do log
    const { password, token, authorization, ...safeFiltros } = filtros;
    
    return safeFiltros;
  }

  /**
   * Calcula o tamanho aproximado da resposta
   */
  private calculateResponseSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Extrai a quantidade de resultados da resposta
   */
  private extractResultCount(data: any): number {
    if (!data) return 0;
    
    // Para respostas paginadas
    if (data.items && Array.isArray(data.items)) {
      return data.items.length;
    }
    
    // Para arrays diretos
    if (Array.isArray(data)) {
      return data.length;
    }
    
    // Para objetos únicos
    return 1;
  }

  /**
   * Log básico de requisições
   */
  private logRequest(params: {
    method: string;
    url: string;
    duration: number;
    statusCode: number;
    userId: string;
    ip: string;
    userAgent: string;
    isFiltrosAvancados: boolean;
    filtros: any;
    responseSize: number;
  }) {
    const {
      method,
      url,
      duration,
      statusCode,
      userId,
      ip,
      isFiltrosAvancados,
      responseSize,
    } = params;
    
    const logLevel = duration > this.SLOW_QUERY_THRESHOLD ? 'warn' : 'log';
    const message = `${method} ${url} - ${duration}ms - ${statusCode} - ${responseSize}b - User: ${userId} - IP: ${ip}`;
    
    if (isFiltrosAvancados) {
      this.logger[logLevel](`[FILTROS_AVANCADOS] ${message}`);
    } else {
      this.logger[logLevel](message);
    }
  }

  /**
   * Log detalhado para queries lentas
   */
  private logSlowQuery(params: {
    method: string;
    url: string;
    duration: number;
    userId: string;
    filtros: any;
    data: any;
  }) {
    const { method, url, duration, userId, filtros } = params;
    
    this.logger.warn(
      `[SLOW_QUERY] ${method} ${url} took ${duration}ms`,
      {
        duration,
        userId,
        filtros,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Alerta para queries muito lentas
   */
  private logVerySlowQuery(params: {
    method: string;
    url: string;
    duration: number;
    userId: string;
    filtros: any;
  }) {
    const { method, url, duration, userId, filtros } = params;
    
    this.logger.error(
      `[VERY_SLOW_QUERY] CRITICAL: ${method} ${url} took ${duration}ms`,
      {
        duration,
        userId,
        filtros,
        timestamp: new Date().toISOString(),
        alert: 'PERFORMANCE_CRITICAL',
      },
    );
  }

  /**
   * Métricas específicas para filtros avançados
   */
  private logFiltrosAvancadosMetrics(params: {
    url: string;
    duration: number;
    filtros: any;
    resultCount: number;
  }) {
    const { url, duration, filtros, resultCount } = params;
    
    // Analisar tipos de filtros utilizados
    const filtroTypes = this.analyzeFiltroTypes(filtros);
    
    // Calcular eficiência (resultados por ms)
    const efficiency = resultCount > 0 ? resultCount / duration : 0;
    
    this.logger.log(
      `[FILTROS_METRICS] ${url} - ${duration}ms - ${resultCount} results`,
      {
        duration,
        resultCount,
        efficiency: parseFloat(efficiency.toFixed(4)),
        filtroTypes,
        hasArrayFilters: filtroTypes.includes('array'),
        hasTextSearch: filtroTypes.includes('text'),
        hasDateFilters: filtroTypes.includes('date'),
        hasPagination: filtroTypes.includes('pagination'),
        hasOrdering: filtroTypes.includes('ordering'),
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Analisa os tipos de filtros utilizados
   */
  private analyzeFiltroTypes(filtros: any): string[] {
    const types: string[] = [];
    
    if (!filtros || typeof filtros !== 'object') {
      return types;
    }
    
    // Verificar filtros de array
    const arrayFields = [
      'status',
      'tipos',
      'categorias',
      'unidades',
      'perfis',
      'situacoes',
    ];
    if (arrayFields.some(field => filtros[field])) {
      types.push('array');
    }
    
    // Verificar busca textual
    const textFields = ['busca', 'search', 'nome', 'descricao'];
    if (textFields.some(field => filtros[field])) {
      types.push('text');
    }
    
    // Verificar filtros de data
    const dateFields = [
      'dataInicio',
      'dataFim',
      'criadoEm',
      'atualizadoEm',
      'dataVencimento',
    ];
    if (dateFields.some(field => filtros[field])) {
      types.push('date');
    }
    
    // Verificar paginação
    if (filtros.limit || filtros.offset || filtros.page) {
      types.push('pagination');
    }
    
    // Verificar ordenação
    if (filtros.orderBy || filtros.sortBy || filtros.order) {
      types.push('ordering');
    }
    
    return types;
  }

  /**
   * Log de erros
   */
  private logError(params: {
    method: string;
    url: string;
    duration: number;
    error: string;
    stack: string;
    userId: string;
    filtros: any;
  }) {
    const { method, url, duration, error, userId, filtros } = params;
    
    this.logger.error(
      `[ERROR] ${method} ${url} failed after ${duration}ms: ${error}`,
      {
        duration,
        error,
        userId,
        filtros,
        timestamp: new Date().toISOString(),
      },
    );
  }
}

/**
 * Decorator para aplicar o interceptor de performance em controllers específicos
 */
export function MonitorPerformance() {
  return function (target: any) {
    // Este decorator pode ser usado para marcar controllers que devem ser monitorados
    Reflect.defineMetadata('monitor-performance', true, target);
  };
}

/**
 * Interface para métricas de performance
 */
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  resultCount: number;
  filtroTypes: string[];
  timestamp: Date;
  userId: string;
  efficiency: number;
}

/**
 * Serviço para coletar e analisar métricas de performance
 */
@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000; // Manter apenas as últimas 1000 métricas em memória

  /**
   * Adiciona uma métrica de performance
   */
  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Manter apenas as métricas mais recentes
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Obtém estatísticas de performance
   */
  getStats(timeWindow: number = 3600000): any { // 1 hora por padrão
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);
    
    const recentMetrics = this.metrics.filter(
      metric => metric.timestamp >= windowStart,
    );
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        slowQueries: 0,
        topEndpoints: [],
        filtroUsage: {},
      };
    }
    
    const totalRequests = recentMetrics.length;
    const averageDuration = recentMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0,
    ) / totalRequests;
    
    const slowQueries = recentMetrics.filter(
      metric => metric.duration > 1000,
    ).length;
    
    // Top endpoints por volume
    const endpointCounts = recentMetrics.reduce((acc, metric) => {
      acc[metric.endpoint] = (acc[metric.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
    
    // Uso de filtros
    const filtroUsage = recentMetrics.reduce((acc, metric) => {
      metric.filtroTypes.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalRequests,
      averageDuration: parseFloat(averageDuration.toFixed(2)),
      slowQueries,
      slowQueryPercentage: parseFloat(((slowQueries / totalRequests) * 100).toFixed(2)),
      topEndpoints,
      filtroUsage,
      timeWindow: timeWindow / 1000 / 60, // em minutos
    };
  }

  /**
   * Limpa as métricas antigas
   */
  clearOldMetrics(maxAge: number = 86400000): void { // 24 horas por padrão
    const cutoff = new Date(Date.now() - maxAge);
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff);
    
    this.logger.log(`Cleared old metrics. Remaining: ${this.metrics.length}`);
  }
}