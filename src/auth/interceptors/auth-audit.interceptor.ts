/**
 * AuthAuditInterceptor
 *
 * Interceptor específico para auditoria do módulo de autenticação.
 * Captura eventos críticos de segurança como login, logout, refresh de tokens,
 * tentativas de acesso não autorizado e operações de recuperação de senha.
 *
 * Funcionalidades:
 * - Auditoria de operações de autenticação e autorização
 * - Captura de dados de contexto de segurança (IP, User-Agent, etc.)
 * - Integração com sistema centralizado de auditoria
 * - Mascaramento de dados sensíveis (senhas, tokens)
 * - Detecção de atividades suspeitas
 *
 * @author Equipe PGBen
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { AuditEventEmitter } from '../../modules/auditoria/events/emitters/audit-event.emitter';
import {
  AuditEventType,
  RiskLevel,
  SecurityAuditEvent,
} from '../../modules/auditoria/events/types/audit-event.types';
import {
  AUDIT_METADATA_KEY,
  SECURITY_AUDIT_METADATA_KEY,
  AuditDecoratorConfig,
  SecurityAuditConfig,
} from '../../modules/auditoria/decorators/audit.decorators';
import { RequestContext } from '../../shared/request-context/request-context.dto';

/**
 * Interface para dados de contexto de autenticação
 */
interface AuthContextData {
  clientIp: string;
  userAgent: string;
  method: string;
  url: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Interface para metadados de auditoria de autenticação
 */
interface AuthAuditMetadata {
  operation: string;
  riskLevel: RiskLevel;
  sensitiveFields?: string[];
  captureRequest?: boolean;
  captureResponse?: boolean;
}

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthAuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    // Extrair metadados de auditoria
    const auditConfig = this.reflector.get<AuditDecoratorConfig>(
      AUDIT_METADATA_KEY,
      handler,
    );

    const securityConfig = this.reflector.get<SecurityAuditConfig>(
      SECURITY_AUDIT_METADATA_KEY,
      handler,
    );

    // Se não há configuração de auditoria, prosseguir sem interceptar
    if (!auditConfig && !securityConfig) {
      return next.handle();
    }

    // Preparar contexto de auditoria
    const authContext = this.prepareAuthContext(request);
    const auditMetadata = this.prepareAuditMetadata(
      auditConfig,
      securityConfig,
      authContext,
    );

    // Emitir evento de início da operação
    this.emitOperationStartEvent(auditMetadata, authContext, startTime);

    return next.handle().pipe(
      tap((result) => {
        // Sucesso - emitir evento de auditoria
        this.emitSuccessEvent(
          auditMetadata,
          authContext,
          result,
          startTime,
          response,
        );
      }),
      catchError((error) => {
        // Erro - emitir evento de erro de segurança
        this.emitErrorEvent(
          auditMetadata,
          authContext,
          error,
          startTime,
          response,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Prepara o contexto de autenticação para auditoria
   */
  private prepareAuthContext(request: Request): AuthContextData {
    const user = (request as any).user;

    return {
      clientIp: this.extractClientIP(request),
      userAgent: this.extractUserAgent(request),
      method: request.method,
      url: this.normalizeEndpoint(request),
      timestamp: new Date(),
      userId: user?.id,
      username: user?.username || user?.email,
      roles: user?.roles || [],
      permissions: user?.permissions || [],
    };
  }

  /**
   * Prepara metadados de auditoria combinando configurações
   */
  private prepareAuditMetadata(
    auditConfig?: AuditDecoratorConfig,
    securityConfig?: SecurityAuditConfig,
    authContext?: AuthContextData,
  ): AuthAuditMetadata {
    const operation =
      auditConfig?.operation || authContext?.method || 'unknown';
    const riskLevel =
      auditConfig?.riskLevel || securityConfig?.riskLevel || RiskLevel.MEDIUM;

    return {
      operation,
      riskLevel,
      sensitiveFields: auditConfig?.sensitiveFields || [
        'password',
        'token',
        'refreshToken',
        'senha',
        'senha_hash',
        'token_acesso',
        'token_refresh',
      ],
      captureRequest: auditConfig?.async !== false,
      captureResponse: auditConfig?.async !== false,
    };
  }

  /**
   * Emite evento de início da operação
   */
  private emitOperationStartEvent(
    metadata: AuthAuditMetadata,
    context: AuthContextData,
    startTime: number,
  ): void {
    try {
      this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        context.userId,
        {
          operation: `auth_${metadata.operation}_start`,
          riskLevel: metadata.riskLevel,
          clientIp: context.clientIp,
          userAgent: context.userAgent,
          method: context.method,
          url: context.url,
          timestamp: context.timestamp.toISOString(),
          startTime,
        },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao emitir evento de início de operação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emite evento de sucesso da operação
   */
  private emitSuccessEvent(
    metadata: AuthAuditMetadata,
    context: AuthContextData,
    result: any,
    startTime: number,
    response: Response,
  ): void {
    try {
      const executionTime = Date.now() - startTime;
      const maskedResult = this.maskSensitiveData(
        result,
        metadata.sensitiveFields,
      );

      this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.SUCCESSFUL_LOGIN,
        context.userId,
        {
          operation: `auth_${metadata.operation}_success`,
          riskLevel: metadata.riskLevel,
          clientIp: context.clientIp,
          userAgent: context.userAgent,
          method: context.method,
          url: context.url,
          statusCode: response.statusCode,
          executionTime,
          timestamp: new Date().toISOString(),
          result: metadata.captureResponse ? maskedResult : undefined,
          username: context.username,
          roles: context.roles,
        },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao emitir evento de sucesso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emite evento de erro da operação
   */
  private emitErrorEvent(
    metadata: AuthAuditMetadata,
    context: AuthContextData,
    error: any,
    startTime: number,
    response: Response,
  ): void {
    try {
      const executionTime = Date.now() - startTime;
      const riskLevel = this.calculateErrorRiskLevel(error, metadata.riskLevel);

      this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.FAILED_LOGIN,
        context.userId,
        {
          operation: `auth_${metadata.operation}_failure`,
          riskLevel,
          clientIp: context.clientIp,
          userAgent: context.userAgent,
          method: context.method,
          url: context.url,
          statusCode: error.status || response.statusCode || 500,
          executionTime,
          timestamp: new Date().toISOString(),
          errorMessage: error.message,
          errorType: error.constructor.name,
          username: context.username,
          suspicious: this.isSuspiciousActivity(error, context),
        },
      );
    } catch (auditError) {
      this.logger.error(
        `Erro ao emitir evento de erro: ${auditError.message}`,
        auditError.stack,
      );
    }
  }

  /**
   * Extrai o IP do cliente considerando proxies e load balancers
   * Implementação padronizada para auditoria
   */
  private extractClientIP(request: Request): string {
    // Ordem de prioridade para extração do IP real do cliente
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // Pega o primeiro IP da lista (cliente original)
      const firstIP = forwardedFor.split(',')[0].trim();
      if (firstIP && firstIP !== 'unknown') {
        return firstIP;
      }
    }

    // Headers alternativos comuns em diferentes proxies
    const realIP = request.headers['x-real-ip'] as string;
    if (realIP && realIP !== 'unknown') {
      return realIP;
    }

    const clientIP = request.headers['x-client-ip'] as string;
    if (clientIP && clientIP !== 'unknown') {
      return clientIP;
    }

    // Conexão direta
    const connectionIP = request.connection?.remoteAddress;
    if (connectionIP) {
      return connectionIP;
    }

    const socketIP = request.socket?.remoteAddress;
    if (socketIP) {
      return socketIP;
    }

    // Fallback obrigatório
    return 'unknown';
  }

  /**
   * Extrai o User-Agent da requisição
   * Implementação padronizada para auditoria
   */
  private extractUserAgent(request: Request): string {
    const userAgent = request.headers['user-agent'];
    return userAgent && userAgent.trim() !== '' ? userAgent : 'unknown';
  }

  /**
   * Normaliza o endpoint removendo parâmetros dinâmicos
   * Implementação padronizada para auditoria
   */
  private normalizeEndpoint(request: Request): string {
    let endpoint = request.url || request.path || '/';

    // Remove query parameters
    const queryIndex = endpoint.indexOf('?');
    if (queryIndex !== -1) {
      endpoint = endpoint.substring(0, queryIndex);
    }

    // Normaliza IDs numéricos para :id
    endpoint = endpoint.replace(/\/\d+/g, '/:id');

    // Normaliza UUIDs para :uuid
    endpoint = endpoint.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:uuid',
    );

    return endpoint;
  }

  /**
   * Mascara dados sensíveis no resultado
   */
  private maskSensitiveData(data: any, sensitiveFields?: string[]): any {
    if (!data || !sensitiveFields?.length) {
      return data;
    }

    const masked = { ...data };

    sensitiveFields.forEach((field) => {
      if (masked[field]) {
        if (typeof masked[field] === 'string') {
          masked[field] = this.maskString(masked[field]);
        } else {
          masked[field] = '[MASKED]';
        }
      }
    });

    return masked;
  }

  /**
   * Mascara uma string mantendo apenas os primeiros e últimos caracteres
   */
  private maskString(value: string): string {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(value.length - 4);

    return `${start}${middle}${end}`;
  }

  /**
   * Calcula o nível de risco baseado no tipo de erro
   */
  private calculateErrorRiskLevel(
    error: any,
    defaultRisk: RiskLevel,
  ): RiskLevel {
    // Erros de autenticação são sempre de alto risco
    if (error.status === 401 || error.message?.includes('Unauthorized')) {
      return RiskLevel.HIGH;
    }

    // Erros de autorização são de médio a alto risco
    if (error.status === 403 || error.message?.includes('Forbidden')) {
      return RiskLevel.HIGH;
    }

    // Erros de validação são de baixo risco
    if (error.status === 400) {
      return RiskLevel.LOW;
    }

    // Erros internos são de médio risco
    if (error.status >= 500) {
      return RiskLevel.MEDIUM;
    }

    return defaultRisk;
  }

  /**
   * Determina se a atividade é suspeita
   */
  private isSuspiciousActivity(error: any, context: AuthContextData): boolean {
    // Múltiplas tentativas de login falhadas
    if (error.status === 401 && context.url?.includes('login')) {
      return true;
    }

    // Tentativas de acesso a recursos protegidos sem autenticação
    if (error.status === 401 && !context.userId) {
      return true;
    }

    // Tentativas de escalação de privilégios
    if (error.status === 403) {
      return true;
    }

    return false;
  }
}
