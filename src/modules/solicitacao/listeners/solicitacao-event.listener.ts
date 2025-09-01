import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao, StatusSolicitacao } from '../../../entities/solicitacao.entity';
import { NotificacaoService } from '../services/notificacao.service';
import { PrazoSolicitacaoService } from '../services/prazo-solicitacao.service';
import {
  SolicitacaoEventType,
  SolicitacaoStatusChangedEvent,
  SolicitacaoDeadlineExpiredEvent,
  SolicitacaoCreatedEvent,
  DraftCreatedEventData,
  ApprovalProcessedEventData,
  RejectionProcessedEventData,
  CancellationProcessedEventData,
  AllPendenciesResolvedEventData,
} from '../events/solicitacao-events';

/**
 * Listener para eventos de solicitação
 *
 * Esta classe implementa os listeners para reagir a eventos emitidos no sistema.
 * Cada método listener é responsável por executar ações específicas quando determinados eventos ocorrem.
 */
@Injectable()
export class SolicitacaoEventListener {
  private readonly logger = new Logger(SolicitacaoEventListener.name);

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly notificacaoService: NotificacaoService,
    private readonly prazoService: PrazoSolicitacaoService,
  ) {}

  /**
   * Listener para evento de criação de solicitação
   * @param evento Evento de criação de solicitação
   */
  @OnEvent(SolicitacaoEventType.CREATED)
  async handleSolicitacaoCreatedEvent(
    evento: SolicitacaoCreatedEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de criação de solicitação: ${evento.solicitacaoId}`,
      );

      // Buscar a solicitação criada com relacionamentos necessários
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
        relations: ['requerente', 'tipo_beneficio', 'tecnico', 'unidade'],
      });

      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }

      // Enviar notificação sobre a criação da solicitação
      // Nota: Como a solicitação foi criada, usamos notificarSolicitacaoAtribuida
      // que é o método disponível no NotificacaoService
      this.notificacaoService.notificarSolicitacaoAtribuida(
        solicitacao,
        evento.data.tecnicoId || 'sistema',
      );

      // Definir prazo de análise inicial para a solicitação
      await this.prazoService.definirPrazoAnalise(evento.solicitacaoId);

      this.logger.log(
        `Evento de criação de solicitação processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de criação de solicitação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de alteração de status de solicitação
   * @param evento Evento de alteração de status
   */
  @OnEvent(SolicitacaoEventType.STATUS_CHANGED)
  async handleStatusChangedEvent(
    evento: SolicitacaoStatusChangedEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de alteração de status: ${evento.solicitacaoId}`,
      );

      // Buscar a solicitação atualizada
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
      });

      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }

      // Enviar notificação sobre a alteração de status
      this.notificacaoService.notificarAlteracaoStatus(
        solicitacao,
        evento.data.statusAnterior,
        evento.data.observacao,
      );

      // Atualizar prazos com base no novo status
      await this.prazoService.atualizarPrazosTransicao(
        evento.solicitacaoId,
        solicitacao.status,
      );

      this.logger.log(
        `Evento de alteração de status processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de alteração de status: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de prazo expirado
   * @param evento Evento de prazo expirado
   */
  @OnEvent(SolicitacaoEventType.DEADLINE_EXPIRED)
  async handleDeadlineExpiredEvent(
    evento: SolicitacaoDeadlineExpiredEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de prazo expirado: ${evento.solicitacaoId}`,
      );

      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
      });

      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }

      // Notificar sobre o prazo expirado
      this.notificacaoService.notificarPrazoExpirado(
        solicitacao,
        evento.data.tipoPrazo,
      );

      this.logger.log(
        `Evento de prazo expirado processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de prazo expirado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de determinação judicial anexada
   * @param evento Evento de determinação judicial anexada
   */
  @OnEvent(SolicitacaoEventType.JUDICIAL_DETERMINATION_ATTACHED)
  async handleJudicialDeterminationEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de determinação judicial: ${evento.solicitacaoId}`,
      );

      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
      });

      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }

      // Atualizar flag de determinação judicial, se ainda não estiver atualizada
      if (!solicitacao.determinacao_judicial_flag) {
        solicitacao.determinacao_judicial_flag = true;
        await this.solicitacaoRepository.save(solicitacao);
      }

      // Atualizar prazos para refletir a prioridade judicial
      await this.prazoService.atualizarPrazosTransicao(
        evento.solicitacaoId,
        solicitacao.status,
      );

      // Notificar sobre a determinação judicial
      this.notificacaoService.notificarDeterminacaoJudicial(solicitacao);

      this.logger.log(
        `Evento de determinação judicial processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de determinação judicial: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de pendência criada
   * @param evento Evento de pendência criada
   */
  @OnEvent(SolicitacaoEventType.PENDENCY_CREATED)
  async handlePendencyCreatedEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de pendência criada: ${evento.pendenciaId}`,
      );

      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
      });

      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }

      // Criar objeto pendência com os dados do evento
      const pendencia = {
        id: evento.pendenciaId,
        descricao: evento.descricao,
        prazo: evento.prazo,
      };

      // Buscar dados do usuário que criou a pendência
      const usuario = {
        id: evento.usuarioId,
        nome: evento.usuarioNome || 'Sistema',
      };

      // Enviar notificação sobre a pendência criada
      await this.notificacaoService.notificarPendenciaCriada(
        pendencia as any,
        solicitacao,
        usuario as any,
      );

      this.logger.log(
        `Evento de pendência criada processado: ${evento.pendenciaId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de pendência criada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de pendência resolvida
   * @param evento Evento de pendência resolvida
   */
  @OnEvent(SolicitacaoEventType.PENDENCY_RESOLVED)
  async handlePendencyResolvedEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de pendência resolvida: ${evento.pendenciaId}`,
      );

      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
      });

      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }

      // Buscar a pendência resolvida com relacionamentos
      const pendenciaResolvida = await this.solicitacaoRepository.manager
        .getRepository('Pendencia')
        .findOne({
          where: { id: evento.pendenciaId },
          relations: ['resolvido_por'],
        });

      if (pendenciaResolvida) {
        // Criar objeto usuário com os dados do evento
        const usuario = {
          id: evento.usuarioId,
          nome: evento.usuarioNome || 'Sistema',
        };

        // Enviar notificação sobre a pendência resolvida
        await this.notificacaoService.notificarPendenciaResolvida(
          pendenciaResolvida as any,
          solicitacao,
          usuario as any,
        );
      }

      // Verificar se existem outras pendências abertas
      const pendenciasAbertas = await this.verificarPendenciasAbertas(
        evento.solicitacaoId,
      );

      // Se não houver mais pendências abertas e a solicitação estiver em estado "aguardando documentos",
      // podemos automaticamente avançar para o próximo estado do workflow
      if (pendenciasAbertas === 0) {
        this.logger.log(
          `Todas as pendências resolvidas para a solicitação: ${evento.solicitacaoId}`,
        );

        // Aqui, poderíamos implementar uma transição automática de estado
        // mas isso ficará para uma próxima fase da refatoração
      }

      this.logger.log(
        `Evento de pendência resolvida processado: ${evento.pendenciaId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de pendência resolvida: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de rascunho criado
   * @param evento Evento de rascunho criado
   */
  @OnEvent(SolicitacaoEventType.DRAFT_CREATED)
  async handleDraftCreatedEvent(evento: { data: DraftCreatedEventData }): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de rascunho criado: ${evento.data.solicitacaoId}`,
      );

      // Se há técnico atribuído, enviar notificação
      // if (evento.data.tecnicoId) {
      //   const solicitacao = await this.solicitacaoRepository.findOne({
      //     where: { id: evento.data.solicitacaoId },
      //   });

      //   if (solicitacao) {
      //     await this.notificacaoService.notificarSolicitacaoAtribuida(solicitacao);
      //   }
      // }

      this.logger.log(
        `Evento de rascunho criado processado: ${evento.data.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de rascunho criado: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de aprovação processada
   * @param evento Evento de aprovação processada
   */
  @OnEvent('solicitacao.approval_processed')
  async handleApprovalProcessedEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de aprovação: ${evento.solicitacaoId}`,
      );

      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId.toString() },
        relations: ['requerente', 'tipo_beneficio'],
      });

      if (solicitacao) {
        // Notificar sobre a aprovação da solicitação
        await this.notificacaoService.notificarAlteracaoStatus(
          solicitacao,
          StatusSolicitacao.EM_ANALISE,
          evento.observacao || evento.parecerSemtas,
        );
      }

      this.logger.log(
        `Evento de aprovação processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de aprovação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de rejeição processada
   * @param evento Evento de rejeição processada
   */
  @OnEvent('solicitacao.rejection_processed')
  async handleRejectionProcessedEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de rejeição: ${evento.solicitacaoId}`,
      );

      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId.toString() },
        relations: ['requerente', 'tipo_beneficio'],
      });

      if (solicitacao) {
        // Notificar sobre a rejeição da solicitação
        await this.notificacaoService.notificarAlteracaoStatus(
          solicitacao,
          StatusSolicitacao.EM_ANALISE,
          evento.motivo,
        );
      }

      this.logger.log(
        `Evento de rejeição processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de rejeição: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de cancelamento processado
   * @param evento Evento de cancelamento processado
   */
  @OnEvent('solicitacao.cancellation_processed')
  async handleCancellationProcessedEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de cancelamento: ${evento.solicitacaoId}`,
      );

      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId.toString() },
        relations: ['requerente', 'tipo_beneficio'],
      });

      if (solicitacao) {
        // Notificar sobre o cancelamento da solicitação
        await this.notificacaoService.notificarAlteracaoStatus(
          solicitacao,
          solicitacao.status,
          evento.motivo,
        );
      }

      this.logger.log(
        `Evento de cancelamento processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de cancelamento: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listener para evento de todas as pendências resolvidas
   * @param evento Evento de todas as pendências resolvidas
   */
  @OnEvent(SolicitacaoEventType.ALL_PENDENCIES_RESOLVED)
  async handleAllPendenciesResolvedEvent(evento: any): Promise<void> {
    try {
      this.logger.log(
        `Processando evento de todas pendências resolvidas: ${evento.solicitacaoId}`,
      );

      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId.toString() },
      });

      if (solicitacao) {
        // Notificar que todas as pendências foram resolvidas
        // Aqui poderia ser implementada uma notificação específica para este caso
        this.logger.log(
          `Todas as pendências foram resolvidas para a solicitação ${evento.solicitacaoId}`,
        );
      }

      this.logger.log(
        `Evento de todas pendências resolvidas processado: ${evento.solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de todas pendências resolvidas: ${error.message}`,
        error.stack,
      );
    }
  }



  /**
   * Verifica se existem pendências abertas para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Número de pendências abertas
   */
  private async verificarPendenciasAbertas(
    solicitacaoId: string,
  ): Promise<number> {
    // Consulta para verificar pendências abertas (implementação fictícia)
    // Em um ambiente real, isso seria implementado com uma consulta ao banco de dados
    return 0;
  }
}
