import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnhancedMetricsService } from './enhanced-metrics.service';
import { ConfigService } from '@nestjs/config';

/**
 * Interceptor para coletar métricas de operações de cache
 *
 * Este interceptor monitora operações de cache e registra métricas
 * como taxa de acertos, tempo de resposta e operações totais.
 */
@Injectable()
export class CacheMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheMetricsInterceptor.name);
  private readonly cacheEnabled: boolean;
  private readonly cacheType: string;

  // Contadores para cálculo de taxa de acertos
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastReportTime = Date.now();
  private readonly reportInterval = 60000; // 1 minuto

  constructor(
    private readonly metricsService: EnhancedMetricsService,
    private readonly configService: ConfigService,
  ) {
    // Verificar se o Redis está habilitado
    this.cacheEnabled = this.configService.get('DISABLE_REDIS') !== 'true';
    this.cacheType = this.cacheEnabled ? 'redis' : 'memory';

    // Iniciar relatório periódico de taxa de acertos
    this.scheduleHitRatioReport();
  }

  /**
   * Intercepta operações de cache e coleta métricas
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Se o cache estiver desabilitado, apenas continua a execução
    if (!this.cacheEnabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Identificar operação de cache com base no método e URL
    const cacheOperation = this.getCacheOperation(method, url);
    if (!cacheOperation) {
      return next.handle();
    }

    const startTime = process.hrtime();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Calcular duração da operação
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationSeconds = seconds + nanoseconds / 1e9;

          // Determinar se foi um hit ou miss no cache
          const isCacheHit = this.isCacheHit(data, cacheOperation);

          // Registrar operação de cache
          this.metricsService.recordCacheOperation(
            cacheOperation,
            true, // operação bem-sucedida
            this.cacheType,
          );

          // Registrar duração da operação
          this.metricsService.recordCacheOperationDuration(
            cacheOperation,
            durationSeconds,
            this.cacheType,
          );

          // Atualizar contadores para taxa de acertos
          if (isCacheHit) {
            this.cacheHits++;
          } else {
            this.cacheMisses++;
          }

          // Atualizar taxa de acertos periodicamente
          this.updateHitRatioIfNeeded();
        },
        error: (error) => {
          // Registrar operação de cache com falha
          this.metricsService.recordCacheOperation(
            cacheOperation,
            false, // operação falhou
            this.cacheType,
          );

          this.logger.error(
            `Erro em operação de cache ${cacheOperation}: ${error.message}`,
          );
        },
      }),
    );
  }

  /**
   * Identifica a operação de cache com base no método e URL
   */
  private getCacheOperation(method: string, url: string): string | null {
    // Mapear métodos HTTP para operações de cache
    if (method === 'GET' && url.includes('/api/')) {
      return 'get';
    }
    if (
      (method === 'POST' || method === 'PUT' || method === 'DELETE') &&
      url.includes('/api/')
    ) {
      return 'invalidate';
    }
    return null;
  }

  /**
   * Determina se uma operação resultou em um hit no cache
   */
  private isCacheHit(data: any, operation: string): boolean {
    // Lógica para determinar se foi um hit no cache
    // Esta é uma implementação simplificada e pode precisar ser ajustada
    // com base na estrutura de resposta real da aplicação
    if (operation === 'get') {
      // Verificar se os dados têm uma propriedade que indica origem do cache
      // ou usar heurística baseada no tempo de resposta
      return data && data._fromCache === true;
    }
    return false;
  }

  /**
   * Atualiza a taxa de acertos se o intervalo de relatório foi atingido
   */
  private updateHitRatioIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastReportTime >= this.reportInterval) {
      this.updateHitRatio();
      this.lastReportTime = now;
    }
  }

  /**
   * Calcula e atualiza a taxa de acertos do cache
   */
  private updateHitRatio(): void {
    const total = this.cacheHits + this.cacheMisses;
    if (total > 0) {
      const ratio = this.cacheHits / total;
      this.metricsService.updateCacheHitRatio(ratio, this.cacheType);

      // Resetar contadores após o relatório
      this.cacheHits = 0;
      this.cacheMisses = 0;

      this.logger.debug(
        `Taxa de acertos do cache (${this.cacheType}): ${(ratio * 100).toFixed(2)}%`,
      );
    }
  }

  /**
   * Agenda relatórios periódicos de taxa de acertos
   */
  private scheduleHitRatioReport(): void {
    setInterval(() => {
      this.updateHitRatio();
    }, this.reportInterval);
  }
}
