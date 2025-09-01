import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AprovacaoEvent,
  AprovacaoEventType,
} from '../events/aprovacao-events';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
// import { HistoricoAprovacaoService } from '../services/historico-aprovacao.service'; // Removido temporariamente

/**
 * Listener responsável por processar eventos do módulo de Aprovação
 * 
 * Escuta eventos emitidos pelo AprovacaoEventosService e executa ações
 * como envio de notificações e registro de histórico.
 * 
 * @author Equipe PGBen
 */
@Injectable()
export class AprovacaoEventListener {
  private readonly logger = new Logger(AprovacaoEventListener.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
  ) { }

  /**
   * Processa evento de criação de aprovação
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_CREATED)
  async handleAprovacaoCriada(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de criação de aprovação: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitacaoId, tipoAprovacao, prioridade, usuarioCriadorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'CRIADA',
      //   'Aprovação criada no sistema',
      //   usuarioCriadorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: usuarioCriadorId,
        tipo: 'APROVACAO_CRIADA',
        titulo: 'Nova Aprovação Criada',
        conteudo: `Sua solicitação de aprovação do tipo ${tipoAprovacao} foi criada e está aguardando análise.`,
        dados: {
          aprovacaoId,
          tipoAprovacao,
          prioridade,
        },
      });

      // Notificar responsáveis se houver atribuição
      if (data.aprovadorId) {
        await this.notificacaoService.criarNotificacaoAprovacao({
          destinatario_id: data.aprovadorId,
          titulo: 'Nova Aprovação Atribuída',
          conteudo: `Uma nova aprovação do tipo ${tipoAprovacao} foi atribuída a você.`,
          solicitacao_id: aprovacaoId,
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          dados_contexto: {
            destinatario_id: data.aprovadorId,
            titulo: 'Nova Aprovação Atribuída',
            conteudo: `Uma nova aprovação do tipo ${tipoAprovacao} foi atribuída a você.`,
            link: `/aprovacoes/detalhes/${aprovacaoId}`,
            aprovacao_id: aprovacaoId,
          }
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de criação de aprovação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de atribuição de aprovação
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_ASSIGNED)
  async handleAprovacaoAtribuida(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de atribuição de aprovação: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { aprovadorId, usuarioAtribuidorId, motivoAtribuicao } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'ATRIBUIDA',
      //   motivoAtribuicao || 'Aprovação atribuída a responsável',
      //   usuarioAtribuidorId,
      // ); // Removido temporariamente

      // Notificar novo responsável
      await this.notificacaoService.criarNotificacaoAprovacao({
        destinatario_id: aprovadorId,
        titulo: 'Aprovação Atribuída',
        conteudo: 'Uma aprovação foi atribuída a você para análise.',
        solicitacao_id: aprovacaoId,
        link: `/aprovacoes/detalhes/${aprovacaoId}`,
        dados_contexto: {
          destinatario_id: aprovadorId,
          titulo: 'Aprovação Atribuída',
          conteudo: 'Uma aprovação foi atribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de atribuição de aprovação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de reatribuição de aprovação
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_REASSIGNED)
  async handleAprovacaoReatribuida(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de reatribuição de aprovação: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { aprovadorNovoId, aprovadorAnteriorId, usuarioReatribuidorId, motivoReatribuicao } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'REATRIBUIDA',
      //   motivoReatribuicao || 'Aprovação reatribuída',
      //   usuarioReatribuidorId,
      // ); // Removido temporariamente

      // Notificar novo responsável
      await this.notificacaoService.criarNotificacaoAprovacao({
        destinatario_id: aprovadorNovoId,
        titulo: 'Aprovação Reatribuída',
        conteudo: 'Uma aprovação foi reatribuída a você para análise.',
        solicitacao_id: aprovacaoId,
        link: `/aprovacoes/detalhes/${aprovacaoId}`,
        dados_contexto: {
          destinatario_id: aprovadorNovoId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });

      // Notificar responsável anterior
      if (aprovadorAnteriorId) {
        await this.notificacaoService.criarNotificacaoSistema({
          destinatario_id: aprovadorAnteriorId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída para outro responsável.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          dados_contexto: {
            destinatario_id: aprovadorNovoId,
            titulo: 'Aprovação Reatribuída',
            conteudo: 'Uma aprovação foi reatribuída a você para análise.',
            link: `/aprovacoes/detalhes/${aprovacaoId}`,
            aprovacao_id: aprovacaoId,
          }
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de reatribuição de aprovação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de aprovação aprovada
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_APPROVED)
  async handleAprovacaoAprovada(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de aprovação aprovada: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { aprovadorId, observacaoAprovacao } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'APROVADA',
      //   observacaoAprovacao || 'Aprovação aprovada',
      //   aprovadorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.criarNotificacaoAprovacao({
        destinatario_id: data.solicitanteId,
        titulo: 'Aprovação Aprovada',
        conteudo: 'Sua solicitação de aprovação foi aprovada.',
        solicitacao_id: aprovacaoId,
        link: `/aprovacoes/detalhes/${aprovacaoId}`,
        dados_contexto: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação aprovada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de aprovação rejeitada
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_REJECTED)
  async handleAprovacaoRejeitada(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de aprovação rejeitada: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, rejeitadoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'REJEITADA',
      //   motivo || 'Aprovação rejeitada',
      //   rejeitadoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: solicitanteId,
        titulo: 'Aprovação Rejeitada',
        conteudo: `Sua solicitação de aprovação foi rejeitada. Motivo: ${motivo || 'Não informado'}`,
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        link: `/aprovacoes/detalhes/${aprovacaoId}`,
        dados_contexto: {
          destinatario_id: solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação rejeitada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de aprovação devolvida
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_RETURNED)
  async handleAprovacaoDevolvida(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de aprovação devolvida: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, devolvidoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'DEVOLVIDA',
      //   motivo || 'Aprovação devolvida para correções',
      //   devolvidoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'APROVACAO_DEVOLVIDA',
        titulo: 'Aprovação Devolvida',
        conteudo: 'Sua solicitação de aprovação foi devolvida para correções.',
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação devolvida: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de cancelamento de aprovação
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_CANCELLED)
  async handleAprovacaoCancelada(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de cancelamento de aprovação: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, canceladoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'CANCELADA',
      //   motivo || 'Aprovação cancelada',
      //   canceladoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'APROVACAO_CANCELADA',
        titulo: 'Aprovação Cancelada',
        conteudo: 'Sua solicitação de aprovação foi cancelada.',
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de cancelamento de aprovação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de mudança de status
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_STATUS_CHANGED)
  async handleMudancaStatus(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de mudança de status: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { statusAnterior, novoStatus, alteradoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'STATUS_ALTERADO',
      //   `Status alterado de ${statusAnterior} para ${novoStatus}. ${motivo || ''}`,
      //   alteradoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de mudança de status: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de aprovação em análise
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_IN_ANALYSIS)
  async handleAprovacaoEmAnalise(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de aprovação em análise: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, analistId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'EM_ANALISE',
      //   'Aprovação iniciou processo de análise',
      //   analistId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'APROVACAO_EM_ANALISE',
        titulo: 'Aprovação em Análise',
        conteudo: 'Sua solicitação de aprovação está sendo analisada.',
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação em análise: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de documentos pendentes
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_PENDING_DOCUMENTS)
  async handleDocumentosPendentes(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de documentos pendentes: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, documentosPendentes } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'DOCUMENTOS_PENDENTES',
      //   `Documentos pendentes: ${documentosPendentes.join(', ')}`,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'DOCUMENTOS_PENDENTES',
        titulo: 'Documentos Pendentes',
        conteudo: 'Existem documentos pendentes para sua aprovação.',
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de documentos pendentes: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de suspensão de aprovação
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.APROVACAO_SUSPENDED)
  async handleAprovacaoSuspensa(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de suspensão de aprovação: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, suspensoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'SUSPENSA',
      //   motivo || 'Aprovação suspensa',
      //   suspensoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'APROVACAO_SUSPENSA',
        titulo: 'Aprovação Suspensa',
        conteudo: 'Sua solicitação de aprovação foi suspensa.',
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de suspensão de aprovação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de anexação de documento
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DOCUMENTO_ATTACHED)
  async handleDocumentoAnexado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de anexação de documento: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { documentoId, tipoDocumento, anexadoPorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'DOCUMENTO_ANEXADO',
      //   `Documento anexado: ${tipoDocumento}`,
      //   anexadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de anexação de documento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de validação de documento
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DOCUMENTO_VALIDATED)
  async handleDocumentoValidado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de validação de documento: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { documentoId, tipoDocumento, validadoPorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'DOCUMENTO_VALIDADO',
      //   `Documento validado: ${tipoDocumento}`,
      //   validadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de validação de documento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de rejeição de documento
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DOCUMENTO_REJECTED)
  async handleDocumentoRejeitado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de rejeição de documento: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { documentoId, tipoDocumento, rejeitadoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'DOCUMENTO_REJEITADO',
      //   `Documento rejeitado: ${tipoDocumento}. Motivo: ${motivo}`,
      //   rejeitadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de rejeição de documento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de solicitação de documento
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DOCUMENTO_REQUESTED)
  async handleDocumentoSolicitado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de solicitação de documento: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, tipoDocumento, solicitadoPorId, observacoes } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'DOCUMENTO_SOLICITADO',
      //   `Documento solicitado: ${tipoDocumento}. ${observacoes || ''}`,
      //   solicitadoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'DOCUMENTO_SOLICITADO',
        titulo: 'Documento Solicitado',
        conteudo: `É necessário anexar o documento: ${tipoDocumento}`,
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
          observacoes,
          tipoDocumento
        }
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de solicitação de documento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de prazo próximo
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DEADLINE_APPROACHING)
  async handlePrazoProximo(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de prazo próximo: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, responsavelId, prazo, diasRestantes } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'PRAZO_PROXIMO',
      //   `Prazo próximo do vencimento. ${diasRestantes} dias restantes.`,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'PRAZO_PROXIMO',
        titulo: 'Prazo Próximo do Vencimento',
        conteudo: `O prazo para sua aprovação está próximo do vencimento (${diasRestantes} dias restantes).`,
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
          aprovacaoId,
          prazo,
          diasRestantes,
        }
      });

      // Notificar responsável se houver
      if (responsavelId) {
        await this.notificacaoService.enviarNotificacao({
          destinatario_id: responsavelId,
          tipo: 'PRAZO_PROXIMO',
          titulo: 'Prazo Próximo do Vencimento',
          conteudo: `O prazo para análise da aprovação está próximo do vencimento (${diasRestantes} dias restantes).`,
          entidade_relacionada_id: aprovacaoId,
          entidade_tipo: 'aprovacao',
          dados: {
            destinatario_id: data.solicitanteId,
            titulo: 'Aprovação Reatribuída',
            conteudo: 'Uma aprovação foi reatribuída a você para análise.',
            link: `/aprovacoes/detalhes/${aprovacaoId}`,
            aprovacao_id: aprovacaoId,
          }
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prazo próximo: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de prazo expirado
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DEADLINE_EXPIRED)
  async handlePrazoExpirado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de prazo expirado: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, responsavelId, prazo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'PRAZO_EXPIRADO',
      //   'Prazo para aprovação expirado',
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'PRAZO_EXPIRADO',
        titulo: 'Prazo Expirado',
        conteudo: 'O prazo para sua aprovação expirou.',
        entidade_relacionada_id: aprovacaoId,
        entidade_tipo: 'aprovacao',
        dados: {
          destinatario_id: data.solicitanteId,
          titulo: 'Aprovação Reatribuída',
          conteudo: 'Uma aprovação foi reatribuída a você para análise.',
          link: `/aprovacoes/detalhes/${aprovacaoId}`,
          aprovacao_id: aprovacaoId,
        }
      });

      // Notificar responsável se houver
      if (responsavelId) {
        await this.notificacaoService.enviarNotificacao({
          destinatario_id: responsavelId,
          tipo: 'PRAZO_EXPIRADO',
          titulo: 'Prazo Expirado',
          conteudo: 'O prazo para análise da aprovação expirou.',
          dados: {
            aprovacaoId,
            prazo,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prazo expirado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de extensão de prazo
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.DEADLINE_EXTENDED)
  async handlePrazoEstendido(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de extensão de prazo: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { solicitanteId, responsavelId, prazoAnterior, novoPrazo, estendidoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'PRAZO_ESTENDIDO',
      //   `Prazo estendido. ${motivo || ''}`,
      //   estendidoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'PRAZO_ESTENDIDO',
        titulo: 'Prazo Estendido',
        conteudo: 'O prazo para sua aprovação foi estendido.',
        dados: {
          aprovacaoId,
          prazoAnterior,
          novoPrazo,
          motivo,
        },
      });

      // Notificar responsável se houver
      if (responsavelId) {
        await this.notificacaoService.enviarNotificacao({
          destinatario_id: responsavelId,
          tipo: 'PRAZO_ESTENDIDO',
          titulo: 'Prazo Estendido',
          conteudo: 'O prazo para análise da aprovação foi estendido.',
          dados: {
            aprovacaoId,
            prazoAnterior,
            novoPrazo,
            motivo,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de extensão de prazo: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de criação de parecer
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.PARECER_CREATED)
  async handleParecerCriado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de criação de parecer: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { parecerId, criadoPorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'PARECER_CRIADO',
      //   'Parecer técnico criado',
      //   criadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de criação de parecer: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de atualização de parecer
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.PARECER_UPDATED)
  async handleParecerAtualizado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de atualização de parecer: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { parecerId, atualizadoPorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'PARECER_ATUALIZADO',
      //   'Parecer técnico atualizado',
      //   atualizadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de atualização de parecer: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de finalização de parecer
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.PARECER_FINALIZED)
  async handleParecerFinalizado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de finalização de parecer: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { parecerId, finalizadoPorId, recomendacao } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'PARECER_FINALIZADO',
      //   `Parecer técnico finalizado. Recomendação: ${recomendacao}`,
      //   finalizadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de finalização de parecer: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de submissão de recurso
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.RECURSO_SUBMITTED)
  async handleRecursoSubmetido(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de submissão de recurso: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { recursoId, solicitanteId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'RECURSO_SUBMETIDO',
      //   `Recurso submetido. Motivo: ${motivo}`,
      //   solicitanteId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'RECURSO_SUBMETIDO',
        titulo: 'Recurso Submetido',
        conteudo: 'Seu recurso foi submetido e será analisado.',
        dados: {
          aprovacaoId,
          recursoId,
          motivo,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de submissão de recurso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de análise de recurso
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.RECURSO_ANALYZED)
  async handleRecursoAnalisado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de análise de recurso: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { recursoId, analisadoPorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'RECURSO_ANALISADO',
      //   'Recurso analisado',
      //   analisadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de análise de recurso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de aprovação de recurso
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.RECURSO_APPROVED)
  async handleRecursoAprovado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de aprovação de recurso: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { recursoId, solicitanteId, aprovadoPorId } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'RECURSO_APROVADO',
      //   'Recurso aprovado',
      //   aprovadoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'RECURSO_APROVADO',
        titulo: 'Recurso Aprovado',
        conteudo: 'Seu recurso foi aprovado.',
        dados: {
          aprovacaoId,
          recursoId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação de recurso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de rejeição de recurso
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.RECURSO_REJECTED)
  async handleRecursoRejeitado(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de rejeição de recurso: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { recursoId, solicitanteId, rejeitadoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'RECURSO_REJEITADO',
      //   `Recurso rejeitado. Motivo: ${motivo}`,
      //   rejeitadoPorId,
      // ); // Removido temporariamente

      // Notificar solicitante
      await this.notificacaoService.enviarNotificacao({
        destinatario_id: solicitanteId,
        tipo: 'RECURSO_REJEITADO',
        titulo: 'Recurso Rejeitado',
        conteudo: 'Seu recurso foi rejeitado.',
        dados: {
          aprovacaoId,
          recursoId,
          motivo,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de rejeição de recurso: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de solicitação de auditoria
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.AUDITORIA_REQUESTED)
  async handleAuditoriaSolicitada(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de solicitação de auditoria: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { auditoriaId, solicitadoPorId, motivo } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'AUDITORIA_SOLICITADA',
      //   `Auditoria solicitada. Motivo: ${motivo}`,
      //   solicitadoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de solicitação de auditoria: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa evento de conclusão de auditoria
   * @param evento Dados do evento
   */
  @OnEvent(AprovacaoEventType.AUDITORIA_COMPLETED)
  async handleAuditoriaConcluida(evento: AprovacaoEvent): Promise<void> {
    this.logger.log(
      `Processando evento de conclusão de auditoria: ${evento.aprovacaoId}`,
    );

    try {
      const { aprovacaoId, data } = evento;
      const { auditoriaId, concluidoPorId, resultado } = data;

      // Registrar no histórico
      // await this.historicoAprovacaoService.registrarHistorico(
      //   aprovacaoId,
      //   'AUDITORIA_CONCLUIDA',
      //   `Auditoria concluída. Resultado: ${resultado}`,
      //   concluidoPorId,
      // ); // Removido temporariamente
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de conclusão de auditoria: ${error.message}`,
        error.stack,
      );
    }
  }
}