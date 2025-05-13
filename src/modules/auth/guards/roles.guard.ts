import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard para controle de acesso baseado em papéis (RBAC)
 * 
 * Verifica se o usuário possui o papel necessário para acessar um recurso
 * Deve ser usado em conjunto com o JwtAuthGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtém os papéis necessários para acessar o recurso
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Se não houver papéis definidos, permite o acesso
    if (!requiredRoles) {
      return true;
    }
    
    // Obtém o usuário da requisição (já autenticado pelo JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();
    
    // Verifica se o usuário possui pelo menos um dos papéis necessários
    return requiredRoles.some(role => user.role === role);
  }
}
