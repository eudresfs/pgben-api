import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { UserAccessTokenClaims } from '../../auth/dtos/auth-token-output.dto';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';

/**
 * Interceptor para definir o contexto de escopo baseado no usuário autenticado
 * 
 * @description
 * Este interceptor executa APÓS o AuthGuard processar o JWT,
 * garantindo que o usuário esteja disponível em req.user.
 * Define o contexto de escopo no RequestContextHolder para ser
 * usado pelo ScopedRepository.
 */
@Injectable()
export class ScopeContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserAccessTokenClaims;

    console.log('ScopeContextInterceptor - User:', JSON.stringify(user, null, 2));

    if (user) {
      // Determinar o tipo de escopo baseado no escopo do usuário
      let scopeType: ScopeType;
      
      switch (user.escopo) {
        case 'GLOBAL':
          scopeType = ScopeType.GLOBAL;
          break;
        case 'UNIDADE':
          scopeType = ScopeType.UNIDADE;
          break;
        case 'PROPRIO':
        default:
          scopeType = ScopeType.PROPRIO;
          break;
      }

      // Aplicar fallback se escopo for UNIDADE mas não há unidade_id
      if (scopeType === ScopeType.UNIDADE && !user.unidade_id) {
        console.log('ScopeContextInterceptor - Fallback: UNIDADE sem unidade_id, usando PROPRIO');
        scopeType = ScopeType.PROPRIO;
      }

      const scopeContext: IScopeContext = {
        tipo: scopeType,
        user_id: String(user.id),
        unidade_id: user.unidade_id,
      };

      console.log('ScopeContextInterceptor - Definindo contexto:', JSON.stringify(scopeContext, null, 2));

      // Validar contexto antes de definir
      if (this.isValidScopeContext(scopeContext)) {
        RequestContextHolder.set(scopeContext);
        console.log('ScopeContextInterceptor - Contexto definido com sucesso');
      } else {
        console.error('ScopeContextInterceptor - Contexto inválido:', scopeContext);
      }
    } else {
      console.log('ScopeContextInterceptor - Nenhum usuário encontrado, continuando...');
    }

    return next.handle().pipe(
      tap(() => {
        // Limpar o contexto após a execução
        RequestContextHolder.clear();
      })
    );
  }

  /**
   * Valida se o contexto de escopo é válido
   */
  private isValidScopeContext(context: any): boolean {
    return (
      context &&
      context.tipo &&
      Object.values(ScopeType).includes(context.tipo) &&
      context.user_id
    );
  }
}