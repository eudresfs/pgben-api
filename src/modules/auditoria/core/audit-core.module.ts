/**
 * AuditCoreModule
 *
 * Módulo core isolado para auditoria.
 * Contém apenas as funcionalidades essenciais sem dependências externas.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogAuditoria } from '../../../entities/log-auditoria.entity';
import { AuditCoreRepository } from './repositories/audit-core.repository';
import { AuditCoreService } from './services/audit-core.service';
import { AuditoriaSignatureService } from '../services/auditoria-signature.service';

@Module({
  imports: [
    // TypeORM para persistência
    TypeOrmModule.forFeature([LogAuditoria]),

    // EventEmitter para eventos síncronos
    EventEmitterModule,

    // ConfigModule para configurações
    ConfigModule,

    // JwtModule para assinatura de logs
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('AUDIT_SIGNING_KEY') || configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1y' }, // Logs de auditoria têm validade longa
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuditCoreRepository, AuditCoreService, AuditoriaSignatureService],
  exports: [AuditCoreRepository, AuditCoreService, AuditoriaSignatureService],
})
export class AuditCoreModule {}
