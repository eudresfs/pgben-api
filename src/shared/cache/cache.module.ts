import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheMetricsProvider } from './cache-metrics.provider';
import { BullModule } from '@nestjs/bull';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { getRedisConfig } from './redis.config';
import { CacheService as MemoryCacheService } from '../services/cache.service';

@Module({
  imports: [
    // Registramos a fila de cache com configurações otimizadas
    BullModule.registerQueueAsync({
      name: 'cache',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: getRedisConfig(configService),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          timeout: 5000, // 5 segundos de timeout para jobs
        },
      }),
      inject: [ConfigService],
    }),
    // Importamos o módulo de monitoramento para ter acesso ao serviço de métricas
    forwardRef(() => MonitoringModule),
  ],
  providers: [CacheService, CacheMetricsProvider, MemoryCacheService],
  exports: [CacheService, CacheMetricsProvider, MemoryCacheService],
})
export class CacheModule {}
