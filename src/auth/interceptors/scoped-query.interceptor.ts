import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { SKIP_UNIT_FILTER_KEY } from '../decorators/skip-unit-filter.decorator';
import { TipoEscopo } from '@/entities/user-permission.entity';

interface ScopeContext {
  type: TipoEscopo;
  unidadeId?: string;
  userId?: string;
}

/**
 * Interceptor global responsável por injetar automaticamente o filtro de unidade
 * nos query params de requisições GET quando o escopo do usuário é UNIDADE.
 *
 * – Se o `PermissionGuard` tiver configurado `request.scope.type === UNIDADE`,
 *   o interceptor adiciona `unidadeId` ao objeto `request.query` (sem sobrescrever
 *   um valor já existente).
 * – Se o escopo for GLOBAL ou SELF, não faz nada.
 * – Pode ser desativado por endpoint usando o decorator `@SkipUnitFilter()`.
 */
@Injectable()
export class ScopedQueryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ScopedQueryInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Processa apenas métodos GET
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Verifica se o endpoint pediu para pular o filtro
    const skipFilter = this.reflector.get<boolean>(
      SKIP_UNIT_FILTER_KEY,
      context.getHandler(),
    );
    if (skipFilter) {
      this.logger.debug(
        'SkipUnitFilter ativo – não aplicando filtro de unidade',
      );
      return next.handle();
    }

    // Leitura do contexto anexado pelo PermissionGuard
    const scope: ScopeContext | undefined = (request as any).scope;
    if (scope && scope.type === TipoEscopo.UNIDADE && scope.unidadeId) {
      // Não sobrescrever se o controller já definiu explicitamente
      if (!request.query) {
        request.query = {};
      }
      if (!request.query.unidadeId) {
        request.query.unidadeId = scope.unidadeId;
        this.logger.debug(
          `Filtro de unidadeId injetado automaticamente: ${scope.unidadeId}`,
        );
      }
    }

    return next.handle();
  }
}
