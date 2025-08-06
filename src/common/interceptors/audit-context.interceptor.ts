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
import { UserAccessTokenClaims } from '../../auth/dtos/auth-token-output.dto';
import { RoleType } from '../../shared/constants/roles.constants';

/**
 * Interface para o contexto de auditoria
 */
export interface AuditContext {
  userId: string | null;
  userRoles: RoleType[];
  ip: string;
  userAgent: string;
  requestId?: string;
  sessionId?: string;
  timestamp: Date;
  method: string;
  url: string;
  controllerName: string;
  handlerName: string;
}

/**
 * Holder para o contexto de auditoria usando AsyncLocalStorage
 */
class AuditContextHolder {
  private static context: AuditContext | null = null;

  /**
   * Define o contexto de auditoria
   */
  static set(context: AuditContext): void {
    this.context = context;
  }

  /**
   * Obtém o contexto de auditoria atual
   */
  static get(): AuditContext | null {
    return this.context;
  }

  /**
   * Verifica se há contexto definido
   */
  static hasContext(): boolean {
    return this.context !== null;
  }

  /**
   * Limpa o contexto de auditoria
   */
  static clear(): void {
    this.context = null;
  }
}

/**
 * Interceptor para capturar contexto completo de auditoria
 *
 * @description
 * Este interceptor captura informações essenciais para auditoria:
 * - IP do cliente
 * - User-Agent
 * - Roles do usuário
 * - Informações da requisição
 * - Timestamps
 *
 * Executa APÓS o AuthGuard e ScopeContextInterceptor para garantir
 * que o usuário esteja disponível em req.user.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as UserAccessTokenClaims;

    // Capturar contexto de auditoria
    const auditContext = this.captureAuditContext(context, request, user);

    // Definir contexto no holder
    AuditContextHolder.set(auditContext);

    this.logger.debug('Contexto de auditoria capturado', {
      userId: auditContext.userId,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
      roles: auditContext.userRoles,
      method: auditContext.method,
      url: auditContext.url,
      timestamp: auditContext.timestamp,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.debug('Requisição processada - contexto de auditoria mantido', {
            userId: auditContext.userId,
            hasContext: AuditContextHolder.hasContext(),
          });
        },
        error: (error) => {
          this.logger.error('Erro durante processamento - contexto de auditoria mantido', {
            error: error.message,
            userId: auditContext.userId,
            ip: auditContext.ip,
          });
        },
        finalize: () => {
          // Limpar contexto após processamento
          AuditContextHolder.clear();
          this.logger.debug('Contexto de auditoria limpo');
        },
      }),
    );
  }

  /**
   * Captura o contexto completo de auditoria
   */
  private captureAuditContext(
    context: ExecutionContext,
    request: Request,
    user: UserAccessTokenClaims | undefined,
  ): AuditContext {
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const ip = this.extractClientIp(request);
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const method = request.method;
    const url = request.url;
    const requestId = (request as any).requestId || this.generateRequestId();
    const sessionId = (request as any).sessionId;

    return {
      userId: user?.id ? String(user.id) : null,
      userRoles: user?.roles || [],
      ip,
      userAgent,
      requestId,
      sessionId,
      timestamp: new Date(),
      method,
      url,
      controllerName,
      handlerName,
    };
  }

  /**
   * Extrai o IP do cliente considerando proxies
   */
  private extractClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const remoteAddress = request.connection?.remoteAddress || request.socket?.remoteAddress;

    if (forwarded) {
      // x-forwarded-for pode conter múltiplos IPs separados por vírgula
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return remoteAddress || 'unknown';
  }

  /**
   * Gera um ID único para a requisição
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Exportar o holder para uso em outros serviços
 */
export { AuditContextHolder };