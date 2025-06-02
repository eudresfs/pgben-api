import { ForbiddenException } from '@nestjs/common';
import { TipoEscopo } from '../../entities/user-permission.entity';

/**
 * Exceção lançada quando um usuário não tem permissão para acessar um recurso.
 * 
 * Esta exceção contém informações detalhadas sobre a permissão necessária
 * para auxiliar o usuário a entender o que está faltando.
 */
export class PermissionDeniedException extends ForbiddenException {
  constructor(
    permissionName: string,
    scopeType: TipoEscopo,
    scopeId?: string,
  ) {
    const baseMessage = `Acesso negado: você não possui a permissão necessária`;
    const detailMessage = `Permissão necessária: ${permissionName} com escopo ${scopeType}${
      scopeId ? ` e ID ${scopeId}` : ''
    }`;

    super({
      message: baseMessage,
      code: 'PERMISSION_DENIED',
      details: {
        requiredPermission: detailMessage,
      },
    });
  }
}
