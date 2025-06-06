import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string | string[];
  subject?: string; // Opcional quando um template é fornecido
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Serviço de envio de emails
 * Suporta templates Handlebars e configuração SMTP
 * Inclui suporte nativo para MailHog, Mailtrap, Gmail e outros provedores
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private templatesCache = new Map<string, EmailTemplate>();
  private readonly templatesDir: string;
  private readonly isEnabled: boolean;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.templatesDir = path.join(process.cwd(), 'src', 'templates', 'email');
    this.isEnabled = this.configService.get<boolean>('EMAIL_ENABLED', false);
    this.isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';

    if (this.isEnabled) {
      // Inicialização síncrona para garantir que o transporter esteja disponível
      this.initializeTransporter();
    } else {
      this.logger.warn(
        'Serviço de email desabilitado. Configure EMAIL_ENABLED=true para habilitar.',
      );
    }
  }

  /**
   * Inicializa o transporter do Nodemailer
   * Configurado para usar STARTTLS na porta 587, SSL na porta 465, ou MailHog na porta 1025
   */
  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    // Configurações SSL/TLS baseadas na porta e provedor
    const secure = port === 465; // SSL para porta 465, STARTTLS para porta 587
    const requireTLS = port === 587 && !this.isMailHog(host, port); // Força STARTTLS apenas para porta 587 (exceto MailHog)

    if (!host) {
      this.logger.error(
        'SMTP_HOST não configurado. Verifique as configurações.',
      );
      return;
    }

    // MailHog não requer autenticação
    const isMailHog = this.isMailHog(host, port);

    if (!isMailHog && (!user || !pass)) {
      this.logger.error(
        'Configurações SMTP incompletas. Verifique SMTP_USER e SMTP_PASS (não necessário para MailHog).',
      );
      return;
    }

    // Configurações específicas do MailHog
    if (isMailHog) {
      this.transporter = nodemailer.createTransport({
        host: host!, // Garantido que não é undefined pelo check acima
        port,
        secure: false, // MailHog não usa SSL/TLS
        requireTLS: false,
        ignoreTLS: true,
        // MailHog não requer autenticação
        auth: undefined,
        pool: false, // Desabilita pool para MailHog
        connectionTimeout: 10000, // Timeout menor para MailHog
        greetingTimeout: 5000,
        socketTimeout: 10000,
        debug: this.isDevelopment,
        logger: this.isDevelopment,
        // Configurações específicas para MailHog
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log(
        `MailHog detectado: ${host}:${port} - Autenticação desabilitada`,
      );
      this.verifyConnection().catch((error) => {
        this.logger.error(
          'Falha na verificação inicial da conexão MailHog:',
          error.message,
        );
      });
      return;
    }

    // Configurações TLS mais flexíveis para outros provedores
    const tlsOptions = {
      rejectUnauthorized: this.configService.get<boolean>(
        'SMTP_REJECT_UNAUTHORIZED',
        false,
      ),
      minVersion: 'TLSv1' as const,
      maxVersion: 'TLSv1.3' as const,
      secureProtocol: undefined,
      ciphers: undefined,
    };

    this.transporter = nodemailer.createTransport({
      host: host!, // Garantido que não é undefined pelo check acima
      port,
      secure,
      requireTLS,
      auth: {
        user: user!,
        pass: pass!,
      },
      tls: tlsOptions,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      ignoreTLS: false,
      debug: this.isDevelopment,
      logger: this.isDevelopment,
    });

    // Configuração de fallback para ambientes de desenvolvimento problemáticos
    if (this.isDevelopment && host.includes('localhost') && !isMailHog) {
      this.logger.warn(
        'Detectado ambiente local - aplicando configurações SSL relaxadas',
      );
      this.transporter = nodemailer.createTransport({
        host: host!,
        port,
        secure: false,
        requireTLS: false,
        auth: { user: user!, pass: pass! },
        tls: {
          rejectUnauthorized: false,
          ignoreTLS: true,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        debug: true,
        logger: true,
      });
    }

    // Verificar conexão de forma assíncrona sem bloquear a inicialização
    this.verifyConnection().catch((error) => {
      this.logger.error(
        'Falha na verificação inicial da conexão SMTP:',
        error.message,
      );
    });
  }

  /**
   * Verifica se é MailHog baseado no host e porta
   * Detecta MailHog por múltiplos critérios para garantir compatibilidade
   */
  private isMailHog(host: string | undefined, port: number): boolean {
    if (!host) {return false;}

    const lowerHost = host.toLowerCase();

    // Detecta MailHog por host ou porta padrão
    return (
      lowerHost.includes('mailhog') ||
      (lowerHost === 'localhost' && port === 1025) ||
      (lowerHost === '127.0.0.1' && port === 1025) ||
      lowerHost === 'mailhog' ||
      port === 1025 // Porta padrão do MailHog
    );
  }

  /**
   * Verifica a conexão SMTP com retry automático
   */
  private async verifyConnection(retries = 3): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log(
        `Servidor SMTP configurado com sucesso: ${this.configService.get('SMTP_HOST')}:${this.configService.get('SMTP_PORT')}`,
      );
    } catch (error) {
      const errorInfo = {
        message: error.message,
        code: error.code,
        command: error.command,
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT'),
        retries: retries - 1,
      };

      this.logger.error('Erro na configuração SMTP:', errorInfo);

      // Tentativa de fallback para configurações mais permissivas
      if (retries > 0 && error.code === 'ESOCKET') {
        this.logger.warn('Tentando configuração SMTP alternativa...');

        // Recriar transporter com configurações mais permissivas
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT', 587);
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        this.transporter = nodemailer.createTransport({
          host: host!,
          port,
          secure: false, // Desabilita SSL/TLS inicial
          requireTLS: false, // Desabilita exigência de TLS
          auth: { user: user!, pass: pass! },
          tls: {
            rejectUnauthorized: false,
            ignoreTLS: true, // Ignora completamente TLS se necessário
          },
          connectionTimeout: 30000,
          socketTimeout: 30000,
          debug: this.isDevelopment,
        });

        // Retry com configuração alternativa
        setTimeout(() => this.verifyConnection(retries - 1), 2000);
      }
    }
  }

  /**
   * Obtém email remetente autorizado baseado no provedor SMTP
   */
  private getAuthorizedFromEmail(): string {
    const configuredFrom = this.configService.get<string>('SMTP_FROM');
    const smtpHost = this.configService.get<string>('SMTP_HOST') || '';
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER') || '';

    // Se um FROM específico foi configurado, usar ele (prioridade máxima)
    if (configuredFrom) {
      this.logger.debug(`Usando email FROM configurado: ${configuredFrom}`);
      return configuredFrom;
    }

    // Para MailHog - aceita qualquer domínio
    if (this.isMailHog(smtpHost, smtpPort)) {
      this.logger.debug('MailHog detectado - usando email de desenvolvimento');
      return 'noreply@localhost.test';
    }

    // Para Mailtrap Live (produção) - precisa usar domínio verificado
    if (smtpHost.toLowerCase().includes('live.smtp.mailtrap.io')) {
      this.logger.error(
        'Mailtrap Live detectado: Configure SMTP_FROM com seu domínio verificado no Mailtrap. ' +
          'Exemplo: SMTP_FROM=noreply@seudominio.com',
      );
      return smtpUser || 'noreply@example.com';
    }

    // Para Mailtrap Testing (desenvolvimento)
    if (
      smtpHost.toLowerCase().includes('sandbox.smtp.mailtrap.io') ||
      smtpHost.toLowerCase().includes('send.smtp.mailtrap.io')
    ) {
      return 'noreply@localhost.test';
    }

    // Para Gmail
    if (smtpHost.toLowerCase().includes('gmail')) {
      return smtpUser;
    }

    // Para outros provedores, tentar usar usuário SMTP
    if (smtpUser) {
      return smtpUser;
    }

    // Fallback para domínio genérico
    this.logger.warn(
      'Usando domínio genérico como remetente - configure SMTP_FROM adequadamente',
    );
    return 'noreply@localhost.test';
  }

  /**
   * Envia um email com tratamento robusto de erros
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn('Tentativa de envio de email com serviço desabilitado', {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    if (!this.transporter) {
      this.logger.error('Transporter não inicializado');
      return false;
    }

    try {
      let html = options.html;
      let text = options.text;
      let subject = options.subject;

      // Processar template se especificado
      if (options.template) {
        const template = await this.loadTemplate(options.template);
        if (template) {
          html = this.compileTemplate(template.html, options.context || {});
          text = template.text
            ? this.compileTemplate(template.text, options.context || {})
            : undefined;
          subject = this.compileTemplate(
            template.subject,
            options.context || {},
          );
        } else {
          this.logger.error(
            `Template '${options.template}' não pôde ser carregado`,
          );
          return false;
        }
      }

      // Garantir que o assunto esteja definido
      if (!subject) {
        subject = 'Notificação - SEMTAS';
        this.logger.warn('Email enviado sem assunto definido, usando padrão', {
          to: options.to,
          template: options.template,
        });
      }

      // Configurar remetente com domínio autorizado
      const fromEmail = this.getAuthorizedFromEmail();
      const fromName = this.configService.get<string>(
        'SMTP_FROM_NAME',
        'SEMTAS - Sistema',
      );

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject,
        html,
        text,
        attachments: options.attachments,
        // Headers adicionais para identificação
        headers: {
          'X-Original-Sender': 'SEMTAS',
          'X-Mailer': 'SEMTAS Email Service',
        },
      };

      // Log detalhado em desenvolvimento
      if (this.isDevelopment) {
        this.logger.debug('Enviando email:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          from: mailOptions.from,
          hasHtml: !!html,
          hasText: !!text,
          attachments: options.attachments?.length || 0,
        });
      }

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log('Email enviado com sucesso', {
        to: options.to,
        subject: subject,
        messageId: result.messageId,
        response: result.response,
      });

      return true;
    } catch (error) {
      // Log detalhado do erro com sugestões
      const errorDetails = {
        message: error.message,
        code: error.code,
        command: error.command,
        to: options.to,
        subject: options.subject || 'N/A',
        template: options.template || 'N/A',
        suggestion: this.getSuggestionForError(error),
        stack: this.isDevelopment ? error.stack : undefined,
      };

      this.logger.error('Erro ao enviar email:', errorDetails);

      // Tentar reconectar se for erro de conexão
      if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
        this.logger.warn(
          'Erro de conexão detectado, tentando reinicializar transporter...',
        );
        setTimeout(() => this.initializeTransporter(), 5000);
      }

      return false;
    }
  }

  /**
   * Carrega um template de email com cache inteligente
   */
  private async loadTemplate(
    templateName: string,
  ): Promise<EmailTemplate | null> {
    // Verificar cache primeiro (apenas em produção)
    if (!this.isDevelopment && this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesDir, templateName);

      // Verificar se o diretório do template existe
      if (!fs.existsSync(templatePath)) {
        this.logger.error(
          `Diretório do template não encontrado: ${templatePath}`,
        );
        return null;
      }

      // Carregar arquivos do template
      const htmlPath = path.join(templatePath, 'template.hbs');
      const textPath = path.join(templatePath, 'template.txt');
      const configPath = path.join(templatePath, 'config.json');

      if (!fs.existsSync(htmlPath)) {
        this.logger.error(`Template HTML não encontrado: ${htmlPath}`);
        return null;
      }

      const html = fs.readFileSync(htmlPath, 'utf8');
      const text = fs.existsSync(textPath)
        ? fs.readFileSync(textPath, 'utf8')
        : undefined;

      let subject = 'Notificação - SEMTAS';
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          subject = config.subject || subject;
        } catch (parseError) {
          this.logger.warn(
            `Erro ao parsear config.json para template ${templateName}:`,
            parseError.message,
          );
        }
      }

      const template: EmailTemplate = { subject, html, text };

      // Cache do template (apenas em produção)
      if (!this.isDevelopment) {
        this.templatesCache.set(templateName, template);
      }

      this.logger.debug(`Template '${templateName}' carregado com sucesso`);
      return template;
    } catch (error) {
      this.logger.error(`Erro ao carregar template ${templateName}:`, {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      });
      return null;
    }
  }

  /**
   * Compila um template Handlebars com tratamento de erro melhorado
   */
  private compileTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    try {
      const compiledTemplate = handlebars.compile(template);
      return compiledTemplate(context);
    } catch (error) {
      this.logger.error('Erro ao compilar template Handlebars:', {
        error: error.message,
        context: Object.keys(context),
        templatePreview: template.substring(0, 100) + '...',
      });
      return template; // Retorna template original em caso de erro
    }
  }

  /**
   * Fornece sugestões baseadas no tipo de erro SMTP
   */
  private getSuggestionForError(error: any): string {
    const errorCode = error.code;
    const errorMessage = error.message?.toLowerCase() || '';
    const smtpHost = this.configService.get<string>('SMTP_HOST') || '';
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);

    if (
      errorCode === 'EENVELOPE' &&
      errorMessage.includes('domain') &&
      errorMessage.includes('not allowed')
    ) {
      if (this.isMailHog(smtpHost, smtpPort)) {
        return 'MailHog não deveria rejeitar domínios. Verifique se o MailHog está rodando corretamente';
      }
      return 'Configure SMTP_FROM com um domínio verificado na sua conta, ou use MailHog para desenvolvimento';
    }

    if (errorCode === 'EAUTH') {
      if (this.isMailHog(smtpHost, smtpPort)) {
        return 'MailHog não requer autenticação. Remova SMTP_USER e SMTP_PASS ou deixe-os vazios';
      }
      return 'Verifique suas credenciais SMTP_USER e SMTP_PASS';
    }

    if (errorCode === 'ESOCKET' || errorCode === 'ECONNECTION') {
      if (this.isMailHog(smtpHost, smtpPort)) {
        return 'MailHog não está rodando. Execute: docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog ou verifique se o serviço está ativo';
      }
      return 'Verifique SMTP_HOST e SMTP_PORT, e sua conexão de internet';
    }

    if (errorCode === 'ENOTFOUND') {
      if (this.isMailHog(smtpHost, smtpPort)) {
        return 'Host MailHog não encontrado. Verifique se está rodando em localhost:1025';
      }
      return 'Host SMTP não encontrado. Verifique SMTP_HOST';
    }

    if (errorCode === 'ETIMEDOUT') {
      if (this.isMailHog(smtpHost, smtpPort)) {
        return 'Timeout conectando ao MailHog. Verifique se está rodando e acessível';
      }
      return 'Timeout na conexão SMTP. Verifique firewall e conectividade';
    }

    if (errorMessage.includes('starttls')) {
      return 'Problema com TLS - para MailHog use porta 1025, para outros tente SMTP_SECURE=false e SMTP_PORT=587';
    }

    return 'Verifique todas as configurações SMTP no arquivo .env';
  }

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string,
    expiresIn: number,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    const result = await this.sendEmail({
      to: email,
      template: 'password-reset',
      context: {
        name,
        resetUrl,
        expiresAt: expiresAt.toLocaleString('pt-BR'),
        expiresInMinutes: expiresIn,
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'suporte@semtas.gov.br',
        ),
      },
    });

    if (!result) {
      this.logger.error('Falha ao enviar email de recuperação de senha', {
        email,
        name,
        expiresIn,
      });
    }

    return result;
  }

  /**
   * Envia email de confirmação de reset de senha
   */
  async sendPasswordResetConfirmationEmail(
    email: string,
    name: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      template: 'password-reset-confirmation',
      context: {
        name,
        loginUrl: `${this.configService.get<string>('FRONTEND_URL')}/login`,
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'suporte@semtas.gov.br',
        ),
      },
    });
  }

  /**
   * Envia email de notificação de tentativa suspeita
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
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'suporte@semtas.gov.br',
        ),
      },
    });
  }

  /**
   * Limpa o cache de templates
   */
  clearTemplateCache(): void {
    this.templatesCache.clear();
    this.logger.log('Cache de templates limpo');
  }

  /**
   * Verifica se o serviço está funcionando
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Health check do email passou - conexão SMTP OK');
      return true;
    } catch (error) {
      this.logger.error('Health check do email falhou:', {
        message: error.message,
        code: error.code,
        suggestion: this.getSuggestionForError(error),
      });
      return false;
    }
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats(): {
    enabled: boolean;
    templatesLoaded: number;
    transporterReady: boolean;
    environment: string;
    smtpConfig: {
      host: string;
      port: number;
      secure: boolean;
      provider: string;
    };
  } {
    const host = this.configService.get<string>('SMTP_HOST') || 'N/A';
    const port = this.configService.get<number>('SMTP_PORT', 587);

    let provider = 'Generic SMTP';
    if (this.isMailHog(host, port)) {
      provider = 'MailHog (Development)';
    } else if (host.toLowerCase().includes('mailtrap')) {
      provider = host.toLowerCase().includes('live')
        ? 'Mailtrap Live'
        : 'Mailtrap Testing';
    } else if (host.toLowerCase().includes('gmail')) {
      provider = 'Gmail';
    }

    return {
      enabled: this.isEnabled,
      templatesLoaded: this.templatesCache.size,
      transporterReady: !!this.transporter,
      environment: this.configService.get<string>('NODE_ENV') || 'development',
      smtpConfig: {
        host,
        port,
        secure: port === 465,
        provider,
      },
    };
  }

  /**
   * Força reconexão do transporter (útil para troubleshooting)
   */
  async reconnect(): Promise<boolean> {
    try {
      if (this.transporter) {
        this.transporter.close();
      }
      this.initializeTransporter();
      return await this.healthCheck();
    } catch (error) {
      this.logger.error('Erro ao reconectar transporter:', error);
      return false;
    }
  }

  /**
   * Testa envio de email (útil para verificar configuração)
   */
  async testEmail(recipient: string): Promise<boolean> {
    return this.sendEmail({
      to: recipient,
      subject: 'Teste de Configuração SMTP - SEMTAS',
      html: `
        <h2>Teste de Email</h2>
        <p>Este é um email de teste para verificar a configuração SMTP.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Servidor:</strong> ${this.configService.get('SMTP_HOST')}</p>
        <p><strong>Porta:</strong> ${this.configService.get('SMTP_PORT')}</p>
        <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
      `,
      text: `
        Teste de Email - SEMTAS
        
        Este é um email de teste para verificar a configuração SMTP.
        Data/Hora: ${new Date().toLocaleString('pt-BR')}
        Servidor: ${this.configService.get('SMTP_HOST')}
        Porta: ${this.configService.get('SMTP_PORT')}
        
        Se você recebeu este email, a configuração está funcionando corretamente!
      `,
    });
  }
}
