/**
 * AuditUtils
 * 
 * Utilitários para o módulo de auditoria.
 * Funções auxiliares para processamento, validação e formatação.
 */

import { Request } from 'express';
import {
  BaseAuditEvent,
  AuditEventType,
  RiskLevel,
} from '../events/types/audit-event.types';

/**
 * Classe com métodos estáticos para utilitários de auditoria
 */
export class AuditUtils {
  /**
   * Extrai informações do usuário da requisição
   */
  static extractUserInfo(request: Request) {
    return {
      userId: request.user?.['id'] || request.user?.['userId'] || request.headers['x-user-id'] as string,
      userAgent: request.headers['user-agent'],
      ip: this.extractClientIp(request),
      sessionId: request.headers['x-session-id'] as string,
    };
  }

  /**
   * Extrai o IP do cliente considerando proxies
   */
  static extractClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] as string ||
      request.headers['x-client-ip'] as string ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitiza dados sensíveis de um objeto
   */
  static sanitizeSensitiveData(
    data: any,
    sensitiveFields: string[] = [],
    maskValue: string = '***MASKED***'
  ): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    const defaultSensitiveFields = [
      'password', 'senha', 'token', 'secret', 'key', 'cpf', 'rg', 'ssn',
      'credit_card', 'card_number', 'cvv', 'pin', 'otp', 'api_key'
    ];

    const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];

    const sanitizeRecursive = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeRecursive(item));
      }

      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (allSensitiveFields.some(field => 
            key.toLowerCase().includes(field.toLowerCase())
          )) {
            result[key] = maskValue;
          } else {
            result[key] = sanitizeRecursive(value);
          }
        }
        return result;
      }

      return obj;
    };

    return sanitizeRecursive(sanitized);
  }

  /**
   * Calcula o nível de risco baseado em vários fatores
   */
  static calculateRiskLevel(
    eventType: AuditEventType,
    operation?: string,
    sensitiveData?: boolean,
    userRole?: string,
    timeOfDay?: Date
  ): RiskLevel {
    let riskScore = 0;

    // Pontuação baseada no tipo de evento
    switch (eventType) {
      case AuditEventType.FAILED_LOGIN:
        riskScore += 30;
        break;
      case AuditEventType.SENSITIVE_DATA_ACCESSED:
        riskScore += 25;
        break;
      case AuditEventType.ENTITY_DELETED:
        riskScore += 20;
        break;
      case AuditEventType.ENTITY_UPDATED:
        riskScore += 15;
        break;
      case AuditEventType.ENTITY_CREATED:
        riskScore += 10;
        break;
      case AuditEventType.ENTITY_ACCESSED:
        riskScore += 5;
        break;
      default:
        riskScore += 5;
    }

    // Pontuação baseada na operação
    if (operation) {
      const highRiskOperations = ['delete', 'remove', 'destroy', 'purge'];
      const mediumRiskOperations = ['update', 'modify', 'change', 'edit'];
      
      if (highRiskOperations.some(op => operation.toLowerCase().includes(op))) {
        riskScore += 15;
      } else if (mediumRiskOperations.some(op => operation.toLowerCase().includes(op))) {
        riskScore += 10;
      }
    }

    // Pontuação para dados sensíveis
    if (sensitiveData) {
      riskScore += 20;
    }

    // Pontuação baseada no papel do usuário
    if (userRole) {
      const highPrivilegeRoles = ['admin', 'superuser', 'root', 'system'];
      if (highPrivilegeRoles.includes(userRole.toLowerCase())) {
        riskScore += 10;
      }
    }

    // Pontuação baseada no horário (fora do horário comercial)
    if (timeOfDay) {
      const hour = timeOfDay.getHours();
      if (hour < 6 || hour > 22) {
        riskScore += 10;
      }
    }

    // Converter pontuação em nível de risco
    if (riskScore >= 50) {
      return RiskLevel.CRITICAL;
    } else if (riskScore >= 35) {
      return RiskLevel.HIGH;
    } else if (riskScore >= 20) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  /**
   * Valida se um evento de auditoria está bem formado
   */
  static validateAuditEvent(event: BaseAuditEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validações obrigatórias
    if (!event.eventType) {
      errors.push('eventType é obrigatório');
    }

    if (!event.timestamp) {
      errors.push('timestamp é obrigatório');
    }

    if (!event.riskLevel) {
      errors.push('riskLevel é obrigatório');
    }

    // Validar timestamp
    if (event.timestamp && !(event.timestamp instanceof Date)) {
      errors.push('timestamp deve ser uma instância de Date');
    }

    // Validar se o timestamp não é futuro
    if (event.timestamp && event.timestamp > new Date()) {
      errors.push('timestamp não pode ser no futuro');
    }

    // Validar enum values
    if (event.eventType && !Object.values(AuditEventType).includes(event.eventType)) {
      errors.push('eventType inválido');
    }

    if (event.riskLevel && !Object.values(RiskLevel).includes(event.riskLevel)) {
      errors.push('riskLevel inválido');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Formata um evento de auditoria para log
   */
  static formatEventForLog(event: BaseAuditEvent): string {
    const timestamp = event.timestamp.toISOString();
    const user = event.userId || 'anonymous';
    const ip = event.requestContext?.ip || 'unknown';
    const type = event.eventType;
    const risk = event.riskLevel;

    return `[${timestamp}] ${type} | User: ${user} | IP: ${ip} | Risk: ${risk}`;
  }

  /**
   * Gera um hash para identificação única do evento
   */
  static generateEventHash(event: BaseAuditEvent): string {
    const data = {
      eventType: event.eventType,
      timestamp: event.timestamp.getTime(),
      userId: event.userId,
      ip: event.requestContext?.ip,
      metadata: event.metadata,
    };

    // Implementação simples de hash (em produção, usar crypto)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Verifica se um evento deve ser processado de forma assíncrona
   */
  static shouldProcessAsync(
    event: BaseAuditEvent,
    config?: { asyncThreshold?: RiskLevel; forceAsync?: boolean }
  ): boolean {
    if (config?.forceAsync) {
      return true;
    }

    const asyncThreshold = config?.asyncThreshold || RiskLevel.MEDIUM;
    const riskLevels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const eventRiskIndex = riskLevels.indexOf(event.riskLevel);
    const thresholdIndex = riskLevels.indexOf(asyncThreshold);

    return eventRiskIndex >= thresholdIndex;
  }

  /**
   * Determina a prioridade da fila baseada no nível de risco
   */
  static getQueuePriority(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 10;
      case RiskLevel.HIGH:
        return 7;
      case RiskLevel.MEDIUM:
        return 5;
      case RiskLevel.LOW:
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Determina o nome da fila baseada no tipo de evento e risco
   */
  static getQueueName(event: BaseAuditEvent): string {
    if (event.riskLevel === RiskLevel.CRITICAL) {
      return 'audit-critical';
    }

    if (event.eventType === AuditEventType.SENSITIVE_DATA_ACCESSED) {
      return 'audit-sensitive';
    }

    return 'auditoria';
  }

  /**
   * Comprime dados para armazenamento eficiente
   */
  static compressData(data: any): string {
    // Implementação simples - em produção, usar biblioteca de compressão
    try {
      const jsonString = JSON.stringify(data);
      // Simulação de compressão (apenas para demonstração)
      return Buffer.from(jsonString).toString('base64');
    } catch (error) {
      return JSON.stringify(data);
    }
  }

  /**
   * Descomprime dados armazenados
   */
  static decompressData(compressedData: string): any {
    try {
      // Simulação de descompressão
      const jsonString = Buffer.from(compressedData, 'base64').toString();
      return JSON.parse(jsonString);
    } catch (error) {
      // Fallback para dados não comprimidos
      return JSON.parse(compressedData);
    }
  }

  /**
   * Verifica se dados contêm informações sensíveis
   */
  static containsSensitiveData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const sensitivePatterns = [
      /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, // CPF
      /\b\d{2}\.\d{3}\.\d{3}-\d{1}\b/, // RG
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Cartão de crédito
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    ];

    const dataString = JSON.stringify(data);
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Gera um ID único para correlação de eventos
   */
  static generateCorrelationId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calcula o tempo de retenção baseado no tipo de evento e conformidade
   */
  static calculateRetentionDays(eventType: AuditEventType, isLgpdRelevant: boolean = false): number {
    // Conformidade LGPD - dados pessoais
    if (isLgpdRelevant) {
      return 2555; // ~7 anos para dados fiscais/legais
    }

    // Baseado no tipo de evento
    switch (eventType) {
      case AuditEventType.FAILED_LOGIN:
        return 2190; // 6 anos
      case AuditEventType.SENSITIVE_DATA_ACCESSED:
        return 1825; // 5 anos
      case AuditEventType.ENTITY_DELETED:
        return 1095; // 3 anos
      case AuditEventType.ENTITY_UPDATED:
        return 730; // 2 anos
      case AuditEventType.ENTITY_CREATED:
        return 365; // 1 ano
      default:
        return 90; // 3 meses
    }
  }
}