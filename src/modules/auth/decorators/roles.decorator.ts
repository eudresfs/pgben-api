import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/**
 * Chave para identificar os papéis necessários para acessar um recurso
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator para definir os papéis necessários para acessar um recurso
 * 
 * Exemplo de uso:
 * ```typescript
 * @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
 * @Get('endpoint-restrito')
 * metodoRestrito() {
 *   // Este endpoint só pode ser acessado por administradores e gestores
 * }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
