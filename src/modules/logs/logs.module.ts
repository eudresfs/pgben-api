import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsController } from './controllers/logs.controller';
import { LogsService } from './services/logs.service';
import { 
  LogAuditoria, 
  Usuario 
} from '../../entities';

/**
 * Módulo de Logs de Auditoria
 * 
 * Responsável por gerenciar os logs de auditoria do sistema, fornecendo
 * funcionalidades para consulta, filtragem e exportação de logs.
 */
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LogAuditoria,
      Usuario,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
