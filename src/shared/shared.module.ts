import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { configModuleOptions } from './configs/module-options';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor as AppLoggingInterceptor } from './interceptors/logging.interceptor';

// Módulo unificado de logging
import { UnifiedLoggerModule } from './logging/unified-logger.module';

// Monitoramento
import { MonitoringModule } from './monitoring/monitoring.module';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { MetricsInterceptor } from './monitoring/metrics.interceptor';
import { CriptografiaService } from './services/criptografia.service';
import { MinioService } from './services/minio.service';
import { ChaveMonitorService } from './services/chave-monitor.service';
import { HealthCheckService } from './services/health-check.service';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number | undefined>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.pass'),
        entities: [__dirname + '/../**/entities/*.entity{.ts,.js}'],
        // Timezone configured on the Postgres server.
        // This is used to typecast server date/time values to JavaScript Date object and vice versa.
        timezone: 'Z',
        synchronize: false,
        debug: configService.get<string>('env') === 'development',
      }),
    }),
    // Módulo unificado de logging
    UnifiedLoggerModule,
    // Monitoramento
    MonitoringModule,
  ],
  exports: [
    UnifiedLoggerModule,
    ConfigModule,
    MonitoringModule,
    CriptografiaService,
    MinioService,
    ChaveMonitorService,
    HealthCheckService,
  ],
  providers: [
    // Serviços compartilhados
    ChaveMonitorService,
    CriptografiaService,
    MinioService,
    HealthCheckService,

    // Interceptores para logging e métricas
    { provide: APP_INTERCEPTOR, useClass: AppLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },

    // Filtro de exceção global
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class SharedModule {}
