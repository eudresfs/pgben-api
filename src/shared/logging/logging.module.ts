import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { LoggingService } from '../logging/logging.service';

// Importação corrigida para o serviço de logging

/**
 * Módulo Global de Logging
 * 
 * Configura o sistema de logging para toda a aplicação
 * usando Winston como provedor de logs
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
  ],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
