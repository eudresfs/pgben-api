import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { LoggingService } from '../logging.service';

/**
 * Metadata key para o decorator de logging
 */
export const LOG_METHOD_KEY = 'log_method';

/**
 * Decorator para logging automático de métodos
 * 
 * @param context - Contexto opcional para o log
 * @param logParams - Se deve logar os parâmetros do método
 * @param logResult - Se deve logar o resultado do método
 */
export function LogMethod(options?: {
  context?: string;
  logParams?: boolean;
  logResult?: boolean;
  logPerformance?: boolean;
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyName;
    const methodContext = options?.context || `${className}.${methodName}`;

    descriptor.value = async function (...args: any[]) {
      // Idealmente, isso seria injetado via DI
      // Em um cenário real, você poderia usar um service locator ou injeção manual
      const logger = new LoggingService(null as any);
      logger.setContext(methodContext);

      const startTime = Date.now();

      // Log de início do método
      logger.debug(`Method started: ${methodContext}`);

      // Log dos parâmetros se solicitado
      if (options?.logParams && args.length > 0) {
        logger.debug(`Method params: ${methodContext}`, undefined, {
          params: this.sanitizeParams(args),
        });
      }

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log de sucesso
        logger.debug(`Method completed: ${methodContext} - ${duration}ms`);

        // Log do resultado se solicitado
        if (options?.logResult && result !== undefined) {
          logger.debug(`Method result: ${methodContext}`, undefined, {
            result: this.sanitizeResult(result),
          });
        }

        // Log de performance se solicitado ou se for lento
        if (options?.logPerformance || duration > 1000) {
          logger.logPerformance(methodContext, duration);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(
          `Method failed: ${methodContext}`,
          error as Error,
          undefined,
          { duration, params: this.sanitizeParams(args) }
        );

        throw error;
      }
    };

    // Adicionar metadata para possível uso futuro
    SetMetadata(LOG_METHOD_KEY, { context: methodContext, ...options })(target, propertyName, descriptor);
  };
}

/**
 * Decorator para logar apenas erros em métodos
 */
export function LogErrors(context?: string) {
  return LogMethod({
    context,
    logParams: false,
    logResult: false,
    logPerformance: false,
  });
}

/**
 * Decorator para logar performance de métodos
 */
export function LogPerformance(context?: string, threshold: number = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodContext = context || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const logger = new LoggingService(null as any);
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        if (duration > threshold) {
          logger.logPerformance(methodContext, duration);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logPerformance(methodContext, duration, 'Performance', {
          error: true,
          errorMessage: (error as Error).message,
        });
        throw error;
      }
    };
  };
}

/**
 * Decorator para logar operações de auditoria
 */
export function LogAudit(resource: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const action = propertyName;

    descriptor.value = async function (...args: any[]) {
      const logger = new LoggingService(null as any);
      
      // Tentar extrair userId dos argumentos ou contexto
      const userId = this.extractUserId(args) || 'system';

      try {
        const result = await originalMethod.apply(this, args);
        
        logger.logAudit(action, resource, userId, 'success', {
          params: this.sanitizeParams(args),
        });

        return result;
      } catch (error) {
        logger.logAudit(action, resource, userId, 'failure', {
          params: this.sanitizeParams(args),
          error: (error as Error).message,
        });
        throw error;
      }
    };
  };
}

/**
 * Parameter decorator para extrair dados do request para logging
 */
export const LogContext = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    return {
      requestId: request.requestId,
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      url: request.url,
    };
  },
);

/**
 * Funções auxiliares para sanitização
 */
declare global {
  interface Object {
    sanitizeParams(params: any[]): any[];
    sanitizeResult(result: any): any;
    extractUserId(args: any[]): string | undefined;
  }
}

Object.prototype.sanitizeParams = function(params: any[]): any[] {
  return params.map(param => {
    if (typeof param === 'object' && param !== null) {
      const sanitized = { ...param };
      // Remover campos sensíveis
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      delete sanitized.key;
      return sanitized;
    }
    return param;
  });
};

Object.prototype.sanitizeResult = function(result: any): any {
  if (typeof result === 'object' && result !== null) {
    const sanitized = { ...result };
    // Remover campos sensíveis do resultado
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.key;
    return sanitized;
  }
  return result;
};

Object.prototype.extractUserId = function(args: any[]): string | undefined {
  // Tentar encontrar userId nos argumentos
  for (const arg of args) {
    if (typeof arg === 'object' && arg !== null) {
      if (arg.userId) return arg.userId;
      if (arg.user?.id) return arg.user.id;
      if (arg.id && typeof arg.id === 'string') return arg.id;
    }
  }
  return undefined;
};