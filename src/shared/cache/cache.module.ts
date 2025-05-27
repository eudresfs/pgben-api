import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheMetricsProvider } from './cache-metrics.provider';
import { BullModule } from '@nestjs/bull';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    // Registramos a fila de cache
    BullModule.registerQueue({
      name: 'cache',
    }),
    // Importamos o módulo de monitoramento para ter acesso ao serviço de métricas
    MonitoringModule,
  ],
  providers: [CacheService, CacheMetricsProvider],
  exports: [CacheService, CacheMetricsProvider],
})
export class CacheModule {}
