import { SetMetadata } from '@nestjs/common';

/**
 * Chave para identificar rotas públicas
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator para marcar rotas como públicas (sem necessidade de autenticação)
 * 
 * Exemplo de uso:
 * ```typescript
 * @Public()
 * @Get('endpoint-publico')
 * metodoPublico() {
 *   // Este endpoint não requer autenticação
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
