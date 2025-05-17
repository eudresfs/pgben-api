import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor para padronizar as respostas da API
 *
 * Garante que todas as respostas sigam o formato:
 * {
 *   data: {},               // Dados da resposta
 *   meta: {                 // Metadados (paginação, etc.)
 *     total: 100,
 *     page: 1,
 *     limit: 10
 *   },
 *   message: "string"       // Mensagem opcional
 * }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Se for uma resposta paginada
        if (data && data.items && data.meta) {
          return {
            data: data.items,
            meta: data.meta,
            message: data.message || null,
          };
        }

        // Se já estiver no formato padronizado
        if (data && (data.data !== undefined || data.meta !== undefined)) {
          return data;
        }

        // Resposta normal
        return {
          data: data,
          meta: null,
          message: null,
        };
      }),
    );
  }
}
