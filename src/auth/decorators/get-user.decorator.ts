import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '../../entities/usuario.entity';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): Usuario | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // Se uma propriedade específica foi solicitada, retorna apenas ela
    if (data && user && typeof user === 'object') {
      return user[data];
    }
    
    // Caso contrário, retorna o usuário completo
    return user;
  },
);
