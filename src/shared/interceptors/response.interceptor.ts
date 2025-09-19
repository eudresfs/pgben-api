import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResponse } from '../configs/swagger/schemas/common';
import { IApiResponse as ApiResponse } from '../../modules/easy-upload/interfaces/easy-upload.interface';
import { SKIP_RESPONSE_INTERCEPTOR_KEY } from '../decorators/skip-response-interceptor.decorator';

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
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Verifica se a rota deve pular o interceptor de resposta
    const skipInterceptor = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_INTERCEPTOR_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se deve pular, retorna a resposta original sem transformação
    if (skipInterceptor) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data) => {
        // Se for uma resposta paginada
        if (data && data.items && data.meta) {
          return {
            data: data.items,
            meta: {
              ...data.meta,
              total: data.total || data.meta.total,
            },
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
