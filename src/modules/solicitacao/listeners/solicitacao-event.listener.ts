import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { NotificacaoService } from '../services/notificacao.service';
import { PrazoSolicitacaoService } from '../services/prazo-solicitacao.service';
import { SolicitacaoEventType, SolicitacaoStatusChangedEvent, SolicitacaoDeadlineExpiredEvent } from '../events/solicitacao-events';

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
   * Listener para evento de alteração de status de solicitação
   * @param evento Evento de alteração de status
   */
  @OnEvent(SolicitacaoEventType.STATUS_CHANGED)
  async handleStatusChangedEvent(evento: SolicitacaoStatusChangedEvent): Promise<void> {
    try {
      this.logger.log(`Processando evento de alteração de status: ${evento.solicitacaoId}`);
      
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
      
      this.logger.log(`Evento de alteração de status processado: ${evento.solicitacaoId}`);
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
  async handleDeadlineExpiredEvent(evento: SolicitacaoDeadlineExpiredEvent): Promise<void> {
    try {
      this.logger.log(`Processando evento de prazo expirado: ${evento.solicitacaoId}`);
      
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
        evento.data.tipoPrazo
      );
      
      this.logger.log(`Evento de prazo expirado processado: ${evento.solicitacaoId}`);
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
      this.logger.log(`Processando evento de determinação judicial: ${evento.solicitacaoId}`);
      
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
      
      this.logger.log(`Evento de determinação judicial processado: ${evento.solicitacaoId}`);
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
      this.logger.log(`Processando evento de pendência criada: ${evento.data.pendenciaId}`);
      
      // Aqui, poderíamos enviar notificações específicas, atualizar métricas, etc.
      // Para o escopo atual, vamos apenas registrar o evento no log.
      
      this.logger.log(`Evento de pendência criada processado: ${evento.data.pendenciaId}`);
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
      this.logger.log(`Processando evento de pendência resolvida: ${evento.data.pendenciaId}`);
      
      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: evento.solicitacaoId },
      });
      
      if (!solicitacao) {
        this.logger.warn(`Solicitação não encontrada: ${evento.solicitacaoId}`);
        return;
      }
      
      // Verificar se existem outras pendências abertas
      const pendenciasAbertas = await this.verificarPendenciasAbertas(evento.solicitacaoId);
      
      // Se não houver mais pendências abertas e a solicitação estiver em estado "aguardando documentos",
      // podemos automaticamente avançar para o próximo estado do workflow
      if (pendenciasAbertas === 0) {
        this.logger.log(`Todas as pendências resolvidas para a solicitação: ${evento.solicitacaoId}`);
        
        // Aqui, poderíamos implementar uma transição automática de estado
        // mas isso ficará para uma próxima fase da refatoração
      }
      
      this.logger.log(`Evento de pendência resolvida processado: ${evento.data.pendenciaId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento de pendência resolvida: ${error.message}`,
        error.stack,
      );
    }
  }
  
  /**
   * Verifica se existem pendências abertas para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Número de pendências abertas
   */
  private async verificarPendenciasAbertas(solicitacaoId: string): Promise<number> {
    // Consulta para verificar pendências abertas (implementação fictícia)
    // Em um ambiente real, isso seria implementado com uma consulta ao banco de dados
    return 0;
  }
}
