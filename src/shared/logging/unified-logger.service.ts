import { Injectable, Scope, Inject, Optional } from '@nestjs/common';
import { Logger, createLogger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { RequestContext } from '../request-context/request-context.dto';
import { winstonConfig } from './winston.config';

/**
 * Serviço de Logging Unificado
 * 
 * Unifica as funcionalidades do AppLogger e LoggingService em um único
 * serviço de logging consistente e flexível.
 * 
 * Mantém compatibilidade com código existente e fornece recursos adicionais
 * para logging contextualizado.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class UnifiedLoggerService {
  private context?: string;
  private logger: Logger;

  constructor(
    @Optional() @Inject(WINSTON_MODULE_PROVIDER) private readonly winstonLogger?: Logger,
  ) {
    // Usar o logger injetado ou criar um novo com a configuração padrão
    this.logger = this.winstonLogger || createLogger(winstonConfig);
  }

  /**
   * Define o contexto para todos os logs deste serviço
   */
  public setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log de nível error
   */
  error(
    ctxOrMessage: RequestContext | string,
    messageOrMeta?: string | Record<string, any>,
    metaOrTrace?: Record<string, any> | string,
    extraMeta?: Record<string, any>,
  ): Logger {
    // Compatibilidade com a API antiga (AppLogger)
    if (typeof ctxOrMessage !== 'string') {
      const ctx = ctxOrMessage;
      const message = messageOrMeta as string;
      const meta = metaOrTrace as Record<string, any>;
      
      return this.logger.error({
        message,
        contextName: this.context,
        ctx,
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
    
    // Nova API (LoggingService)
    const message = ctxOrMessage;
    const context = messageOrMeta as string || this.context;
    const trace = typeof metaOrTrace === 'string' ? metaOrTrace : undefined;
    const meta = typeof metaOrTrace === 'object' ? metaOrTrace : extraMeta;
    
    return this.logger.error(message, {
      context,
      trace,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log de nível warn
   */
  warn(
    ctxOrMessage: RequestContext | string,
    messageOrMeta?: string | Record<string, any>,
    meta?: Record<string, any>,
  ): Logger {
    // Compatibilidade com a API antiga (AppLogger)
    if (typeof ctxOrMessage !== 'string') {
      const ctx = ctxOrMessage;
      const message = messageOrMeta as string;
      
      return this.logger.warn({
        message,
        contextName: this.context,
        ctx,
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
    
    // Nova API (LoggingService)
    const message = ctxOrMessage;
    const context = messageOrMeta as string || this.context;
    
    return this.logger.warn(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log de nível info (ou log)
   */
  log(
    ctxOrMessage: RequestContext | string,
    messageOrMeta?: string | Record<string, any>,
    meta?: Record<string, any>,
  ): Logger {
    // Compatibilidade com a API antiga (AppLogger)
    if (typeof ctxOrMessage !== 'string') {
      const ctx = ctxOrMessage;
      const message = messageOrMeta as string;
      
      return this.logger.info({
        message,
        contextName: this.context,
        ctx,
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
    
    // Nova API (LoggingService)
    const message = ctxOrMessage;
    const context = messageOrMeta as string || this.context;
    
    return this.logger.info(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  // Alias para log (compatibilidade com LoggingService)
  info(
    ctxOrMessage: RequestContext | string,
    messageOrMeta?: string | Record<string, any>,
    meta?: Record<string, any>,
  ): Logger {
    return this.log(ctxOrMessage, messageOrMeta, meta);
  }

  /**
   * Log de nível debug
   */
  debug(
    ctxOrMessage: RequestContext | string,
    messageOrMeta?: string | Record<string, any>,
    meta?: Record<string, any>,
  ): Logger {
    // Compatibilidade com a API antiga (AppLogger)
    if (typeof ctxOrMessage !== 'string') {
      const ctx = ctxOrMessage;
      const message = messageOrMeta as string;
      
      return this.logger.debug({
        message,
        contextName: this.context,
        ctx,
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
    
    // Nova API (LoggingService)
    const message = ctxOrMessage;
    const context = messageOrMeta as string || this.context;
    
    return this.logger.debug(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log de nível verbose
   */
  verbose(
    ctxOrMessage: RequestContext | string,
    messageOrMeta?: string | Record<string, any>,
    meta?: Record<string, any>,
  ): Logger {
    // Compatibilidade com a API antiga (AppLogger)
    if (typeof ctxOrMessage !== 'string') {
      const ctx = ctxOrMessage;
      const message = messageOrMeta as string;
      
      return this.logger.verbose({
        message,
        contextName: this.context,
        ctx,
        timestamp: new Date().toISOString(),
        ...meta
      });
    }
    
    // Nova API (LoggingService)
    const message = ctxOrMessage;
    const context = messageOrMeta as string || this.context;
    
    return this.logger.verbose(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra uma operação de banco de dados
   */
  logDatabase(
    operation: string,
    entity: string,
    duration: number,
    query?: string,
  ): void {
    this.logger.debug(`DB: ${operation} ${entity} - ${duration}ms`, {
      context: 'Database',
      operation,
      entity,
      duration,
      query,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra uma operação de autenticação
   */
  logAuth(
    operation: string,
    userId: string,
    success: boolean,
    ip?: string,
    userAgent?: string,
  ): void {
    this.logger.info(
      `Auth: ${operation} - Usuário: ${userId} - Sucesso: ${success}`,
      {
        context: 'Authentication',
        operation,
        userId,
        success,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Registra uma operação de negócio
   */
  logBusiness(
    operation: string,
    entity: string,
    entityId: string,
    userId: string,
    details?: Record<string, any>,
  ): void {
    this.logger.info(
      `Business: ${operation} ${entity} ${entityId} - Usuário: ${userId}`,
      {
        context: 'Business',
        operation,
        entity,
        entityId,
        userId,
        details,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
