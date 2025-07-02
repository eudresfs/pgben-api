import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PagamentoService } from '../services/pagamento.service';
import { ComprovanteService } from '../services/comprovante.service';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Processor para fila de pagamentos
 * Implementa Event-Driven Architecture para processamento assíncrono
 */
@Injectable()
@Processor('pagamentos')
export class PagamentoQueueProcessor implements OnModuleDestroy {
  private readonly logger = new Logger(PagamentoQueueProcessor.name);

  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly comprovanteService: ComprovanteService,
    private readonly notificacaoService: NotificacaoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Processa criação de pagamento
   */
  @Process('criar-pagamento')
  async processarCriacaoPagamento(job: Job<any>) {
    const { pagamentoData, usuarioId } = job.data;

    try {
      this.logger.log(`Processando criação de pagamento: ${job.id}`);

      // Criar pagamento
      const pagamento = await this.pagamentoService.create(
        pagamentoData,
        usuarioId,
      );

      // Registrar auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamento.id;
      logDto.usuario_id = usuarioId;

      await this.auditoriaService.create(logDto);

      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'PAGAMENTO_CRIADO',
        destinatario_id: pagamento.solicitacao?.tecnico_id,
        titulo: 'Pagamento Criado',
        conteudo: 'Seu pagamento foi criado e está sendo processado.',
        dados: { pagamentoId: pagamento.id },
      });

      this.logger.log(`Pagamento criado com sucesso: ${pagamento.id}`);
      return pagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao processar criação de pagamento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Processa liberação de pagamento
   */
  @Process('liberar-pagamento')
  async processarLiberacaoPagamento(job: Job<any>) {
    const { pagamentoId, usuarioId, dadosLiberacao } = job.data;

    try {
      this.logger.log(`Processando liberação de pagamento: ${pagamentoId}`);

      // Liberar pagamento (usando updateStatus)
      const pagamento = await this.pagamentoService.updateStatus(
        pagamentoId,
        {
          status: StatusPagamentoEnum.LIBERADO,
          observacoes: 'Pagamento liberado via fila',
        },
        usuarioId,
      );

      // Registrar auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.UPDATE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamentoId;
      logDto.usuario_id = usuarioId;

      await this.auditoriaService.create(logDto);

      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'PAGAMENTO_LIBERADO',
        destinatario_id: pagamento.solicitacao?.tecnico_id,
        titulo: 'Pagamento Liberado',
        conteudo: 'Seu pagamento foi liberado e está disponível para saque.',
        dados: { pagamentoId, valor: pagamento.valor },
      });

      this.logger.log(`Pagamento liberado com sucesso: ${pagamentoId}`);
      return pagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao processar liberação de pagamento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Processa cancelamento de pagamento
   */
  @Process('cancelar-pagamento')
  async processarCancelamentoPagamento(job: Job<any>) {
    const { pagamentoId, usuarioId, motivo } = job.data;

    try {
      this.logger.log(`Processando cancelamento de pagamento: ${pagamentoId}`);

      // Cancelar pagamento
      const pagamento = await this.pagamentoService.cancelar(
        pagamentoId,
        motivo,
        usuarioId,
      );

      // Registrar auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.DELETE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamentoId;
      logDto.usuario_id = usuarioId;

      await this.auditoriaService.create(logDto);

      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'PAGAMENTO_CANCELADO',
        destinatario_id: pagamento.solicitacao?.tecnico_id,
        titulo: 'Pagamento Cancelado',
        conteudo:
          'Seu pagamento foi cancelado. Verifique os detalhes na sua conta.',
        dados: { pagamentoId, motivo },
      });

      this.logger.log(`Pagamento cancelado com sucesso: ${pagamentoId}`);
      return pagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao processar cancelamento de pagamento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Processa confirmação de recebimento
   */
  @Process('confirmar-recebimento')
  async processarConfirmacaoRecebimento(job: Job<any>) {
    const { pagamentoId, confirmacaoData, usuarioId } = job.data;

    try {
      this.logger.log(`Processando confirmação de recebimento: ${pagamentoId}`);

      // Confirmar recebimento (usando updateStatus)
      const confirmacao = await this.pagamentoService.updateStatus(
        pagamentoId,
        {
          status: StatusPagamentoEnum.CONFIRMADO,
          observacoes: 'Recebimento confirmado',
        },
        usuarioId,
      );

      // Registrar auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.UPDATE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamentoId;
      logDto.usuario_id = usuarioId;

      await this.auditoriaService.create(logDto);

      this.logger.log(`Recebimento confirmado com sucesso: ${confirmacao.id}`);
      return confirmacao;
    } catch (error) {
      this.logger.error(
        `Erro ao processar confirmação de recebimento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Processa validação de comprovante
   */
  @Process('validar-comprovante')
  async processarValidacaoComprovante(job: Job<any>) {
    const { comprovante_id, usuarioId } = job.data;

    try {
      this.logger.log(`Processando validação de comprovante: ${comprovante_id}`);

      // Buscar comprovante
      const comprovante = await this.comprovanteService.findById(comprovante_id);

      // Registrar auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.READ;
      logDto.entidade_afetada = 'ComprovantePagamento';
      logDto.entidade_id = comprovante_id;
      logDto.usuario_id = usuarioId;

      await this.auditoriaService.create(logDto);

      this.logger.log(`Comprovante validado com sucesso: ${comprovante_id}`);
      return comprovante;
    } catch (error) {
      this.logger.error(
        `Erro ao processar validação de comprovante: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cleanup quando o módulo é destruído
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Finalizando processador de pagamentos...');

    try {
      // Aguardar um pouco para jobs em andamento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log('Processador de pagamentos finalizado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao finalizar processador de pagamentos:', error);
    }
  }
}
