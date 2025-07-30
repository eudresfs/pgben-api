import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata para identificar métodos que devem ignorar escopo
 */
export const NO_SCOPE_KEY = 'no_scope';

/**
 * Decorator para marcar métodos que devem ignorar a aplicação automática de escopo
 * 
 * @description
 * Use este decorator em métodos de serviço que precisam acessar dados
 * sem aplicar filtros de escopo. Útil para:
 * - Operações administrativas
 * - Relatórios globais
 * - Validações que precisam verificar dados de outras unidades
 * - Operações de sistema
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class ClienteService {
 *   // Método normal - aplica escopo automaticamente
 *   async findAll() {
 *     return this.repository.findAll();
 *   }
 * 
 *   // Método administrativo - ignora escopo
 *   @NoScope()
 *   async findAllForAdmin() {
 *     return this.repository.findAllGlobal();
 *   }
 * 
 *   // Relatório global - ignora escopo
 *   @NoScope()
 *   async generateGlobalReport() {
 *     return this.repository.findAllGlobal();
 *   }
 * }
 * ```
 * 
 * @security
 * ATENÇÃO: Use com cuidado! Métodos marcados com @NoScope podem
 * acessar dados de qualquer unidade. Certifique-se de que:
 * 1. O método é realmente necessário
 * 2. Há validação adequada de permissões
 * 3. O acesso está documentado e auditado
 */
export const NoScope = () => SetMetadata(NO_SCOPE_KEY, true);

/**
 * Utilitário para verificar se um método tem o decorator @NoScope
 * 
 * @param target - Classe do serviço
 * @param methodName - Nome do método
 * @returns true se o método tem @NoScope, false caso contrário
 */
export function hasNoScopeDecorator(
  target: any, 
  methodName: string
): boolean {
  return Reflect.getMetadata(NO_SCOPE_KEY, target, methodName) === true;
}

/**
 * Interceptor para validar uso do decorator @NoScope
 * 
 * @description
 * Este interceptor pode ser usado para:
 * - Logar acessos a métodos sem escopo
 * - Validar permissões adicionais
 * - Auditar operações sensíveis
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

@Injectable()
export class NoScopeAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NoScopeAuditInterceptor.name);
  
  constructor(private reflector: Reflector) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isNoScope = this.reflector.get<boolean>(
      NO_SCOPE_KEY, 
      context.getHandler()
    );
    
    if (isNoScope) {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const methodName = context.getHandler().name;
      const className = context.getClass().name;
      
      this.logger.warn(
        `[NO_SCOPE_ACCESS] Usuário ${user?.id || 'UNKNOWN'} acessou método sem escopo: ${className}.${methodName}`
      );
    }
    
    return next.handle().pipe(
      tap(() => {
        if (isNoScope) {
          this.logger.debug(
            `[NO_SCOPE_ACCESS] Método sem escopo executado com sucesso`
          );
        }
      })
    );
  }
}