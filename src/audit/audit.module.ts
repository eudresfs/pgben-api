import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';

import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    ScheduleModule.forRoot(), // Para tarefas agendadas (cleanup automático)
    forwardRef(() => AuthModule),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService], // Exporta para uso em outros módulos
})
export class AuditModule {}