import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { LogAuditoria } from '../../modules/auditoria/entities/log-auditoria.entity';
import { AuditoriaQueueService } from '../../modules/auditoria/services/auditoria-queue.service';
import { LogAuditoriaRepository } from '../../modules/auditoria/repositories/log-auditoria.repository';
import { AuditoriaSignatureService } from '../../modules/auditoria/services/auditoria-signature.service';

/**
 * Módulo compartilhado de Auditoria
 * 
 * Este módulo exporta os serviços essenciais de auditoria que podem
 * ser usados por outros módulos sem criar dependências circulares.
 * 
 * É usado para quebrar a dependência circular entre os módulos.
 */
@Global()
@Module({
  imports: [
    // Configuração do TypeORM para entidades do módulo
    TypeOrmModule.forFeature([LogAuditoria]),
    
    // Configuração assíncrona do BullModule
    BullModule.registerQueueAsync({
      name: 'auditoria',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    
    // Configuração assíncrona do JwtModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Serviços essenciais
    AuditoriaQueueService,
    LogAuditoriaRepository,
    AuditoriaSignatureService,
  ],
  exports: [
    // Exporta os serviços principais para uso em outros módulos
    AuditoriaQueueService,
    LogAuditoriaRepository,
    AuditoriaSignatureService,
  ],
})
export class AuditoriaSharedModule {}
