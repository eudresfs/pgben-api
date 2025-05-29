 
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RoleType } from '../../shared/constants/roles.constants';
import { ROLES_KEY } from '../decorators/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    if (!user.roles || !Array.isArray(user.roles)) {
      throw new UnauthorizedException('Usuário não possui roles definidas');
    }

    if (requiredRoles.some((role) => user.roles.includes(role))) {
      return true;
    }

    throw new UnauthorizedException(
      `Usuário com cargo ${user.roles.join(', ')} não tem acesso a esta rota.`,
    );
  }
}
