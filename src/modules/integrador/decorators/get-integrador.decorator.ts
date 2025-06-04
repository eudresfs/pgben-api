import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para injetar o objeto integrador na assinatura do método do controller.
 * Extrai o integrador do objeto de requisição que foi previamente configurado pelo guard.
 *
 * @example
 * // Uso em um método de controller
 * @Get('recursos')
 * getRecursos(@GetIntegrador() integrador: Integrador) {
 *   // O integrador já está disponível aqui
 *   return `Recursos para ${integrador.nome}`;
 * }
 */
export const GetIntegrador = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.integrador;
  },
);
