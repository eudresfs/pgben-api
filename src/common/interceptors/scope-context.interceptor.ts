import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
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
  private readonly logger = new Logger(ScopeContextInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserAccessTokenClaims;

    this.logger.debug('[SCOPE-DEBUG] Interceptor executado', {
      hasUser: !!user,
      userId: user?.id,
      userEscopo: user?.escopo,
      userUnidadeId: user?.unidade_id,
      url: request.url,
      method: request.method
    });

    // Setup do contexto de forma síncrona
    this.setupScopeContext(user);

    // Executar o handler preservando o contexto durante operações assíncronas
    // O AsyncLocalStorage já gerencia automaticamente a propagação do contexto
    return next.handle().pipe(
      tap({
        error: (error) => {
          this.logger.error(`Erro durante processamento da requisição`, {
            error: error.message,
            userId: user?.id,
          });
        },
      }),
    );
  }

  /**
   * Configura o contexto de escopo de forma síncrona
   */
  private setupScopeContext(user: UserAccessTokenClaims | undefined): void {
    if (!user) {
      // Definir contexto GLOBAL quando não há usuário
      const globalContext: IScopeContext = {
        tipo: ScopeType.GLOBAL,
        user_id: null,
        unidade_id: null,
      };
      RequestContextHolder.set(globalContext);
      this.logger.debug('[SCOPE-DEBUG] Contexto GLOBAL definido (sem usuário)', globalContext);
      return;
    }

    try {
      const context = this.buildScopeContext(user);

      // Validação síncrona do contexto
      if (!this.isValidScopeContextSync(context)) {
        throw new Error('Contexto de escopo inválido');
      }

      RequestContextHolder.set(context);
      this.logger.debug('[SCOPE-DEBUG] Contexto definido com sucesso', {
        userId: user.id,
        userEscopo: user.escopo,
        userUnidadeId: user.unidade_id,
        contextTipo: context.tipo,
        contextUnidadeId: context.unidade_id
      });
    } catch (error) {
      this.logger.error(
        `Erro ao configurar contexto: ${error.message}`,
      );
      // Em caso de erro, define contexto PROPRIO como fallback
      const fallbackContext = {
        tipo: ScopeType.PROPRIO,
        user_id: String(user?.id || ''),
        unidade_id: null,
      };
      RequestContextHolder.set(fallbackContext);
      this.logger.warn('[SCOPE-DEBUG] Fallback para contexto PROPRIO', fallbackContext);
    }
  }

  /**
   * Constrói o contexto de escopo baseado no usuário
   */
  private buildScopeContext(user: UserAccessTokenClaims): IScopeContext {
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
      scopeType = ScopeType.PROPRIO;
    }

    const context: IScopeContext = {
      tipo: scopeType,
      user_id: String(user.id),
      unidade_id: user.unidade_id ? String(user.unidade_id) : null,
    };

    // Validação de integridade simplificada
    if (!this.validateScopeIntegritySync(context)) {
      // Fallback para PROPRIO em caso de falha na validação
      return {
        tipo: ScopeType.PROPRIO,
        user_id: String(user.id),
        unidade_id: null,
      };
    }

    return context;
  }

  /**
   * Valida se o contexto de escopo é válido (versão síncrona)
   */
  private isValidScopeContextSync(context: any): boolean {
    return (
      context &&
      context.tipo &&
      Object.values(ScopeType).includes(context.tipo) &&
      context.user_id
    );
  }

  /**
   * Valida se o contexto de escopo é válido (versão assíncrona - mantida para compatibilidade)
   */
  private async isValidScopeContext(context: any): Promise<boolean> {
    return this.isValidScopeContextSync(context);
  }

  /**
   * Validação de Integridade Simplificada
   * Valida se o contexto tem os dados mínimos necessários
   */
  private validateScopeIntegritySync(context: IScopeContext): boolean {
    try {
      // Validações básicas síncronas
      if (!context.user_id) {
        return false;
      }

      // Se for escopo UNIDADE, deve ter unidade_id
      if (context.tipo === ScopeType.UNIDADE && !context.unidade_id) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Erro na validação de integridade do escopo', {
        error: error.message,
      });
      return false;
    }
  }
}
