import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para permitir acesso a rotas mesmo quando o usuário está em primeiro acesso
 *
 * Use este decorator em rotas que devem ser acessíveis para usuários que ainda não
 * alteraram sua senha no primeiro acesso, como:
 * - Rota de alteração de senha no primeiro acesso
 * - Rota de logout
 * - Rotas de perfil básico
 *
 * @example
 * ```typescript
 * @Put('/primeiro-acesso/alterar-senha')
 * @AllowPrimeiroAcesso()
 * async alterarSenhaPrimeiroAcesso() {
 *   // Esta rota será acessível mesmo em primeiro acesso
 * }
 * ```
 */
export const AllowPrimeiroAcesso = () =>
  SetMetadata('allow-primeiro-acesso', true);
