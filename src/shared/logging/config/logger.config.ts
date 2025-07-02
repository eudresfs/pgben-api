import { ConfigService } from '@nestjs/config';

/**
 * Configurações de logging baseadas em variáveis de ambiente
 */
export interface LoggerConfig {
  level: string;
  silent: boolean;
  logDir: string;
  maxFileSize: string;
  maxFiles: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableHttp: boolean;
  enableDatabase: boolean;
  enableAudit: boolean;
  sensitiveFields: string[];
  slowQueryThreshold: number;
  slowRequestThreshold: number;
}

/**
 * Factory para criar configuração do logger
 */
export function createLoggerConfig(configService: ConfigService): LoggerConfig {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isDevelopment = nodeEnv !== 'production';

  return {
    level: configService.get<string>(
      'LOG_LEVEL',
      isDevelopment ? 'debug' : 'info',
    ),
    silent: configService.get<boolean>('SILENT_LOGS', false),
    logDir: configService.get<string>('LOG_DIR', 'logs'),
    maxFileSize: configService.get<string>('LOG_MAX_FILE_SIZE', '50m'),
    maxFiles: configService.get<string>('LOG_MAX_FILES', '30d'),
    enableConsole: configService.get<boolean>('LOG_ENABLE_CONSOLE', true),
    enableFile: configService.get<boolean>('LOG_ENABLE_FILE', true),
    enableHttp: configService.get<boolean>('LOG_ENABLE_HTTP', true),
    enableDatabase: configService.get<boolean>('LOG_ENABLE_DATABASE', true),
    enableAudit: configService.get<boolean>('LOG_ENABLE_AUDIT', true),
    sensitiveFields: configService
      .get<string>('LOG_SENSITIVE_FIELDS', 'password,token,secret,key')
      .split(',')
      .map((field) => field.trim()),
    slowQueryThreshold: configService.get<number>(
      'LOG_SLOW_QUERY_THRESHOLD',
      1000,
    ),
    slowRequestThreshold: configService.get<number>(
      'LOG_SLOW_REQUEST_THRESHOLD',
      2000,
    ),
  };
}

/**
 * Validação da configuração do logger
 */
export function validateLoggerConfig(config: LoggerConfig): void {
  const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];

  if (!validLevels.includes(config.level)) {
    throw new Error(
      `Invalid log level: ${config.level}. Valid levels: ${validLevels.join(', ')}`,
    );
  }

  if (config.slowQueryThreshold < 0) {
    throw new Error('Slow query threshold must be a positive number');
  }

  if (config.slowRequestThreshold < 0) {
    throw new Error('Slow request threshold must be a positive number');
  }
}

/**
 * Utilitários para configuração do logger
 */
export class LoggerConfigUtils {
  /**
   * Verifica se um campo é sensível e deve ser omitido dos logs
   */
  static isSensitiveField(
    fieldName: string,
    sensitiveFields: string[],
  ): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return sensitiveFields.some((sensitive) =>
      lowerFieldName.includes(sensitive.toLowerCase()),
    );
  }

  /**
   * Remove campos sensíveis de um objeto
   */
  static sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, sensitiveFields));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key, sensitiveFields)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Trunca strings longas para evitar logs excessivamente grandes
   */
  static truncateString(str: string, maxLength: number = 1000): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + '... [TRUNCATED]';
  }

  /**
   * Formata duração em formato legível
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    }
    return `${(milliseconds / 60000).toFixed(2)}m`;
  }

  /**
   * Determina o nível de log baseado na duração
   */
  static getPerformanceLogLevel(
    duration: number,
    thresholds: { warn: number; error: number },
  ): string {
    if (duration >= thresholds.error) return 'error';
    if (duration >= thresholds.warn) return 'warn';
    return 'debug';
  }
}
