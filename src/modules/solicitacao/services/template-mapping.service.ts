import { Injectable, Logger } from '@nestjs/common';
import { TemplateRepository } from '../../configuracao/repositories/template.repository';
import { NotificationTemplate } from '../../../entities/notification-template.entity';

/**
 * Enum para mapear tipos de notificação para códigos de template
 */
export enum TipoNotificacaoTemplate {
  APROVACAO = 'APROVACAO',
  INDEFERIMENTO = 'INDEFERIMENTO',
  CANCELAMENTO = 'CANCELAMENTO',
  PENDENCIA = 'PENDENCIA',
  DOCUMENTOS = 'DOCUMENTOS',
  PRAZO = 'PRAZO',
}

/**
 * Serviço helper para mapear tipos de notificação para templates
 *
 * Centraliza a lógica de associação entre tipos de notificação e templates,
 * facilitando a manutenção e garantindo consistência.
 */
@Injectable()
export class TemplateMappingService {
  private readonly logger = new Logger(TemplateMappingService.name);

  constructor(private readonly templateRepository: TemplateRepository) {}

  /**
   * Mapeia tipos de notificação para códigos de template
   */
  private readonly templateMappings: Record<TipoNotificacaoTemplate, string> = {
    [TipoNotificacaoTemplate.APROVACAO]: 'solicitacao-aprovada',
    [TipoNotificacaoTemplate.INDEFERIMENTO]: 'solicitacao-indeferida',
    [TipoNotificacaoTemplate.CANCELAMENTO]: 'solicitacao-cancelada',
    [TipoNotificacaoTemplate.PENDENCIA]: 'solicitacao-pendencia-criada',
    [TipoNotificacaoTemplate.DOCUMENTOS]: 'solicitacao-documentos-solicitados',
    [TipoNotificacaoTemplate.PRAZO]: 'solicitacao-prazo-vencimento',
  };

  private obterCodigoTemplate(tipo: TipoNotificacaoTemplate): string {
    return this.templateMappings[tipo];
  }

  /**
   * Busca um template pelo tipo de notificação
   * @param tipoNotificacao Tipo da notificação
   * @returns Template encontrado ou null
   */
  async buscarTemplatePorTipo(
    tipoNotificacao: keyof typeof TipoNotificacaoTemplate,
  ): Promise<NotificationTemplate | null> {
    try {
      this.logger.debug(`Buscando template para tipo: '${tipoNotificacao}'`);
      this.logger.debug(
        `Enum TipoNotificacaoTemplate:`,
        TipoNotificacaoTemplate,
      );

      const codigoTemplate = this.obterCodigoTemplate(
        tipoNotificacao as TipoNotificacaoTemplate,
      );
      this.logger.debug(`Código do template mapeado: '${codigoTemplate}'`);

      if (!codigoTemplate) {
        this.logger.warn(
          `Tipo de notificação '${tipoNotificacao}' não mapeado para nenhum template`,
        );
        return null;
      }

      const template =
        await this.templateRepository.findByCodigo(codigoTemplate);
      this.logger.debug(
        `Template encontrado no banco:`,
        template ? `ID: ${template.id}, Código: ${template.codigo}` : 'null',
      );

      if (!template) {
        this.logger.warn(
          `Template com código '${codigoTemplate}' não encontrado no banco de dados`,
        );
        return null;
      }

      this.logger.debug(
        `Template '${codigoTemplate}' encontrado para tipo '${tipoNotificacao}'`,
      );
      return template;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar template para tipo '${tipoNotificacao}': ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Verifica se um tipo de notificação possui template mapeado
   * @param tipoNotificacao Tipo da notificação
   * @returns Boolean indicando se existe mapeamento
   */
  temTemplateMapeado(tipoNotificacao: string): boolean {
    return Object.keys(TipoNotificacaoTemplate).includes(tipoNotificacao);
  }

  /**
   * Retorna todos os mapeamentos disponíveis
   * @returns Objeto com todos os mapeamentos tipo -> código do template
   */
  obterTodosMapeamentos(): Record<string, string> {
    return { ...TipoNotificacaoTemplate };
  }

  /**
   * Busca template e retorna dados formatados para notificação
   * @param tipoNotificacao Tipo da notificação
   * @returns Objeto com template_id e informações de log
   */
  async prepararDadosTemplate(
    tipoNotificacao: keyof typeof TipoNotificacaoTemplate,
  ): Promise<{
    template_id?: string;
    templateEncontrado: boolean;
    codigoTemplate?: string;
  }> {
    const template = await this.buscarTemplatePorTipo(tipoNotificacao);

    return {
      template_id: template?.id,
      templateEncontrado: !!template,
      codigoTemplate: template?.codigo,
    };
  }
}
