import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseNotificationContext,
  NotificationResult,
  ChannelResult,
  NotificationChannel,
  NotificationType,
  NotificationPriority
} from '../interfaces/base-notification.interface';
import { NotificationConfig } from '../config/notification.config';

/**
 * Contexto estruturado para logs de notificação
 */
interface NotificationLogContext {
  notificacao_id?: string;
  destinatario_id: string;
  tipo: NotificationType;
  prioridade: NotificationPriority;
  canais: NotificationChannel[];
  template_email?: string;
  modulo_origem?: string;
  evento_origem?: string;
  timestamp: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  correlation_id?: string;
}

/**
 * Contexto de performance para logs
 */
interface PerformanceLogContext {
  operation: string;
  duration_ms: number;
  start_time: string;
  end_time: string;
  memory_usage?: number;
  cpu_usage?: number;
  success: boolean;
  error_type?: string;
}

/**
 * Contexto de métricas para logs
 */
interface MetricsLogContext {
  metric_name: string;
  metric_value: number;
  metric_type: 'counter' | 'gauge' | 'histogram' | 'timer';
  tags: Record<string, string>;
  timestamp: string;
}

/**
 * Serviço de logs estruturados para notificações
 * 
 * Responsável por:
 * - Fornecer logs estruturados e padronizados
 * - Filtrar informações sensíveis
 * - Incluir contexto relevante automaticamente
 * - Facilitar observabilidade e debugging
 * - Integrar com sistemas de monitoramento
 */
@Injectable()
export class NotificationLoggerService {
  private readonly logger = new Logger(NotificationLoggerService.name);
  private readonly config: NotificationConfig;
  private readonly sensitiveFields: string[];
  private readonly maxContextSize: number;
  private readonly includePerformance: boolean;
  private readonly structuredLogsEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    notificationConfig: NotificationConfig
  ) {
    this.config = notificationConfig;
    const loggingConfig = this.config.loggingConfig;
    
    this.sensitiveFields = loggingConfig.sensitive_fields;
    this.maxContextSize = loggingConfig.max_context_size;
    this.includePerformance = loggingConfig.include_performance;
    this.structuredLogsEnabled = loggingConfig.structured;
  }

  /**
   * Log de início de processamento de notificação
   * 
   * @param context Contexto da notificação
   * @param additionalContext Contexto adicional
   */
  logNotificationStart(
    context: BaseNotificationContext,
    additionalContext: Record<string, any> = {}
  ): void {
    const logContext = this.createNotificationLogContext(context, additionalContext);
    
    this.logger.log('Iniciando processamento de notificação', {
      ...logContext,
      operation: 'notification_start',
      stage: 'initialization'
    });
  }

  /**
   * Log de sucesso de notificação
   * 
   * @param context Contexto da notificação
   * @param result Resultado do envio
   * @param duration Duração do processamento
   */
  logNotificationSuccess(
    context: BaseNotificationContext,
    result: NotificationResult,
    duration: number
  ): void {
    const logContext = this.createNotificationLogContext(context);
    const performanceContext = this.createPerformanceLogContext(
      'notification_complete',
      duration,
      true
    );

    this.logger.log('Notificação processada com sucesso', {
      ...logContext,
      ...performanceContext,
      notificacao_id: result.notificacao_id,
      canais_sucesso: result.resultados_canais.filter(r => r.sucesso).length,
      canais_total: result.resultados_canais.length,
      operation: 'notification_success',
      stage: 'completion'
    });
  }

  /**
   * Log de falha de notificação
   * 
   * @param context Contexto da notificação
   * @param error Erro ocorrido
   * @param duration Duração do processamento
   */
  logNotificationError(
    context: BaseNotificationContext,
    error: Error | string,
    duration: number
  ): void {
    const logContext = this.createNotificationLogContext(context);
    const performanceContext = this.createPerformanceLogContext(
      'notification_complete',
      duration,
      false,
      typeof error === 'string' ? error : error.name
    );

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' && error.stack ? error.stack : undefined;

    this.logger.error('Falha no processamento de notificação', {
      ...logContext,
      ...performanceContext,
      error_message: errorMessage,
      error_stack: errorStack,
      operation: 'notification_error',
      stage: 'error_handling'
    });
  }

  /**
   * Log de resultado de canal específico
   * 
   * @param canal Canal de envio
   * @param result Resultado do canal
   * @param context Contexto da notificação
   */
  logChannelResult(
    canal: NotificationChannel,
    result: ChannelResult,
    context: BaseNotificationContext
  ): void {
    const logContext = this.createNotificationLogContext(context);
    
    const logData = {
      ...logContext,
      canal,
      sucesso: result.sucesso,
      operation: `channel_${canal}_result`,
      stage: 'channel_processing'
    };

    if (result.sucesso) {
      this.logger.log(`Envio por ${canal} realizado com sucesso`, {
        ...logData,
        dados_resposta: this.sanitizeData(result.dados_resposta)
      });
    } else {
      this.logger.warn(`Falha no envio por ${canal}`, {
        ...logData,
        erro: result.erro
      });
    }
  }

  /**
   * Log de validação de template
   * 
   * @param context Contexto da notificação
   * @param isValid Se o template é válido
   * @param errors Erros de validação
   */
  logTemplateValidation(
    context: BaseNotificationContext,
    isValid: boolean,
    errors: string[] = []
  ): void {
    const logContext = this.createNotificationLogContext(context);
    
    if (isValid) {
      this.logger.log('Template validado com sucesso', {
        ...logContext,
        template_email: context.template_email,
        operation: 'template_validation_success',
        stage: 'validation'
      });
    } else {
      this.logger.warn('Falha na validação de template', {
        ...logContext,
        template_email: context.template_email,
        validation_errors: errors,
        operation: 'template_validation_error',
        stage: 'validation'
      });
    }
  }

  /**
   * Log de métricas
   * 
   * @param metricName Nome da métrica
   * @param value Valor da métrica
   * @param type Tipo da métrica
   * @param tags Tags adicionais
   */
  logMetric(
    metricName: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' | 'timer' = 'gauge',
    tags: Record<string, string> = {}
  ): void {
    const metricsContext: MetricsLogContext = {
      metric_name: metricName,
      metric_value: value,
      metric_type: type,
      tags,
      timestamp: new Date().toISOString()
    };

    // this.logger.log(`Métrica coletada: ${metricName}`, {
    //   ...metricsContext,
    //   operation: 'metric_collection',
    //   stage: 'metrics'
    // });
  }

  /**
   * Log de performance de operação
   * 
   * @param operation Nome da operação
   * @param duration Duração em ms
   * @param success Se foi bem-sucedida
   * @param additionalContext Contexto adicional
   */
  logPerformance(
    operation: string,
    duration: number,
    success: boolean = true,
    additionalContext: Record<string, any> = {}
  ): void {
    if (!this.includePerformance) {
      return;
    }

    const performanceContext = this.createPerformanceLogContext(
      operation,
      duration,
      success
    );

    this.logger.log(`Performance: ${operation}`, {
      ...performanceContext,
      ...this.sanitizeData(additionalContext),
      stage: 'performance_monitoring'
    });
  }

  /**
   * Log de debug (apenas em modo debug)
   * 
   * @param message Mensagem de debug
   * @param context Contexto adicional
   */
  logDebug(message: string, context: Record<string, any> = {}): void {
    if (this.config.developmentConfig.debug_mode) {
      this.logger.debug(message, {
        ...this.sanitizeData(context),
        operation: 'debug',
        stage: 'debugging'
      });
    }
  }

  /**
   * Log de auditoria
   * 
   * @param action Ação realizada
   * @param userId ID do usuário
   * @param context Contexto da ação
   */
  logAudit(
    action: string,
    userId: string,
    context: Record<string, any> = {}
  ): void {
    this.logger.log(`Auditoria: ${action}`, {
      user_id: userId,
      action,
      timestamp: new Date().toISOString(),
      ...this.sanitizeData(context),
      operation: 'audit',
      stage: 'audit_trail'
    });
  }

  /**
   * Cria contexto estruturado para logs de notificação
   * 
   * @param context Contexto da notificação
   * @param additionalContext Contexto adicional
   * @returns Contexto estruturado
   */
  private createNotificationLogContext(
    context: BaseNotificationContext,
    additionalContext: Record<string, any> = {}
  ): NotificationLogContext {
    return {
      destinatario_id: context.destinatario_id,
      tipo: context.tipo,
      prioridade: context.prioridade,
      canais: context.canais,
      template_email: context.template_email,
      modulo_origem: context.dados_contexto?.modulo_origem,
      evento_origem: context.dados_contexto?.evento_origem,
      timestamp: new Date().toISOString(),
      correlation_id: context.dados_contexto?.correlation_id,
      ...this.sanitizeData(additionalContext)
    };
  }

  /**
   * Cria contexto de performance
   * 
   * @param operation Nome da operação
   * @param duration Duração em ms
   * @param success Se foi bem-sucedida
   * @param errorType Tipo do erro (se houver)
   * @returns Contexto de performance
   */
  private createPerformanceLogContext(
    operation: string,
    duration: number,
    success: boolean,
    errorType?: string
  ): PerformanceLogContext {
    const now = new Date();
    const startTime = new Date(now.getTime() - duration);

    return {
      operation,
      duration_ms: duration,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      success,
      error_type: errorType
    };
  }

  /**
   * Remove informações sensíveis dos dados
   * 
   * @param data Dados a serem sanitizados
   * @returns Dados sanitizados
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove campos sensíveis
    this.sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Limita o tamanho do contexto
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > this.maxContextSize) {
      return {
        ...sanitized,
        _truncated: true,
        _original_size: serialized.length,
        _max_size: this.maxContextSize
      };
    }

    return sanitized;
  }

  /**
   * Cria um timer para medir performance
   * 
   * @param operation Nome da operação
   * @returns Função para finalizar o timer
   */
  createTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration);
    };
  }

  /**
   * Wrapper para executar operação com log automático
   * 
   * @param operation Nome da operação
   * @param fn Função a ser executada
   * @param context Contexto adicional
   * @returns Resultado da função
   */
  async withLogging<T>(
    operation: string,
    fn: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.logDebug(`Iniciando operação: ${operation}`, context);
      
      const result = await fn();
      
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration, true, context);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration, false, {
        ...context,
        error: error.message
      });
      
      throw error;
    }
  }
}