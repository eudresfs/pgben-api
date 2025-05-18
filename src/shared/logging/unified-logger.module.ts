import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';

import { winstonConfig } from './winston.config';
import { UnifiedLoggerService } from './unified-logger.service';
import { LoggingService } from './logging.service';
import { AppLogger } from '../logger/logger.service';

/**
 * Módulo Unificado de Logging
 * 
 * Fornece serviços de logging para toda a aplicação,
 * mantendo compatibilidade com o código existente
 * enquanto oferece uma interface unificada e melhorada.
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
  ],
  providers: [
    UnifiedLoggerService,
    // Manter os serviços originais para compatibilidade
    {
      provide: LoggingService,
      useExisting: UnifiedLoggerService,
    },
    {
      provide: AppLogger,
      useExisting: UnifiedLoggerService,
    },
  ],
  exports: [
    UnifiedLoggerService,
    LoggingService,
    AppLogger,
  ],
})
export class UnifiedLoggerModule {}
