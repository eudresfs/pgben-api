import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Guard que permite acesso tanto para usuários autenticados quanto anônimos
 * Diferente do JwtAuthGuard, este guard não bloqueia requisições sem token
 * Apenas popula o user no request se o token for válido
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') implements CanActivate {
  /**
   * Permite acesso mesmo sem autenticação
   * Se houver token válido, popula o user no request
   * Se não houver token ou for inválido, permite acesso sem user
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Chama o guard pai, mas captura exceções
    return super.canActivate(context) as boolean | Promise<boolean> | Observable<boolean>;
  }

  /**
   * Sobrescreve o método handleRequest para não lançar exceção
   * quando não há token ou token é inválido
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Se houver erro ou não houver usuário, retorna null (acesso anônimo)
    // Não lança exceção como o guard padrão faria
    if (err || !user) {
      return null;
    }
    
    // Se tudo estiver ok, retorna o usuário
    return user;
  }
}