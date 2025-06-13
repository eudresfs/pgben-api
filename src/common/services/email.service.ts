import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string | string[];
  subject?: string;
  template?: string | TemplateSource;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  tags?: string[];
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface TemplateSource {
  type: 'file' | 'inline' | 'remote';
  source: string;
  cacheable?: boolean;
}

export interface EmailMetrics {
  emailsSent: number;
  emailsFailed: number;
  successRate: number;
  avgResponseTime: number;
  templateUsage: Array<[string, number]>;
  topErrors: Array<[string, number]>;
  providerStats: {
    provider: string;
    uptime: number;
    lastCheck: Date;
  };
}

export interface StressTestResult {
  success: number;
  failed: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

/**
 * Serviço de envio de emails enterprise-grade
 * Suporta templates Handlebars, múltiplos provedores SMTP, rate limiting,
 * métricas avançadas, resilência e compliance
 */
@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private fallbackTransporter?: Transporter;
  
  /**
   * Cache de templates com TTL
   */
  private templatesCache = new Map<
    string,
    { template: EmailTemplate; loadedAt: number }
  >();
  
  /**
   * Rate limiting por destinatário
   */
  private emailQueue = new Map<string, Date>();
  
  /**
   * Métricas de negócio
   */
  private metrics = {
    emailsSent: 0,
    emailsFailed: 0,
    templateUsage: new Map<string, number>(),
    providerErrors: new Map<string, number>(),
    responseTimes: [] as number[],
    startTime: Date.now(),
  };
  
  /**
   * Blacklist e whitelist de domínios
   */
  private domainBlacklist = new Set<string>();
  private domainWhitelist = new Set<string>();
  
  /**
   * Configurações de timeout
   */
  private readonly timeoutConfig: {
    connection: number;
    greeting: number;
    socket: number;
    send: number;
  };
  
  private readonly templateTtlMs: number;
  private readonly templatesDir: string;
  private readonly isEnabled: boolean;
  private readonly isDevelopment: boolean;
  private readonly rateLimit: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    // Configurações básicas
    const devTemplatesDir = path.join(process.cwd(), 'src', 'templates', 'email');
    const prodTemplatesDir = path.join(__dirname, '..', '..', '..', 'templates', 'email');
    this.templatesDir = fs.existsSync(devTemplatesDir) ? devTemplatesDir : prodTemplatesDir;

    const emailEnabledRaw = this.configService.get<string>('EMAIL_ENABLED') || 'false';
    this.isEnabled = ['true', '1', 'yes', 'y'].includes(emailEnabledRaw.toString().toLowerCase());

    this.isDevelopment = (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'development';

    const ttlSeconds = this.configService.get<number>('EMAIL_TEMPLATE_TTL', 3600);
    this.templateTtlMs = ttlSeconds * 1000;

    // Configurações avançadas
    this.rateLimit = this.configService.get<number>('EMAIL_RATE_LIMIT_MS', 1000);
    this.maxRetries = this.configService.get<number>('EMAIL_MAX_RETRIES', 3);

    // Configurações de timeout otimizadas para performance
    this.timeoutConfig = {
      connection: this.configService.get<number>('SMTP_CONNECTION_TIMEOUT', 5000), // Reduzido de 30s para 5s
      greeting: this.configService.get<number>('SMTP_GREETING_TIMEOUT', 3000), // Reduzido de 10s para 3s
      socket: this.configService.get<number>('SMTP_SOCKET_TIMEOUT', 10000), // Reduzido de 60s para 10s
      send: this.configService.get<number>('SMTP_SEND_TIMEOUT', 15000), // Reduzido de 120s para 15s
    };

    // Inicializar blacklist/whitelist
    this.initializeDomainLists();

    if (this.isEnabled) {
      this.initializeTransporter();
      this.initializeFallbackTransporter();
      this.startHealthCheckInterval();
    } else {
      this.logger.warn('Serviço de email desabilitado. Configure EMAIL_ENABLED=true para habilitar.');
    }
  }

  /**
   * Verifica se o serviço de email está habilitado
   * @returns true se o email estiver habilitado, false caso contrário
   */
  public isEmailEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Cleanup ao destruir o módulo
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.transporter) {
        this.transporter.close();
        this.logger.log('Conexão SMTP principal fechada');
      }
      
      if (this.fallbackTransporter) {
        this.fallbackTransporter.close();
        this.logger.log('Conexão SMTP fallback fechada');
      }
    } catch (error) {
      this.logger.error('Erro ao fechar conexões SMTP:', error);
    }
  }

  /**
   * Inicializa listas de domínios permitidos/bloqueados
   */
  private initializeDomainLists(): void {
    const blacklistStr = this.configService.get<string>('EMAIL_DOMAIN_BLACKLIST', '');
    const whitelistStr = this.configService.get<string>('EMAIL_DOMAIN_WHITELIST', '');

    if (blacklistStr) {
      blacklistStr.split(',').forEach(domain => {
        this.domainBlacklist.add(domain.trim().toLowerCase());
      });
    }

    if (whitelistStr) {
      whitelistStr.split(',').forEach(domain => {
        this.domainWhitelist.add(domain.trim().toLowerCase());
      });
    }
  }

  /**
   * Inicializa transporter principal
   */
  private initializeTransporter(): void {
    this.logger.debug('=== INICIANDO CONFIGURAÇÃO SMTP ===');
    
    const config = this.getSmtpConfig('primary');
    if (!config) {
      this.logger.error('Configuração SMTP principal não disponível');
      return;
    }

    this.logger.debug('Configuração SMTP completa:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS,
      auth: config.auth ? { user: config.auth.user, pass: config.auth.pass ? '[CONFIGURADO]' : '[NÃO CONFIGURADO]' } : 'não configurado',
      pool: config.pool,
      maxConnections: config.maxConnections,
      connectionTimeout: config.connectionTimeout,
      greetingTimeout: config.greetingTimeout,
      socketTimeout: config.socketTimeout
    });

    try {
      this.transporter = nodemailer.createTransport(config);
      this.logger.debug('Transporter criado com sucesso, iniciando verificação...');
      
      this.verifyConnection(this.transporter, 'primary').catch(error => {
        this.logger.error('Falha na verificação inicial da conexão SMTP principal:', {
          error: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
          stack: error.stack
        });
      });
    } catch (error) {
      this.logger.error('Erro ao criar transporter SMTP:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Inicializa transporter de fallback
   */
  private initializeFallbackTransporter(): void {
    const config = this.getSmtpConfig('fallback');
    if (!config) return;

    this.fallbackTransporter = nodemailer.createTransport(config);
    this.verifyConnection(this.fallbackTransporter, 'fallback').catch(error => {
      this.logger.warn('Transporter de fallback não disponível:', error.message);
    });
  }

  /**
   * Obtém configuração SMTP
   */
  private getSmtpConfig(type: 'primary' | 'fallback'): any {
    const prefix = type === 'primary' ? 'SMTP' : 'SMTP_FALLBACK';
    
    const host = this.configService.get<string>(`${prefix}_HOST`);
    const port = this.configService.get<number>(`${prefix}_PORT`, 587);
    const user = this.configService.get<string>(`${prefix}_USER`);
    const pass = this.configService.get<string>(`${prefix}_PASS`);

    if (!host) {
      if (type === 'primary') {
        this.logger.error(`${prefix}_HOST não configurado`);
      }
      return null;
    }

    const secure = port === 465;
    const requireTLS = port === 587 && !this.isMailHog(host, port);
    const isMailHog = this.isMailHog(host, port);

    if (!isMailHog && (!user || !pass)) {
      this.logger.error(`Configurações ${prefix} incompletas`);
      return null;
    }

    if (isMailHog) {
      return {
        host,
        port,
        secure: false,
        requireTLS: false,
        ignoreTLS: true,
        auth: undefined,
        pool: false,
        connectionTimeout: this.timeoutConfig.connection,
        greetingTimeout: this.timeoutConfig.greeting,
        socketTimeout: this.timeoutConfig.socket,
        debug: false, // Desabilitado para melhorar performance
        logger: false, // Desabilitado para melhorar performance
        tls: { rejectUnauthorized: false },
      };
    }

    const tlsOptions = {
      rejectUnauthorized: this.configService.get<boolean>(`${prefix}_REJECT_UNAUTHORIZED`, false),
      minVersion: 'TLSv1' as const,
      maxVersion: 'TLSv1.3' as const,
    };

    return {
      host,
      port,
      secure,
      requireTLS,
      auth: { user, pass },
      tls: tlsOptions,
      pool: true,
      maxConnections: this.configService.get<number>(`${prefix}_MAX_CONNECTIONS`, 5),
      maxMessages: this.configService.get<number>(`${prefix}_MAX_MESSAGES`, 100),
      rateLimit: this.configService.get<number>(`${prefix}_RATE_LIMIT`, 10),
      connectionTimeout: this.timeoutConfig.connection,
      greetingTimeout: this.timeoutConfig.greeting,
      socketTimeout: this.timeoutConfig.socket,
      debug: false, // Desabilitado para melhorar performance
      logger: false, // Desabilitado para melhorar performance
    };
  }

  /**
   * Verifica se é MailHog
   */
  private isMailHog(host: string | undefined, port: number): boolean {
    if (!host) return false;
    const lowerHost = host.toLowerCase();
    return (
      lowerHost.includes('mailhog') ||
      (lowerHost === 'localhost' && port === 1025) ||
      (lowerHost === '127.0.0.1' && port === 1025) ||
      lowerHost === 'mailhog' ||
      port === 1025
    );
  }

  /**
   * Verifica conexão com retry
   */
  private async verifyConnection(transporter: Transporter, type: string, retries = 3): Promise<void> {
    this.logger.debug(`Verificando conexão SMTP ${type}...`);
    
    try {
      await transporter.verify();
      this.logger.log(`✅ Servidor SMTP ${type} configurado com sucesso`);
    } catch (error) {
      this.logger.error(`❌ Erro na verificação SMTP ${type}:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        stack: error.stack
      });
      
      this.metrics.providerErrors.set(error.code || 'UNKNOWN', 
        (this.metrics.providerErrors.get(error.code || 'UNKNOWN') || 0) + 1);

      if (retries > 0) {
        this.logger.warn(`🔄 Tentando reconectar ${type} (${retries} tentativas restantes)...`);
        setTimeout(() => this.verifyConnection(transporter, type, retries - 1), 2000);
      } else {
        this.logger.error(`💥 Falha definitiva na conexão ${type} após todas as tentativas`);
      }
    }
  }

  /**
   * Inicia health check periódico
   */
  private startHealthCheckInterval(): void {
    const interval = this.configService.get<number>('EMAIL_HEALTH_CHECK_INTERVAL', 300000); // 5 min
    
    setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        this.logger.error('Health check falhou:', error);
      }
    }, interval);
  }

  /**
   * Valida opções de email
   */
  private validateEmailOptions(options: EmailOptions): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Validar formato dos emails
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Formato de email inválido: ${email}`);
      }

      // Verificar blacklist/whitelist
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain) {
        if (this.domainBlacklist.has(domain)) {
          throw new Error(`Domínio bloqueado: ${domain}`);
        }
        
        if (this.domainWhitelist.size > 0 && !this.domainWhitelist.has(domain)) {
          throw new Error(`Domínio não autorizado: ${domain}`);
        }
      }
    }

    // Validar conteúdo
    if (!options.html && !options.text && !options.template) {
      throw new Error('Email deve ter conteúdo (html, text, ou template)');
    }

    // Validar tamanho de anexos
    if (options.attachments) {
      const maxSize = this.configService.get<number>('EMAIL_MAX_ATTACHMENT_SIZE', 25 * 1024 * 1024); // 25MB
      let totalSize = 0;

      for (const attachment of options.attachments) {
        const size = Buffer.isBuffer(attachment.content) 
          ? attachment.content.length 
          : Buffer.byteLength(attachment.content.toString());
        totalSize += size;
      }

      if (totalSize > maxSize) {
        throw new Error(`Anexos excedem o tamanho máximo permitido: ${totalSize} > ${maxSize}`);
      }
    }
  }

  /**
   * Verifica rate limiting
   */
  private async checkRateLimit(recipient: string): Promise<boolean> {
    if (this.isDevelopment) return true; // Sem rate limit em desenvolvimento

    const lastSent = this.emailQueue.get(recipient);
    const now = new Date();

    if (lastSent && (now.getTime() - lastSent.getTime()) < this.rateLimit) {
      this.logger.warn(`Rate limit aplicado para ${recipient}`);
      return false;
    }

    this.emailQueue.set(recipient, now);
    
    // Limpeza periódica do cache de rate limiting
    if (this.emailQueue.size > 10000) {
      const cutoff = now.getTime() - (this.rateLimit * 10);
      for (const [email, time] of this.emailQueue.entries()) {
        if (time.getTime() < cutoff) {
          this.emailQueue.delete(email);
        }
      }
    }

    return true;
  }

  /**
   * Envia email com todas as validações e fallbacks
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn('Tentativa de envio com serviço desabilitado', { to: options.to });
      return false;
    }

    const startTime = Date.now();

    try {
      // Validações
      this.validateEmailOptions(options);

      // Rate limiting
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      for (const recipient of recipients) {
        if (!(await this.checkRateLimit(recipient))) {
          return false;
        }
      }

      // Processar template
      let { html, text, subject } = await this.processTemplate(options);

      // Configurar email
      const mailOptions = {
        from: this.getAuthorizedFromEmail(),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: subject || 'Notificação - PGBen',
        html,
        text,
        attachments: options.attachments,
        priority: options.priority || 'normal',
        headers: {
          'X-Original-Sender': 'PGBen',
          'X-Mailer': 'PGBen Email Service v1.0',
          'X-Tags': options.tags?.join(',') || '',
        },
      };

      // Tentar envio com retry
      const result = await this.sendWithRetry(mailOptions);
      
      // Métricas de sucesso
      const responseTime = Date.now() - startTime;
      this.metrics.emailsSent++;
      this.metrics.responseTimes.push(responseTime);
      
      if (options.template && typeof options.template === 'string') {
        this.metrics.templateUsage.set(
          options.template,
          (this.metrics.templateUsage.get(options.template) || 0) + 1
        );
      }

      this.logger.log('Email enviado com sucesso', {
        to: options.to,
        subject: mailOptions.subject,
        responseTime,
        messageId: result.messageId,
      });

      return true;

    } catch (error) {
      // Métricas de erro
      const responseTime = Date.now() - startTime;
      this.metrics.emailsFailed++;
      this.metrics.responseTimes.push(responseTime);
      this.metrics.providerErrors.set(
        error.code || 'UNKNOWN',
        (this.metrics.providerErrors.get(error.code || 'UNKNOWN') || 0) + 1
      );

      // Serialize error details properly to avoid [object Object] in logs
      const errorDetails = {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace available',
        code: error?.code || 'NO_CODE',
        command: error?.command || 'NO_COMMAND', 
        response: typeof error?.response === 'string' ? error.response : JSON.stringify(error?.response || 'NO_RESPONSE'),
        responseCode: error?.responseCode || 'NO_RESPONSE_CODE',
        name: error?.name || 'NO_NAME',
        errno: error?.errno || 'NO_ERRNO',
        syscall: error?.syscall || 'NO_SYSCALL',
        hostname: error?.hostname || 'NO_HOSTNAME',
        port: error?.port || 'NO_PORT',
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      };
      
      this.logger.error(`Erro ao enviar email: ${errorDetails.message}`, {
        errorDetails,
        smtpConfig: {
          host: this.configService.get('SMTP_HOST'),
          port: this.configService.get('SMTP_PORT'),
          user: this.configService.get('SMTP_USER')?.substring(0, 15) + '...',
          secure: this.configService.get('SMTP_PORT') === '465'
        },
        emailInfo: {
          to: options.to,
          subject: options.subject,
          template: options.template
        },
        responseTime,
        suggestion: this.getSuggestionForError(error),
      });

      return false;
    }
  }

  /**
   * Processa template (suporte a diferentes tipos)
   */
  private async processTemplate(options: EmailOptions): Promise<{
    html?: string;
    text?: string;
    subject: string;
  }> {
    let html = options.html;
    let text = options.text;
    let subject = options.subject;

    if (options.template) {
      const template = typeof options.template === 'string' 
        ? await this.loadTemplate(options.template)
        : await this.loadTemplateFromSource(options.template);

      if (template) {
        html = this.compileTemplate(template.html, options.context || {});
        text = template.text 
          ? this.compileTemplate(template.text, options.context || {})
          : undefined;
        subject = this.compileTemplate(template.subject, options.context || {});
      }
    }

    return { html, text, subject: subject || 'Notificação - PGBen' };
  }

  /**
   * Carrega template de diferentes fontes
   */
  private async loadTemplateFromSource(source: TemplateSource): Promise<EmailTemplate | null> {
    switch (source.type) {
      case 'inline':
        return {
          subject: 'Notificação - PGBen',
          html: source.source,
        };
      
      case 'remote':
        try {
          // Implementar fetch de template remoto
          const response = await fetch(source.source);
          const html = await response.text();
          return {
            subject: 'Notificação - PGBen',
            html,
          };
        } catch (error) {
          this.logger.error('Erro ao carregar template remoto:', error);
          return null;
        }
      
      case 'file':
      default:
        return this.loadTemplate(source.source);
    }
  }

  /**
   * Envia email com retry e fallback
   */
  private async sendWithRetry(mailOptions: any, retries = this.maxRetries): Promise<any> {
    try {
      if (!this.transporter) {
        throw new Error('Transporter principal não disponível');
      }
      
      this.logger.debug('Tentando enviar email via transporter principal', {
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error('Erro no transporter principal:', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });
      
      if (retries > 0) {
        this.logger.warn(`Tentativa de reenvio (${retries} restantes):`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.sendWithRetry(mailOptions, retries - 1);
      }

      // Tentar fallback
      if (this.fallbackTransporter) {
        this.logger.warn('Tentando transporter de fallback...');
        try {
          return await this.fallbackTransporter.sendMail(mailOptions);
        } catch (fallbackError) {
          this.logger.error('Fallback também falhou:', {
            error: fallbackError.message,
            code: fallbackError.code,
            command: fallbackError.command,
            response: fallbackError.response,
            responseCode: fallbackError.responseCode,
            stack: fallbackError.stack
          });
        }
      }

      throw error;
    }
  }

  /**
   * Carrega template com cache
   */
  private async loadTemplate(templateName: string): Promise<EmailTemplate | null> {
    // Verificar cache (apenas em produção)
    if (!this.isDevelopment && this.templatesCache.has(templateName)) {
      const cached = this.templatesCache.get(templateName)!;
      if (Date.now() - cached.loadedAt < this.templateTtlMs) {
        return cached.template;
      }
      this.templatesCache.delete(templateName);
    }

    try {
      const templatePath = path.join(this.templatesDir, templateName);

      if (!fs.existsSync(templatePath)) {
        this.logger.error(`Template não encontrado: ${templatePath}`);
        return null;
      }

      const htmlPath = path.join(templatePath, 'template.hbs');
      const textPath = path.join(templatePath, 'template.txt');
      const configPath = path.join(templatePath, 'config.json');

      if (!fs.existsSync(htmlPath)) {
        this.logger.error(`Template HTML não encontrado: ${htmlPath}`);
        return null;
      }

      const html = fs.readFileSync(htmlPath, 'utf8');
      const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : undefined;

      let subject = 'Notificação - PGBen';
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          subject = config.subject || subject;
        } catch (parseError) {
          this.logger.warn(`Erro ao parsear config.json para ${templateName}:`, parseError.message);
        }
      }

      const template: EmailTemplate = { subject, html, text };

      // Cache apenas em produção
      if (!this.isDevelopment) {
        this.templatesCache.set(templateName, {
          template,
          loadedAt: Date.now(),
        });
      }

      return template;
    } catch (error) {
      this.logger.error(`Erro ao carregar template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Compila template Handlebars
   */
  private compileTemplate(template: string, context: Record<string, any>): string {
    try {
      const compiledTemplate = handlebars.compile(template);
      return compiledTemplate(context);
    } catch (error) {
      this.logger.error('Erro ao compilar template:', error);
      return template;
    }
  }

  /**
   * Obtém email remetente autorizado
   */
  private getAuthorizedFromEmail(): string {
    const configuredFrom = this.configService.get<string>('SMTP_FROM');
    const smtpHost = this.configService.get<string>('SMTP_HOST') || '';
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER') || '';
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'PGBen');

    let email = configuredFrom;

    if (!email) {
      if (this.isMailHog(smtpHost, smtpPort)) {
        email = 'noreply@localhost.test';
      } else if (smtpHost.toLowerCase().includes('gmail')) {
        email = smtpUser;
      } else {
        email = smtpUser || 'noreply@localhost.test';
      }
    }

    return `"${fromName}" <${email}>`;
  }

  /**
   * Fornece sugestões para erros
   */
  private getSuggestionForError(error: any): string {
    const errorCode = error.code;
    const errorMessage = error.message?.toLowerCase() || '';
    const smtpHost = this.configService.get<string>('SMTP_HOST') || '';
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);

    if (errorCode === 'EENVELOPE' && errorMessage.includes('domain')) {
      return 'Configure SMTP_FROM com um domínio verificado ou use MailHog para desenvolvimento';
    }

    if (errorCode === 'EAUTH') {
      return this.isMailHog(smtpHost, smtpPort) 
        ? 'MailHog não requer autenticação'
        : 'Verifique credenciais SMTP_USER e SMTP_PASS';
    }

    if (errorCode === 'ESOCKET' || errorCode === 'ECONNECTION') {
      return this.isMailHog(smtpHost, smtpPort)
        ? 'MailHog não está rodando. Execute: docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog'
        : 'Verifique SMTP_HOST, SMTP_PORT e conexão de internet';
    }

    return 'Verifique configurações SMTP no .env';
  }

  /**
   * Teste de stress do serviço
   */
  async stressTest(recipients: string[], concurrency = 10): Promise<StressTestResult> {
    const results = { 
      success: 0, 
      failed: 0, 
      times: [] as number[],
      startTime: Date.now()
    };

    const chunks = this.chunkArray(recipients, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (email) => {
        const start = Date.now();
        const result = await this.testEmail(email);
        const time = Date.now() - start;

        results.times.push(time);
        result ? results.success++ : results.failed++;
      });

      await Promise.allSettled(promises);
    }

    const totalTime = Date.now() - results.startTime;
    const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;

    return {
      success: results.success,
      failed: results.failed,
      avgTime,
      minTime: Math.min(...results.times),
      maxTime: Math.max(...results.times),
      throughput: (results.success + results.failed) / (totalTime / 1000), // emails/segundo
    };
  }

  /**
   * Divide array em chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Health check avançado
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.debug('Health check passou - conexão SMTP OK');
      return true;
    } catch (error) {
      this.logger.error('Health check falhou:', error.message);
      
      // Tentar reconectar
      try {
        this.initializeTransporter();
        await this.transporter.verify();
        this.logger.log('Reconexão automática bem-sucedida');
        return true;
      } catch (reconnectError) {
        this.logger.error('Reconexão automática falhou:', reconnectError.message);
        return false;
      }
    }
  }

  /**
   * Obtém métricas avançadas
   */
  getMetrics(): EmailMetrics {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const total = this.metrics.emailsSent + this.metrics.emailsFailed;
    const successRate = total > 0 ? this.metrics.emailsSent / total : 0;

    const templateUsage = Array.from(this.metrics.templateUsage.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const topErrors = Array.from(this.metrics.providerErrors.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const smtpHost = this.configService.get<string>('SMTP_HOST') || 'N/A';
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    
    let provider = 'Generic SMTP';
    if (this.isMailHog(smtpHost, smtpPort)) {
      provider = 'MailHog (Development)';
    } else if (smtpHost.toLowerCase().includes('mailtrap')) {
      provider = 'Mailtrap';
    } else if (smtpHost.toLowerCase().includes('gmail')) {
      provider = 'Gmail';
    } else if (smtpHost.toLowerCase().includes('sendgrid')) {
      provider = 'SendGrid';
    } else if (smtpHost.toLowerCase().includes('mailersend')) {
      provider = 'MailerSend';
    } else if (smtpHost.toLowerCase().includes('brevo')) {
      provider = 'Brevo';
    }

    return {
      emailsSent: this.metrics.emailsSent,
      emailsFailed: this.metrics.emailsFailed,
      successRate,
      avgResponseTime,
      templateUsage,
      topErrors,
      providerStats: {
        provider,
        uptime,
        lastCheck: new Date(),
      },
    };
  }

  /**
   * Força reconexão
   */
  async reconnect(): Promise<boolean> {
    try {
      if (this.transporter) {
        this.transporter.close();
      }
      if (this.fallbackTransporter) {
        this.fallbackTransporter.close();
      }
      
      this.initializeTransporter();
      this.initializeFallbackTransporter();
      
      return await this.healthCheck();
    } catch (error) {
      this.logger.error('Erro ao reconectar:', error);
      return false;
    }
  }

  /**
   * Teste de email
   */
  async testEmail(recipient: string): Promise<boolean> {
    return this.sendEmail({
      to: recipient,
      subject: 'Teste de Configuração SMTP - PGBen',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🚀 Teste de Email - PGBen</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Servidor:</strong> ${this.configService.get('SMTP_HOST')}</p>
            <p><strong>Porta:</strong> ${this.configService.get('SMTP_PORT')}</p>
            <p><strong>Ambiente:</strong> ${this.isDevelopment ? 'Desenvolvimento' : 'Produção'}</p>
          </div>
          <p style="color: #27ae60;">✅ Se você recebeu este email, a configuração está funcionando corretamente!</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #7f8c8d;">
            Este é um email automático de teste do sistema PGBen.<br>
            Métricas atuais: ${this.metrics.emailsSent} emails enviados com sucesso.
          </p>
        </div>
      `,
      text: `
        Teste de Email - PGBen
        
        Este é um email de teste para verificar a configuração SMTP.
        Data/Hora: ${new Date().toLocaleString('pt-BR')}
        Servidor: ${this.configService.get('SMTP_HOST')}
        Porta: ${this.configService.get('SMTP_PORT')}
        Ambiente: ${this.isDevelopment ? 'Desenvolvimento' : 'Produção'}
        
        ✅ Se você recebeu este email, a configuração está funcionando corretamente!
        
        Métricas atuais: ${this.metrics.emailsSent} emails enviados com sucesso.
      `,
      tags: ['test', 'system'],
    });
  }

  /**
   * Limpa cache de templates
   */
  clearTemplateCache(): void {
    this.templatesCache.clear();
    this.logger.log('Cache de templates limpo');
  }

  /**
   * Obtém estatísticas detalhadas
   */
  getDetailedStats(): {
    service: {
      enabled: boolean;
      environment: string;
      uptime: number;
      version: string;
    };
    smtp: {
      primary: any;
      fallback: any;
    };
    performance: {
      totalEmails: number;
      successRate: number;
      avgResponseTime: number;
      rateLimit: number;
    };
    templates: {
      cached: number;
      cacheTtl: number;
      topUsed: Array<[string, number]>;
    };
    domains: {
      blacklisted: number;
      whitelisted: number;
    };
    errors: {
      recent: Array<[string, number]>;
    };
  } {
    const uptime = Date.now() - this.metrics.startTime;
    const total = this.metrics.emailsSent + this.metrics.emailsFailed;
    const successRate = total > 0 ? (this.metrics.emailsSent / total) * 100 : 0;
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    return {
      service: {
        enabled: this.isEnabled,
        environment: this.isDevelopment ? 'development' : 'production',
        uptime,
        version: '2.0.0',
      },
      smtp: {
        primary: {
          host: this.configService.get('SMTP_HOST'),
          port: this.configService.get('SMTP_PORT'),
          secure: this.configService.get('SMTP_PORT') === 465,
          ready: !!this.transporter,
        },
        fallback: {
          host: this.configService.get('SMTP_FALLBACK_HOST'),
          port: this.configService.get('SMTP_FALLBACK_PORT'),
          ready: !!this.fallbackTransporter,
        },
      },
      performance: {
        totalEmails: total,
        successRate,
        avgResponseTime,
        rateLimit: this.rateLimit,
      },
      templates: {
        cached: this.templatesCache.size,
        cacheTtl: this.templateTtlMs,
        topUsed: Array.from(this.metrics.templateUsage.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5),
      },
      domains: {
        blacklisted: this.domainBlacklist.size,
        whitelisted: this.domainWhitelist.size,
      },
      errors: {
        recent: Array.from(this.metrics.providerErrors.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
      },
    };
  }

  /**
   * Métodos de conveniência para templates específicos
   */

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string,
    expiresIn: number,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/redefinir-senha?token=${resetToken}`;
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    return this.sendEmail({
      to: email,
      template: 'password-reset',
      context: {
        name,
        resetUrl,
        expiresAt: expiresAt.toLocaleString('pt-BR'),
        expiresInMinutes: expiresIn,
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@PGBen.gov.br'),
      },
      priority: 'high',
      tags: ['password-reset', 'security'],
    });
  }

  /**
   * Envia email de confirmação de reset de senha
   */
  async sendPasswordResetConfirmationEmail(email: string, name: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      template: 'password-reset-confirmation',
      context: {
        name,
        loginUrl: `${this.configService.get<string>('FRONTEND_URL')}/login`,
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@PGBen.gov.br'),
      },
      tags: ['password-reset', 'confirmation'],
    });
  }

  /**
   * Envia email de atividade suspeita
   */
  async sendSuspiciousActivityEmail(
    email: string,
    name: string,
    activity: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      template: 'suspicious-activity',
      context: {
        name,
        activity,
        ipAddress,
        userAgent,
        timestamp: new Date().toLocaleString('pt-BR'),
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@PGBen.gov.br'),
      },
      priority: 'high',
      tags: ['security', 'alert'],
    });
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(email: string, name: string, activationToken?: string): Promise<boolean> {
    const context: any = {
      name,
      loginUrl: `${this.configService.get<string>('FRONTEND_URL')}/login`,
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@PGBen.gov.br'),
    };

    if (activationToken) {
      context.activationUrl = `${this.configService.get<string>('FRONTEND_URL')}/activate?token=${activationToken}`;
    }

    return this.sendEmail({
      to: email,
      template: 'welcome',
      context,
      tags: ['welcome', 'onboarding'],
    });
  }

  /**
   * Envia email de notificação genérica
   */
  async sendNotificationEmail(
    email: string | string[],
    subject: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
  ): Promise<boolean> {
    const colors = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      success: '#27ae60',
    };

    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
    };

    return this.sendEmail({
      to: email,
      template: {
        type: 'inline',
        source: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${colors[type]}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h2 style="margin: 0;">${icons[type]} {{subject}}</h2>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
              <p style="margin: 0;">{{message}}</p>
            </div>
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
              PGBen - Sistema de Gestão<br>
              Este é um email automático, não responda.
            </p>
          </div>
        `,
      },
      context: { subject, message },
      subject,
      tags: ['notification', type],
    });
  }

  /**
   * Envia email em lote com controle de rate
   */
  async sendBulkEmail(
    recipients: string[],
    options: Omit<EmailOptions, 'to'>,
    batchSize = 50,
    delayMs = 1000,
  ): Promise<{ success: number; failed: number; results: Array<{ email: string; success: boolean; error?: string }> }> {
    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let success = 0;
    let failed = 0;

    const batches = this.chunkArray(recipients, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      this.logger.log(`Processando lote ${i + 1}/${batches.length} (${batch.length} emails)`);

      const promises = batch.map(async (email) => {
        try {
          const result = await this.sendEmail({ ...options, to: email });
          const status = { email, success: result };
          results.push(status);
          
          if (result) {
            success++;
          } else {
            failed++;
            results[results.length - 1].error = 'Falha no envio';
          }
        } catch (error) {
          failed++;
          results.push({
            email,
            success: false,
            error: error.message,
          });
        }
      });

      await Promise.allSettled(promises);

      // Delay entre lotes para evitar rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    this.logger.log(`Envio em lote concluído: ${success} sucessos, ${failed} falhas`);

    return { success, failed, results };
  }

  /**
   * Reseta métricas
   */
  resetMetrics(): void {
    this.metrics = {
      emailsSent: 0,
      emailsFailed: 0,
      templateUsage: new Map(),
      providerErrors: new Map(),
      responseTimes: [],
      startTime: Date.now(),
    };
    this.logger.log('Métricas resetadas');
  }

  /**
   * Configura novos domínios na blacklist/whitelist
   */
  updateDomainLists(blacklist?: string[], whitelist?: string[]): void {
    if (blacklist) {
      this.domainBlacklist.clear();
      blacklist.forEach(domain => this.domainBlacklist.add(domain.toLowerCase()));
      this.logger.log(`Blacklist atualizada: ${blacklist.length} domínios`);
    }

    if (whitelist) {
      this.domainWhitelist.clear();
      whitelist.forEach(domain => this.domainWhitelist.add(domain.toLowerCase()));
      this.logger.log(`Whitelist atualizada: ${whitelist.length} domínios`);
    }
  }

  /**
   * Obtém status detalhado do serviço
   */
  async getServiceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: boolean; message: string; timestamp: Date }>;
  }> {
    const timestamp = new Date();
    const checks: Record<string, { status: boolean; message: string; timestamp: Date }> = {};

    // Verificar transporter principal
    try {
      if (this.transporter) {
        await this.transporter.verify();
        checks.primarySmtp = { status: true, message: 'Conexão SMTP principal OK', timestamp };
      } else {
        checks.primarySmtp = { status: false, message: 'Transporter principal não inicializado', timestamp };
      }
    } catch (error) {
      checks.primarySmtp = { status: false, message: `Erro SMTP principal: ${error.message}`, timestamp };
    }

    // Verificar transporter fallback
    if (this.fallbackTransporter) {
      try {
        await this.fallbackTransporter.verify();
        checks.fallbackSmtp = { status: true, message: 'Conexão SMTP fallback OK', timestamp };
      } catch (error) {
        checks.fallbackSmtp = { status: false, message: `Erro SMTP fallback: ${error.message}`, timestamp };
      }
    } else {
      checks.fallbackSmtp = { status: true, message: 'Fallback não configurado', timestamp };
    }

    // Verificar diretório de templates
    checks.templates = {
      status: fs.existsSync(this.templatesDir),
      message: fs.existsSync(this.templatesDir) 
        ? `Diretório de templates OK: ${this.templatesDir}`
        : `Diretório de templates não encontrado: ${this.templatesDir}`,
      timestamp,
    };

    // Verificar taxa de sucesso
    const total = this.metrics.emailsSent + this.metrics.emailsFailed;
    const successRate = total > 0 ? (this.metrics.emailsSent / total) * 100 : 100;
    checks.successRate = {
      status: successRate >= 95,
      message: `Taxa de sucesso: ${successRate.toFixed(1)}% (${this.metrics.emailsSent}/${total})`,
      timestamp,
    };

    // Determinar status geral
    const healthyChecks = Object.values(checks).filter(check => check.status).length;
    const totalChecks = Object.values(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }
}