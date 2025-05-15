import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { configModuleOptions } from './configs/module-options';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor as AppLoggingInterceptor } from './interceptors/logging.interceptor';
import { AppLoggerModule } from './logger/logger.module';

// Novos módulos de logging e monitoramento
import { LoggingModule } from './logging/logging.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { GlobalExceptionFilter } from './logging/exception.filter';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { MetricsInterceptor } from './monitoring/metrics.interceptor';
import { CriptografiaService } from './services/criptografia.service';
import { MinioService } from './services/minio.service';

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
    AppLoggerModule,
    // Novos módulos
    LoggingModule,
    MonitoringModule,
  ],
  exports: [AppLoggerModule, ConfigModule, LoggingModule, MonitoringModule, CriptografiaService, MinioService],
  providers: [
    // Serviços compartilhados
    CriptografiaService,
    MinioService,
    
    // Interceptores para logging e métricas
    { provide: APP_INTERCEPTOR, useClass: AppLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },

    // Filtros de exceção
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class SharedModule {}
