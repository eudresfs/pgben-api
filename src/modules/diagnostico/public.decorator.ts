import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para marcar rotas como públicas 
 * Permite acesso sem autenticação para fins de diagnóstico
 */
export const Public = () => SetMetadata('isPublic', true);
