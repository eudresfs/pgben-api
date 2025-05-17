import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

/**
 * Serviço de Logging
 *
 * Fornece métodos para registrar logs em diferentes níveis
 * e com informações estruturadas
 */
@Injectable()
export class LoggingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Registra um log de nível "info"
   */
  info(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.info(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra um log de nível "error"
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: Record<string, any>,
  ): void {
    this.logger.error(message, {
      trace,
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra um log de nível "warn"
   */
  warn(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.warn(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra um log de nível "debug"
   */
  debug(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.debug(message, {
      context,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra um log de nível "verbose"
   */
  verbose(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, {
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
