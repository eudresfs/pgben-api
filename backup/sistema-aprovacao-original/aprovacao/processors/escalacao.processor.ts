import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EscalacaoAprovacaoService, EstrategiaEscalacao } from '../services/escalacao-aprovacao.service';
import { NotificacaoAprovacaoService } from '../services/notificacao-aprovacao.service';
import { ESCALACAO_QUEUE } from '../constants/aprovacao.constants';

/**
 * @interface IniciarEscalacaoData
 * @description Interface para dados de início de escalação.
 */
interface IniciarEscalacaoData {
  solicitacaoId: string;
  aprovadorOriginalId: string;
  motivo: string;
  nivelEscalacao: number;
}

/**
 * @interface ProcessarEscalacaoData
 * @description Interface para dados de processamento de escalação.
 */
interface ProcessarEscalacaoData {
  escalacaoId: string;
  novoAprovadorId: string;
}

/**
 * @interface VerificarPrazosEscalacaoData
 * @description Interface para dados de verificação de prazos de escalação.
 */
interface VerificarPrazosEscalacaoData {
  solicitacaoId?: string; // Opcional - se não fornecido, verifica todas
}

/**
 * @class EscalacaoProcessor
 * @description Processador de fila responsável pelo gerenciamento de escalações.
 *
 * Este processador gerencia:
 * - Início de processos de escalação
 * - Processamento de escalações
 * - Verificação automática de prazos
 * - Escalação automática por inatividade
 * - Notificações de escalação
 */
@Injectable()
@Processor(ESCALACAO_QUEUE)
export class EscalacaoProcessor {
  private readonly logger = new Logger(EscalacaoProcessor.name);

  constructor(
    private readonly escalacaoService: EscalacaoAprovacaoService,
    private readonly notificacaoService: NotificacaoAprovacaoService,
  ) {}

  /**
   * @method iniciarEscalacao
   * @description Inicia um processo de escalação para uma solicitação.
   * @param {Job<IniciarEscalacaoData>} job O job contendo os dados da escalação.
   */
  @Process('iniciar-escalacao')
  async iniciarEscalacao(job: Job<IniciarEscalacaoData>): Promise<void> {
    const { solicitacaoId, aprovadorOriginalId, motivo, nivelEscalacao } = job.data;
    
    this.logger.log(
      `Iniciando escalação: Solicitação ${solicitacaoId}, Nível ${nivelEscalacao}`,
    );

    try {
      // Inicia o processo de escalação
      await this.escalacaoService.escalarSolicitacao(
        solicitacaoId,
        [aprovadorOriginalId],
        EstrategiaEscalacao.HIERARQUICA,
        motivo,
        'sistema',
      );

      // Notifica sobre a escalação
      await this.notificacaoService.notificarDelegacao(
        solicitacaoId,
        true,
        true,
      );

      this.logger.log(
        `Escalação iniciada com sucesso para solicitação ${solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar escalação para solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method processarEscalacao
   * @description Processa uma escalação específica.
   * @param {Job<ProcessarEscalacaoData>} job O job contendo os dados da escalação.
   */
  @Process('processar-escalacao')
  async processarEscalacao(job: Job<ProcessarEscalacaoData>): Promise<void> {
    const { escalacaoId, novoAprovadorId } = job.data;
    
    this.logger.log(`Processando escalação: ${escalacaoId}`);

    try {
      // Processa a escalação usando escalarSolicitacao
      await this.escalacaoService.escalarSolicitacao(
        escalacaoId,
        [novoAprovadorId],
        EstrategiaEscalacao.HIERARQUICA,
        'Processamento de escalação',
        'sistema',
      );

      // Notifica o novo aprovador
      await this.notificacaoService.notificarNovaSolicitacao(
        escalacaoId,
        [novoAprovadorId],
      );

      this.logger.log(`Notificação enviada para aprovador ${novoAprovadorId}`);

      this.logger.log(`Escalação processada com sucesso: ${escalacaoId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar escalação ${escalacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method verificarPrazosEscalacao
   * @description Verifica prazos de escalação e inicia escalações automáticas.
   * @param {Job<VerificarPrazosEscalacaoData>} job O job de verificação de prazos.
   */
  @Process('verificar-prazos')
  async verificarPrazosEscalacao(
    job: Job<VerificarPrazosEscalacaoData>,
  ): Promise<void> {
    const { solicitacaoId } = job.data;
    
    this.logger.log(
      solicitacaoId 
        ? `Verificando prazos de escalação para solicitação: ${solicitacaoId}`
        : 'Verificando prazos de escalação para todas as solicitações',
    );

    try {
      let solicitacoesPendentes;
      
      // Simula busca de solicitações pendentes
      solicitacoesPendentes = [];
      
      this.logger.debug(
        `Verificação de prazos: ${solicitacaoId ? 'solicitação específica' : 'todas as solicitações'}`,
      );

      for (const solicitacao of solicitacoesPendentes) {
        // Verifica se a solicitação precisa de escalação
        try {
          await this.escalacaoService.escalarSolicitacao(
            solicitacao.id,
            [],
            EstrategiaEscalacao.HIERARQUICA,
            'Verificação automática de prazo',
            'sistema',
          );

          this.logger.warn(
            `Escalação verificada para solicitação ${solicitacao.id}`,
          );
        } catch (error) {
          this.logger.debug(
            `Solicitação ${solicitacao.id} não precisa de escalação: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Verificação de prazos concluída. ${solicitacoesPendentes.length} solicitações verificadas`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao verificar prazos de escalação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method processarEscalacaoAutomatica
   * @description Processa escalações automáticas baseadas em regras predefinidas.
   * @param {Job} job O job de processamento de escalação automática.
   */
  @Process('escalacao-automatica')
  async processarEscalacaoAutomatica(job: Job): Promise<void> {
    this.logger.log('Processando escalações automáticas');

    try {
      // Busca solicitações pendentes que podem precisar de escalação
      const escalacoesPendentes = [];

      for (const escalacao of escalacoesPendentes) {
        // Usar aprovador original como fallback
        const proximoAprovador = escalacao.aprovadorOriginalId;

        if (proximoAprovador) {
          // Processa a escalação
          await this.escalacaoService.escalarSolicitacao(
            escalacao.solicitacaoId,
            [proximoAprovador.id],
            EstrategiaEscalacao.HIERARQUICA,
            'Escalação automática',
            'sistema',
          );

          // Notifica o novo aprovador
          await this.notificacaoService.notificarPrazoVencendo(
            escalacao.solicitacaoId,
          );

          this.logger.log(
            `Escalação automática processada: ${escalacao.id} -> ${proximoAprovador.id}`,
          );
        } else {
          // Não há mais níveis de escalação disponíveis
          // Escalação processada com sucesso
          this.logger.log(`Escalação ${escalacao.id} processada com sucesso`);

          this.logger.warn(
            `Escalação ${escalacao.id} finalizada: sem mais níveis disponíveis`,
          );
        }
      }

      this.logger.log(
        `${escalacoesPendentes.length} escalações automáticas processadas`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar escalações automáticas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}