import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditoriaQueueService } from '../services/auditoria-queue.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { AuditEvent } from '../interfaces/audit-event.interface';

/**
 * Interceptor simplificado para auditoria de operações - Versão MVP
 *
 * Este interceptor pode ser aplicado a controladores ou métodos específicos
 * para registrar automaticamente operações críticas no sistema de auditoria.
 *
 * Implementação simplificada para o MVP com foco em rastreabilidade básica.
 *
 * Exemplo de uso:
 * ```typescript
 * @UseInterceptors(AuditInterceptor)
 * @Controller('usuarios')
 * export class UsuarioController {}
 * ```
 *
 * Ou em um método específico:
 * ```typescript
 * @UseInterceptors(new AuditInterceptor({
 *   entidade_afetada: 'Usuario',
 *   tipo_operacao: TipoOperacao.READ
 * }))
 * @Get('list')
 * findAll() {}
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly config: Partial<AuditEvent>;

  /**
   * Cria uma nova instância do interceptor de auditoria
   *
   * @param config Configuração opcional para o interceptor
   */
  constructor(
    private readonly auditoriaQueueService: AuditoriaQueueService,
    config?: Partial<AuditEvent>,
  ) {
    this.config = config || {};
  }

  /**
   * Intercepta a requisição e registra a operação no sistema de auditoria (versão MVP)
   *
   * @param context Contexto de execução
   * @param next Manipulador da chamada
   * @returns Observable do resultado da chamada
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extrair informações básicas da requisição
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, params, body, user } = request;
    const userId = user ? (user as { id?: string }).id : undefined;

    // Determinar o tipo de operação com base no método HTTP
    let tipoOperacao = this.config.tipo_operacao;
    if (!tipoOperacao) {
      switch (method) {
        case 'POST':
          tipoOperacao = TipoOperacao.CREATE;
          break;
        case 'GET':
          tipoOperacao = TipoOperacao.READ;
          break;
        case 'PUT':
        case 'PATCH':
          tipoOperacao = TipoOperacao.UPDATE;
          break;
        case 'DELETE':
          tipoOperacao = TipoOperacao.DELETE;
          break;
        default:
          tipoOperacao = TipoOperacao.ACCESS;
      }
    }

    // Extrair nome da entidade do controlador ou da configuração
    const controllerName = context.getClass().name.replace('Controller', '');
    const entidadeAfetada = this.config.entidade_afetada || controllerName;

    // Extrair ID da entidade dos parâmetros da rota
    const entidadeId = this.extractEntityId(params);

    // Continuar com a execução do handler
    return next.handle().pipe(
      tap(() => {
        // Criar DTO simplificado para o log de auditoria (MVP)
        const logDto = new CreateLogAuditoriaDto();
        logDto.tipo_operacao = tipoOperacao;
        logDto.entidade_afetada = entidadeAfetada;
        logDto.entidade_id = entidadeId;
        logDto.usuario_id = userId;
        logDto.endpoint = url;
        logDto.metodo_http = method;

        // Processar log simplificado diretamente sem enfileiramento complexo
        void this.auditoriaQueueService.processarLog(logDto);
      }),
    );
  }

  /**
   * Extrai o ID da entidade dos parâmetros da rota - Versão MVP Simplificada
   *
   * @param params Parâmetros da rota
   * @returns ID da entidade ou undefined
   */
  private extractEntityId(params: unknown): string | undefined {
    if (!params || typeof params !== 'object') {
      return undefined;
    }

    const paramsObj = params as Record<string, unknown>;

    // Verificar se o parâmetro 'id' está presente
    if ('id' in paramsObj && paramsObj['id']) {
      return String(paramsObj['id']);
    }

    // Verificar se há alguma chave que termina com 'Id'
    for (const key in paramsObj) {
      if (key.endsWith('Id') && paramsObj[key]) {
        return String(paramsObj[key]);
      }
    }

    return undefined;
  }
}
