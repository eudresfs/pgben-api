import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as path from 'path';

/**
 * Configuração do Winston para logging
 * 
 * Define os formatos, níveis e destinos dos logs da aplicação
 */
export const winstonConfig: WinstonModuleOptions = {
  transports: [
    // Console transport para desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('PGBEN', {
          colors: true,
          prettyPrint: true,
        }),
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    
    // Arquivo de log para todos os níveis
    new winston.transports.DailyRotateFile({
      dirname: path.join(process.cwd(), 'logs'),
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      level: 'info',
    }),
    
    // Arquivo de log específico para erros
    new winston.transports.DailyRotateFile({
      dirname: path.join(process.cwd(), 'logs'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      level: 'error',
    }),
  ],
};
