/**
 * AuditGuard
 *
 * Guard para auditoria automática baseada em decorators.
 * Integra com a arquitetura event-driven para capturar eventos de segurança.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditEventEmitter } from '../events/emitters/audit-event.emitter';
import {
  SECURITY_AUDIT_METADATA_KEY,
  SENSITIVE_DATA_METADATA_KEY,
  SecurityAuditConfig,
  SensitiveDataConfig,
} from '../decorators/audit.decorators';
import {
  AuditEventType,
  RiskLevel,
  SecurityAuditEvent,
} from '../events/types/audit-event.types';

@Injectable()
export class AuditGuard implements CanActivate {
  private readonly logger = new Logger(AuditGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extrair configurações dos decorators
    const securityConfig = this.reflector.get<SecurityAuditConfig>(
      SECURITY_AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    const sensitiveConfig = this.reflector.get<SensitiveDataConfig>(
      SENSITIVE_DATA_METADATA_KEY,
      context.getHandler(),
    );

    // Se não há configuração de auditoria de segurança, permitir acesso
    if (!securityConfig && !sensitiveConfig) {
      return true;
    }

    try {
      // Preparar contexto da auditoria
      const auditContext = this.prepareAuditContext(context, request);

      // Verificar autenticação se necessário
      if (securityConfig?.requiresAuth && !this.isAuthenticated(request)) {
        this.emitSecurityEvent(
          auditContext,
          'authentication_failed',
          RiskLevel.HIGH,
        );
        throw new UnauthorizedException('Acesso não autorizado');
      }

      // Verificar autorização se necessário
      if (
        securityConfig?.requiredRoles &&
        !this.hasRequiredRoles(request, securityConfig.requiredRoles)
      ) {
        this.emitSecurityEvent(
          auditContext,
          'authorization_failed',
          RiskLevel.HIGH,
        );
        throw new ForbiddenException(
          'Acesso negado - permissões insuficientes',
        );
      }

      // Verificar consentimento para dados sensíveis
      if (
        sensitiveConfig?.requiresConsent &&
        !this.hasConsent(request, sensitiveConfig)
      ) {
        this.emitSecurityEvent(
          auditContext,
          'consent_required',
          RiskLevel.MEDIUM,
        );
        throw new ForbiddenException(
          'Consentimento necessário para acesso a dados sensíveis',
        );
      }

      // Verificar rate limiting para operações sensíveis
      if (
        securityConfig?.rateLimit &&
        !this.checkRateLimit(request, securityConfig)
      ) {
        this.emitSecurityEvent(
          auditContext,
          'rate_limit_exceeded',
          RiskLevel.HIGH,
        );
        throw new ForbiddenException('Limite de requisições excedido');
      }

      // Emitir evento de acesso autorizado
      this.emitSecurityEvent(auditContext, 'access_granted', RiskLevel.LOW);

      return true;
    } catch (error) {
      // Se é uma exceção conhecida, re-lançar
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Para outros erros, logar e emitir evento de erro
      this.logger.error('Erro no AuditGuard:', error);
      const auditContext = this.prepareAuditContext(context, request);
      this.emitSecurityEvent(auditContext, 'guard_error', RiskLevel.CRITICAL, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });

      // Por segurança, negar acesso em caso de erro
      return false;
    }
  }

  /**
   * Prepara o contexto da auditoria
   */
  private prepareAuditContext(context: ExecutionContext, request: Request) {
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    const userId = this.extractUserId(request);
    const userAgent = request.headers['user-agent'];
    const ip = this.extractClientIp(request);

    return {
      controller: controllerName,
      method: methodName,
      userId,
      userAgent,
      ip,
      url: request.url,
      httpMethod: request.method,
      timestamp: new Date(),
    };
  }

  /**
   * Verifica se o usuário está autenticado
   */
  private isAuthenticated(request: Request): boolean {
    return !!request.user;
  }

  /**
   * Verifica se o usuário tem as roles necessárias
   */
  private hasRequiredRoles(request: Request, requiredRoles: string[]): boolean {
    const userRoles = request.user?.['roles'] || [];
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Verifica se há consentimento para dados sensíveis
   */
  private hasConsent(
    request: Request,
    sensitiveConfig: SensitiveDataConfig,
  ): boolean {
    // Implementação simplificada - em produção, verificar contra base de dados de consentimentos
    const consentHeader = request.headers['x-data-consent'] as string;
    return consentHeader === 'granted' || !sensitiveConfig.requiresConsent;
  }

  /**
   * Verifica rate limiting
   */
  private checkRateLimit(
    request: Request,
    securityConfig: SecurityAuditConfig,
  ): boolean {
    // Implementação simplificada - em produção, usar Redis ou similar
    // Por enquanto, sempre permitir (rate limiting seria implementado em middleware separado)
    return true;
  }

  /**
   * Emite evento de segurança
   */
  private emitSecurityEvent(
    auditContext: any,
    operation: string,
    riskLevel: RiskLevel,
    additionalMetadata?: any,
  ) {
    try {
      const securityEvent: SecurityAuditEvent = {
        eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
        timestamp: new Date(),
        userId: auditContext.userId,
        riskLevel,
        entityName: `${auditContext.controller}.${auditContext.method}`,
        entityId: auditContext.userId || 'unknown',
        lgpdRelevant: true,
        metadata: {
          controller: auditContext.controller,
          method: auditContext.method,
          url: auditContext.url,
          httpMethod: auditContext.httpMethod,
          timestamp: auditContext.timestamp,
          ...additionalMetadata,
        },
      };

      this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        auditContext.userId,
        {
          operation,
          resource: `${auditContext.controller}.${auditContext.method}`,
          success: operation === 'access_granted',
          controller: auditContext.controller,
          method: auditContext.method,
          url: auditContext.url,
          httpMethod: auditContext.httpMethod,
          timestamp: auditContext.timestamp,
          ...additionalMetadata,
        },
      );
    } catch (error) {
      this.logger.error('Erro ao emitir evento de segurança:', error);
    }
  }

  /**
   * Extrai o ID do usuário da requisição
   */
  private extractUserId(request: Request): string | undefined {
    return (
      request.user?.['id'] ||
      request.user?.['userId'] ||
      (request.headers['x-user-id'] as string) ||
      undefined
    );
  }

  /**
   * Extrai o IP do cliente
   */
  private extractClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
