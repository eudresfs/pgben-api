import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AprovacaoService } from '../services/aprovacao.service';
import { NotificacaoAprovacaoService } from '../services/notificacao-aprovacao.service';
import { APROVACAO_QUEUE } from '../constants/aprovacao.constants';
import { StatusSolicitacaoAprovacao } from '../enums/aprovacao.enums';

/**
 * @interface ProcessarAprovacaoData
 * @description Interface que define os dados necessários para processar uma aprovação.
 */
interface ProcessarAprovacaoData {
  solicitacaoId: string;
  aprovadorId: string;
  aprovado: boolean;
  observacoes?: string;
}

/**
 * @interface AvaliarSolicitacaoData
 * @description Interface que define os dados para avaliar uma solicitação completa.
 */
interface AvaliarSolicitacaoData {
  solicitacaoId: string;
}

/**
 * @class AprovacaoProcessor
 * @description Processador de fila responsável pelo processamento assíncrono de aprovações.
 *
 * Este processador lida com:
 * - Processamento de aprovações individuais
 * - Avaliação de solicitações completas
 * - Notificações automáticas
 * - Escalação de prazos
 */
@Injectable()
@Processor(APROVACAO_QUEUE)
export class AprovacaoProcessor {
  private readonly logger = new Logger(AprovacaoProcessor.name);

  constructor(
    private readonly aprovacaoService: AprovacaoService,
    private readonly notificacaoService: NotificacaoAprovacaoService,
  ) {}

  /**
   * @method processarAprovacao
   * @description Processa uma aprovação individual de forma assíncrona.
   * @param {Job<ProcessarAprovacaoData>} job O job contendo os dados da aprovação.
   */
  @Process('processar-aprovacao')
  async processarAprovacao(job: Job<ProcessarAprovacaoData>): Promise<void> {
    const { solicitacaoId, aprovadorId, aprovado, observacoes } = job.data;
    
    this.logger.log(
      `Processando aprovação: Solicitação ${solicitacaoId}, Aprovador ${aprovadorId}, Aprovado: ${aprovado}`,
    );

    try {
      // Processa a aprovação usando o método correto
      if (aprovado) {
        await this.aprovacaoService.aprovarSolicitacao(
          solicitacaoId,
          { 
            aprovador_id: aprovadorId,
            justificativa: observacoes || 'Aprovação processada' 
          },
          aprovadorId,
        );
      } else {
        await this.aprovacaoService.rejeitarSolicitacao(
          solicitacaoId,
          { 
            aprovador_id: aprovadorId,
            justificativa: observacoes || 'Solicitação rejeitada',
            motivo_rejeicao: observacoes || 'Rejeitado pelo aprovador'
          },
          aprovadorId,
        );
      }

      // Envia notificação baseada no resultado
      if (aprovado) {
        await this.notificacaoService.notificarAprovacao(
          solicitacaoId,
          aprovadorId,
          observacoes || 'Aprovação processada',
        );
      } else {
        await this.notificacaoService.notificarRejeicao(
          solicitacaoId,
          aprovadorId,
          observacoes || 'Solicitação rejeitada',
        );
      }

      this.logger.log(`Aprovação processada com sucesso: ${solicitacaoId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar aprovação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method avaliarSolicitacao
   * @description Avalia uma solicitação completa para determinar seu status final.
   * @param {Job<AvaliarSolicitacaoData>} job O job contendo o ID da solicitação.
   */
  @Process('avaliar-solicitacao')
  async avaliarSolicitacao(job: Job<AvaliarSolicitacaoData>): Promise<void> {
    const { solicitacaoId } = job.data;
    
    this.logger.log(`Avaliando solicitação: ${solicitacaoId}`);

    try {
      // Busca a solicitação para verificar seu status atual
      const solicitacao = await this.aprovacaoService.buscarSolicitacaoPorId(solicitacaoId);
      const resultado = {
         finalizada: solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE,
         aprovada: solicitacao.status === StatusSolicitacaoAprovacao.APROVADA
       };

      if (resultado.finalizada) {
        // Notifica sobre a conclusão da solicitação
        if (resultado.aprovada) {
          await this.notificacaoService.notificarAprovacao(
            solicitacaoId,
            'sistema',
            'Solicitação aprovada e finalizada',
          );
        } else {
          await this.notificacaoService.notificarRejeicao(
            solicitacaoId,
            'sistema',
            'Solicitação rejeitada',
          );
        }

        this.logger.log(
          `Solicitação ${solicitacaoId} finalizada. Aprovada: ${resultado.aprovada}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao avaliar solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method verificarPrazos
   * @description Verifica prazos de aprovação e inicia escalação se necessário.
   * @param {Job} job O job de verificação de prazos.
   */
  @Process('verificar-prazos')
  async verificarPrazos(job: Job): Promise<void> {
    this.logger.log('Verificando prazos de aprovação');

    try {
      // Simula verificação de prazos
      this.logger.debug('Verificação de prazos executada - implementação simplificada');
      
      // TODO: Implementar busca real de solicitações pendentes
      // TODO: Implementar verificação real de prazos
      // TODO: Implementar escalação automática
    } catch (error) {
      this.logger.error(
        `Erro ao verificar prazos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}