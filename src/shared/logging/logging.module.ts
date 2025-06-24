import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { LoggingService } from './logging.service';

/**
 * Módulo Global de Logging Otimizado
 * 
 * Configura o sistema de logging unificado para toda a aplicação
 * 
 * Features:
 * - Logging estruturado com Winston
 * - Rotação automática de arquivos
 * - Diferentes níveis por ambiente
 * - Contexto automático e manual
 * - Metadados padronizados
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
  ],
  providers: [
    LoggingService,
  ],
  exports: [
    LoggingService,
    WinstonModule,
  ],
})
export class LoggingModule {}