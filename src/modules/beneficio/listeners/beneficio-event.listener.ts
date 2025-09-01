import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BeneficioEvent,
  BeneficioEventType,
  ConcessaoCreatedEventData,
  ConcessaoStatusChangedEventData,
  ConcessaoSuspendedEventData,
  ConcessaoBlockedEventData,
  ConcessaoReactivatedEventData,
  ConcessaoExtendedEventData,
  ValidationCompletedEventData,
  ValidationFailedEventData,
  DocumentAttachedEventData,
  DocumentValidatedEventData,
  DocumentRejectedEventData,
  DeadlineApproachingEventData,
  DeadlineExpiredEventData,
} from '../events/beneficio-events';
import { Concessao } from '../../../entities/concessao.entity';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';

/**
 * Listener responsável por processar eventos do módulo de Benefício
 * Executa ações como envio de notificações e registro de histórico
 */
@Injectable()
export class BeneficioEventListener {
  private readonly logger = new Logger(BeneficioEventListener.name);

  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    private readonly notificacaoService: NotificacaoService,
  ) { }

  /**
   * Listener para evento de criação de concessão
   * @param evento Evento de criação de concessão
   */
  @OnEvent(BeneficioEventType.CONCESSAO_CREATED)
  async handleConcessaoCreatedEvent(
    evento: BeneficioEvent & { data: ConcessaoCreatedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de criação de concessão: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['requerente', 'tipo_beneficio', 'solicitacao'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }


      // Enviar notificação de criação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Concessão Criada',
        conteudo: `Sua concessão para o benefício ${concessao.solicitacao.tipo_beneficio?.nome} foi criada com sucesso.`,
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Concessão Criada',
          conteudo: `Sua concessão para o benefício ${concessao.solicitacao.tipo_beneficio?.nome} foi criada com sucesso.`,
          link: `/concessoes/detalhes/${concessao.id}`
        },
      });

      this.logger.log(
        `Evento de criação de concessão processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de criação de concessão: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de mudança de status de concessão
   * @param evento Evento de mudança de status
   */
  @OnEvent(BeneficioEventType.CONCESSAO_STATUS_CHANGED)
  async handleConcessaoStatusChangedEvent(
    evento: BeneficioEvent & { data: ConcessaoStatusChangedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de mudança de status: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de mudança de status
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Status da Concessão Alterado',
        conteudo: `O status da sua concessão foi alterado de ${evento.data.statusAnterior} para ${evento.data.statusAtual}. ${evento.data.observacao || ''}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Status da Concessão Alterado',
          conteudo: `O status da sua concessão foi alterado de ${evento.data.statusAnterior} para ${evento.data.statusAtual}. ${evento.data.observacao || ''}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de mudança de status processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de mudança de status: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de suspensão de concessão
   * @param evento Evento de suspensão
   */
  @OnEvent(BeneficioEventType.CONCESSAO_SUSPENDED)
  async handleConcessaoSuspendedEvent(
    evento: BeneficioEvent & { data: ConcessaoSuspendedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de suspensão de concessão: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de suspensão
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Concessão Suspensa',
        conteudo: `Sua concessão foi suspensa. Motivo: ${evento.data.motivoSuspensao}. ${evento.data.prazoReativacao ? `Prazo para reativação: ${evento.data.prazoReativacao.toLocaleDateString()}` : ''}`,
        entidade_relacionada_id: concessao.id,
        entidade_tipo: 'concessao',
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Concessão Suspensa',
          conteudo: `Sua concessão foi suspensa. Motivo: ${evento.data.motivoSuspensao}. ${evento.data.prazoReativacao ? `Prazo para reativação: ${evento.data.prazoReativacao.toLocaleDateString()}` : ''}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de suspensão de concessão processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de suspensão de concessão: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de bloqueio de concessão
   * @param evento Evento de bloqueio
   */
  @OnEvent(BeneficioEventType.CONCESSAO_BLOCKED)
  async handleConcessaoBlockedEvent(
    evento: BeneficioEvent & { data: ConcessaoBlockedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de bloqueio de concessão: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de bloqueio
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Concessão Bloqueada',
        conteudo: `Sua concessão foi bloqueada. Motivo: ${evento.data.motivoBloqueio}`,
        entidade_relacionada_id: concessao.id,
        entidade_tipo: 'concessao',
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Concessão Bloqueada',
          conteudo: `Sua concessão foi bloqueada. Motivo: ${evento.data.motivoBloqueio}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de bloqueio de concessão processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de bloqueio de concessão: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de reativação de concessão
   * @param evento Evento de reativação
   */
  @OnEvent(BeneficioEventType.CONCESSAO_REACTIVATED)
  async handleConcessaoReactivatedEvent(
    evento: BeneficioEvent & { data: ConcessaoReactivatedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de reativação de concessão: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de reativação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Concessão Reativada',
        conteudo: `Sua concessão foi reativada do status ${evento.data.statusAnterior}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Concessão Reativada',
          conteudo: `Sua concessão foi reativada do status ${evento.data.statusAnterior}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de reativação de concessão processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de reativação de concessão: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de prorrogação de concessão
   * @param evento Evento de prorrogação
   */
  @OnEvent(BeneficioEventType.CONCESSAO_EXTENDED)
  async handleConcessaoExtendedEvent(
    evento: BeneficioEvent & { data: ConcessaoExtendedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de prorrogação de concessão: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de prorrogação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Concessão Prorrogada',
        conteudo: `Sua concessão foi prorrogada até ${evento.data.novaDataFim.toLocaleDateString()}. Motivo: ${evento.data.motivoProrrogacao}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Concessão Prorrogada',
          conteudo: `Sua concessão foi prorrogada até ${evento.data.novaDataFim.toLocaleDateString()}. Motivo: ${evento.data.motivoProrrogacao}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de prorrogação de concessão processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prorrogação de concessão: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de validação completada
   * @param evento Evento de validação completada
   */
  @OnEvent(BeneficioEventType.VALIDATION_COMPLETED)
  async handleValidationCompletedEvent(
    evento: BeneficioEvent & { data: ValidationCompletedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de validação completada: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de validação
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Validação Concluída',
        conteudo: `A validação ${evento.data.tipoValidacao} da sua concessão foi concluída. Resultado: ${evento.data.resultado}. ${evento.data.observacao || ''}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Validação Concluída',
          conteudo: `A validação ${evento.data.tipoValidacao} da sua concessão foi concluída. Resultado: ${evento.data.resultado}. ${evento.data.observacao || ''}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de validação completada processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de validação completada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de validação falhada
   * @param evento Evento de validação falhada
   */
  @OnEvent(BeneficioEventType.VALIDATION_FAILED)
  async handleValidationFailedEvent(
    evento: BeneficioEvent & { data: ValidationFailedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de validação falhada: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de falha na validação
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Falha na Validação',
        conteudo: `Houve uma falha na validação ${evento.data.tipoValidacao} da sua concessão. Motivo: ${evento.data.motivoFalha}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        entidade_relacionada_id: concessao.id,
        entidade_tipo: 'concessao',
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Falha na Validação',
          conteudo: `Houve uma falha na validação ${evento.data.tipoValidacao} da sua concessão. Motivo: ${evento.data.motivoFalha}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de validação falhada processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de validação falhada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de documento anexado
   * @param evento Evento de documento anexado
   */
  @OnEvent(BeneficioEventType.DOCUMENT_ATTACHED)
  async handleDocumentAttachedEvent(
    evento: BeneficioEvent & { data: DocumentAttachedEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de documento anexado: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de documento anexado
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Documento Anexado',
        conteudo: `Um novo documento ${evento.data.tipoDocumento} foi anexado à sua concessão: ${evento.data.nomeArquivo}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Documento Anexado',
          conteudo: `Um novo documento ${evento.data.tipoDocumento} foi anexado à sua concessão: ${evento.data.nomeArquivo}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de documento anexado processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de documento anexado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de prazo próximo
   * @param evento Evento de prazo próximo
   */
  @OnEvent(BeneficioEventType.DEADLINE_APPROACHING)
  async handleDeadlineApproachingEvent(
    evento: BeneficioEvent & { data: DeadlineApproachingEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de prazo próximo: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de prazo próximo
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Prazo Próximo',
        conteudo: `O prazo ${evento.data.tipoPrazo} da sua concessão está próximo. Restam ${evento.data.diasRestantes} dias até ${evento.data.dataPrazo.toLocaleDateString()}`,
        link: `/concessoes/detalhes/${concessao.id}`,
        entidade_relacionada_id: concessao.id,
        entidade_tipo: 'concessao',
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Prazo Próximo',
          conteudo: `O prazo ${evento.data.tipoPrazo} da sua concessão está próximo. Restam ${evento.data.diasRestantes} dias até ${evento.data.dataPrazo.toLocaleDateString()}`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de prazo próximo processado: ${evento.concessaoId}`,
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
  @OnEvent(BeneficioEventType.DEADLINE_EXPIRED)
  async handleDeadlineExpiredEvent(
    evento: BeneficioEvent & { data: DeadlineExpiredEventData },
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de prazo expirado: ${evento.concessaoId}`,
      );

      // Buscar a concessão com relacionamentos
      const concessao = await this.concessaoRepository.findOne({
        where: { id: evento.concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        this.logger.warn(`Concessão não encontrada: ${evento.concessaoId}`);
        return;
      }

      // Enviar notificação de prazo expirado
      await this.notificacaoService.criarNotificacaoAlerta({
        destinatario_id: concessao.solicitacao.tecnico_id,
        titulo: 'Prazo Expirado',
        conteudo: `O prazo ${evento.data.tipoPrazo} da sua concessão expirou há ${evento.data.diasAtraso} dias (vencimento: ${evento.data.dataPrazo.toLocaleDateString()})`,
        link: `/concessoes/detalhes/${concessao.id}`,
        entidade_relacionada_id: concessao.id,
        entidade_tipo: 'concessao',
        dados_contexto: {
          concessao_id: concessao.id,
          destinatario_id: concessao.solicitacao.tecnico_id,
          titulo: 'Prazo Expirado',
          conteudo: `O prazo ${evento.data.tipoPrazo} da sua concessão expirou há ${evento.data.diasAtraso} dias (vencimento: ${evento.data.dataPrazo.toLocaleDateString()})`,
          link: `/concessoes/detalhes/${concessao.id}`,
        },
      });

      this.logger.log(
        `Evento de prazo expirado processado: ${evento.concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prazo expirado: ${error.message}`,
        error.stack,
      );
    }
  }
}