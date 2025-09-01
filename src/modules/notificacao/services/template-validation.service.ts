import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../../../entities/notification-template.entity';
import {
  TemplateValidationResult,
  NotificationChannel,
  BaseNotificationContext
} from '../interfaces/base-notification.interface';

/**
 * Serviço de validação de templates
 * 
 * Responsável por:
 * - Validar obrigatoriamente a existência de templates para e-mail
 * - Verificar se templates estão ativos
 * - Bloquear envios sem template válido
 * - Fornecer logs estruturados para auditoria
 */
@Injectable()
export class TemplateValidationService {
  private readonly logger = new Logger(TemplateValidationService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>
  ) {}

  /**
   * Valida se um template é obrigatório e válido para o contexto
   * 
   * @param context Contexto da notificação
   * @returns Resultado da validação
   */
  async validarTemplate(context: BaseNotificationContext): Promise<TemplateValidationResult> {
    const startTime = Date.now();
    const logContext = {
      destinatario_id: context.destinatario_id,
      tipo: context.tipo,
      template_email: context.template_email,
      canais: context.canais
    };

    this.logger.log('Iniciando validação de template', logContext);

    try {
      // Verifica se e-mail está nos canais solicitados
      const requiresEmailTemplate = context.canais.includes(NotificationChannel.EMAIL);
      
      if (!requiresEmailTemplate) {
        this.logger.log('Template de e-mail não necessário', logContext);
        return {
          valido: true,
          existe: true,
          ativo: true,
          erros: []
        };
      }

      // E-mail requer template obrigatório
      if (!context.template_email) {
        const erro = 'Template de e-mail é obrigatório quando canal EMAIL está especificado';
        this.logger.error(erro, logContext);
        return {
          valido: false,
          existe: false,
          ativo: false,
          erros: [erro]
        };
      }

      // Busca o template no banco
      const template = await this.templateRepository.findOne({
        where: { nome: context.template_email }
      });

      if (!template) {
        const erro = `Template '${context.template_email}' não encontrado no sistema`;
        this.logger.error(erro, logContext);
        return {
          valido: false,
          existe: false,
          ativo: false,
          erros: [erro]
        };
      }

      if (!template.ativo) {
        const erro = `Template '${context.template_email}' está inativo`;
        this.logger.error(erro, logContext);
        return {
          valido: false,
          existe: true,
          ativo: false,
          erros: [erro]
        };
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Template validado com sucesso em ${duration}ms`, {
        ...logContext,
        template_id: template.id,
        duration
      });

      return {
        valido: true,
        existe: true,
        ativo: true,
        erros: []
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Erro durante validação de template', {
        ...logContext,
        error: error.message,
        stack: error.stack,
        duration
      });

      return {
        valido: false,
        existe: false,
        ativo: false,
        erros: [`Erro interno durante validação: ${error.message}`]
      };
    }
  }

  /**
   * Valida múltiplos templates em lote
   * 
   * @param contexts Array de contextos para validação
   * @returns Array de resultados de validação
   */
  async validarTemplatesLote(contexts: BaseNotificationContext[]): Promise<TemplateValidationResult[]> {
    this.logger.log(`Iniciando validação em lote de ${contexts.length} templates`);
    
    const resultados = await Promise.all(
      contexts.map(context => this.validarTemplate(context))
    );

    const sucessos = resultados.filter(r => r.valido).length;
    const falhas = resultados.length - sucessos;

    this.logger.log('Validação em lote concluída', {
      total: contexts.length,
      sucessos,
      falhas,
      taxa_sucesso: (sucessos / contexts.length) * 100
    });

    return resultados;
  }

  /**
   * Lista templates ativos disponíveis
   * 
   * @returns Lista de templates ativos
   */
  async listarTemplatesAtivos(): Promise<NotificationTemplate[]> {
    try {
      const templates = await this.templateRepository.find({
        where: { ativo: true },
        order: { nome: 'ASC' }
      });

      this.logger.log(`Encontrados ${templates.length} templates ativos`);
      return templates;

    } catch (error) {
      this.logger.error('Erro ao listar templates ativos', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Verifica se um template específico existe e está ativo
   * 
   * @param nomeTemplate Nome do template
   * @returns True se template existe e está ativo
   */
  async templateExisteEAtivo(nomeTemplate: string): Promise<boolean> {
    try {
      const template = await this.templateRepository.findOne({
        where: { nome: nomeTemplate, ativo: true }
      });

      return !!template;

    } catch (error) {
      this.logger.error('Erro ao verificar template', {
        template: nomeTemplate,
        error: error.message
      });
      return false;
    }
  }
}