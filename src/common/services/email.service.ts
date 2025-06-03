
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
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private templatesCache = new Map<string, EmailTemplate>();
  private readonly templatesDir: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.templatesDir = path.join(process.cwd(), 'src', 'templates', 'email');
    this.isEnabled = this.configService.get<boolean>('EMAIL_ENABLED', false);
    
    if (this.isEnabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Serviço de email desabilitado. Configure EMAIL_ENABLED=true para habilitar.');
    }
  }

  /**
   * Inicializa o transporter do Nodemailer
   * Configurado para usar STARTTLS na porta 587 (padrão Mailtrap)
   */
  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const requireTLS = this.configService.get<boolean>('SMTP_REQUIRE_TLS', true);
    const rejectUnauthorized = this.configService.get<boolean>('SMTP_REJECT_UNAUTHORIZED', false);

    if (!host || !user || !pass) {
      this.logger.error('Configurações SMTP incompletas. Verifique SMTP_HOST, SMTP_USER e SMTP_PASS.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // false para porta 587, true para porta 465
      requireTLS, // Força uso de STARTTLS para porta 587
      auth: {
        user,
        pass,
      },
      tls: {
        // Configurações TLS mais permissivas para desenvolvimento
        rejectUnauthorized,
        ciphers: 'SSLv3',
        minVersion: 'TLSv1.2', // Versão mínima do TLS
      },
      pool: true, // Usar pool de conexões
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10, // Máximo 10 emails por segundo
      connectionTimeout: 60000, // 60 segundos timeout
      greetingTimeout: 30000, // 30 segundos para greeting
      socketTimeout: 60000, // 60 segundos socket timeout
    });

    // Verificar conexão com melhor tratamento de erro
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Erro na configuração SMTP:', {
          error: error.message,
          code: error.code,
          command: error.command,
          host,
          port,
          secure,
          requireTLS,
        });
      } else {
        this.logger.log(`Servidor SMTP configurado com sucesso: ${host}:${port} (TLS: ${requireTLS})`);
      }
    });
  }

  /**
   * Envia um email
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
          text = template.text ? this.compileTemplate(template.text, options.context || {}) : undefined;
          subject = this.compileTemplate(template.subject, options.context || {});
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

      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'noreply@semtas.gov.br'),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject,
        html,
        text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.log('Email enviado com sucesso', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      this.logger.error('Erro ao enviar email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Carrega um template de email
   */
  private async loadTemplate(templateName: string): Promise<EmailTemplate | null> {
    // Verificar cache primeiro
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesDir, templateName);
      
      // Carregar arquivos do template
      const htmlPath = path.join(templatePath, 'template.hbs');
      const textPath = path.join(templatePath, 'template.txt');
      const configPath = path.join(templatePath, 'config.json');

      if (!fs.existsSync(htmlPath)) {
        this.logger.error(`Template HTML não encontrado: ${htmlPath}`);
        return null;
      }

      const html = fs.readFileSync(htmlPath, 'utf8');
      const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : undefined;
      
      let subject = 'Notificação - SEMTAS';
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        subject = config.subject || subject;
      }

      const template: EmailTemplate = { subject, html, text };
      
      // Cache do template
      this.templatesCache.set(templateName, template);
      
      return template;
    } catch (error) {
      this.logger.error(`Erro ao carregar template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Compila um template Handlebars
   */
  private compileTemplate(template: string, context: Record<string, any>): string {
    try {
      const compiledTemplate = handlebars.compile(template);
      return compiledTemplate(context);
    } catch (error) {
      this.logger.error('Erro ao compilar template:', error);
      return template; // Retorna template original em caso de erro
    }
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

    return this.sendEmail({
      to: email,
      template: 'password-reset',
      context: {
        name,
        resetUrl,
        expiresAt: expiresAt.toLocaleString('pt-BR'),
        expiresInMinutes: expiresIn,
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@semtas.gov.br'),
      },
    });
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
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@semtas.gov.br'),
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
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'suporte@semtas.gov.br'),
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
      return true;
    } catch (error) {
      this.logger.error('Health check do email falhou:', error);
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
  } {
    return {
      enabled: this.isEnabled,
      templatesLoaded: this.templatesCache.size,
      transporterReady: !!this.transporter,
    };
  }
}