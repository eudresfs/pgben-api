import { Injectable } from '@nestjs/common';
import { LoggingService } from '../../../shared/logging/logging.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditEventType } from '../../auditoria/events/types/audit-event.types';
import { Documento } from '../../../entities/documento.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { Request } from 'express';
import { AuditContextHolder } from '../../../common/interceptors/audit-context.interceptor';

export interface DocumentoAuditContext {
  userId: string;
  userRoles: string[];
  ip: string;
  userAgent: string;
  sessionId?: string;
  requestId?: string;
}

export interface DocumentoAccessAuditData {
  documentoId: string;
  filename: string;
  mimetype: string;
  fileSize: number;
  cidadaoId: string;
  solicitacaoId?: string;
  accessType: 'view' | 'download' | 'upload' | 'verify' | 'delete' | 'reuse';
  success: boolean;
  errorReason?: string;
  metadata?: Record<string, any>;
}

export interface DocumentoOperationAuditData {
  documentoId?: string;
  operationType:
    | 'upload'
    | 'verify'
    | 'delete'
    | 'access_check'
    | 'rate_limit'
    | 'validation';
  operationDetails: Record<string, any>;
  success: boolean;
  errorDetails?: string;
  performanceMetrics?: {
    duration: number;
    memoryUsage?: number;
    fileSize?: number;
  };
}

/**
 * Serviço especializado para auditoria de operações de documentos
 *
 * Centraliza e padroniza o logging de auditoria para todas as operações
 * relacionadas a documentos, fornecendo rastreabilidade completa.
 */
@Injectable()
export class DocumentoAuditService {
  constructor(
    private readonly logger: LoggingService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Audita acesso a documento
   */
  async auditAccess(
    context: DocumentoAuditContext,
    data: DocumentoAccessAuditData,
  ): Promise<void> {
    try {
      await this.auditEventEmitter.emitEntityAccessed(
        'Documento',
        data.documentoId,
        context.userId,
        {
          synchronous: false,
        },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao auditar acesso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Audita upload de documento
   */
  async auditUpload(
    context: DocumentoAuditContext,
    data: DocumentoOperationAuditData,
  ): Promise<void> {
    try {
      await this.auditEventEmitter.emitEntityCreated(
        'Documento',
        data.documentoId,
        {
          fileSize: data.operationDetails?.fileSize,
          mimetype: data.operationDetails?.mimetype,
          filename: data.operationDetails?.filename,
          userRoles: context.userRoles,
          ip: context.ip,
          userAgent: context.userAgent,
          timestamp: new Date().toISOString(),
        },
        context.userId,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao auditar upload: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Audita verificação de documento
   */
  async auditVerification(
    context: DocumentoAuditContext,
    data: DocumentoOperationAuditData,
  ): Promise<void> {
    try {
      await this.auditEventEmitter.emitEntityUpdated(
        'Documento',
        data.documentoId,
        { verificado: false },
        {
          verificado: true,
          userRoles: context.userRoles,
          observacoes: data.operationDetails?.observacoes,
          ip: context.ip,
          userAgent: context.userAgent,
          timestamp: new Date().toISOString(),
        },
        context.userId,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao auditar verificação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Audita remoção de documento
   */
  async auditRemoval(
    context: DocumentoAuditContext,
    data: DocumentoOperationAuditData,
  ): Promise<void> {
    try {
      await this.auditEventEmitter.emitEntityDeleted(
        'Documento',
        data.documentoId,
        {
          userRoles: context.userRoles,
          reason: data.operationDetails?.reason,
          ip: context.ip,
          userAgent: context.userAgent,
          timestamp: new Date().toISOString(),
        },
        context.userId,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao auditar remoção: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Audita falha de acesso (negação de permissão)
   */
  async auditAccessDenied(
    documentoId: string,
    context: DocumentoAuditContext,
    denialReason: string,
    attemptedAction: string,
  ): Promise<void> {
    try {
      const eventData = {
        entityType: 'Documento',
        entityId: documentoId,
        action: 'access_denied',
        userId: context.userId,
        userRoles: context.userRoles,
        ip: context.ip,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        requestId: context.requestId,
        timestamp: new Date(),
        success: false,
        details: {
          denialReason,
          attemptedAction,
        },
      };

      await this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        context.userId,
        eventData.details,
      );

      this.logger.warn(
        'Acesso negado a documento',
        DocumentoAuditService.name,
        {
          documentoId,
          userId: context.userId,
          userRoles: context.userRoles,
          denialReason,
          attemptedAction,
          ip: context.ip,
        },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao auditar acesso negado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Audita operações de segurança (rate limiting, validação, etc.)
   */
  async auditSecurityOperation(
    context: DocumentoAuditContext,
    operationData: DocumentoOperationAuditData,
  ): Promise<void> {
    try {
      // Mapeia operações para eventos de segurança apropriados
      let eventType: any;

      switch (operationData.operationType.toLowerCase()) {
        case 'acesso_negado':
        case 'access_denied':
          eventType = AuditEventType.SUSPICIOUS_ACTIVITY;
          break;
        case 'acesso_concedido':
        case 'access_granted':
          eventType = AuditEventType.PERMISSION_CHANGED;
          break;
        default:
          eventType = AuditEventType.SUSPICIOUS_ACTIVITY;
      }

      const eventData = {
        entityType: 'Documento',
        entityId: operationData.documentoId || 'N/A',
        action: operationData.operationType,
        userId: context.userId,
        userRoles: context.userRoles,
        ip: context.ip,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        requestId: context.requestId,
        timestamp: new Date(),
        success: operationData.success,
        details: {
          ...operationData.operationDetails,
          errorDetails: operationData.errorDetails,
          performanceMetrics: operationData.performanceMetrics,
        },
      };

      if (operationData.success) {
        await this.auditEventEmitter.emitEntityAccessed(
          'Documento',
          operationData.documentoId || 'N/A',
          context.userId,
        );
      } else {
        await this.auditEventEmitter.emitSecurityEvent(
          eventType,
          context.userId,
          eventData.details,
        );
      }

      const logLevel = operationData.success ? 'info' : 'warn';
      const logMessage = `Operação de segurança: ${operationData.operationType}`;

      this.logger[logLevel](logMessage, DocumentoAuditService.name, {
        userId: context.userId,
        operationType: operationData.operationType,
        success: operationData.success,
        documentoId: operationData.documentoId,
        ip: context.ip,
        errorDetails: operationData.errorDetails,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao auditar operação de segurança: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Extrai contexto de auditoria de uma requisição HTTP
   * Prioriza o AuditContextHolder quando disponível
   */
  extractAuditContext(request: Request): DocumentoAuditContext {
    // Tentar usar o contexto do AuditContextHolder primeiro
    const auditContext = AuditContextHolder.get();

    if (auditContext) {
      this.logger.debug(
        `Usando contexto de auditoria do AuditContextHolder - userId: ${auditContext.userId}, ip: ${auditContext.ip}, userAgent: ${auditContext.userAgent}, roles: ${auditContext.userRoles?.join(', ')}`,
      );

      return {
        userId:
          auditContext.userId === 'anonymous'
            ? '00000000-0000-0000-0000-000000000000'
            : auditContext.userId || '00000000-0000-0000-0000-000000000000',
        userRoles: auditContext.userRoles || [],
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        sessionId: auditContext.sessionId,
        requestId: auditContext.requestId,
      };
    }

    // Fallback para extração manual da requisição
    this.logger.debug(
      'AuditContextHolder não disponível, extraindo contexto da requisição',
    );

    const user = (request as any).user;
    const requestContext = (request as any).requestContext;
    const ip = this.extractClientIp(request);

    return {
      userId: user?.id || '00000000-0000-0000-0000-000000000000',
      userRoles: user?.roles || [],
      ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      sessionId: requestContext?.sessionId,
      requestId: requestContext?.requestId,
    };
  }

  /**
   * Extrai o IP do cliente considerando proxies
   */
  private extractClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const remoteAddress =
      request.connection?.remoteAddress || request.socket?.remoteAddress;

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
   * Cria dados de auditoria para acesso a documento
   */
  createAccessAuditData(
    documento: Documento,
    accessType: DocumentoAccessAuditData['accessType'],
    success: boolean,
    errorReason?: string,
    metadata?: Record<string, any>,
  ): DocumentoAccessAuditData {
    return {
      documentoId: documento.id,
      filename: documento.nome_arquivo,
      mimetype: documento.mimetype,
      fileSize: documento.tamanho,
      cidadaoId: documento.cidadao_id,
      solicitacaoId: documento.solicitacao_id,
      accessType,
      success,
      errorReason,
      metadata,
    };
  }
}
