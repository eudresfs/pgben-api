import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

/**
 * Tipos de erro do sistema SSE
 */
export enum SseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  CIRCUIT_BREAKER_ERROR = 'CIRCUIT_BREAKER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Severidade do erro
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Contexto do erro
 */
export interface ErrorContext {
  /** ID do usuário (se disponível) */
  userId?: number;
  /** ID da sessão */
  sessionId?: string;
  /** IP do cliente */
  clientIp?: string;
  /** User Agent */
  userAgent?: string;
  /** URL da requisição */
  requestUrl?: string;
  /** Método HTTP */
  httpMethod?: string;
  /** Headers da requisição */
  headers?: Record<string, string>;
  /** Dados adicionais */
  additionalData?: Record<string, any>;
  /** Timestamp do erro */
  timestamp: Date;
}

/**
 * Detalhes do erro processado
 */
export interface ProcessedError {
  /** ID único do erro */
  id: string;
  /** Tipo do erro */
  type: SseErrorType;
  /** Severidade */
  severity: ErrorSeverity;
  /** Mensagem original */
  originalMessage: string;
  /** Mensagem amigável para o usuário */
  userMessage: string;
  /** Stack trace (se disponível) */
  stackTrace?: string;
  /** Contexto do erro */
  context: ErrorContext;
  /** Erro original */
  originalError: Error;
  /** Indica se deve ser reportado */
  shouldReport: boolean;
  /** Indica se deve ser logado */
  shouldLog: boolean;
  /** Ações de recuperação sugeridas */
  recoveryActions: string[];
}

/**
 * Configuração do error boundary
 */
export interface ErrorBoundaryConfig {
  /** Habilitar logging detalhado */
  enableDetailedLogging: boolean;
  /** Habilitar notificação de erros críticos */
  enableCriticalErrorNotification: boolean;
  /** Habilitar stack trace em produção */
  enableStackTraceInProduction: boolean;
  /** Máximo de erros por minuto antes de throttling */
  maxErrorsPerMinute: number;
  /** Habilitar throttling de logs */
  enableLogThrottling: boolean;
  /** Habilitar métricas de erro */
  enableErrorMetrics: boolean;
}

/**
 * Métricas de erro
 */
export interface ErrorMetrics {
  /** Total de erros */
  totalErrors: number;
  /** Erros por tipo */
  errorsByType: Record<SseErrorType, number>;
  /** Erros por severidade */
  errorsBySeverity: Record<ErrorSeverity, number>;
  /** Erros nas últimas 24 horas */
  errorsLast24Hours: number;
  /** Erros na última hora */
  errorsLastHour: number;
  /** Taxa de erro atual */
  currentErrorRate: number;
  /** Último erro */
  lastError?: ProcessedError;
}

/**
 * Serviço que atua como error boundary para o sistema SSE
 * Captura, processa e trata erros de forma centralizada
 */
@Injectable()
export class SseErrorBoundaryService {
  private readonly logger = new Logger(SseErrorBoundaryService.name);
  private readonly config: ErrorBoundaryConfig;
  private readonly errorHistory: ProcessedError[] = [];
  private readonly errorCounts = new Map<string, number>();
  private readonly errorTimestamps: Date[] = [];
  private errorIdCounter = 0;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enableDetailedLogging: this.configService.get<boolean>('SSE_ERROR_DETAILED_LOGGING', true),
      enableCriticalErrorNotification: this.configService.get<boolean>('SSE_ERROR_CRITICAL_NOTIFICATION', true),
      enableStackTraceInProduction: this.configService.get<boolean>('SSE_ERROR_STACK_TRACE_PROD', false),
      maxErrorsPerMinute: this.configService.get<number>('SSE_ERROR_MAX_PER_MINUTE', 100),
      enableLogThrottling: this.configService.get<boolean>('SSE_ERROR_LOG_THROTTLING', true),
      enableErrorMetrics: this.configService.get<boolean>('SSE_ERROR_METRICS', true),
    };
  }

  /**
   * Captura e processa um erro
   */
  captureError(
    error: Error,
    context: Partial<ErrorContext> = {},
    response?: Response,
  ): ProcessedError {
    const processedError = this.processError(error, context);
    
    // Registrar erro
    this.recordError(processedError);
    
    // Logar erro se necessário
    if (processedError.shouldLog && this.shouldLogError(processedError)) {
      this.logError(processedError);
    }
    
    // Enviar resposta de erro se response fornecido
    if (response && !response.headersSent) {
      this.sendErrorResponse(response, processedError);
    }
    
    // Notificar erro crítico se necessário
    if (processedError.severity === ErrorSeverity.CRITICAL && this.config.enableCriticalErrorNotification) {
      this.notifyCriticalError(processedError);
    }
    
    return processedError;
  }

  /**
   * Captura erro de conexão SSE
   */
  captureSseConnectionError(
    error: Error,
    userId: number,
    sessionId: string,
    response?: Response,
  ): ProcessedError {
    return this.captureError(error, {
      userId,
      sessionId,
      additionalData: {
        component: 'sse-connection',
      },
    }, response);
  }

  /**
   * Captura erro de autenticação
   */
  captureAuthenticationError(
    error: Error,
    context: Partial<ErrorContext> = {},
    response?: Response,
  ): ProcessedError {
    return this.captureError(error, {
      ...context,
      additionalData: {
        ...context.additionalData,
        component: 'authentication',
      },
    }, response);
  }

  /**
   * Captura erro de banco de dados
   */
  captureDatabaseError(
    error: Error,
    operation: string,
    context: Partial<ErrorContext> = {},
  ): ProcessedError {
    return this.captureError(error, {
      ...context,
      additionalData: {
        ...context.additionalData,
        component: 'database',
        operation,
      },
    });
  }

  /**
   * Captura erro do Redis
   */
  captureRedisError(
    error: Error,
    operation: string,
    context: Partial<ErrorContext> = {},
  ): ProcessedError {
    return this.captureError(error, {
      ...context,
      additionalData: {
        ...context.additionalData,
        component: 'redis',
        operation,
      },
    });
  }

  /**
   * Captura erro de circuit breaker
   */
  captureCircuitBreakerError(
    error: Error,
    circuitBreakerName: string,
    context: Partial<ErrorContext> = {},
  ): ProcessedError {
    return this.captureError(error, {
      ...context,
      additionalData: {
        ...context.additionalData,
        component: 'circuit-breaker',
        circuitBreakerName,
      },
    });
  }

  /**
   * Captura erro de notificação
   */
  captureNotificationError(
    error: Error,
    notificationType: string,
    userId: number,
    context: Partial<ErrorContext> = {},
  ): ProcessedError {
    return this.captureError(error, {
      ...context,
      userId,
      additionalData: {
        ...context.additionalData,
        component: 'notification',
        notificationType,
      },
    });
  }

  /**
   * Obtém métricas de erro
   */
  getErrorMetrics(): ErrorMetrics {
    if (!this.config.enableErrorMetrics) {
      return {
        totalErrors: 0,
        errorsByType: {} as Record<SseErrorType, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        errorsLast24Hours: 0,
        errorsLastHour: 0,
        currentErrorRate: 0,
      };
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const lastMinute = new Date(now.getTime() - 60 * 1000);

    const errorsLast24Hours = this.errorHistory.filter(e => e.context.timestamp >= last24Hours).length;
    const errorsLastHour = this.errorHistory.filter(e => e.context.timestamp >= lastHour).length;
    const errorsLastMinute = this.errorHistory.filter(e => e.context.timestamp >= lastMinute).length;

    const errorsByType: Record<SseErrorType, number> = {} as Record<SseErrorType, number>;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;

    // Inicializar contadores
    Object.values(SseErrorType).forEach(type => {
      errorsByType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Contar erros
    this.errorHistory.forEach(error => {
      errorsByType[error.type]++;
      errorsBySeverity[error.severity]++;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      errorsLast24Hours,
      errorsLastHour,
      currentErrorRate: errorsLastMinute,
      lastError: this.errorHistory[this.errorHistory.length - 1],
    };
  }

  /**
   * Obtém histórico de erros
   */
  getErrorHistory(limit = 100): ProcessedError[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Limpa histórico de erros
   */
  clearErrorHistory(): void {
    this.errorHistory.length = 0;
    this.errorCounts.clear();
    this.errorTimestamps.length = 0;
    this.logger.log('Histórico de erros limpo');
  }

  /**
   * Verifica se o sistema está em estado de erro crítico
   */
  isInCriticalErrorState(): boolean {
    const metrics = this.getErrorMetrics();
    
    // Considerar crítico se:
    // - Taxa de erro atual > 50 por minuto
    // - Mais de 10 erros críticos na última hora
    const criticalErrorsLastHour = this.errorHistory
      .filter(e => {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return e.context.timestamp >= hourAgo && e.severity === ErrorSeverity.CRITICAL;
      })
      .length;

    return metrics.currentErrorRate > 50 || criticalErrorsLastHour > 10;
  }

  /**
   * Processa um erro e determina suas características
   */
  private processError(error: Error, context: Partial<ErrorContext>): ProcessedError {
    const errorId = this.generateErrorId();
    const errorType = this.determineErrorType(error);
    const severity = this.determineSeverity(error, errorType);
    const userMessage = this.generateUserMessage(errorType, severity);
    const recoveryActions = this.generateRecoveryActions(errorType);
    
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      ...context,
    };

    return {
      id: errorId,
      type: errorType,
      severity,
      originalMessage: error.message,
      userMessage,
      stackTrace: this.shouldIncludeStackTrace() ? error.stack : undefined,
      context: fullContext,
      originalError: error,
      shouldReport: this.shouldReportError(errorType, severity),
      shouldLog: this.shouldLogError({ type: errorType, severity } as ProcessedError),
      recoveryActions,
    };
  }

  /**
   * Determina o tipo do erro
   */
  private determineErrorType(error: Error): SseErrorType {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();

    // Erros de conexão
    if (message.includes('connection') || message.includes('econnreset') || message.includes('enotfound')) {
      return SseErrorType.CONNECTION_ERROR;
    }

    // Erros de autenticação
    if (name.includes('unauthorized') || message.includes('authentication') || message.includes('token')) {
      return SseErrorType.AUTHENTICATION_ERROR;
    }

    // Erros de autorização
    if (name.includes('forbidden') || message.includes('authorization') || message.includes('permission')) {
      return SseErrorType.AUTHORIZATION_ERROR;
    }

    // Erros de validação
    if (name.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return SseErrorType.VALIDATION_ERROR;
    }

    // Erros de banco de dados
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return SseErrorType.DATABASE_ERROR;
    }

    // Erros do Redis
    if (message.includes('redis') || message.includes('cache')) {
      return SseErrorType.REDIS_ERROR;
    }

    // Erros de circuit breaker
    if (message.includes('circuit') || message.includes('breaker') || name.includes('circuitbreaker')) {
      return SseErrorType.CIRCUIT_BREAKER_ERROR;
    }

    // Erros de timeout
    if (message.includes('timeout') || message.includes('etimedout')) {
      return SseErrorType.TIMEOUT_ERROR;
    }

    // Erros de rate limit
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return SseErrorType.RATE_LIMIT_ERROR;
    }

    // Erros de serviço externo
    if (message.includes('external') || message.includes('service unavailable') || message.includes('bad gateway')) {
      return SseErrorType.EXTERNAL_SERVICE_ERROR;
    }

    // Erros de notificação
    if (message.includes('notification') || message.includes('message')) {
      return SseErrorType.NOTIFICATION_ERROR;
    }

    return SseErrorType.UNKNOWN_ERROR;
  }

  /**
   * Determina a severidade do erro
   */
  private determineSeverity(error: Error, type: SseErrorType): ErrorSeverity {
    // Erros críticos
    if ([
      SseErrorType.DATABASE_ERROR,
      SseErrorType.INTERNAL_ERROR,
    ].includes(type)) {
      return ErrorSeverity.CRITICAL;
    }

    // Erros de alta severidade
    if ([
      SseErrorType.AUTHENTICATION_ERROR,
      SseErrorType.REDIS_ERROR,
      SseErrorType.CIRCUIT_BREAKER_ERROR,
    ].includes(type)) {
      return ErrorSeverity.HIGH;
    }

    // Erros de média severidade
    if ([
      SseErrorType.CONNECTION_ERROR,
      SseErrorType.TIMEOUT_ERROR,
      SseErrorType.EXTERNAL_SERVICE_ERROR,
      SseErrorType.NOTIFICATION_ERROR,
    ].includes(type)) {
      return ErrorSeverity.MEDIUM;
    }

    // Erros de baixa severidade
    return ErrorSeverity.LOW;
  }

  /**
   * Gera mensagem amigável para o usuário
   */
  private generateUserMessage(type: SseErrorType, severity: ErrorSeverity): string {
    const messages = {
      [SseErrorType.CONNECTION_ERROR]: 'Problema de conexão. Tente novamente em alguns instantes.',
      [SseErrorType.AUTHENTICATION_ERROR]: 'Erro de autenticação. Faça login novamente.',
      [SseErrorType.AUTHORIZATION_ERROR]: 'Você não tem permissão para realizar esta ação.',
      [SseErrorType.VALIDATION_ERROR]: 'Dados inválidos fornecidos. Verifique as informações.',
      [SseErrorType.DATABASE_ERROR]: 'Erro interno do sistema. Nossa equipe foi notificada.',
      [SseErrorType.REDIS_ERROR]: 'Problema temporário no sistema. Tente novamente.',
      [SseErrorType.CIRCUIT_BREAKER_ERROR]: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
      [SseErrorType.TIMEOUT_ERROR]: 'Operação demorou muito para responder. Tente novamente.',
      [SseErrorType.RATE_LIMIT_ERROR]: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      [SseErrorType.INTERNAL_ERROR]: 'Erro interno do sistema. Nossa equipe foi notificada.',
      [SseErrorType.EXTERNAL_SERVICE_ERROR]: 'Serviço externo indisponível. Tente novamente mais tarde.',
      [SseErrorType.NOTIFICATION_ERROR]: 'Problema ao enviar notificação. Tente novamente.',
      [SseErrorType.UNKNOWN_ERROR]: 'Erro inesperado. Nossa equipe foi notificada.',
    };

    return messages[type] || 'Erro inesperado. Tente novamente.';
  }

  /**
   * Gera ações de recuperação sugeridas
   */
  private generateRecoveryActions(type: SseErrorType): string[] {
    const actions = {
      [SseErrorType.CONNECTION_ERROR]: [
        'Verificar conexão de rede',
        'Tentar novamente em alguns segundos',
        'Recarregar a página',
      ],
      [SseErrorType.AUTHENTICATION_ERROR]: [
        'Fazer login novamente',
        'Verificar credenciais',
        'Limpar cache do navegador',
      ],
      [SseErrorType.AUTHORIZATION_ERROR]: [
        'Verificar permissões do usuário',
        'Contatar administrador',
      ],
      [SseErrorType.VALIDATION_ERROR]: [
        'Verificar dados fornecidos',
        'Corrigir campos obrigatórios',
        'Verificar formato dos dados',
      ],
      [SseErrorType.DATABASE_ERROR]: [
        'Aguardar resolução automática',
        'Contatar suporte técnico',
      ],
      [SseErrorType.REDIS_ERROR]: [
        'Tentar novamente em alguns segundos',
        'Verificar se dados foram salvos',
      ],
      [SseErrorType.CIRCUIT_BREAKER_ERROR]: [
        'Aguardar alguns minutos',
        'Tentar novamente mais tarde',
      ],
      [SseErrorType.TIMEOUT_ERROR]: [
        'Tentar novamente',
        'Verificar conexão de rede',
        'Reduzir quantidade de dados',
      ],
      [SseErrorType.RATE_LIMIT_ERROR]: [
        'Aguardar alguns minutos',
        'Reduzir frequência de requisições',
      ],
      [SseErrorType.INTERNAL_ERROR]: [
        'Aguardar resolução automática',
        'Contatar suporte técnico',
      ],
      [SseErrorType.EXTERNAL_SERVICE_ERROR]: [
        'Tentar novamente mais tarde',
        'Verificar status do serviço',
      ],
      [SseErrorType.NOTIFICATION_ERROR]: [
        'Tentar enviar novamente',
        'Verificar configurações de notificação',
      ],
      [SseErrorType.UNKNOWN_ERROR]: [
        'Tentar novamente',
        'Recarregar a página',
        'Contatar suporte se persistir',
      ],
    };

    return actions[type] || ['Tentar novamente', 'Contatar suporte se persistir'];
  }

  /**
   * Registra erro no histórico
   */
  private recordError(error: ProcessedError): void {
    this.errorHistory.push(error);
    this.errorTimestamps.push(error.context.timestamp);
    
    // Manter apenas os últimos 1000 erros
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
      this.errorTimestamps.shift();
    }
    
    // Atualizar contadores
    const key = `${error.type}:${error.severity}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  /**
   * Determina se deve incluir stack trace
   */
  private shouldIncludeStackTrace(): boolean {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return !isProduction || this.config.enableStackTraceInProduction;
  }

  /**
   * Determina se deve reportar o erro
   */
  private shouldReportError(type: SseErrorType, severity: ErrorSeverity): boolean {
    // Sempre reportar erros críticos e de alta severidade
    if ([ErrorSeverity.CRITICAL, ErrorSeverity.HIGH].includes(severity)) {
      return true;
    }
    
    // Não reportar erros de validação e autorização
    if ([SseErrorType.VALIDATION_ERROR, SseErrorType.AUTHORIZATION_ERROR].includes(type)) {
      return false;
    }
    
    return true;
  }

  /**
   * Determina se deve logar o erro
   */
  private shouldLogError(error: ProcessedError): boolean {
    if (!this.config.enableLogThrottling) {
      return true;
    }
    
    // Verificar throttling
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentErrors = this.errorTimestamps.filter(timestamp => timestamp >= oneMinuteAgo);
    
    return recentErrors.length < this.config.maxErrorsPerMinute;
  }

  /**
   * Loga o erro
   */
  private logError(error: ProcessedError): void {
    const logData = {
      errorId: error.id,
      type: error.type,
      severity: error.severity,
      message: error.originalMessage,
      context: error.context,
      stackTrace: error.stackTrace,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('ERRO CRÍTICO capturado', logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('Erro de alta severidade capturado', logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Erro de média severidade capturado', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.debug('Erro de baixa severidade capturado', logData);
        break;
    }
  }

  /**
   * Envia resposta de erro para o cliente
   */
  private sendErrorResponse(response: Response, error: ProcessedError): void {
    const statusCode = this.getHttpStatusCode(error.type);
    
    const errorResponse = {
      error: {
        id: error.id,
        type: error.type,
        message: error.userMessage,
        severity: error.severity,
        recoveryActions: error.recoveryActions,
        timestamp: error.context.timestamp,
      },
    };

    // Incluir detalhes adicionais em desenvolvimento
    if (this.configService.get('NODE_ENV') !== 'production') {
      (errorResponse.error as any).details = {
        originalMessage: error.originalMessage,
        stackTrace: error.stackTrace,
        context: error.context,
      };
    }

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Obtém código de status HTTP apropriado
   */
  private getHttpStatusCode(type: SseErrorType): number {
    const statusCodes = {
      [SseErrorType.CONNECTION_ERROR]: 503,
      [SseErrorType.AUTHENTICATION_ERROR]: 401,
      [SseErrorType.AUTHORIZATION_ERROR]: 403,
      [SseErrorType.VALIDATION_ERROR]: 400,
      [SseErrorType.DATABASE_ERROR]: 500,
      [SseErrorType.REDIS_ERROR]: 503,
      [SseErrorType.CIRCUIT_BREAKER_ERROR]: 503,
      [SseErrorType.TIMEOUT_ERROR]: 408,
      [SseErrorType.RATE_LIMIT_ERROR]: 429,
      [SseErrorType.INTERNAL_ERROR]: 500,
      [SseErrorType.EXTERNAL_SERVICE_ERROR]: 502,
      [SseErrorType.NOTIFICATION_ERROR]: 500,
      [SseErrorType.UNKNOWN_ERROR]: 500,
    };

    return statusCodes[type] || 500;
  }

  /**
   * Notifica erro crítico
   */
  private notifyCriticalError(error: ProcessedError): void {
    // Implementar notificação para equipe técnica
    // Pode ser via email, Slack, PagerDuty, etc.
    this.logger.error('🚨 ERRO CRÍTICO DETECTADO - Equipe técnica deve ser notificada', {
      errorId: error.id,
      type: error.type,
      message: error.originalMessage,
      context: error.context,
    });
  }

  /**
   * Gera ID único para o erro
   */
  private generateErrorId(): string {
    this.errorIdCounter++;
    const timestamp = Date.now();
    return `sse-error-${timestamp}-${this.errorIdCounter}`;
  }
}