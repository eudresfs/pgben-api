import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guarda para controle de acesso às rotas de auditoria - Versão MVP
 *
 * Implementação simplificada que permite acesso apenas a usuários com perfis de administrador
 * ou supervisor, garantindo que informações de auditoria sejam acessíveis apenas por
 * usuários autorizados.
 */
@Injectable()
export class AuditoriaGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Verifica se o usuário tem permissão para acessar rotas de auditoria
   *
   * @param context Contexto de execução da requisição
   * @returns true se o usuário tem permissão, false caso contrário
   * @throws {ForbiddenException} Se o usuário não estiver autenticado ou não tiver permissão
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar se o usuário está autenticado
    if (!user) {
      throw new ForbiddenException('Acesso negado: usuário não autenticado');
    }

    // Perfis permitidos para acessar dados de auditoria
    const perfisPermitidos = ['administrador', 'gestor_semtas', 'auditor'];

    // Verificar se o usuário tem um dos perfis permitidos
    const temPermissao = user.perfil && perfisPermitidos.includes(user.perfil);

    if (!temPermissao) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para acessar informações de auditoria',
      );
    }

    return true;
  }
}
