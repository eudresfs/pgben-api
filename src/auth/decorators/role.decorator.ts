import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Role } from '../../shared/enums/role.enum';

/**
 * Chave usada para armazenar os papéis no metadado
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator para definir os papéis necessários para acessar um endpoint
 * @param roles Lista de papéis permitidos
 * @returns Um decorator que define os papéis necessários no metadado
 */
export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
