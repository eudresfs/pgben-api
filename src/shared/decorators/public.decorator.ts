import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para marcar rotas como públicas, ou seja, que não requerem autenticação.
 * Útil para endpoints como health check, métricas e documentação.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
