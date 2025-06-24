import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from '../logging/logging.service';

/**
 * Interceptor que faz redaction de dados sensíveis nos logs.
 * Atualmente remove campos típicos de PII: password, token, secret, cpf, email.
 * Pode ser estendido via variável de ambiente LOG_REDACT_FIELDS (lista separada por vírgula).
 */
@Injectable()
export class RedactLogsInterceptor implements NestInterceptor {
  private readonly sensitiveFields: string[];
  private readonly sensitiveSet: Set<string>;
  private readonly isDebugEnabled: boolean;

  constructor(private readonly logger: LoggingService) {

    const extra = process.env.LOG_REDACT_FIELDS || '';
    this.sensitiveFields = [
      'password',
      'senha_hash',
      'senha',
      'token',
      'secret',
      'cpf',
      'email',
      ...extra.split(',').map((f) => f.trim()).filter(Boolean),
    ];
    this.sensitiveSet = new Set(this.sensitiveFields.map((f) => f.toLowerCase()));
    // Ativa logs detalhados apenas em desenvolvimento ou se nível = debug
    this.isDebugEnabled =
      process.env.NODE_ENV !== 'production' ||
      (process.env.LOG_LEVEL || '').toLowerCase() === 'debug';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    if (!this.isDebugEnabled) {
      // Se log detalhado desativado, não realizar redaction nem logs para cada requisição
      return next.handle();
    }

    // Redact body antes de logar
    const redactedBody = this.redactObject(req.body);
    const { method, originalUrl } = req;

    this.logger.debug(`REQ ${method} ${originalUrl}`, RedactLogsInterceptor.name, { body: redactedBody });

    const startedAt = Date.now();
    return next.handle().pipe(
      tap((responseData) => {
        const durationMs = Date.now() - startedAt;
        this.logger.debug(`RES ${method} ${originalUrl}`, RedactLogsInterceptor.name, {
          durationMs,
          response: this.redactObject(responseData)
        });
      }),
    );
  }

  private redactObject(source: any): any {
    if (!source || typeof source !== 'object') return source;

    // Iterative deep clone with redaction to evitar recursion overhead
    const rootClone: any = Array.isArray(source) ? [] : {};
    const stack: Array<{ src: any; dst: any }> = [{ src: source, dst: rootClone }];

    while (stack.length) {
      const { src, dst } = stack.pop()!;

      for (const [key, value] of Object.entries(src)) {
        if (this.sensitiveSet.has(key.toLowerCase())) {
          dst[key] = '[REDACTED]';
        } else if (value && typeof value === 'object') {
          const childClone: any = Array.isArray(value) ? [] : {};
          dst[key] = childClone;
          stack.push({ src: value, dst: childClone });
        } else {
          dst[key] = value;
        }
      }
    }
    return rootClone;
  }
}
