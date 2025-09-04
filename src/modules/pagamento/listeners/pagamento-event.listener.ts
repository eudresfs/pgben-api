import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PagamentoEvent,
  PagamentoEventType,
  PagamentoCreatedEventData,
  PagamentoProcessedEventData,
  PagamentoFailedEventData,
  PagamentoStatusChangedEventData,
  PagamentoApprovedEventData,
  PagamentoRejectedEventData,
  PagamentoCancelledEventData,
  ComprovanteUploadedEventData,
  ComprovanteValidatedEventData,
  ComprovanteRejectedEventData,
  DeadlineApproachingEventData,
  DeadlineExpiredEventData,
  EstornoRequestedEventData,
  EstornoProcessedEventData,
  EstornoFailedEventData,
  LoteCreatedEventData,
  LoteProcessedEventData,
  LoteFailedEventData,
} from '../events/pagamento-events';
import { Pagamento } from '../../../entities/pagamento.entity';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
// import { HistoricoPagamentoService } from '../services/historico-pagamento.service'; // Removido temporariamente

/**
 * Listener responsável por processar eventos do módulo de Pagamento
 * Executa ações como envio de notificações e registro de histórico
 */
@Injectable()
export class PagamentoEventListener {
  private readonly logger = new Logger(PagamentoEventListener.name);

  constructor(
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    private readonly notificacaoService: NotificacaoService,
    // private readonly historicoPagamentoService: HistoricoPagamentoService, // Removido temporariamente
  ) {}

  /**
   * Listener para evento de criação de pagamento
   * @param evento Evento de criação de pagamento
   */
  @OnEvent(PagamentoEventType.PAGAMENTO_CREATED)
  async handlePagamentoCreatedEvent(
    evento: PagamentoEvent & { data: PagamentoCreatedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de criação de pagamento: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante',
          'concessao.solicitacao.tipo_beneficio'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'CRIACAO',
      //   `Pagamento criado no valor de R$ ${evento.data.valor.toFixed(2)}`,
      //   evento.data.usuarioCriadorId,
      // ); // Removido temporariamente

      // Enviar notificação de criação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Pagamento Criado',
        conteudo: `Um novo pagamento foi criado para sua concessão no valor de R$ ${pagamento.valor.toFixed(2)}.`,
        link: `/pagamentos/detalhes/${pagamento.id}`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Pagamento Criado',
          conteudo: `Um novo pagamento foi criado para sua concessão no valor de R$ ${pagamento.valor.toFixed(2)}.`,
          link: `/pagamentos/detalhes/${pagamento.id}`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de criação de pagamento processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de criação de pagamento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de processamento de pagamento
   * @param evento Evento de processamento
   */
  @OnEvent(PagamentoEventType.PAGAMENTO_PROCESSED)
  async handlePagamentoProcessedEvent(
    evento: PagamentoEvent & { data: PagamentoProcessedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de processamento de pagamento: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'PROCESSAMENTO',
      //   `Pagamento processado no valor de R$ ${evento.data.valorProcessado.toFixed(2)}`,
      //   evento.data.usuarioProcessadorId,
      //   `Lote: ${evento.data.loteId || 'N/A'} - Ref: ${evento.data.referenciaBancaria || 'N/A'}`,
      // ); // Removido temporariamente

      // Enviar notificação de processamento
      await this.notificacaoService.criarNotificacaoSistema({
         destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
         titulo: 'Pagamento Processado',
         conteudo: `Seu pagamento no valor de R$ ${pagamento.valor.toFixed(2)} foi processado com sucesso.`,
         link: `/pagamentos/detalhes/${pagamento.id}`,
         dados_contexto: {
           destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
           titulo: 'Pagamento Processado',
           conteudo: `Seu pagamento no valor de R$ ${pagamento.valor.toFixed(2)} foi processado com sucesso.`,
           link: `/pagamentos/detalhes/${pagamento.id}`,
           pagamento_id: pagamento.id,
         },
       });

      this.logger.log(
        `Evento de processamento de pagamento processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de processamento de pagamento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de falha no pagamento
   * @param evento Evento de falha
   */
  @OnEvent(PagamentoEventType.PAGAMENTO_FAILED)
  async handlePagamentoFailedEvent(
    evento: PagamentoEvent & { data: PagamentoFailedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de falha no pagamento: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'FALHA',
      //   `Falha no pagamento: ${evento.data.motivoFalha}`,
      //   evento.data.usuarioProcessadorId,
      //   `Código: ${evento.data.codigoErro || 'N/A'} - Tentativa: ${evento.data.tentativaReprocessamento}`,
      // ); // Removido temporariamente

      // Enviar notificação de falha
      await this.notificacaoService.criarNotificacaoAlerta({
         destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
         titulo: 'Falha no Pagamento',
         conteudo: `Houve uma falha no processamento do seu pagamento. Motivo: ${evento.data.motivoFalha}`,
         entidade_relacionada_id: pagamento.id,
         entidade_tipo: 'pagamento',
         link: `/pagamentos/detalhes/${pagamento.id}`,
         dados_contexto: {
           destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
           titulo: 'Falha no Pagamento',
           conteudo: `Houve uma falha no processamento do seu pagamento. Motivo: ${evento.data.motivoFalha}`,
           entidade_relacionada_id: pagamento.id,
           entidade_tipo: 'pagamento',
           link: `/pagamentos/detalhes/${pagamento.id}`,
           pagamento_id: pagamento.id,
         },
       });

      this.logger.log(
        `Evento de falha no pagamento processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de falha no pagamento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de mudança de status
   * @param evento Evento de mudança de status
   */
  @OnEvent(PagamentoEventType.PAGAMENTO_STATUS_CHANGED)
  async handlePagamentoStatusChangedEvent(
    evento: PagamentoEvent & { data: PagamentoStatusChangedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de mudança de status: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'ALTERACAO_STATUS',
      //   `Status alterado de ${evento.data.statusAnterior} para ${evento.data.statusAtual}`,
      //   evento.data.usuarioId,
      //   evento.data.observacao,
      // ); // Removido temporariamente

      // Enviar notificação de mudança de status
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Status do Pagamento Alterado',
        conteudo: `O status do seu pagamento foi alterado de ${evento.data.statusAnterior} para ${evento.data.statusAtual}. ${evento.data.observacao || ''}`,
        link: `/pagamentos/detalhes/${pagamento.id}`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Status do Pagamento Alterado',
          conteudo: `O status do seu pagamento foi alterado de ${evento.data.statusAnterior} para ${evento.data.statusAtual}. ${evento.data.observacao || ''}`,
          link: `/pagamentos/detalhes/${pagamento.id}`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de mudança de status processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de mudança de status: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de aprovação de pagamento
   * @param evento Evento de aprovação
   */
  @OnEvent(PagamentoEventType.PAGAMENTO_APPROVED)
  async handlePagamentoApprovedEvent(
    evento: PagamentoEvent & { data: PagamentoApprovedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de aprovação de pagamento: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'APROVACAO',
      //   `Pagamento aprovado no valor de R$ ${evento.data.valorAprovado.toFixed(2)}`,
      //   evento.data.aprovadorId,
      //   evento.data.observacaoAprovacao,
      // ); // Removido temporariamente

      // Enviar notificação de aprovação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Pagamento Aprovado',
        conteudo: `Seu pagamento no valor de R$ ${evento.data.valorAprovado.toFixed(2)} foi aprovado.`,
        link: `/pagamentos/detalhes/${pagamento.id}`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Pagamento Aprovado',
          conteudo: `Seu pagamento no valor de R$ ${evento.data.valorAprovado.toFixed(2)} foi aprovado.`,
          link: `/pagamentos/detalhes/${pagamento.id}`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de aprovação de pagamento processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação de pagamento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de upload de comprovante
   * @param evento Evento de upload
   */
  @OnEvent(PagamentoEventType.COMPROVANTE_UPLOADED)
  async handleComprovanteUploadedEvent(
    evento: PagamentoEvent & { data: ComprovanteUploadedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de upload de comprovante: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'COMPROVANTE_UPLOAD',
      //   `Comprovante anexado: ${evento.data.nomeArquivo}`,
      //   evento.data.usuarioUploadId,
      //   `Tamanho: ${(evento.data.tamanhoArquivo / 1024).toFixed(2)} KB - Tipo: ${evento.data.tipoArquivo}`,
      // ); // Removido temporariamente

      // Enviar notificação de upload
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Comprovante Enviado',
        conteudo: `Comprovante de pagamento ${evento.data.nomeArquivo} foi enviado com sucesso.`,
        link: `/pagamentos/detalhes/${pagamento.id}/comprovantes`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Comprovante Enviado',
          conteudo: `Comprovante de pagamento ${evento.data.nomeArquivo} foi enviado com sucesso.`,
          link: `/pagamentos/detalhes/${pagamento.id}/comprovantes`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de upload de comprovante processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de upload de comprovante: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de validação de comprovante
   * @param evento Evento de validação
   */
  @OnEvent(PagamentoEventType.COMPROVANTE_VALIDATED)
  async handleComprovanteValidatedEvent(
    evento: PagamentoEvent & { data: ComprovanteValidatedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de validação de comprovante: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'COMPROVANTE_VALIDACAO',
      //   `Comprovante validado com resultado: ${evento.data.resultadoValidacao}`,
      //   evento.data.validadorId,
      //   evento.data.observacaoValidacao,
      // ); // Removido temporariamente

      // Enviar notificação de validação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Comprovante Validado',
        conteudo: `Seu comprovante de pagamento foi validado com resultado: ${evento.data.resultadoValidacao}. ${evento.data.observacaoValidacao || ''}`,
        link: `/pagamentos/detalhes/${pagamento.id}/comprovantes`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Comprovante Validado',
          conteudo: `Seu comprovante de pagamento foi validado com resultado: ${evento.data.resultadoValidacao}. ${evento.data.observacaoValidacao || ''}`,
          link: `/pagamentos/detalhes/${pagamento.id}/comprovantes`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de validação de comprovante processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de validação de comprovante: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de prazo próximo
   * @param evento Evento de prazo próximo
   */
  @OnEvent(PagamentoEventType.DEADLINE_APPROACHING)
  async handleDeadlineApproachingEvent(
    evento: PagamentoEvent & { data: DeadlineApproachingEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de prazo próximo: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Enviar notificação de prazo próximo
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Prazo Próximo - Pagamento',
        conteudo: `Atenção: O prazo ${evento.data.tipoPrazo} do seu pagamento está próximo. Restam ${evento.data.diasRestantes} dias.`,
        entidade_relacionada_id: pagamento.id,
        entidade_tipo: 'pagamento',
        link: `/pagamentos/detalhes/${pagamento.id}`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Prazo Próximo - Pagamento',
          conteudo: `Atenção: O prazo ${evento.data.tipoPrazo} do seu pagamento está próximo. Restam ${evento.data.diasRestantes} dias.`,
          entidade_relacionada_id: pagamento.id,
          entidade_tipo: 'pagamento',
          link: `/pagamentos/detalhes/${pagamento.id}`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de prazo próximo processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prazo próximo: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de prazo expirado
   * @param evento Evento de prazo expirado
   */
  @OnEvent(PagamentoEventType.DEADLINE_EXPIRED)
  async handleDeadlineExpiredEvent(
    evento: PagamentoEvent & { data: DeadlineExpiredEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de prazo expirado: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'PRAZO_EXPIRADO',
      //   `Prazo ${evento.data.tipoPrazo} expirado há ${evento.data.diasAtraso} dias`,
      //   'sistema',
      // ); // Removido temporariamente

      // Enviar notificação de prazo expirado
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Prazo Expirado - Pagamento',
        conteudo: `Atenção: O prazo ${evento.data.tipoPrazo} do seu pagamento expirou há ${evento.data.diasAtraso} dias.`,
        entidade_relacionada_id: pagamento.id,
        entidade_tipo: 'pagamento',
        link: `/pagamentos/detalhes/${pagamento.id}`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Prazo Expirado - Pagamento',
          conteudo: `Atenção: O prazo ${evento.data.tipoPrazo} do seu pagamento expirou há ${evento.data.diasAtraso} dias.`,
          entidade_relacionada_id: pagamento.id,
          entidade_tipo: 'pagamento',
          link: `/pagamentos/detalhes/${pagamento.id}`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de prazo expirado processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prazo expirado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de estorno solicitado
   * @param evento Evento de estorno
   */
  @OnEvent(PagamentoEventType.ESTORNO_REQUESTED)
  async handleEstornoRequestedEvent(
    evento: PagamentoEvent & { data: EstornoRequestedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de estorno solicitado: ${evento.pagamentoId}`,
      );

      // Buscar o pagamento com relacionamentos
      const pagamento = await this.pagamentoRepository.findOne({
        where: { id: evento.pagamentoId },
        relations: [
          'concessao',
          'concessao.solicitacao',
          'concessao.solicitacao.beneficiario',
          'concessao.solicitacao.solicitante'
        ],
      });

      if (!pagamento) {
        this.logger.warn(`Pagamento não encontrado: ${evento.pagamentoId}`);
        return;
      }

      // Registrar no histórico
      // await this.historicoPagamentoService.registrarHistorico(
      //   pagamento.id,
      //   'ESTORNO_SOLICITADO',
      //   `Estorno solicitado no valor de R$ ${evento.data.valorEstorno.toFixed(2)}: ${evento.data.motivoEstorno}`,
      //   evento.data.solicitanteId,
      //   evento.data.observacao,
      // ); // Removido temporariamente

      // Enviar notificação de estorno solicitado
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
        titulo: 'Estorno Solicitado',
        conteudo: `Foi solicitado um estorno no valor de R$ ${evento.data.valorEstorno.toFixed(2)} para seu pagamento. Motivo: ${evento.data.motivoEstorno}`,
        link: `/pagamentos/detalhes/${pagamento.id}`,
        dados_contexto: {
          destinatario_id: pagamento.concessao.solicitacao.tecnico_id,
          titulo: 'Estorno Solicitado',
          conteudo: `Foi solicitado um estorno no valor de R$ ${evento.data.valorEstorno.toFixed(2)} para seu pagamento. Motivo: ${evento.data.motivoEstorno}`,
          link: `/pagamentos/detalhes/${pagamento.id}`,
          pagamento_id: pagamento.id,
        },
      });

      this.logger.log(
        `Evento de estorno solicitado processado: ${evento.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de estorno solicitado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de lote criado
   * @param evento Evento de lote
   */
  @OnEvent(PagamentoEventType.LOTE_CREATED)
  async handleLoteCreatedEvent(
    evento: PagamentoEvent & { data: LoteCreatedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de lote criado: ${evento.data.loteId}`,
      );

      // Enviar notificação de lote criado
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: evento.data.usuarioCriadorId,
        titulo: 'Lote de Pagamentos Criado',
        conteudo: `Um novo lote de pagamentos foi criado com ${evento.data.quantidadePagamentos} pagamentos no valor total de R$ ${evento.data.valorTotal.toFixed(2)}.`,
        link: `/lotes/${evento.data.loteId}`,
        dados_contexto: {
          destinatario_id: evento.data.usuarioCriadorId,
          titulo: 'Lote de Pagamentos Criado',
          conteudo: `Um novo lote de pagamentos foi criado com ${evento.data.quantidadePagamentos} pagamentos no valor total de R$ ${evento.data.valorTotal.toFixed(2)}.`,
          link: `/lotes/${evento.data.loteId}`,
          lote_id: evento.data.loteId,
        },
      });

      this.logger.log(
        `Evento de lote criado processado: ${evento.data.loteId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de lote criado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de lote processado
   * @param evento Evento de lote processado
   */
  @OnEvent(PagamentoEventType.LOTE_PROCESSED)
  async handleLoteProcessedEvent(
    evento: PagamentoEvent & { data: LoteProcessedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de lote processado: ${evento.data.loteId}`,
      );

      // Enviar notificação de lote processado
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: evento.data.usuarioProcessadorId,
        titulo: 'Lote de Pagamentos Processado',
        conteudo: `O lote de pagamentos foi processado com sucesso. ${evento.data.quantidadeProcessada} pagamentos processados no valor de R$ ${evento.data.valorProcessado.toFixed(2)}.`,
        link: `/lotes/${evento.data.loteId}`,
        dados_contexto: {
          destinatario_id: evento.data.usuarioProcessadorId,
          titulo: 'Lote de Pagamentos Processado',
          conteudo: `O lote de pagamentos foi processado com sucesso. ${evento.data.quantidadeProcessada} pagamentos processados no valor de R$ ${evento.data.valorProcessado.toFixed(2)}.`,
          link: `/lotes/${evento.data.loteId}`,
          lote_id: evento.data.loteId,
        },
      });

      this.logger.log(
        `Evento de lote processado processado: ${evento.data.loteId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de lote processado: ${error.message}`,
        error.stack,
      );
    }
  }
}