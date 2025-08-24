import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Formato customizado para logs estruturados
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({
      timestamp,
      level,
      message,
      context,
      requestId,
      userId,
      duration,
      statusCode,
      ...meta
    }) => {
      // Estrutura base do log
      const logEntry: any = {
        timestamp,
        level: level.toUpperCase(),
        context: context || 'Application',
        message,
      };

      // Adicionar campos importantes se existirem
      if (requestId) logEntry.requestId = requestId;
      if (userId) logEntry.userId = userId;
      if (duration !== undefined) logEntry.duration = `${duration}ms`;
      if (statusCode) logEntry.statusCode = statusCode;

      // Adicionar outros metadados
      if (Object.keys(meta).length > 0) {
        logEntry.meta = meta;
      }

      return JSON.stringify(logEntry);
    },
  ),
);

/**
 * Formato para console em desenvolvimento (mais legível)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({
      timestamp,
      level,
      message,
      context,
      requestId,
      userId,
      duration,
      statusCode,
      stack,
      ...meta
    }) => {
      const contextStr = context ? `[${context}]` : '[App]';
      const reqStr = requestId ? `[${String(requestId).substring(0, 8)}]` : '';
      const userStr = userId && userId !== 'anonymous' ? `[${userId}]` : '';
      const durationStr = duration ? `(${duration}ms)` : '';
      const statusStr = statusCode ? `${statusCode}` : '';

      let logLine = `${timestamp} ${level.toUpperCase().padEnd(5)} ${contextStr}${reqStr}${userStr} ${message} ${statusStr}${durationStr}`;

      // Adicionar metadados importantes
      if (meta && Object.keys(meta).length > 0) {
        const importantMeta = Object.entries(meta)
          .filter(
            ([key, value]) =>
              !['timestamp', 'level', 'service', 'environment'].includes(key) &&
              value !== undefined,
          )
          .map(([key, value]) => `${key}=${value}`)
          .join(' ');

        if (importantMeta) {
          logLine += ` | ${importantMeta}`;
        }
      }

      // Adicionar stack trace se for erro
      if (stack) {
        logLine += `\n${stack}`;
      }

      return logLine;
    },
  ),
);

/**
 * Configuração otimizada do Winston
 */
export const winstonConfig: WinstonModuleOptions = {
  level: isDevelopment ? 'debug' : 'info',
  defaultMeta: {
    service: 'PGBEN',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console - formato legível para desenvolvimento
    new winston.transports.Console({
      level: isDevelopment ? 'debug' : 'warn',
      silent: process.env.SILENT_LOGS === 'true',
      format: isDevelopment ? consoleFormat : customFormat,
    }),

    // Arquivo combinado - todos os logs estruturados
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '30d',
      level: 'debug',
      format: customFormat,
      auditFile: path.join(logDir, '.audit-application.json'),
    }),

    // Arquivo de erros
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      level: 'error',
      format: customFormat,
      auditFile: path.join(logDir, '.audit-error.json'),
    }),

    // Arquivo específico para HTTP (requisições)
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7d',
      level: 'info',
      format: winston.format.combine(
        customFormat,
        winston.format((info) => {
          // Filtrar apenas logs HTTP
          return info.context === 'HTTP' ? info : false;
        })(),
      ),
      auditFile: path.join(logDir, '.audit-http.json'),
    }),
  ],

  // Handlers para exceções não capturadas
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
    }),
  ],

  // Handlers para promises rejeitadas
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
    }),
  ],
};
