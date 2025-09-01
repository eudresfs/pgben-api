import { Injectable, Logger } from '@nestjs/common';
import {
  BaseNotificationContext,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  PagamentoEventType
} from '../interfaces/base-notification.interface';

/**
 * Interface para contexto de solicitação
 */
export interface SolicitacaoNotificationContext extends BaseNotificationContext {
  solicitacao_id: string;
  numero_solicitacao: string;
  status_anterior?: string;
  status_atual: string;
  prazo_resposta?: Date;
}

/**
 * Interface para contexto de pagamento
 */
export interface PagamentoNotificationContext extends BaseNotificationContext {
  pagamento_id: string;
  valor: number;
  evento_tipo: PagamentoEventType;
  numero_transacao?: string;
  metodo_pagamento?: string;
}

/**
 * Interface para contexto de concessão
 */
export interface ConcessaoNotificationContext extends BaseNotificationContext {
  concessao_id: string;
  numero_concessao: string;
  tipo_concessao: string;
  data_vencimento?: Date;
}

/**
 * Interface para contexto de aprovação
 */
export interface AprovacaoNotificationContext extends BaseNotificationContext {
  aprovacao_id: string;
  item_aprovacao: string;
  aprovador_id: string;
  decisao: 'aprovado' | 'rejeitado' | 'pendente';
  justificativa?: string;
}

/**
 * Interface para contexto de monitoramento
 */
export interface MonitoramentoNotificationContext extends BaseNotificationContext {
  alerta_id: string;
  metrica: string;
  valor_atual: number;
  valor_limite: number;
  severidade: 'baixa' | 'media' | 'alta' | 'critica';
}

/**
 * Factory para criação de contextos de notificação padronizados
 * 
 * Responsável por:
 * - Criar contextos padronizados para cada módulo
 * - Validar dados obrigatórios
 * - Aplicar configurações padrão
 * - Garantir consistência entre módulos
 */
@Injectable()
export class NotificationContextFactory {
  private readonly logger = new Logger(NotificationContextFactory.name);

  /**
   * Cria contexto para notificações de solicitação
   */
  criarContextoSolicitacao(dados: {
    destinatario_id: string;
    solicitacao_id: string;
    numero_solicitacao: string;
    status_atual: string;
    status_anterior?: string;
    prazo_resposta?: Date;
    titulo?: string;
    conteudo?: string;
    template_email?: string;
    canais?: NotificationChannel[];
    prioridade?: NotificationPriority;
    dados_contexto?: Record<string, any>;
  }): SolicitacaoNotificationContext {
    this.logger.debug('Criando contexto de solicitação', {
      solicitacao_id: dados.solicitacao_id,
      destinatario_id: dados.destinatario_id
    });

    return {
      destinatario_id: dados.destinatario_id,
      tipo: NotificationType.SOLICITACAO,
      prioridade: dados.prioridade || NotificationPriority.MEDIA,
      titulo: dados.titulo || `Solicitação ${dados.numero_solicitacao} - ${dados.status_atual}`,
      conteudo: dados.conteudo || `A solicitação ${dados.numero_solicitacao} teve seu status alterado para ${dados.status_atual}`,
      url: `/solicitacoes/${dados.solicitacao_id}`,
      template_email: dados.template_email,
      canais: dados.canais || [NotificationChannel.IN_APP],
      dados_contexto: {
        ...dados.dados_contexto,
        solicitacao_id: dados.solicitacao_id,
        numero_solicitacao: dados.numero_solicitacao,
        status_atual: dados.status_atual,
        status_anterior: dados.status_anterior,
        prazo_resposta: dados.prazo_resposta
      },
      solicitacao_id: dados.solicitacao_id,
      numero_solicitacao: dados.numero_solicitacao,
      status_anterior: dados.status_anterior,
      status_atual: dados.status_atual,
      prazo_resposta: dados.prazo_resposta
    };
  }

  /**
   * Cria contexto para notificações de pagamento
   */
  criarContextoPagamento(dados: {
    destinatario_id: string;
    pagamento_id: string;
    valor: number;
    evento_tipo: PagamentoEventType;
    numero_transacao?: string;
    metodo_pagamento?: string;
    titulo?: string;
    conteudo?: string;
    template_email?: string;
    canais?: NotificationChannel[];
    prioridade?: NotificationPriority;
    dados_contexto?: Record<string, any>;
  }): PagamentoNotificationContext {
    this.logger.debug('Criando contexto de pagamento', {
      pagamento_id: dados.pagamento_id,
      destinatario_id: dados.destinatario_id,
      evento_tipo: dados.evento_tipo
    });

    const prioridadePorEvento = this.obterPrioridadePagamento(dados.evento_tipo);

    return {
      destinatario_id: dados.destinatario_id,
      tipo: NotificationType.PAGAMENTO,
      prioridade: dados.prioridade || prioridadePorEvento,
      titulo: dados.titulo || this.gerarTituloPagamento(dados.evento_tipo, dados.valor),
      conteudo: dados.conteudo || this.gerarConteudoPagamento(dados.evento_tipo, dados.valor, dados.numero_transacao),
      url: `/pagamentos/${dados.pagamento_id}`,
      template_email: dados.template_email,
      canais: dados.canais || [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      dados_contexto: {
        ...dados.dados_contexto,
        pagamento_id: dados.pagamento_id,
        valor: dados.valor,
        evento_tipo: dados.evento_tipo,
        numero_transacao: dados.numero_transacao,
        metodo_pagamento: dados.metodo_pagamento
      },
      pagamento_id: dados.pagamento_id,
      valor: dados.valor,
      evento_tipo: dados.evento_tipo,
      numero_transacao: dados.numero_transacao,
      metodo_pagamento: dados.metodo_pagamento
    };
  }

  /**
   * Cria contexto para notificações de concessão
   */
  criarContextoConcessao(dados: {
    destinatario_id: string;
    concessao_id: string;
    numero_concessao: string;
    tipo_concessao: string;
    data_vencimento?: Date;
    titulo?: string;
    conteudo?: string;
    template_email?: string;
    canais?: NotificationChannel[];
    prioridade?: NotificationPriority;
    dados_contexto?: Record<string, any>;
  }): ConcessaoNotificationContext {
    this.logger.debug('Criando contexto de concessão', {
      concessao_id: dados.concessao_id,
      destinatario_id: dados.destinatario_id
    });

    return {
      destinatario_id: dados.destinatario_id,
      tipo: NotificationType.CONCESSAO,
      prioridade: dados.prioridade || NotificationPriority.ALTA,
      titulo: dados.titulo || `Concessão ${dados.numero_concessao} - ${dados.tipo_concessao}`,
      conteudo: dados.conteudo || `Nova concessão ${dados.numero_concessao} do tipo ${dados.tipo_concessao}`,
      url: `/concessoes/${dados.concessao_id}`,
      template_email: dados.template_email,
      canais: dados.canais || [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      dados_contexto: {
        ...dados.dados_contexto,
        concessao_id: dados.concessao_id,
        numero_concessao: dados.numero_concessao,
        tipo_concessao: dados.tipo_concessao,
        data_vencimento: dados.data_vencimento
      },
      concessao_id: dados.concessao_id,
      numero_concessao: dados.numero_concessao,
      tipo_concessao: dados.tipo_concessao,
      data_vencimento: dados.data_vencimento
    };
  }

  /**
   * Cria contexto para notificações de aprovação
   */
  criarContextoAprovacao(dados: {
    destinatario_id: string;
    aprovacao_id: string;
    item_aprovacao: string;
    aprovador_id: string;
    decisao: 'aprovado' | 'rejeitado' | 'pendente';
    justificativa?: string;
    titulo?: string;
    conteudo?: string;
    template_email?: string;
    canais?: NotificationChannel[];
    prioridade?: NotificationPriority;
    dados_contexto?: Record<string, any>;
  }): AprovacaoNotificationContext {
    this.logger.debug('Criando contexto de aprovação', {
      aprovacao_id: dados.aprovacao_id,
      destinatario_id: dados.destinatario_id,
      decisao: dados.decisao
    });

    const prioridadePorDecisao = dados.decisao === 'pendente' ? NotificationPriority.ALTA : NotificationPriority.MEDIA;

    return {
      destinatario_id: dados.destinatario_id,
      tipo: NotificationType.APROVACAO,
      prioridade: dados.prioridade || prioridadePorDecisao,
      titulo: dados.titulo || `Aprovação ${dados.decisao} - ${dados.item_aprovacao}`,
      conteudo: dados.conteudo || this.gerarConteudoAprovacao(dados.item_aprovacao, dados.decisao, dados.justificativa),
      url: `/aprovacoes/${dados.aprovacao_id}`,
      template_email: dados.template_email,
      canais: dados.canais || [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      dados_contexto: {
        ...dados.dados_contexto,
        aprovacao_id: dados.aprovacao_id,
        item_aprovacao: dados.item_aprovacao,
        aprovador_id: dados.aprovador_id,
        decisao: dados.decisao,
        justificativa: dados.justificativa
      },
      aprovacao_id: dados.aprovacao_id,
      item_aprovacao: dados.item_aprovacao,
      aprovador_id: dados.aprovador_id,
      decisao: dados.decisao,
      justificativa: dados.justificativa
    };
  }

  /**
   * Cria contexto para notificações de monitoramento
   */
  criarContextoMonitoramento(dados: {
    destinatario_id: string;
    alerta_id: string;
    metrica: string;
    valor_atual: number;
    valor_limite: number;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    titulo?: string;
    conteudo?: string;
    template_email?: string;
    canais?: NotificationChannel[];
    prioridade?: NotificationPriority;
    dados_contexto?: Record<string, any>;
  }): MonitoramentoNotificationContext {
    this.logger.debug('Criando contexto de monitoramento', {
      alerta_id: dados.alerta_id,
      destinatario_id: dados.destinatario_id,
      severidade: dados.severidade
    });

    const prioridadePorSeveridade = this.obterPrioridadeMonitoramento(dados.severidade);

    return {
      destinatario_id: dados.destinatario_id,
      tipo: NotificationType.MONITORAMENTO,
      prioridade: dados.prioridade || prioridadePorSeveridade,
      titulo: dados.titulo || `Alerta de ${dados.metrica} - ${dados.severidade.toUpperCase()}`,
      conteudo: dados.conteudo || `A métrica ${dados.metrica} atingiu ${dados.valor_atual}, ultrapassando o limite de ${dados.valor_limite}`,
      url: `/monitoramento/alertas/${dados.alerta_id}`,
      template_email: dados.template_email,
      canais: dados.canais || this.obterCanaisMonitoramento(dados.severidade),
      dados_contexto: {
        ...dados.dados_contexto,
        alerta_id: dados.alerta_id,
        metrica: dados.metrica,
        valor_atual: dados.valor_atual,
        valor_limite: dados.valor_limite,
        severidade: dados.severidade
      },
      alerta_id: dados.alerta_id,
      metrica: dados.metrica,
      valor_atual: dados.valor_atual,
      valor_limite: dados.valor_limite,
      severidade: dados.severidade
    };
  }

  /**
   * Obtém prioridade baseada no tipo de evento de pagamento
   */
  private obterPrioridadePagamento(evento: PagamentoEventType): NotificationPriority {
    switch (evento) {
      case PagamentoEventType.PAGAMENTO_REJEITADO:
      case PagamentoEventType.PAGAMENTO_CANCELADO:
        return NotificationPriority.ALTA;
      case PagamentoEventType.PAGAMENTO_APROVADO:
      case PagamentoEventType.PAGAMENTO_PROCESSADO:
        return NotificationPriority.MEDIA;
      default:
        return NotificationPriority.BAIXA;
    }
  }

  /**
   * Gera título para notificação de pagamento
   */
  private gerarTituloPagamento(evento: PagamentoEventType, valor: number): string {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);

    switch (evento) {
      case PagamentoEventType.PAGAMENTO_APROVADO:
        return `Pagamento aprovado - ${valorFormatado}`;
      case PagamentoEventType.PAGAMENTO_REJEITADO:
        return `Pagamento rejeitado - ${valorFormatado}`;
      case PagamentoEventType.PAGAMENTO_PROCESSADO:
        return `Pagamento processado - ${valorFormatado}`;
      default:
        return `Pagamento ${evento} - ${valorFormatado}`;
    }
  }

  /**
   * Gera conteúdo para notificação de pagamento
   */
  private gerarConteudoPagamento(evento: PagamentoEventType, valor: number, numeroTransacao?: string): string {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);

    const transacao = numeroTransacao ? ` (Transação: ${numeroTransacao})` : '';
    
    switch (evento) {
      case PagamentoEventType.PAGAMENTO_APROVADO:
        return `Seu pagamento de ${valorFormatado} foi aprovado com sucesso${transacao}.`;
      case PagamentoEventType.PAGAMENTO_REJEITADO:
        return `Seu pagamento de ${valorFormatado} foi rejeitado${transacao}. Verifique os dados e tente novamente.`;
      case PagamentoEventType.PAGAMENTO_PROCESSADO:
        return `Seu pagamento de ${valorFormatado} está sendo processado${transacao}.`;
      default:
        return `Pagamento de ${valorFormatado} - ${evento}${transacao}.`;
    }
  }

  /**
   * Gera conteúdo para notificação de aprovação
   */
  private gerarConteudoAprovacao(item: string, decisao: string, justificativa?: string): string {
    let conteudo = `O item "${item}" foi ${decisao}.`;
    
    if (justificativa) {
      conteudo += ` Justificativa: ${justificativa}`;
    }
    
    return conteudo;
  }

  /**
   * Obtém prioridade baseada na severidade do monitoramento
   */
  private obterPrioridadeMonitoramento(severidade: string): NotificationPriority {
    switch (severidade) {
      case 'critica':
        return NotificationPriority.URGENTE;
      case 'alta':
        return NotificationPriority.ALTA;
      case 'media':
        return NotificationPriority.MEDIA;
      default:
        return NotificationPriority.BAIXA;
    }
  }

  /**
   * Obtém canais baseados na severidade do monitoramento
   */
  private obterCanaisMonitoramento(severidade: string): NotificationChannel[] {
    switch (severidade) {
      case 'critica':
        return [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS];
      case 'alta':
        return [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
      default:
        return [NotificationChannel.IN_APP];
    }
  }
}