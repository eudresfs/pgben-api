import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { RetryConfig } from '../interfaces/base-notification.interface';

/**
 * Configuração centralizada para o sistema de notificações padronizado
 * 
 * Responsável por:
 * - Centralizar todas as configurações de notificação
 * - Fornecer valores padrão seguros
 * - Validar configurações obrigatórias
 * - Facilitar testes e manutenção
 */
@Injectable()
export class NotificationConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Configuração de retry para notificações
   */
  get retryConfig(): RetryConfig {
    return {
      max_tentativas: this.configService.get<number>('NOTIFICATION_MAX_RETRIES', 3),
      intervalo_base: this.configService.get<number>('NOTIFICATION_RETRY_INTERVAL', 1000),
      multiplicador_backoff: this.configService.get<number>('NOTIFICATION_BACKOFF_MULTIPLIER', 2),
      intervalo_maximo: this.configService.get<number>('NOTIFICATION_MAX_INTERVAL', 30000)
    };
  }

  /**
   * Configuração de templates
   */
  get templateConfig() {
    return {
      validacao_obrigatoria: this.configService.get<boolean>('NOTIFICATION_TEMPLATE_VALIDATION_REQUIRED', true),
      cache_templates: this.configService.get<boolean>('NOTIFICATION_TEMPLATE_CACHE_ENABLED', true),
      cache_ttl: this.configService.get<number>('NOTIFICATION_TEMPLATE_CACHE_TTL', 300000), // 5 minutos
      templates_path: this.configService.get<string>('NOTIFICATION_TEMPLATES_PATH', './templates'),
      fallback_template: this.configService.get<string>('NOTIFICATION_FALLBACK_TEMPLATE', 'default')
    };
  }

  /**
   * Configuração do Ably
   */
  get ablyConfig() {
    return {
      enabled: this.configService.get<boolean>('ABLY_ENABLED', true),
      api_key: this.configService.get<string>('ABLY_API_KEY'),
      environment: this.configService.get<string>('ABLY_ENVIRONMENT', 'production'),
      channel_prefix: this.configService.get<string>('ABLY_CHANNEL_PREFIX', 'pgben'),
      connection_timeout: this.configService.get<number>('ABLY_CONNECTION_TIMEOUT', 10000),
      max_message_size: this.configService.get<number>('ABLY_MAX_MESSAGE_SIZE', 65536), // 64KB
      retry_attempts: this.configService.get<number>('ABLY_RETRY_ATTEMPTS', 3)
    };
  }

  /**
   * Configuração de e-mail
   */
  get emailConfig() {
    return {
      enabled: this.configService.get<boolean>('EMAIL_ENABLED', true),
      provider: this.configService.get<string>('EMAIL_PROVIDER', 'smtp'),
      from_address: this.configService.get<string>('EMAIL_FROM_ADDRESS', 'noreply@pgben.com'),
      from_name: this.configService.get<string>('EMAIL_FROM_NAME', 'PGBEN Sistema'),
      reply_to: this.configService.get<string>('EMAIL_REPLY_TO'),
      max_recipients: this.configService.get<number>('EMAIL_MAX_RECIPIENTS', 50),
      rate_limit: this.configService.get<number>('EMAIL_RATE_LIMIT', 100), // por minuto
      timeout: this.configService.get<number>('EMAIL_TIMEOUT', 30000)
    };
  }

  /**
   * Configuração de SMS
   */
  get smsConfig() {
    return {
      enabled: this.configService.get<boolean>('SMS_ENABLED', false),
      provider: this.configService.get<string>('SMS_PROVIDER', 'twilio'),
      api_key: this.configService.get<string>('SMS_API_KEY'),
      api_secret: this.configService.get<string>('SMS_API_SECRET'),
      from_number: this.configService.get<string>('SMS_FROM_NUMBER'),
      max_length: this.configService.get<number>('SMS_MAX_LENGTH', 160),
      rate_limit: this.configService.get<number>('SMS_RATE_LIMIT', 10), // por minuto
      timeout: this.configService.get<number>('SMS_TIMEOUT', 15000)
    };
  }

  /**
   * Configuração de logs
   */
  get loggingConfig() {
    return {
      level: this.configService.get<string>('NOTIFICATION_LOG_LEVEL', 'info'),
      structured: this.configService.get<boolean>('NOTIFICATION_STRUCTURED_LOGS', true),
      include_context: this.configService.get<boolean>('NOTIFICATION_LOG_INCLUDE_CONTEXT', true),
      include_performance: this.configService.get<boolean>('NOTIFICATION_LOG_INCLUDE_PERFORMANCE', true),
      max_context_size: this.configService.get<number>('NOTIFICATION_LOG_MAX_CONTEXT_SIZE', 1000),
      sensitive_fields: this.configService.get<string>('NOTIFICATION_LOG_SENSITIVE_FIELDS', 'password,token,secret').split(',')
    };
  }

  /**
   * Configuração de métricas
   */
  get metricsConfig() {
    return {
      enabled: this.configService.get<boolean>('NOTIFICATION_METRICS_ENABLED', true),
      collection_interval: this.configService.get<number>('NOTIFICATION_METRICS_COLLECTION_INTERVAL', 60000), // 1 minuto
      retention_period: this.configService.get<number>('NOTIFICATION_METRICS_RETENTION_PERIOD', 86400000), // 24 horas
      max_samples_per_channel: this.configService.get<number>('NOTIFICATION_METRICS_MAX_SAMPLES', 100),
      export_enabled: this.configService.get<boolean>('NOTIFICATION_METRICS_EXPORT_ENABLED', false),
      export_endpoint: this.configService.get<string>('NOTIFICATION_METRICS_EXPORT_ENDPOINT')
    };
  }

  /**
   * Configuração de rate limiting
   */
  get rateLimitConfig() {
    return {
      enabled: this.configService.get<boolean>('NOTIFICATION_RATE_LIMIT_ENABLED', true),
      global_limit: this.configService.get<number>('NOTIFICATION_GLOBAL_RATE_LIMIT', 1000), // por minuto
      per_user_limit: this.configService.get<number>('NOTIFICATION_PER_USER_RATE_LIMIT', 50), // por minuto
      per_channel_limit: {
        email: this.configService.get<number>('NOTIFICATION_EMAIL_RATE_LIMIT', 20),
        sms: this.configService.get<number>('NOTIFICATION_SMS_RATE_LIMIT', 5),
        ably: this.configService.get<number>('NOTIFICATION_ABLY_RATE_LIMIT', 100),
        in_app: this.configService.get<number>('NOTIFICATION_IN_APP_RATE_LIMIT', 100)
      },
      window_size: this.configService.get<number>('NOTIFICATION_RATE_LIMIT_WINDOW', 60000), // 1 minuto
      block_duration: this.configService.get<number>('NOTIFICATION_RATE_LIMIT_BLOCK_DURATION', 300000) // 5 minutos
    };
  }

  /**
   * Configuração de URLs
   */
  get urlConfig() {
    return {
      base_url: this.configService.get<string>('APP_BASE_URL', 'https://pgben.com'),
      frontend_url: this.configService.get<string>('FRONTEND_URL', 'https://app.pgben.com'),
      api_url: this.configService.get<string>('API_URL', 'https://api.pgben.com'),
      unsubscribe_url: this.configService.get<string>('NOTIFICATION_UNSUBSCRIBE_URL', '/unsubscribe'),
      preferences_url: this.configService.get<string>('NOTIFICATION_PREFERENCES_URL', '/preferences'),
      deep_link_scheme: this.configService.get<string>('DEEP_LINK_SCHEME', 'pgben')
    };
  }

  /**
   * Configuração de segurança
   */
  get securityConfig() {
    return {
      encrypt_sensitive_data: this.configService.get<boolean>('NOTIFICATION_ENCRYPT_SENSITIVE_DATA', true),
      encryption_key: this.configService.get<string>('NOTIFICATION_ENCRYPTION_KEY'),
      max_content_length: this.configService.get<number>('NOTIFICATION_MAX_CONTENT_LENGTH', 10000),
      allowed_domains: this.configService.get<string>('NOTIFICATION_ALLOWED_DOMAINS', '').split(',').filter(Boolean),
      sanitize_html: this.configService.get<boolean>('NOTIFICATION_SANITIZE_HTML', true),
      validate_recipients: this.configService.get<boolean>('NOTIFICATION_VALIDATE_RECIPIENTS', true)
    };
  }

  /**
   * Configuração de desenvolvimento
   */
  get developmentConfig() {
    return {
      mock_external_services: this.configService.get<boolean>('NOTIFICATION_MOCK_EXTERNAL_SERVICES', false),
      debug_mode: this.configService.get<boolean>('NOTIFICATION_DEBUG_MODE', false),
      test_mode: this.configService.get<boolean>('NOTIFICATION_TEST_MODE', false),
      dry_run: this.configService.get<boolean>('NOTIFICATION_DRY_RUN', false),
      log_all_events: this.configService.get<boolean>('NOTIFICATION_LOG_ALL_EVENTS', false)
    };
  }

  /**
   * Valida se todas as configurações obrigatórias estão presentes
   * 
   * @throws Error se alguma configuração obrigatória estiver ausente
   */
  validateRequiredConfig(): void {
    const requiredConfigs = [];

    // Validação do Ably
    if (this.ablyConfig.enabled && !this.ablyConfig.api_key) {
      requiredConfigs.push('ABLY_API_KEY');
    }

    // Validação do e-mail
    if (this.emailConfig.enabled && !this.emailConfig.from_address) {
      requiredConfigs.push('EMAIL_FROM_ADDRESS');
    }

    // Validação do SMS
    if (this.smsConfig.enabled && (!this.smsConfig.api_key || !this.smsConfig.api_secret)) {
      requiredConfigs.push('SMS_API_KEY', 'SMS_API_SECRET');
    }

    // Validação de segurança
    if (this.securityConfig.encrypt_sensitive_data && !this.securityConfig.encryption_key) {
      requiredConfigs.push('NOTIFICATION_ENCRYPTION_KEY');
    }

    if (requiredConfigs.length > 0) {
      throw new Error(
        `Configurações obrigatórias ausentes para o sistema de notificações: ${requiredConfigs.join(', ')}`
      );
    }
  }

  /**
   * Obtém todas as configurações em um objeto
   * 
   * @returns Objeto com todas as configurações
   */
  getAllConfig() {
    return {
      retry: this.retryConfig,
      template: this.templateConfig,
      ably: this.ablyConfig,
      email: this.emailConfig,
      sms: this.smsConfig,
      logging: this.loggingConfig,
      metrics: this.metricsConfig,
      rateLimit: this.rateLimitConfig,
      url: this.urlConfig,
      security: this.securityConfig,
      development: this.developmentConfig
    };
  }
}