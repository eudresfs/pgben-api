import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PagamentoLiberacaoService } from '../services/pagamento-liberacao.service';
import { PagamentoService } from '../services/pagamento.service';
import { UnifiedLoggerService } from '../../../shared/logging/unified-logger.service';

@Injectable()
export class PagamentoLiberacaoScheduler {
  constructor(
    private readonly pagamentoLiberacaoService: PagamentoLiberacaoService,
    private readonly pagamentoService: PagamentoService,
    private readonly logger: UnifiedLoggerService,
  ) {}

  /**
   * Executa diariamente às 06:00 para processar liberação automática de pagamentos
   * baseado na data prevista de liberação.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processarLiberacaoAutomatica(): Promise<void> {
    this.logger.log('[PagamentoLiberacaoScheduler] Iniciando processamento de liberação automática de pagamentos.');

    try {
      const resultado = await this.pagamentoLiberacaoService.processarLiberacaoAutomatica('SISTEMA_SCHEDULER');
      
      this.logger.log(
        `[PagamentoLiberacaoScheduler] Processamento concluído. ` +
        `Liberados: ${resultado.liberados.length}, Falhas: ${resultado.falhas.length}, ` +
        `Total processados: ${resultado.total}`
      );
    } catch (error) {
      this.logger.error(
        '[PagamentoLiberacaoScheduler] Erro durante processamento de liberação automática:',
        error.stack
      );
    }
  }

  /**
   * Executa diariamente às 08:00 para processar vencimentos automáticos
   * de pagamentos de Aluguel Social que não foram liberados.
   */
  @Cron('0 0 8 * * *') // Todos os dias às 08:00
  async processarVencimentoAutomatico(): Promise<void> {
    this.logger.log('[PagamentoLiberacaoScheduler] Iniciando processamento de vencimento automático de pagamentos.');

    try {
      const resultado = await this.pagamentoService.processarVencimentoAutomatico();
      
      this.logger.log(
        `[PagamentoLiberacaoScheduler] Processamento de vencimento concluído. ` +
        `Pagamentos marcados como vencidos: ${resultado.length}`
      );
    } catch (error) {
      this.logger.error(
        '[PagamentoLiberacaoScheduler] Erro durante processamento de vencimento automático:',
        error.stack
      );
    }
  }

  /**
   * Executa a cada 4 horas para verificar pagamentos de aluguel social
   * que precisam de recibo do mês anterior.
   */
  @Cron('0 */4 * * *') // A cada 4 horas
  async verificarRecibosAluguelSocial(): Promise<void> {
    this.logger.debug('[PagamentoLiberacaoScheduler] Verificando recibos de aluguel social pendentes.');

    try {
      // Buscar pagamentos de aluguel social elegíveis
      const pagamentosElegiveis = await this.pagamentoLiberacaoService.buscarPagamentosElegiveis(100);

      // Filtrar apenas pagamentos de aluguel social
      const pagamentosAluguelSocial = pagamentosElegiveis.filter(p => 
        p.solicitacao?.tipo_beneficio?.codigo === 'aluguel-social'
      );

      const pagamentosSemRecibo: any[] = [];
      for (const pagamento of pagamentosAluguelSocial) {
        const elegibilidade = await this.pagamentoLiberacaoService.verificarElegibilidadeLiberacao(pagamento.id);
        if (!elegibilidade.podeLiberar && elegibilidade.motivo?.includes('recibo')) {
          pagamentosSemRecibo.push(pagamento);
        }
      }

      if (pagamentosSemRecibo.length > 0) {
        this.logger.warn(
          `[PagamentoLiberacaoScheduler] ${pagamentosSemRecibo.length} pagamentos de aluguel social ` +
          'aguardando recibo do mês anterior.'
        );
      }
    } catch (error) {
      this.logger.error(
        '[PagamentoLiberacaoScheduler] Erro ao verificar recibos de aluguel social:',
        error.stack
      );
    }
  }
}