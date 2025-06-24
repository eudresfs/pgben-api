import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { LoggingService } from '../logging.service';
  import { Reflector } from '@nestjs/core';
  
  /**
   * Metadata key para operações de banco
   */
  export const DATABASE_OPERATION_KEY = 'database_operation';
  
  /**
   * Decorator para marcar métodos que fazem operações de banco
   */
  export function DatabaseOperation(entity: string, operation?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const operationType = operation || propertyKey;
      Reflect.defineMetadata(DATABASE_OPERATION_KEY, { entity, operation: operationType }, descriptor.value);
    };
  }
  
  /**
   * Interceptor para logging automático de operações de banco de dados
   * 
   * Funciona em conjunto com o decorator @DatabaseOperation para
   * automaticamente logar operações de banco com métricas de performance.
   */
  @Injectable()
  export class DatabaseLoggerInterceptor implements NestInterceptor {
    constructor(
      private readonly loggingService: LoggingService,
      private readonly reflector: Reflector,
    ) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const handler = context.getHandler();
      const dbOperation = this.reflector.get<{ entity: string; operation: string }>(
        DATABASE_OPERATION_KEY,
        handler,
      );
  
      // Se não há metadata de operação de banco, continua sem logging
      if (!dbOperation) {
        return next.handle();
      }
  
      const startTime = Date.now();
      const request = context.switchToHttp()?.getRequest();
      const requestId = request?.requestId;
      const userId = request?.user?.id || 'system';
  
      // Log de início da operação
      this.loggingService.debug(
        `DB Operation started: ${dbOperation.operation} ${dbOperation.entity}`,
        'Database',
        {
          operation: dbOperation.operation,
          entity: dbOperation.entity,
          requestId,
          userId,
        },
      );
  
      return next.handle().pipe(
        tap({
          next: (result) => {
            const duration = Date.now() - startTime;
            
            // Log da operação bem-sucedida
            this.loggingService.logDatabase({
              operation: dbOperation.operation,
              entity: dbOperation.entity,
              duration,
              requestId,
              userId,
              resultCount: this.getResultCount(result),
            });
  
            // Log de performance se a operação foi lenta
            if (duration > 1000) {
              this.loggingService.logPerformance(
                `DB ${dbOperation.operation} ${dbOperation.entity}`,
                duration,
                'Database',
                {
                  entity: dbOperation.entity,
                  operation: dbOperation.operation,
                  requestId,
                },
              );
            }
          },
          error: (error) => {
            const duration = Date.now() - startTime;
            
            // Log do erro na operação
            this.loggingService.error(
              `DB Operation failed: ${dbOperation.operation} ${dbOperation.entity}`,
              error,
              'Database',
              {
                operation: dbOperation.operation,
                entity: dbOperation.entity,
                duration,
                requestId,
                userId,
                errorCode: error.code,
                errorDetail: error.detail,
              },
            );
          },
        }),
      );
    }
  
    /**
     * Tenta extrair o número de resultados da operação
     */
    private getResultCount(result: any): number | undefined {
      if (Array.isArray(result)) {
        return result.length;
      }
      if (result && typeof result === 'object') {
        // Para operações como UPDATE/DELETE que retornam affected rows
        if (result.affected !== undefined) return result.affected;
        if (result.count !== undefined) return result.count;
        if (result.length !== undefined) return result.length;
      }
      return undefined;
    }
  }
  
  /**
   * Interceptor específico para TypeORM
   * 
   * Pode ser usado para interceptar queries específicas do TypeORM
   * e adicionar logging mais detalhado.
   */
  @Injectable()
  export class TypeORMLoggerInterceptor implements NestInterceptor {
    constructor(private readonly loggingService: LoggingService) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const className = context.getClass().name;
      const methodName = context.getHandler().name;
      
      // Verificar se é um repository do TypeORM
      if (!className.includes('Repository') && !className.includes('Service')) {
        return next.handle();
      }
  
      const startTime = Date.now();
      const request = context.switchToHttp()?.getRequest();
  
      return next.handle().pipe(
        tap({
          next: (result) => {
            const duration = Date.now() - startTime;
            
            if (duration > 500) { // Log apenas queries que demoram mais que 500ms
              this.loggingService.logDatabase({
                operation: methodName,
                entity: className,
                duration,
                requestId: request?.requestId,
                userId: request?.user?.id || 'system',
                resultCount: this.getResultCount(result),
              });
            }
          },
          error: (error) => {
            const duration = Date.now() - startTime;
            
            this.loggingService.error(
              `Repository operation failed: ${className}.${methodName}`,
              error,
              'TypeORM',
              {
                className,
                methodName,
                duration,
                requestId: request?.requestId,
                userId: request?.user?.id || 'system',
              },
            );
          },
        }),
      );
    }
  
    private getResultCount(result: any): number | undefined {
      if (Array.isArray(result)) return result.length;
      if (result && result.affected !== undefined) return result.affected;
      return undefined;
    }
  }