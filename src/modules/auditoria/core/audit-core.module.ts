/**
 * AuditCoreModule
 * 
 * Módulo core isolado para auditoria.
 * Contém apenas as funcionalidades essenciais sem dependências externas.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LogAuditoria } from '../../../entities/log-auditoria.entity';
import { AuditCoreRepository } from './repositories/audit-core.repository';
import { AuditCoreService } from './services/audit-core.service';

@Module({
  imports: [
    // TypeORM para persistência
    TypeOrmModule.forFeature([LogAuditoria]),
    
    // EventEmitter para eventos síncronos
    EventEmitterModule,
  ],
  providers: [
    AuditCoreRepository,
    AuditCoreService,
  ],
  exports: [
    AuditCoreRepository,
    AuditCoreService,
  ],
})
export class AuditCoreModule {}