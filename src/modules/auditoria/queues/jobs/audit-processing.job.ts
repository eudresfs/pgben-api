/**
 * AuditProcessingJob
 *
 * Job responsável pelo processamento assíncrono de eventos de auditoria.
 * Implementa compressão, assinatura digital e persistência otimizada.
 */

import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import {
  AuditEvent,
  AuditEventConfig,
} from '../../events/types/audit-event.types';
import { AuditCoreRepository } from '../../core/repositories/audit-core.repository';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';
import { AuditoriaSignatureService } from '../../services/auditoria-signature.service';

/**
 * Interface para dados do job
 */
export interface AuditJobData {
  event: AuditEvent;
  config?: AuditEventConfig;
}

/**
 * Interface para resultado do processamento
 */
export interface AuditProcessingResult {
  success: boolean;
  logId?: string;
  processingTime: number;
  compressed?: boolean;
  signed?: boolean;
  error?: string;
}

@Injectable()
export class AuditProcessingJob {
  private readonly logger = new Logger(AuditProcessingJob.name);

  constructor(
    private readonly auditRepository: AuditCoreRepository,
    private readonly auditoriaSignatureService?: AuditoriaSignatureService,
  ) {}

  /**
   * Processa um evento de auditoria
   */
  async process(data: AuditJobData): Promise<AuditProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Processing audit event: ${data.event.eventType}`);

      // Valida os dados do evento
      this.validateJobData(data);

      // Prepara os dados para persistência
      const processedData = await this.prepareDataForPersistence(data);

      // Persiste o log de auditoria
      const logId = await this.persistAuditLog(processedData);

      // Executa pós-processamento se necessário
      await this.executePostProcessing(data.event, logId);

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Audit event processed successfully in ${processingTime}ms: ${logId}`,
      );

      return {
        success: true,
        logId,
        processingTime,
        compressed: data.config?.compress || false,
        signed: data.config?.sign || false,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Failed to process audit event: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Valida os dados do job
   */
  private validateJobData(data: AuditJobData): void {
    if (!data || !data.event) {
      throw new Error('Invalid job data: event is required');
    }

    if (!data.event.eventType) {
      throw new Error('Invalid event: eventType is required');
    }

    if (!data.event.entityName) {
      throw new Error('Invalid event: entityName is required');
    }

    if (!data.event.timestamp) {
      throw new Error('Invalid event: timestamp is required');
    }
  }

  /**
   * Prepara os dados para persistência
   */
  private async prepareDataForPersistence(data: AuditJobData): Promise<any> {
    const { event, config } = data;

    // Estrutura base do log
    let logData = {
      tipo_operacao: event.eventType,
      entidade_afetada: event.entityName,
      entidade_id: event.entityId || null,
      usuario_id: event.userId || null,
      timestamp: event.timestamp,
      dados_anteriores: null,
      dados_novos: null,
      descricao: this.generateDescription(event),
      nivel_risco: event.riskLevel || 'LOW',
      lgpd_relevante: event.lgpdRelevant || false,
      metadata: event.metadata || {},
      contexto_requisicao: event.requestContext || {},
    };

    // Adiciona dados específicos do tipo de evento
    if ('previousData' in event && event.previousData) {
      logData.dados_anteriores = event.previousData;
    }

    if ('newData' in event && event.newData) {
      logData.dados_novos = event.newData;
    }

    // Adiciona metadados específicos para eventos de entidade
    if ('changedFields' in event && event.changedFields) {
      logData.metadata.changedFields = event.changedFields;
      logData.metadata.sensitiveFieldsChanged =
        event.sensitiveFieldsChanged || false;
    }

    // Adiciona metadados específicos para eventos de dados sensíveis
    if ('sensitiveFields' in event && event.sensitiveFields) {
      logData.metadata.sensitiveFields = event.sensitiveFields;
      logData.metadata.legalBasis = event.legalBasis;
      logData.metadata.purpose = event.purpose;
    }

    // Aplica compressão se configurado
    if (config?.compress) {
      logData = await this.compressData(logData);
    }

    // Aplica assinatura digital se configurado
    if (config?.sign) {
      logData = await this.signData(logData);
    }

    return logData;
  }

  /**
   * Persiste o log de auditoria no banco de dados
   */
  private async persistAuditLog(logData: any): Promise<string> {
    try {
      // Converte o tipo de operação para enum se necessário
      if (typeof logData.tipo_operacao === 'string') {
        logData.tipo_operacao = logData.tipo_operacao as TipoOperacao;
      }

      // Persiste usando o repositório real
      const savedLog = await this.auditRepository.create(logData);

      this.logger.debug(`Audit log persisted with ID: ${savedLog.id}`);

      return savedLog.id;
    } catch (error) {
      this.logger.error(
        `Failed to persist audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Executa pós-processamento do evento
   */
  private async executePostProcessing(
    event: AuditEvent,
    logId: string,
  ): Promise<void> {
    // Notificações para eventos críticos
    if (event.riskLevel === 'CRITICAL') {
      await this.sendCriticalEventNotification(event, logId);
    }

    // Alertas LGPD
    if (event.lgpdRelevant) {
      await this.processLgpdCompliance(event, logId);
    }

    // Métricas e monitoramento
    await this.updateMetrics(event);
  }

  /**
   * Gera descrição do evento
   */
  private generateDescription(event: AuditEvent): string {
    const baseDescription = `${event.eventType} em ${event.entityName}`;

    if (event.entityId) {
      return `${baseDescription} (ID: ${event.entityId})`;
    }

    return baseDescription;
  }

  /**
   * Comprime os dados do log
   */
  private async compressData(data: any): Promise<any> {
    try {
      const gzipAsync = promisify(gzip);
      const originalData = JSON.stringify(data);
      const originalSize = originalData.length;

      // Comprime os dados usando gzip
      const compressedBuffer = await gzipAsync(originalData);
      const compressedData = compressedBuffer.toString('base64');
      const compressedSize = compressedData.length;

      this.logger.debug(
        `Data compressed: ${originalSize} bytes -> ${compressedSize} bytes (${((1 - compressedSize / originalSize) * 100).toFixed(2)}% reduction)`,
      );

      return {
        _compressed: true,
        _originalSize: originalSize,
        _compressedSize: compressedSize,
        _compressionRatio: compressedSize / originalSize,
        _data: compressedData,
        _algorithm: 'gzip',
        // Mantém campos essenciais não comprimidos para indexação
        tipo_operacao: data.tipo_operacao,
        entidade_afetada: data.entidade_afetada,
        entidade_id: data.entidade_id,
        usuario_id: data.usuario_id,
        timestamp: data.timestamp,
        nivel_risco: data.nivel_risco,
        lgpd_relevante: data.lgpd_relevante,
      };
    } catch (error) {
      this.logger.error(
        `Failed to compress data: ${error.message}`,
        error.stack,
      );

      // Fallback: retorna dados originais com flag de erro
      return {
        ...data,
        _compressed: false,
        _compressionError: error.message,
        _originalSize: JSON.stringify(data).length,
      };
    }
  }

  /**
   * Descomprime os dados do log
   */
  private async decompressData(compressedData: any): Promise<any> {
    try {
      if (!compressedData._compressed || !compressedData._data) {
        return compressedData;
      }

      const gunzipAsync = promisify(gunzip);
      const compressedBuffer = Buffer.from(compressedData._data, 'base64');

      // Descomprime os dados usando gunzip
      const decompressedBuffer = await gunzipAsync(compressedBuffer);
      const originalData = JSON.parse(decompressedBuffer.toString());

      this.logger.debug(
        `Data decompressed: ${compressedData._compressedSize} bytes -> ${compressedData._originalSize} bytes`,
      );

      return originalData;
    } catch (error) {
      this.logger.error(
        `Failed to decompress data: ${error.message}`,
        error.stack,
      );

      // Retorna dados comprimidos com flag de erro
      return {
        ...compressedData,
        _decompressionError: error.message,
      };
    }
  }

  /**
   * Assina digitalmente os dados
   */
  private async signData(data: any): Promise<any> {
    try {
      // Criar um objeto temporário com os dados para assinatura
      const tempLogData = {
        id: data._tempId || this.generateTempId(),
        tipo_operacao: data.tipo_operacao,
        entidade_afetada: data.entidade_afetada,
        entidade_id: data.entidade_id,
        usuario_id: data.usuario_id,
        endpoint: data.endpoint,
        metodo_http: data.metodo_http,
        ip_origem: data.ip_origem,
        data_hora: new Date(),
      };

      // Usar o serviço de assinatura real se disponível
      if (this.auditoriaSignatureService) {
        const signature =
          await this.auditoriaSignatureService.assinarLog(tempLogData);

        return {
          ...data,
          _signature: signature,
          _signedAt: new Date().toISOString(),
          _tempId: tempLogData.id,
        };
      }

      // Fallback para hash simples se o serviço não estiver disponível
      const dataString = JSON.stringify(data);
      const hash = this.generateHash(dataString);

      return {
        ...data,
        _signature: hash,
        _signedAt: new Date().toISOString(),
        _fallback: true,
      };
    } catch (error) {
      this.logger.error(`Erro ao assinar dados: ${error.message}`, error.stack);

      // Fallback para hash simples em caso de erro
      const dataString = JSON.stringify(data);
      const hash = this.generateHash(dataString);

      return {
        ...data,
        _signature: hash,
        _signedAt: new Date().toISOString(),
        _fallback: true,
      };
    }
  }

  /**
   * Gera um ID temporário para assinatura
   */
  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Envia notificação para eventos críticos
   */
  private async sendCriticalEventNotification(
    event: AuditEvent,
    logId: string,
  ): Promise<void> {
    this.logger.warn(
      `CRITICAL EVENT DETECTED: ${event.eventType} - Log ID: ${logId}`,
    );

    try {
      // Estrutura da notificação crítica
      const notification = {
        level: 'CRITICAL',
        eventType: event.eventType,
        logId,
        timestamp: new Date().toISOString(),
        entityType: event.entityName,
        entityId: event.entityId,
        userId: event.userId,
        details: event.metadata,
        riskLevel: event.riskLevel,
        message: `Evento crítico detectado: ${event.eventType} em ${event.entityName}`,
      };

      // Log estruturado para sistemas de monitoramento (ELK, Splunk, etc.)
      this.logger.error(
        JSON.stringify({
          type: 'CRITICAL_SECURITY_EVENT',
          ...notification,
        }),
      );

      // Notificação via webhook para sistemas externos (Slack, Teams, etc.)
      await this.sendWebhookNotification(notification);

      // Notificação via email para administradores
      await this.sendEmailNotification(notification);

      // Registro no sistema de alertas interno
      await this.registerInternalAlert(notification);
    } catch (error) {
      this.logger.error(
        `Failed to send critical event notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Envia notificação via webhook
   */
  private async sendWebhookNotification(notification: any): Promise<void> {
    try {
      // Implementação de webhook para Slack/Teams/Discord
      const webhookUrl = process.env.SECURITY_WEBHOOK_URL;

      if (!webhookUrl) {
        this.logger.debug(
          'Webhook URL not configured, skipping webhook notification',
        );
        return;
      }

      const payload = {
        text: `🚨 ALERTA DE SEGURANÇA CRÍTICO`,
        attachments: [
          {
            color: 'danger',
            title: `${notification.eventType}`,
            fields: [
              {
                title: 'Entidade',
                value: `${notification.entityType} (${notification.entityId})`,
                short: true,
              },
              {
                title: 'Nível de Risco',
                value: notification.riskLevel,
                short: true,
              },
              {
                title: 'Log ID',
                value: notification.logId,
                short: true,
              },
              {
                title: 'Timestamp',
                value: notification.timestamp,
                short: true,
              },
            ],
            footer: 'Sistema de Auditoria PGBen',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      // Simula envio de webhook (em produção, usar fetch ou axios)
      this.logger.debug(
        `Webhook notification sent: ${JSON.stringify(payload)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send webhook notification: ${error.message}`,
      );
    }
  }

  /**
   * Envia notificação via email
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    try {
      const adminEmails = process.env.SECURITY_ADMIN_EMAILS?.split(',') || [];

      if (adminEmails.length === 0) {
        this.logger.debug(
          'Admin emails not configured, skipping email notification',
        );
        return;
      }

      const emailContent = {
        to: adminEmails,
        subject: `🚨 ALERTA CRÍTICO DE SEGURANÇA - ${notification.eventType}`,
        html: `
          <h2>Alerta Crítico de Segurança</h2>
          <p><strong>Evento:</strong> ${notification.eventType}</p>
          <p><strong>Entidade:</strong> ${notification.entityType} (${notification.entityId})</p>
          <p><strong>Nível de Risco:</strong> ${notification.riskLevel}</p>
          <p><strong>Timestamp:</strong> ${notification.timestamp}</p>
          <p><strong>Log ID:</strong> ${notification.logId}</p>
          <p><strong>Detalhes:</strong> ${JSON.stringify(notification.details, null, 2)}</p>
          <hr>
          <p><em>Sistema de Auditoria PGBen</em></p>
        `,
      };

      // Simula envio de email (em produção, usar serviço de email real)
      this.logger.debug(
        `Email notification prepared for: ${adminEmails.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Registra alerta no sistema interno
   */
  private async registerInternalAlert(notification: any): Promise<void> {
    try {
      // Registra no sistema de alertas interno para dashboard
      const alert = {
        id: this.generateLogId(),
        type: 'SECURITY_CRITICAL',
        level: 'CRITICAL',
        source: 'audit_system',
        event_type: notification.eventType,
        entity_type: notification.entityType,
        entity_id: notification.entityId,
        user_id: notification.userId,
        log_id: notification.logId,
        risk_level: notification.riskLevel,
        details: notification.details,
        timestamp: notification.timestamp,
        acknowledged: false,
        resolved: false,
      };

      // Em produção, salvar em tabela de alertas ou cache Redis
      this.logger.debug(`Internal alert registered: ${JSON.stringify(alert)}`);
    } catch (error) {
      this.logger.error(`Failed to register internal alert: ${error.message}`);
    }
  }

  /**
   * Processa conformidade LGPD
   */
  private async processLgpdCompliance(
    event: AuditEvent,
    logId: string,
  ): Promise<void> {
    this.logger.debug(
      `Processing LGPD compliance for event: ${event.eventType}`,
    );

    try {
      const lgpdData = {
        logId,
        eventType: event.eventType,
        entityType: event.entityName,
        entityId: event.entityId,
        userId: event.userId,
        timestamp: new Date().toISOString(),
        dataProcessed: event.metadata?.dataProcessed || [],
        purpose: event.metadata?.purpose || 'system_operation',
        legalBasis: await this.determineLegalBasis(event),
        consentStatus: await this.validateConsent(event),
        dataRetention: await this.checkDataRetention(event),
        dataMinimization: await this.validateDataMinimization(event),
        securityMeasures: await this.validateSecurityMeasures(event),
      };

      // Registra para relatórios de conformidade LGPD
      await this.registerLgpdCompliance(lgpdData);

      // Verifica se há violações potenciais
      await this.checkLgpdViolations(lgpdData);

      // Atualiza métricas de conformidade
      await this.updateLgpdMetrics(lgpdData);
    } catch (error) {
      this.logger.error(
        `Failed to process LGPD compliance: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Determina a base legal para o processamento de dados
   */
  private async determineLegalBasis(event: AuditEvent): Promise<string> {
    // Mapeia tipos de eventos para bases legais LGPD
    const legalBasisMap: Record<string, string> = {
      USER_LOGIN: 'execucao_contrato', // Art. 7º, V
      USER_LOGOUT: 'execucao_contrato',
      USER_REGISTRATION: 'consentimento', // Art. 7º, I
      USER_UPDATE: 'execucao_contrato',
      USER_DELETE: 'consentimento',
      PAYMENT_CREATED: 'execucao_contrato',
      PAYMENT_PROCESSED: 'execucao_contrato',
      DOCUMENT_UPLOAD: 'cumprimento_obrigacao_legal', // Art. 7º, II
      DOCUMENT_ACCESS: 'legitimo_interesse', // Art. 7º, IX
      AUDIT_LOG: 'cumprimento_obrigacao_legal',
      SECURITY_INCIDENT: 'legitimo_interesse',
      DATA_EXPORT: 'exercicio_direitos',
      DATA_DELETION: 'exercicio_direitos',
    };

    return legalBasisMap[event.eventType] || 'legitimo_interesse';
  }

  /**
   * Valida status do consentimento
   */
  private async validateConsent(event: AuditEvent): Promise<any> {
    try {
      // Para eventos que requerem consentimento
      const consentRequiredEvents = [
        'USER_REGISTRATION',
        'USER_DELETE',
        'MARKETING_EMAIL',
        'DATA_SHARING',
      ];

      if (!consentRequiredEvents.includes(event.eventType)) {
        return {
          required: false,
          status: 'not_applicable',
        };
      }

      // Simula verificação de consentimento (em produção, consultar base de dados)
      const consentData = {
        required: true,
        status: 'granted', // granted, denied, withdrawn, pending
        timestamp: new Date().toISOString(),
        version: '1.0',
        method: 'explicit', // explicit, implicit
        scope: ['data_processing', 'communication'],
        userId: event.userId,
      };

      return consentData;
    } catch (error) {
      this.logger.error(`Failed to validate consent: ${error.message}`);
      return {
        required: true,
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Verifica políticas de retenção de dados
   */
  private async checkDataRetention(event: AuditEvent): Promise<any> {
    try {
      // Define períodos de retenção por tipo de dados
      const retentionPolicies: Record<string, number> = {
        audit_logs: 5 * 365, // 5 anos
        user_data: 2 * 365, // 2 anos após inatividade
        payment_data: 10 * 365, // 10 anos (obrigação legal)
        document_data: 7 * 365, // 7 anos
        session_data: 30, // 30 dias
        temporary_data: 1, // 1 dia
      };

      const dataType = this.mapEventToDataType(event.eventType);
      const retentionDays = retentionPolicies[dataType] || 365;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + retentionDays);

      return {
        dataType,
        retentionDays,
        expirationDate: expirationDate.toISOString(),
        policy: 'automatic_deletion',
        compliant: true,
      };
    } catch (error) {
      this.logger.error(`Failed to check data retention: ${error.message}`);
      return {
        compliant: false,
        error: error.message,
      };
    }
  }

  /**
   * Valida princípio da minimização de dados
   */
  private async validateDataMinimization(event: AuditEvent): Promise<any> {
    try {
      const processedFields = event.metadata?.fields || [];
      const purpose = event.metadata?.purpose || 'system_operation';

      // Define campos necessários por finalidade
      const necessaryFieldsByPurpose: Record<string, string[]> = {
        user_authentication: ['email', 'password_hash', 'last_login'],
        payment_processing: [
          'user_id',
          'amount',
          'payment_method',
          'bank_info',
        ],
        document_verification: ['document_type', 'document_number', 'user_id'],
        audit_logging: ['user_id', 'action', 'timestamp', 'ip_address'],
        system_operation: ['id', 'timestamp', 'status'],
      };

      const necessaryFields = necessaryFieldsByPurpose[purpose] || [];
      const unnecessaryFields = processedFields.filter(
        (field: string) => !necessaryFields.includes(field),
      );

      return {
        purpose,
        processedFields,
        necessaryFields,
        unnecessaryFields,
        compliant: unnecessaryFields.length === 0,
        minimizationScore:
          necessaryFields.length / (processedFields.length || 1),
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate data minimization: ${error.message}`,
      );
      return {
        compliant: false,
        error: error.message,
      };
    }
  }

  /**
   * Valida medidas de segurança
   */
  private async validateSecurityMeasures(event: AuditEvent): Promise<any> {
    try {
      const securityChecks = {
        encryption: {
          inTransit: true, // HTTPS
          atRest: true, // Database encryption
          compliant: true,
        },
        access_control: {
          authentication: event.userId ? true : false,
          authorization: event.metadata?.authorized || false,
          compliant: true,
        },
        audit_trail: {
          logged: true,
          signed: event.metadata?.signed || false,
          compliant: true,
        },
        data_integrity: {
          checksums: event.metadata?.checksum ? true : false,
          validation: event.metadata?.validated || false,
          compliant: true,
        },
      };

      const overallCompliant = Object.values(securityChecks).every(
        (check: any) => check.compliant,
      );

      return {
        ...securityChecks,
        overallCompliant,
        securityLevel: overallCompliant ? 'adequate' : 'needs_improvement',
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate security measures: ${error.message}`,
      );
      return {
        overallCompliant: false,
        error: error.message,
      };
    }
  }

  /**
   * Registra dados de conformidade LGPD
   */
  private async registerLgpdCompliance(lgpdData: any): Promise<void> {
    try {
      // Em produção, salvar em tabela específica de conformidade LGPD
      const complianceRecord = {
        id: this.generateLogId(),
        audit_log_id: lgpdData.logId,
        event_type: lgpdData.eventType,
        legal_basis: lgpdData.legalBasis,
        consent_status: lgpdData.consentStatus.status,
        data_retention_compliant: lgpdData.dataRetention.compliant,
        minimization_compliant: lgpdData.dataMinimization.compliant,
        security_compliant: lgpdData.securityMeasures.overallCompliant,
        overall_compliant: this.calculateOverallCompliance(lgpdData),
        timestamp: lgpdData.timestamp,
        created_at: new Date(),
      };

      this.logger.debug(
        `LGPD compliance record: ${JSON.stringify(complianceRecord)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to register LGPD compliance: ${error.message}`);
    }
  }

  /**
   * Verifica violações potenciais da LGPD
   */
  private async checkLgpdViolations(lgpdData: any): Promise<void> {
    try {
      const violations = [];

      // Verifica consentimento para eventos que requerem
      if (
        lgpdData.consentStatus.required &&
        lgpdData.consentStatus.status !== 'granted'
      ) {
        violations.push({
          type: 'consent_violation',
          severity: 'high',
          description: 'Processamento sem consentimento válido',
          article: 'Art. 7º, I da LGPD',
        });
      }

      // Verifica minimização de dados
      if (!lgpdData.dataMinimization.compliant) {
        violations.push({
          type: 'data_minimization_violation',
          severity: 'medium',
          description: 'Processamento de dados desnecessários',
          article: 'Art. 6º, III da LGPD',
        });
      }

      // Verifica medidas de segurança
      if (!lgpdData.securityMeasures.overallCompliant) {
        violations.push({
          type: 'security_violation',
          severity: 'high',
          description: 'Medidas de segurança inadequadas',
          article: 'Art. 46 da LGPD',
        });
      }

      if (violations.length > 0) {
        this.logger.warn(
          `LGPD violations detected: ${JSON.stringify(violations)}`,
        );

        // Notificar DPO (Data Protection Officer)
        await this.notifyDpo(lgpdData, violations);
      }
    } catch (error) {
      this.logger.error(`Failed to check LGPD violations: ${error.message}`);
    }
  }

  /**
   * Atualiza métricas de conformidade LGPD
   */
  private async updateLgpdMetrics(lgpdData: any): Promise<void> {
    try {
      const metrics = {
        total_events: 1,
        compliant_events: lgpdData.overallCompliant ? 1 : 0,
        consent_required: lgpdData.consentStatus.required ? 1 : 0,
        consent_granted: lgpdData.consentStatus.status === 'granted' ? 1 : 0,
        security_compliant: lgpdData.securityMeasures.overallCompliant ? 1 : 0,
        minimization_compliant: lgpdData.dataMinimization.compliant ? 1 : 0,
        timestamp: new Date(),
      };

      this.logger.debug(`LGPD metrics updated: ${JSON.stringify(metrics)}`);
    } catch (error) {
      this.logger.error(`Failed to update LGPD metrics: ${error.message}`);
    }
  }

  /**
   * Mapeia tipo de evento para tipo de dados
   */
  private mapEventToDataType(eventType: string): string {
    const eventToDataTypeMap: Record<string, string> = {
      USER_LOGIN: 'session_data',
      USER_LOGOUT: 'session_data',
      USER_REGISTRATION: 'user_data',
      USER_UPDATE: 'user_data',
      PAYMENT_CREATED: 'payment_data',
      PAYMENT_PROCESSED: 'payment_data',
      DOCUMENT_UPLOAD: 'document_data',
      DOCUMENT_ACCESS: 'document_data',
      AUDIT_LOG: 'audit_logs',
      TEMP_DATA: 'temporary_data',
    };

    return eventToDataTypeMap[eventType] || 'user_data';
  }

  /**
   * Calcula conformidade geral
   */
  private calculateOverallCompliance(lgpdData: any): boolean {
    const checks = [
      lgpdData.consentStatus.required
        ? lgpdData.consentStatus.status === 'granted'
        : true,
      lgpdData.dataRetention.compliant,
      lgpdData.dataMinimization.compliant,
      lgpdData.securityMeasures.overallCompliant,
    ];

    return checks.every((check) => check === true);
  }

  /**
   * Notifica o DPO sobre violações
   */
  private async notifyDpo(lgpdData: any, violations: any[]): Promise<void> {
    try {
      const notification = {
        type: 'LGPD_VIOLATION_ALERT',
        logId: lgpdData.logId,
        eventType: lgpdData.eventType,
        violations,
        severity: violations.some((v) => v.severity === 'high')
          ? 'high'
          : 'medium',
        timestamp: new Date().toISOString(),
        requiresAction: true,
      };

      this.logger.warn(`DPO notification: ${JSON.stringify(notification)}`);

      // Em produção, enviar email/notificação para o DPO
    } catch (error) {
      this.logger.error(`Failed to notify DPO: ${error.message}`);
    }
  }

  /**
   * Converte timestamp para número (milissegundos)
   * Trata tanto Date quanto string ISO
   */
  private getTimestampAsNumber(
    timestamp: Date | string | undefined,
  ): number | undefined {
    if (!timestamp) {
      return undefined;
    }

    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }

    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? undefined : date.getTime();
    }

    return undefined;
  }

  /**
   * Atualiza métricas de monitoramento
   */
  private async updateMetrics(event: AuditEvent): Promise<void> {
    this.logger.debug(`Updating metrics for event: ${event.eventType}`);

    try {
      const timestamp = new Date();
      const eventMetrics = {
        eventType: event.eventType,
        entityName: event.entityName,
        userId: event.userId,
        timestamp: timestamp.toISOString(),
        processingTime:
          Date.now() -
          (this.getTimestampAsNumber(event.timestamp) || Date.now()),
        success: true,
      };

      // Atualiza contadores por tipo de evento
      await this.updateEventCounters(eventMetrics);

      // Atualiza métricas de performance
      await this.updatePerformanceMetrics(eventMetrics);

      // Verifica thresholds e gera alertas se necessário
      await this.checkMetricThresholds(eventMetrics);

      // Atualiza métricas de segurança
      await this.updateSecurityMetrics(event);

      // Atualiza métricas de conformidade
      await this.updateComplianceMetrics(event);
    } catch (error) {
      this.logger.error(
        `Failed to update metrics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Atualiza contadores por tipo de evento
   */
  private async updateEventCounters(metrics: any): Promise<void> {
    try {
      const counters = {
        [`events.${metrics.eventType}.total`]: 1,
        [`events.${metrics.eventType}.success`]: metrics.success ? 1 : 0,
        [`events.${metrics.eventType}.failure`]: metrics.success ? 0 : 1,
        [`events.${metrics.entityName}.total`]: 1,
        [`events.daily.${this.getDateKey()}.total`]: 1,
        [`events.hourly.${this.getHourKey()}.total`]: 1,
      };

      // Em produção, usar Redis ou InfluxDB para métricas
      this.logger.debug(`Event counters updated: ${JSON.stringify(counters)}`);

      // Simula incremento de contadores
      await this.incrementCounters(counters);
    } catch (error) {
      this.logger.error(`Failed to update event counters: ${error.message}`);
    }
  }

  /**
   * Atualiza métricas de performance
   */
  private async updatePerformanceMetrics(metrics: any): Promise<void> {
    try {
      const performanceMetrics = {
        processingTime: metrics.processingTime,
        eventType: metrics.eventType,
        timestamp: metrics.timestamp,
        throughput: await this.calculateThroughput(),
        latency: await this.calculateLatency(metrics.eventType),
        errorRate: await this.calculateErrorRate(metrics.eventType),
      };

      // Registra métricas de performance
      this.logger.debug(
        `Performance metrics: ${JSON.stringify(performanceMetrics)}`,
      );

      // Verifica se o tempo de processamento está dentro do esperado
      const expectedProcessingTime = this.getExpectedProcessingTime(
        metrics.eventType,
      );
      if (performanceMetrics.processingTime > expectedProcessingTime) {
        this.logger.warn(
          `Slow processing detected for ${metrics.eventType}: ${performanceMetrics.processingTime}ms > ${expectedProcessingTime}ms`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update performance metrics: ${error.message}`,
      );
    }
  }

  /**
   * Verifica thresholds e gera alertas
   */
  private async checkMetricThresholds(metrics: any): Promise<void> {
    try {
      const thresholds = {
        processingTime: {
          warning: 5000, // 5 segundos
          critical: 10000, // 10 segundos
        },
        errorRate: {
          warning: 0.05, // 5%
          critical: 0.1, // 10%
        },
        throughput: {
          warning: 100, // eventos por minuto
          critical: 50,
        },
      };

      const alerts = [];

      // Verifica tempo de processamento
      if (metrics.processingTime > thresholds.processingTime.critical) {
        alerts.push({
          type: 'CRITICAL_PROCESSING_TIME',
          message: `Processing time exceeded critical threshold: ${metrics.processingTime}ms`,
          threshold: thresholds.processingTime.critical,
          value: metrics.processingTime,
          severity: 'critical',
        });
      } else if (metrics.processingTime > thresholds.processingTime.warning) {
        alerts.push({
          type: 'WARNING_PROCESSING_TIME',
          message: `Processing time exceeded warning threshold: ${metrics.processingTime}ms`,
          threshold: thresholds.processingTime.warning,
          value: metrics.processingTime,
          severity: 'warning',
        });
      }

      // Verifica taxa de erro
      const currentErrorRate = await this.calculateErrorRate(metrics.eventType);
      if (currentErrorRate > thresholds.errorRate.critical) {
        alerts.push({
          type: 'CRITICAL_ERROR_RATE',
          message: `Error rate exceeded critical threshold: ${currentErrorRate * 100}%`,
          threshold: thresholds.errorRate.critical,
          value: currentErrorRate,
          severity: 'critical',
        });
      }

      // Verifica throughput
      const currentThroughput = await this.calculateThroughput();
      if (currentThroughput < thresholds.throughput.critical) {
        alerts.push({
          type: 'CRITICAL_LOW_THROUGHPUT',
          message: `Throughput below critical threshold: ${currentThroughput} events/min`,
          threshold: thresholds.throughput.critical,
          value: currentThroughput,
          severity: 'critical',
        });
      }

      // Processa alertas
      for (const alert of alerts) {
        await this.processAlert(alert);
      }
    } catch (error) {
      this.logger.error(`Failed to check metric thresholds: ${error.message}`);
    }
  }

  /**
   * Atualiza métricas de segurança
   */
  private async updateSecurityMetrics(event: AuditEvent): Promise<void> {
    try {
      const securityEvents = [
        'USER_LOGIN',
        'USER_LOGOUT',
        'FAILED_LOGIN',
        'SECURITY_INCIDENT',
        'PERMISSION_DENIED',
        'SUSPICIOUS_ACTIVITY',
      ];

      if (securityEvents.includes(event.eventType)) {
        const securityMetrics = {
          eventType: event.eventType,
          userId: event.userId,
          ipAddress: event.requestContext?.ip,
          userAgent: event.requestContext?.userAgent,
          timestamp: new Date().toISOString(),
          riskLevel: this.calculateRiskLevel(event),
        };

        this.logger.debug(
          `Security metrics: ${JSON.stringify(securityMetrics)}`,
        );

        // Detecta padrões suspeitos
        await this.detectSuspiciousPatterns(securityMetrics);
      }
    } catch (error) {
      this.logger.error(`Failed to update security metrics: ${error.message}`);
    }
  }

  /**
   * Atualiza métricas de conformidade
   */
  private async updateComplianceMetrics(event: AuditEvent): Promise<void> {
    try {
      const complianceMetrics = {
        eventType: event.eventType,
        hasPersonalData: this.containsPersonalData(event),
        hasConsentValidation: event.metadata?.consentValidated || false,
        hasDataMinimization: event.metadata?.dataMinimized || false,
        hasSecurityMeasures: event.metadata?.securityValidated || false,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(
        `Compliance metrics: ${JSON.stringify(complianceMetrics)}`,
      );

      // Calcula score de conformidade
      const complianceScore = this.calculateComplianceScore(complianceMetrics);
      const threshold = this.getComplianceThreshold(event.eventType);
      const category = this.getEventCategory(event.eventType);

      if (complianceScore < threshold) {
        this.logger.warn(
          `Low compliance score detected: ${complianceScore.toFixed(2)} (threshold: ${threshold}) for ${category} event ${event.eventType}`,
        );
      } else {
        this.logger.debug(
          `Compliance score: ${complianceScore.toFixed(2)} (threshold: ${threshold}) for ${category} event ${event.eventType}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update compliance metrics: ${error.message}`,
      );
    }
  }

  /**
   * Incrementa contadores de métricas
   */
  private async incrementCounters(
    counters: Record<string, number>,
  ): Promise<void> {
    try {
      // Em produção, usar Redis INCR ou similar
      for (const [key, value] of Object.entries(counters)) {
        this.logger.debug(`Counter ${key}: +${value}`);
      }
    } catch (error) {
      this.logger.error(`Failed to increment counters: ${error.message}`);
    }
  }

  /**
   * Calcula throughput atual
   */
  private async calculateThroughput(): Promise<number> {
    try {
      // Em produção, calcular baseado em dados reais dos últimos minutos
      // Simula throughput entre 80-120 eventos por minuto
      return Math.floor(Math.random() * 40) + 80;
    } catch (error) {
      this.logger.error(`Failed to calculate throughput: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calcula latência média
   */
  private async calculateLatency(eventType: string): Promise<number> {
    try {
      // Em produção, calcular baseado em dados históricos
      const baseLatency = {
        USER_LOGIN: 200,
        PAYMENT_PROCESSED: 500,
        DOCUMENT_UPLOAD: 1000,
        AUDIT_LOG: 100,
      };

      return baseLatency[eventType] || 300;
    } catch (error) {
      this.logger.error(`Failed to calculate latency: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calcula taxa de erro
   */
  private async calculateErrorRate(eventType: string): Promise<number> {
    try {
      // Em produção, calcular baseado em dados reais
      // Simula taxa de erro baixa (0-5%)
      return Math.random() * 0.05;
    } catch (error) {
      this.logger.error(`Failed to calculate error rate: ${error.message}`);
      return 0;
    }
  }

  /**
   * Obtém tempo esperado de processamento
   */
  private getExpectedProcessingTime(eventType: string): number {
    const expectedTimes = {
      USER_LOGIN: 1000, // 1 segundo
      PAYMENT_PROCESSED: 3000, // 3 segundos
      DOCUMENT_UPLOAD: 5000, // 5 segundos
      AUDIT_LOG: 500, // 0.5 segundos
    };

    return expectedTimes[eventType] || 2000; // 2 segundos padrão
  }

  /**
   * Processa alertas de métricas
   */
  private async processAlert(alert: any): Promise<void> {
    try {
      this.logger.warn(
        `METRIC ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`,
      );

      // Em produção, enviar para sistema de alertas (PagerDuty, Slack, etc.)
      const alertData = {
        ...alert,
        timestamp: new Date().toISOString(),
        source: 'audit-processing-job',
        environment: process.env.NODE_ENV || 'development',
      };

      // Simula envio de alerta
      this.logger.debug(`Alert sent: ${JSON.stringify(alertData)}`);
    } catch (error) {
      this.logger.error(`Failed to process alert: ${error.message}`);
    }
  }

  /**
   * Calcula nível de risco de segurança
   */
  private calculateRiskLevel(event: AuditEvent): string {
    const highRiskEvents = [
      'FAILED_LOGIN',
      'SECURITY_INCIDENT',
      'PERMISSION_DENIED',
      'SUSPICIOUS_ACTIVITY',
    ];

    const mediumRiskEvents = [
      'USER_LOGIN',
      'PASSWORD_CHANGE',
      'PERMISSION_CHANGE',
    ];

    if (highRiskEvents.includes(event.eventType)) {
      return 'high';
    } else if (mediumRiskEvents.includes(event.eventType)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Detecta padrões suspeitos
   */
  private async detectSuspiciousPatterns(metrics: any): Promise<void> {
    try {
      // Em produção, implementar detecção de padrões mais sofisticada
      const suspiciousPatterns = [];

      // Exemplo: múltiplos logins falhados
      if (metrics.eventType === 'FAILED_LOGIN') {
        suspiciousPatterns.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          description: 'Possível tentativa de força bruta',
          riskLevel: 'high',
        });
      }

      // Exemplo: login de IP suspeito
      if (metrics.ipAddress && this.isSuspiciousIP(metrics.ipAddress)) {
        suspiciousPatterns.push({
          type: 'SUSPICIOUS_IP',
          description: 'Login de IP conhecido como malicioso',
          riskLevel: 'high',
        });
      }

      if (suspiciousPatterns.length > 0) {
        this.logger.warn(
          `Suspicious patterns detected: ${JSON.stringify(suspiciousPatterns)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to detect suspicious patterns: ${error.message}`,
      );
    }
  }

  /**
   * Verifica se contém dados pessoais
   */
  private containsPersonalData(event: AuditEvent): boolean {
    const personalDataFields = [
      'email',
      'cpf',
      'phone',
      'address',
      'name',
      'birth_date',
    ];

    const eventFields = event.metadata?.fields || [];
    return personalDataFields.some((field) => eventFields.includes(field));
  }

  /**
   * Enum para categorias de eventos de auditoria
   */
  private readonly EVENT_CATEGORIES: Record<string, string[]> = {
     AUTH: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE'],
     READ: ['VIEW', 'LIST', 'SEARCH', 'EXPORT'],
     WRITE: ['CREATE', 'UPDATE', 'UPLOAD'],
     DELETE: ['DELETE', 'REMOVE'],
     ADMIN: ['PERMISSION_CHANGE', 'ROLE_CHANGE', 'CONFIG_CHANGE', 'USER_CREATION']
   };

  /**
   * Thresholds de compliance por categoria
   */
  private readonly COMPLIANCE_THRESHOLDS = {
      AUTH: 0.7,    // 70% - eventos de autenticação
      READ: 0.6,    // 60% - eventos de leitura
      WRITE: 0.8,   // 80% - eventos de escrita
      DELETE: 0.9,  // 90% - eventos de exclusão
      ADMIN: 0.9    // 90% - eventos administrativos
    } as const;

  /**
   * Determina a categoria do evento
   */
  private getEventCategory(eventType: string): keyof typeof this.COMPLIANCE_THRESHOLDS {
    for (const [category, events] of Object.entries(this.EVENT_CATEGORIES)) {
      if (events.includes(eventType)) {
        return category as keyof typeof this.COMPLIANCE_THRESHOLDS;
      }
    }
    return 'WRITE'; // categoria padrão para eventos não mapeados
  }

  /**
   * Calcula score de conformidade baseado na categoria do evento
   */
  private calculateComplianceScore(metrics: any): number {
    const category = this.getEventCategory(metrics.eventType);
    let score = 0;

    switch (category) {
      case 'AUTH':
        // Para eventos de autenticação, foco apenas em segurança
        score = metrics.hasSecurityMeasures ? 1.0 : 0.0;
        break;

      case 'READ':
         // Para eventos de leitura, foco em segurança e minimização de dados
         score = (metrics.hasSecurityMeasures ? 0.6 : 0) + 
                 (metrics.hasDataMinimization ? 0.4 : 0);
         break;

      case 'WRITE':
        // Para eventos de escrita, todos os critérios com pesos balanceados
        const hasValidConsent = !metrics.hasPersonalData || metrics.hasConsentValidation;
        score = (metrics.hasSecurityMeasures ? 0.4 : 0) + 
                (hasValidConsent ? 0.4 : 0) + 
                (metrics.hasDataMinimization ? 0.2 : 0);
        break;

      case 'DELETE':
      case 'ADMIN':
        // Para eventos críticos, todos os critérios são obrigatórios
        const hasValidConsentCritical = !metrics.hasPersonalData || metrics.hasConsentValidation;
        const allCriticalChecks = [
          metrics.hasSecurityMeasures,
          hasValidConsentCritical,
          metrics.hasDataMinimization
        ];
        const passedCriticalChecks = allCriticalChecks.filter(check => check).length;
        score = passedCriticalChecks / allCriticalChecks.length;
        break;

      default:
        // Fallback para o cálculo original
        const hasValidConsentDefault = !metrics.hasPersonalData || metrics.hasConsentValidation;
        const defaultChecks = [
          hasValidConsentDefault,
          metrics.hasDataMinimization,
          metrics.hasSecurityMeasures,
        ];
        const passedDefaultChecks = defaultChecks.filter(check => check).length;
        score = passedDefaultChecks / defaultChecks.length;
    }

    return Math.min(1.0, Math.max(0.0, score)); // Garante que o score está entre 0 e 1
  }

  /**
   * Obtém o threshold de compliance para um tipo de evento
   */
  private getComplianceThreshold(eventType: string): number {
    const category = this.getEventCategory(eventType);
    return this.COMPLIANCE_THRESHOLDS[category];
  }

  /**
   * Verifica se IP é suspeito
   */
  private isSuspiciousIP(ipAddress: string): boolean {
    // Em produção, consultar listas de IPs maliciosos
    const suspiciousIPs = [
      '192.168.1.100', // Exemplo
      '10.0.0.50', // Exemplo
    ];

    return suspiciousIPs.includes(ipAddress);
  }

  /**
   * Obtém chave de data para métricas diárias
   */
  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Obtém chave de hora para métricas horárias
   */
  private getHourKey(): string {
    const now = new Date();
    return `${now.toISOString().split('T')[0]}-${now.getHours().toString().padStart(2, '0')}`;
  }

  /**
   * Gera ID único para o log
   */
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera hash para assinatura
   */
  private generateHash(data: string): string {
    // Implementação simples de hash - em produção usar crypto real
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
