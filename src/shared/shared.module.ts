import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { configModuleOptions } from './configs/module-options';

// Interceptors
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import {
  ValidationErrorInterceptor,
  ValidationMessageHelper,
} from './interceptors/validation-error.interceptor';

// Módulo unificado de logging
import { LoggingModule } from './logging/logging.module';

// Monitoramento
// Removido para evitar dependência circular - importado diretamente no AppModule
// import { MonitoringModule } from './monitoring/monitoring.module';

// Services
import { CriptografiaService } from './services/criptografia.service';
import { MinioService } from './services/minio.service';
import { ChaveMonitorService } from './services/chave-monitor.service';
import { HealthCheckService } from './services/health-check.service';

// Validators
import {
  IsEnumValueConstraint,
  EnumValidationHelper,
} from './validators/enum-validator';
import { IsCPF } from './validators/cpf.validator';

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
        synchronize: false,
        debug: configService.get<string>('env') === 'development',
      }),
    }),
    // Módulo unificado de logging
    LoggingModule,
    // Monitoramento movido para AppModule para evitar dependência circular
  ],
  exports: [
    LoggingModule,
    ConfigModule,
    // MonitoringModule removido para evitar dependência circular
    CriptografiaService,
    MinioService,
    ChaveMonitorService,
    HealthCheckService,
    // Validators
    IsCPF,
    IsEnumValueConstraint,
    EnumValidationHelper,
    ValidationMessageHelper,
  ],
  providers: [
    // Serviços compartilhados
    ChaveMonitorService,
    CriptografiaService,
    MinioService,
    HealthCheckService,

    // Validators
    IsCPF,
    IsEnumValueConstraint,
    EnumValidationHelper,
    ValidationMessageHelper,

    // Interceptores para logging e métricas
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ValidationErrorInterceptor },
  ],
})
export class SharedModule {}
