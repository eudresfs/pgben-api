import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../../../entities/notification-template.entity';

/**
 * Enum para mapear tipos de notificação de aprovação para códigos de template
 */
export enum TipoNotificacaoAprovacao {
  SOLICITACAO_CRIADA = 'SOLICITACAO_CRIADA',
  SOLICITACAO_APROVADA = 'SOLICITACAO_APROVADA',
  SOLICITACAO_REJEITADA = 'SOLICITACAO_REJEITADA',
  SOLICITACAO_EXECUTADA = 'SOLICITACAO_EXECUTADA',
  ERRO_EXECUCAO = 'ERRO_EXECUCAO',
  DECISAO_TOMADA = 'DECISAO_TOMADA',
  SOLICITACAO_CANCELADA = 'SOLICITACAO_CANCELADA',
}

/**
 * Serviço para mapear tipos de notificação de aprovação para templates
 *
 * Centraliza a lógica de associação entre tipos de notificação do módulo de aprovação
 * e templates específicos, garantindo consistência e facilitando manutenção.
 */
@Injectable()
export class AprovacaoTemplateMappingService {
  private readonly logger = new Logger(AprovacaoTemplateMappingService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  /**
   * Mapeia tipos de notificação de aprovação para códigos de template
   */
  private readonly templateMappings: Record<TipoNotificacaoAprovacao, string> = {
    [TipoNotificacaoAprovacao.SOLICITACAO_CRIADA]: 'nova-solicitacao-aprovacao',
    [TipoNotificacaoAprovacao.SOLICITACAO_APROVADA]: 'aprovacao-solicitacao-aprovada',
    [TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA]: 'aprovacao-solicitacao-rejeitada',
    [TipoNotificacaoAprovacao.SOLICITACAO_EXECUTADA]: 'solicitacao-aprovacao-processada',
    [TipoNotificacaoAprovacao.ERRO_EXECUCAO]: 'aprovacao-erro-execucao',
    [TipoNotificacaoAprovacao.DECISAO_TOMADA]: 'aprovacao-decisao-tomada',
    [TipoNotificacaoAprovacao.SOLICITACAO_CANCELADA]: 'aprovacao-solicitacao-cancelada',
  };

  /**
   * Obtém o código do template para um tipo de notificação
   */
  private obterCodigoTemplate(tipo: TipoNotificacaoAprovacao): string {
    return this.templateMappings[tipo];
  }

  /**
   * Busca um template pelo tipo de notificação de aprovação
   * @param tipoNotificacao Tipo da notificação de aprovação
   * @returns Template encontrado ou null
   */
  async buscarTemplatePorTipo(
    tipoNotificacao: keyof typeof TipoNotificacaoAprovacao,
  ): Promise<NotificationTemplate | null> {
    try {
      this.logger.debug(`Buscando template para tipo de aprovação: '${tipoNotificacao}'`);

      const codigoTemplate = this.obterCodigoTemplate(
        tipoNotificacao as TipoNotificacaoAprovacao,
      );
      this.logger.debug(`Código do template mapeado: '${codigoTemplate}'`);

      if (!codigoTemplate) {
        this.logger.warn(
          `Tipo de notificação de aprovação '${tipoNotificacao}' não mapeado para nenhum template`,
        );
        return null;
      }

      const template = await this.templateRepository.findOne({
        where: { codigo: codigoTemplate, ativo: true },
      });

      if (!template) {
        this.logger.warn(
          `Template com código '${codigoTemplate}' não encontrado ou inativo no banco de dados`,
        );
        return null;
      }

      this.logger.debug(
        `Template '${codigoTemplate}' encontrado para tipo '${tipoNotificacao}' (ID: ${template.id})`,
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
    return Object.keys(TipoNotificacaoAprovacao).includes(tipoNotificacao);
  }

  /**
   * Retorna todos os mapeamentos disponíveis
   * @returns Objeto com todos os mapeamentos tipo -> código do template
   */
  obterTodosMapeamentos(): Record<string, string> {
    return { ...this.templateMappings };
  }

  /**
   * Busca template e retorna dados formatados para notificação
   * @param tipoNotificacao Tipo da notificação de aprovação
   * @returns Objeto com template_id e informações de log
   */
  async prepararDadosTemplate(
    tipoNotificacao: keyof typeof TipoNotificacaoAprovacao,
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

  /**
   * Lista todos os tipos de notificação de aprovação disponíveis
   * @returns Array com todos os tipos disponíveis
   */
  listarTiposDisponiveis(): string[] {
    return Object.keys(TipoNotificacaoAprovacao);
  }

  /**
   * Obtém informações detalhadas sobre um mapeamento específico
   * @param tipoNotificacao Tipo da notificação
   * @returns Informações detalhadas do mapeamento
   */
  async obterInformacoesMapeamento(tipoNotificacao: keyof typeof TipoNotificacaoAprovacao): Promise<{
    tipo: string;
    codigoTemplate: string;
    templateExiste: boolean;
    templateAtivo?: boolean;
    templateId?: string;
  }> {
    const codigoTemplate = this.obterCodigoTemplate(tipoNotificacao as TipoNotificacaoAprovacao);
    const template = await this.buscarTemplatePorTipo(tipoNotificacao);

    return {
      tipo: tipoNotificacao,
      codigoTemplate,
      templateExiste: !!template,
      templateAtivo: template?.ativo,
      templateId: template?.id,
    };
  }
}