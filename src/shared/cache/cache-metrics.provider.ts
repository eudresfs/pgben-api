import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EnhancedMetricsService } from '../monitoring/enhanced-metrics.service';

/**
 * Provedor de métricas para o sistema de cache
 *
 * Este provedor coleta métricas do sistema de cache e as envia para o serviço de métricas
 * para monitoramento e análise de performance.
 */
@Injectable()
export class CacheMetricsProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheMetricsProvider.name);
  private readonly cacheEnabled: boolean;
  private readonly cacheType: string;
  private readonly metricsInterval = 60000; // 1 minuto
  private metricsTimer: NodeJS.Timeout;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;
  private metricsDisabled = false;

  // Contadores para cálculo de métricas
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheFailures = 0;
  private cacheRecoveryAttempts = 0;
  private responseTimesMs: Map<string, number[]> = new Map();
  private cacheOperations = {
    get: 0,
    set: 0,
    del: 0,
    clear: 0,
  };

  constructor(
    private readonly metricsService: EnhancedMetricsService,
    private readonly configService: ConfigService,
    @InjectQueue('cache') private readonly cacheQueue: Queue,
  ) {
    // Verificar se o Redis está habilitado
    this.cacheEnabled = this.configService.get('DISABLE_REDIS') !== 'true';
    this.cacheType = this.cacheEnabled ? 'redis' : 'memory';
  }

  /**
   * Inicializa a coleta periódica de métricas quando o módulo é inicializado
   */
  onModuleInit() {
    this.startMetricsCollection();
    this.logger.log(
      `Iniciando coleta de métricas de cache (${this.cacheType})`,
    );
  }

  /**
   * Inicia a coleta periódica de métricas
   */
  private startMetricsCollection(): void {
    // Coletar métricas imediatamente na inicialização
    this.collectMetrics();

    // Configurar coleta periódica
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
  }

  /**
   * Coleta métricas do sistema de cache
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Verificar se as métricas foram desabilitadas devido a falhas consecutivas
      if (this.metricsDisabled) {
        this.logger.debug(
          'Coleta de métricas de cache temporariamente desabilitada devido a falhas consecutivas',
        );
        this.reportEmptyMetrics();
        return;
      }

      if (!this.cacheEnabled || !this.cacheQueue) {
        // Se o cache estiver desabilitado ou fila não disponível, apenas reporta métricas zeradas
        this.reportEmptyMetrics();
        return;
      }

      // Verificar se o Redis está acessível antes de tentar coletar métricas
      try {
        // Teste simples de conectividade com timeout reduzido
        const testPromise = this.cacheQueue.getJobCounts();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout na verificação de conectividade')),
            2000,
          ),
        );

        await Promise.race([testPromise, timeoutPromise]);

        // Se chegou até aqui, resetar contador de falhas
        this.consecutiveFailures = 0;
        if (this.metricsDisabled) {
          this.metricsDisabled = false;
          this.logger.log(
            'Coleta de métricas de cache reabilitada - Redis acessível novamente',
          );
        }
      } catch (connectivityError) {
        // Incrementar contador de falhas consecutivas
        this.consecutiveFailures++;

        // Se houver erro de conectividade ou autenticação, reportar métricas vazias
        if (
          connectivityError.message.includes('NOAUTH') ||
          connectivityError.message.includes('Authentication') ||
          connectivityError.message.includes('Timeout') ||
          connectivityError.message.includes('Connection')
        ) {
          this.logger.warn(
            `Redis não acessível (${connectivityError.message}) - Falha ${this.consecutiveFailures}/${this.maxConsecutiveFailures}`,
          );

          // Desabilitar coleta após muitas falhas consecutivas
          if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            this.metricsDisabled = true;
            this.logger.error(
              `Coleta de métricas de cache desabilitada após ${this.maxConsecutiveFailures} falhas consecutivas`,
            );
          }

          this.reportEmptyMetrics();
          return;
        }
        throw connectivityError;
      }

      // Coletar métricas do Redis via Bull com timeout e limitação
      const timeout = 5000; // 5 segundos de timeout
      const maxJobs = 50; // Reduzir ainda mais para evitar sobrecarga

      const jobCounts = (await Promise.race([
        this.cacheQueue.getJobCounts(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout ao obter contadores de jobs')),
            timeout,
          ),
        ),
      ])) as any;

      // Coletar apenas jobs ativos e em espera para reduzir carga
      const [activeJobs, waitingJobs] = (await Promise.all([
        Promise.race([
          this.cacheQueue.getJobs(['active'], 0, maxJobs),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout ao obter jobs ativos')),
              timeout,
            ),
          ),
        ]),
        Promise.race([
          this.cacheQueue.getJobs(['waiting'], 0, maxJobs),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout ao obter jobs em espera')),
              timeout,
            ),
          ),
        ]),
      ])) as any[];

      // Calcular tamanho aproximado do cache em bytes de forma mais eficiente
      let totalSizeBytes = 0;
      const allJobs = [...(activeJobs || []), ...(waitingJobs || [])];

      // Calcular tamanho apenas dos primeiros 20 jobs para reduzir processamento
      const jobsToCalculate = allJobs.slice(0, 20);
      for (const job of jobsToCalculate) {
        try {
          if (job && job.data) {
            const jobSize = JSON.stringify(job.data).length;
            totalSizeBytes += jobSize;
          }
        } catch (error) {
          // Ignorar erros de serialização de jobs individuais
          this.logger.debug(
            `Erro ao calcular tamanho do job: ${error.message}`,
          );
        }
      }

      // Estimar tamanho total baseado na amostra
      if (
        allJobs.length > jobsToCalculate.length &&
        jobsToCalculate.length > 0
      ) {
        const avgJobSize = totalSizeBytes / jobsToCalculate.length;
        totalSizeBytes = Math.round(avgJobSize * allJobs.length);
      }

      // Atualizar métricas
      this.metricsService.updateCacheSize(totalSizeBytes, this.cacheType);

      // Calcular e atualizar taxa de acertos se houver operações
      const totalOps = this.cacheHits + this.cacheMisses;
      if (totalOps > 0) {
        const hitRatio = this.cacheHits / totalOps;
        this.metricsService.updateCacheHitRatio(hitRatio, this.cacheType);
      }

      // Registrar operações acumuladas
      Object.entries(this.cacheOperations).forEach(([operation, count]) => {
        if (count > 0) {
          this.metricsService.recordCacheOperation(
            operation,
            true, // assumimos sucesso para métricas acumuladas
            this.cacheType,
          );
          // Resetar contador após registrar
          this.cacheOperations[operation] = 0;
        }
      });

      // Registrar falhas e tentativas de recuperação
      if (this.cacheFailures > 0) {
        this.metricsService.recordCacheFailures(
          this.cacheFailures,
          this.cacheType,
        );
        this.cacheFailures = 0;
      }

      if (this.cacheRecoveryAttempts > 0) {
        this.metricsService.recordCacheRecoveryAttempts(
          this.cacheRecoveryAttempts,
          this.cacheType,
        );
        this.cacheRecoveryAttempts = 0;
      }

      // Registrar tempos de resposta
      this.responseTimesMs.forEach((times, key) => {
        if (times.length > 0) {
          const avgTime =
            times.reduce((sum, time) => sum + time, 0) / times.length;
          this.metricsService.recordCacheResponseTime(
            avgTime,
            key,
            this.cacheType,
          );
        }
      });
      this.responseTimesMs.clear();

      // Resetar contadores
      this.cacheHits = 0;
      this.cacheMisses = 0;

      this.logger.debug(
        `Métricas de cache coletadas: ${allJobs.length} itens, ${totalSizeBytes} bytes`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao coletar métricas de cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Reporta métricas vazias quando o cache está desabilitado
   */
  private reportEmptyMetrics(): void {
    this.metricsService.updateCacheSize(0, this.cacheType);
    this.metricsService.updateCacheHitRatio(0, this.cacheType);
  }

  /**
   * Registra um hit no cache
   */
  registerCacheHit(): void {
    this.cacheHits++;
    this.cacheOperations.get++;
  }

  /**
   * Registra um miss no cache
   */
  registerCacheMiss(): void {
    this.cacheMisses++;
    this.cacheOperations.get++;
  }

  /**
   * Registra uma operação de set no cache
   */
  registerCacheSet(): void {
    this.cacheOperations.set++;
  }

  /**
   * Registra uma operação de delete no cache
   */
  registerCacheDelete(): void {
    this.cacheOperations.del++;
  }

  /**
   * Registra uma operação de clear no cache
   */
  registerCacheClear(): void {
    this.cacheOperations.clear++;
  }

  /**
   * Registra uma falha no cache
   */
  registerCacheFailure(): void {
    this.cacheFailures++;
    this.metricsService.recordCacheOperation('failure', false, this.cacheType);
  }

  /**
   * Registra uma tentativa de recuperação do circuit breaker
   */
  registerCacheRecoveryAttempt(): void {
    this.cacheRecoveryAttempts++;
    this.metricsService.recordCacheOperation('recovery', true, this.cacheType);
  }

  /**
   * Registra o tempo de resposta de uma operação de cache
   * @param key Chave do cache
   * @param timeMs Tempo em milissegundos (opcional)
   */
  registerCacheResponseTime(key: string, timeMs?: number): void {
    const time = timeMs || 0;
    if (!this.responseTimesMs.has(key)) {
      this.responseTimesMs.set(key, []);
    }
    const times = this.responseTimesMs.get(key);
    if (times) {
      times.push(time);
    }
  }

  /**
   * Cleanup quando o módulo for destruído
   */
  onModuleDestroy(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.logger.log('Timer de métricas de cache limpo');
    }
  }

  /**
   * Reabilita manualmente a coleta de métricas
   */
  enableMetrics(): void {
    this.metricsDisabled = false;
    this.consecutiveFailures = 0;
    this.logger.log('Coleta de métricas de cache reabilitada manualmente');
  }

  /**
   * Desabilita manualmente a coleta de métricas
   */
  disableMetrics(): void {
    this.metricsDisabled = true;
    this.logger.log('Coleta de métricas de cache desabilitada manualmente');
  }

  /**
   * Retorna o status atual das métricas
   */
  getMetricsStatus(): {
    enabled: boolean;
    consecutiveFailures: number;
    maxFailures: number;
    disabled: boolean;
  } {
    return {
      enabled: this.cacheEnabled,
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.maxConsecutiveFailures,
      disabled: this.metricsDisabled,
    };
  }
}
