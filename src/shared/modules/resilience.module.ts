import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ResilientAuditoriaService } from '../services/resilient-auditoria.service';
import { HybridCacheService } from '../services/hybrid-cache.service';
import { HealthCheckService } from '../services/health-check.service';
import { CacheModule } from '../cache/cache.module';
/**
 * Módulo de Resiliência
 * 
 * Centraliza todos os serviços relacionados à resiliência do sistema:
 * - Cache híbrido com múltiplas camadas
 * - Auditoria resiliente com fallbacks
 * - Health checks e monitoramento
 * - Configurações de resiliência
 * 
 * Este módulo é global para estar disponível em toda a aplicação
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // Para jobs de recuperação e cache warming
    CacheModule,
  ],
  providers: [
    HealthCheckService,
    HybridCacheService,
    ResilientAuditoriaService,
    {
      provide: 'RESILIENCE_CONFIG',
      useFactory: () => ({
        // Configurações de Cache
        cache: {
          l1MaxSize: parseInt(process.env.CACHE_L1_MAX_SIZE || '1000'),
          defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300000'), // 5 minutos
          enableL2: process.env.CACHE_ENABLE_L2 !== 'false',
          enableWarming: process.env.CACHE_ENABLE_WARMING !== 'false',
          warmingInterval: parseInt(process.env.CACHE_WARMING_INTERVAL || '60000') // 1 minuto
        },
        
        // Configurações de Auditoria
        auditoria: {
          enableSyncFallback: process.env.AUDITORIA_ENABLE_SYNC_FALLBACK !== 'false',
          enableFileBackup: process.env.AUDITORIA_ENABLE_FILE_BACKUP !== 'false',
          backupPath: process.env.AUDITORIA_BACKUP_PATH || './logs/audit-backup',
          maxRetries: parseInt(process.env.AUDITORIA_MAX_RETRIES || '3'),
          retryDelay: parseInt(process.env.AUDITORIA_RETRY_DELAY || '1000'),
          recoveryInterval: process.env.AUDITORIA_RECOVERY_INTERVAL || '0 */5 * * * *' // A cada 5 minutos
        },
        
        // Configurações de Health Check
        healthCheck: {
          redisTimeout: parseInt(process.env.HEALTH_REDIS_TIMEOUT || '5000'),
          dbTimeout: parseInt(process.env.HEALTH_DB_TIMEOUT || '10000'),
          checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 segundos
          enableDetailedChecks: process.env.HEALTH_ENABLE_DETAILED_CHECKS !== 'false'
        },
        
        // Configurações de Circuit Breaker
        circuitBreaker: {
          failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
          recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '60000'), // 1 minuto
          monitoringPeriod: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_PERIOD || '10000') // 10 segundos
        },
        
        // Configurações de Monitoramento
        monitoring: {
          enableMetrics: process.env.MONITORING_ENABLE_METRICS !== 'false',
          metricsInterval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '60000'), // 1 minuto
          enableAlerts: process.env.MONITORING_ENABLE_ALERTS !== 'false',
          alertThresholds: {
            cacheHitRate: parseFloat(process.env.ALERT_CACHE_HIT_RATE_THRESHOLD || '0.8'), // 80%
            auditoriaFailureRate: parseFloat(process.env.ALERT_AUDITORIA_FAILURE_RATE_THRESHOLD || '0.1'), // 10%
            redisAvailability: parseFloat(process.env.ALERT_REDIS_AVAILABILITY_THRESHOLD || '0.95') // 95%
          }
        }
      })
    }
  ],
  exports: [
    HealthCheckService,
    HybridCacheService,
    ResilientAuditoriaService,
    'RESILIENCE_CONFIG'
  ]
})
export class ResilienceModule {}