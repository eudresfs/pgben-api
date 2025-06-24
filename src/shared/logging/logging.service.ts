import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import {
  LogMetadata,
  DatabaseLogMetadata,
  AuthLogMetadata,
  BusinessLogMetadata,
  HttpLogMetadata,
  LogLevel,
} from './types/logging.types';

/**
 * Serviço de Logging Unificado e Otimizado
 */
@Injectable()
export class LoggingService {
  private context?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Define o contexto padrão para logs deste serviço
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Cria uma nova instância com contexto específico
   */
  child(context: string): LoggingService {
    const childService = new LoggingService(this.logger);
    childService.setContext(context);
    return childService;
  }

  /**
   * Log de nível debug
   */
  debug(message: string, context?: string, meta?: LogMetadata): void {
    this.log('debug', message, context, meta);
  }

  /**
   * Log de nível info
   */
  info(message: string, context?: string, meta?: LogMetadata): void {
    this.log('info', message, context, meta);
  }

  /**
   * Log de nível warn
   */
  warn(message: string, context?: string, meta?: LogMetadata): void {
    this.log('warn', message, context, meta);
  }

  /**
   * Log de nível error
   */
  error(
    message: string,
    error?: Error | string,
    context?: string,
    meta?: LogMetadata,
  ): void {
    const errorMeta: LogMetadata = {
      ...meta,
    };

    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      errorMeta.stack = error.stack;
    } else if (typeof error === 'string') {
      errorMeta.trace = error;
    }

    this.log('error', message, context, errorMeta);
  }

  /**
   * Log de nível verbose
   */
  verbose(message: string, context?: string, meta?: LogMetadata): void {
    this.log('verbose', message, context, meta);
  }

  /**
   * Método interno para padronizar o logging
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    meta?: LogMetadata,
  ): void {
    const logContext = context || this.context || 'Application';
    
    // Sanitizar metadados removendo valores undefined
    const cleanMeta = this.sanitizeMetadata(meta || {});

    this.logger.log(level, message, {
      context: logContext,
      ...cleanMeta,
    });
  }

  /**
   * Log especializado para operações de banco de dados
   */
  logDatabase(meta: DatabaseLogMetadata): void {
    const { operation, entity, duration, query, params, ...rest } = meta;
    
    const message = `DB ${operation}: ${entity} (${duration}ms)`;
    
    const dbMeta = {
      operation,
      entity,
      duration,
      ...(query && { query: this.truncateQuery(query) }),
      ...(params && params.length > 0 && { hasParams: true }),
      ...(duration > 1000 && { performanceFlag: 'SLOW_QUERY' }),
      ...this.sanitizeMetadata(rest),
    };

    this.log('debug', message, 'Database', dbMeta);
  }

  /**
   * Log especializado para operações de autenticação
   */
  logAuth(meta: AuthLogMetadata): void {
    const { operation, userId, success, reason, ...rest } = meta;
    
    const level: LogLevel = success ? 'info' : 'warn';
    const message = `Auth ${operation}: ${userId} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    const authMeta = {
      operation,
      userId,
      success,
      ...(reason && { reason }),
      ...(!success && { securityEvent: true }),
      ...this.sanitizeMetadata(rest),
    };

    this.log(level, message, 'Authentication', authMeta);
  }

  /**
   * Log especializado para operações de negócio
   */
  logBusiness(meta: BusinessLogMetadata): void {
    const { operation, entity, entityId, userId, details, ...rest } = meta;
    
    const message = `Business ${operation}: ${entity} ${entityId} by ${userId}`;
    
    const businessMeta = {
      operation,
      entity,
      entityId,
      userId,
      ...(details && { details }),
      ...this.sanitizeMetadata(rest),
    };

    this.log('info', message, 'Business', businessMeta);
  }

  /**
   * Log especializado para requisições HTTP
   */
  logHttp(meta: HttpLogMetadata): void {
    const { method, url, statusCode, duration, ...rest } = meta;
    
    const level = this.getHttpLogLevel(statusCode);
    const message = statusCode 
      ? `${method} ${url} ${statusCode} (${duration}ms)`
      : `${method} ${url} - Started`;

    const httpMeta = {
      method,
      url,
      ...(statusCode && { statusCode }),
      ...(duration !== undefined && { duration }),
      ...(duration && duration > 2000 && { performanceFlag: 'SLOW_REQUEST' }),
      ...this.sanitizeMetadata(rest),
    };

    this.log(level, message, 'HTTP', httpMeta);
  }

  /**
   * Determina o nível do log baseado no status code HTTP
   */
  private getHttpLogLevel(statusCode?: number): LogLevel {
    if (!statusCode) return 'info';
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  /**
   * Log para métricas de performance
   */
  logPerformance(
    operation: string,
    duration: number,
    context?: string,
    meta?: LogMetadata,
  ): void {
    const level: LogLevel = duration > 5000 ? 'warn' : 'debug';
    const performanceFlag = 
      duration > 10000 ? 'CRITICAL_SLOW' :
      duration > 5000 ? 'SLOW' :
      duration > 1000 ? 'MODERATE' : 'FAST';

    const message = `Performance: ${operation} (${duration}ms)`;

    this.log(level, message, context || 'Performance', {
      operation,
      duration,
      performanceFlag,
      ...this.sanitizeMetadata(meta || {}),
    });
  }

  /**
   * Log para eventos de segurança
   */
  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    meta?: LogMetadata,
  ): void {
    const level: LogLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    this.log(level, `Security: ${event}`, 'Security', {
      securityEvent: true,
      severity,
      ...this.sanitizeMetadata(meta || {}),
    });
  }

  /**
   * Log para auditoria
   */
  logAudit(
    action: string,
    resource: string,
    userId: string,
    result: 'success' | 'failure',
    meta?: LogMetadata,
  ): void {
    const message = `Audit: ${action} ${resource} by ${userId} - ${result.toUpperCase()}`;
    
    this.log('info', message, 'Audit', {
      action,
      resource,
      userId,
      result,
      auditEvent: true,
      ...this.sanitizeMetadata(meta || {}),
    });
  }

  /**
   * Log para operações de cache
   */
  logCache(
    operation: 'HIT' | 'MISS' | 'SET' | 'DELETE' | 'CLEAR',
    key: string,
    meta?: LogMetadata,
  ): void {
    const message = `Cache ${operation}: ${key}`;
    
    this.log('debug', message, 'Cache', {
      operation,
      key,
      ...this.sanitizeMetadata(meta || {}),
    });
  }

  /**
   * Remove campos undefined e sanitiza dados sensíveis de forma recursiva
   */
  private sanitizeMetadata(meta: LogMetadata): LogMetadata {
    // Lista ampliada de campos sensíveis
    const sensitiveFields = [
      'senha', 'password', 'token', 'secret', 'authorization', 'key',
      'confirmPassword', 'confirmSenha', 'currentPassword', 'senhaAtual', 'newPassword', 'novaSenha',
      'cpf', 'rg', 'cnpj', 'cardNumber', 'cartao', 'cvv', 'passaporte', 'biometria'
    ];

    // Função recursiva interna para sanitizar
    const sanitizeValue = (value: any, keyPath: string): any => {
      // Caso base: valor é null ou undefined
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Verificar se o campo atual é sensível
      if (sensitiveFields.some(field => keyPath.toLowerCase().includes(field.toLowerCase()))) {
        return '[REDACTED]';
      }
      
      // Caso recursivo: valor é um objeto
      if (typeof value === 'object' && !Array.isArray(value)) {
        const sanitizedObj: any = {};
        
        for (const [childKey, childValue] of Object.entries(value)) {
          const newPath = keyPath ? `${keyPath}.${childKey}` : childKey;
          const sanitized = sanitizeValue(childValue, newPath);
          
          if (sanitized !== undefined) {
            sanitizedObj[childKey] = sanitized;
          }
        }
        
        return Object.keys(sanitizedObj).length > 0 ? sanitizedObj : undefined;
      }
      
      // Caso recursivo: valor é um array
      if (Array.isArray(value)) {
        const sanitizedArray = value
          .map((item, index) => sanitizeValue(item, `${keyPath}[${index}]`))
          .filter(item => item !== undefined);
        
        return sanitizedArray.length > 0 ? sanitizedArray : undefined;
      }
      
      // Caso base: valor simples
      return value;
    };

    // Iniciar sanitização recursiva
    const result = sanitizeValue(meta, '');
    return result === undefined ? {} : result as LogMetadata;
  }

  /**
   * Trunca queries SQL longas
   */
  private truncateQuery(query: string): string {
    return query.length > 500 ? query.substring(0, 500) + '...' : query;
  }
}