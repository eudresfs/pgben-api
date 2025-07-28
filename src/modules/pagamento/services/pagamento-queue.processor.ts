import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bull';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';
import { PagamentoService } from './pagamento.service';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Processador de jobs da fila de pagamentos
 * Implementa a arquitetura orientada a eventos para operações assíncronas
 */
@Injectable()
@Processor('pagamentos')
export class PagamentoQueueProcessor implements OnModuleDestroy {
  private readonly logger = new Logger(PagamentoQueueProcessor.name);

  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly notificacaoService: NotificacaoService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Processa a criação de um pagamento
   */
  @Process('create-pagamento')
  async processCreatePagamento(
    job: Job<{
      data: PagamentoCreateDto;
      userId: string;
    }>,
  ): Promise<any> {
    const { data, userId } = job.data;

    try {
      // Criar o pagamento
      const pagamento = await this.pagamentoService.create(data, userId);

      // Registrar auditoria
      await this.auditEventEmitter.emitEntityCreated(
        'Pagamento',
        pagamento.id,
        { pagamentoData: data },
        userId,
      );

      // Enviar notificação
      try {
        await this.notificacaoService.enviarNotificacao({
          tipo: 'PAGAMENTO_CRIADO',
          destinatario_id: userId,
          titulo: 'Pagamento Criado',
          conteudo: 'Seu pagamento foi criado com sucesso',
          dados: { pagamento },
        });
      } catch (notificationError) {
        this.logger.warn(
          `Falha ao enviar notificação de criação para pagamento ${pagamento.id}: ${notificationError.message}`,
        );
      }

      return pagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao processar criação de pagamento: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Processa a liberação de um pagamento
   */
  @Process('liberar-pagamento')
  async processLiberarPagamento(
    job: Job<{
      pagamentoId: string;
      data: any;
      userId: string;
    }>,
  ): Promise<any> {
    const { pagamentoId, data, userId } = job.data;

    const pagamento = await this.pagamentoService.findPagamentoCompleto(pagamentoId);

    if (!pagamento) {
        this.logger.error(`Pagamento com ID ${pagamentoId} não encontrado.`);
        return;
    }

    // Validação mais rigorosa de status para evitar processamento duplicado
    if (![StatusPagamentoEnum.PENDENTE, StatusPagamentoEnum.AGENDADO].includes(pagamento.status)) {
        this.logger.warn(`Pagamento ${pagamentoId} não está em status válido para liberação (${pagamento.status}). Job será ignorado.`);
        return;
    }

    try {
      const pagamentoAtualizado = await this.pagamentoService.updateStatus(
        pagamentoId,
        {
          status: StatusPagamentoEnum.LIBERADO,
          observacoes: 'Pagamento liberado via processamento em lote.',
        },
        userId,
      );

      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: pagamento.status },
        { status: StatusPagamentoEnum.LIBERADO, liberacaoData: data },
        userId,
      );

      // Notificar o técnico responsável pela liberação
      try {
        await this.notificacaoService.enviarNotificacao({
          tipo: 'PAGAMENTO_LIBERADO',
          destinatario_id: userId,
          titulo: 'Pagamento liberado com sucesso',
          conteudo: `O pagamento no valor de R$ ${pagamento.valor} foi liberado e processado.`,
          dados: { pagamento: pagamentoAtualizado },
        });
      } catch (notificationError) {
        this.logger.warn(
          `Falha ao enviar notificação de liberação para pagamento ${pagamentoId}: ${notificationError.message}`,
        );
      }

      return pagamentoAtualizado;
    } catch (error) {
      this.logger.error(
        `Erro ao processar liberação do pagamento ${pagamentoId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Processa o cancelamento de um pagamento
   */
  @Process('cancelar-pagamento')
  async processCancelarPagamento(
    job: Job<{
      pagamentoId: string;
      motivo: string;
      userId: string;
    }>,
  ): Promise<any> {
    const { pagamentoId, motivo, userId } = job.data;

    try {
      // Cancelar o pagamento
      const pagamento = await this.pagamentoService.cancelar(
        pagamentoId,
        motivo,
        userId,
      );

      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: pagamento.status },
        { status: StatusPagamentoEnum.CANCELADO, motivo },
        userId,
      );

      // Enviar notificação
      try {
        await this.notificacaoService.enviarNotificacao({
          tipo: 'PAGAMENTO_CANCELADO',
          destinatario_id: userId,
          titulo: 'Pagamento Cancelado',
          conteudo: 'Seu pagamento foi cancelado',
          dados: { pagamento, motivo },
        });
      } catch (notificationError) {
        this.logger.warn(
          `Falha ao enviar notificação de cancelamento para pagamento ${pagamentoId}: ${notificationError.message}`,
        );
      }

      return pagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao processar cancelamento de pagamento: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Processa a confirmação de recebimento
   */
  @Process('confirmar-recebimento')
  async processConfirmarRecebimento(
    job: Job<{
      pagamentoId: string;
      data: ConfirmacaoRecebimentoDto;
      userId: string;
    }>,
  ): Promise<any> {
    const { pagamentoId, data, userId } = job.data;

    try {
      // Confirmar recebimento (usando updateStatus)
      const confirmacao = await this.pagamentoService.updateStatus(
        pagamentoId,
        {
          status: StatusPagamentoEnum.CONFIRMADO,
          observacoes: 'Recebimento confirmado',
        },
        userId,
      );

      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: 'LIBERADO' },
        { status: StatusPagamentoEnum.CONFIRMADO, confirmacaoData: data },
        userId,
      );

      // Enviar notificação
      try {
        await this.notificacaoService.enviarNotificacao({
          tipo: 'RECEBIMENTO_CONFIRMADO',
          destinatario_id: userId,
          titulo: 'Recebimento Confirmado',
          conteudo: 'O recebimento do pagamento foi confirmado',
          dados: { confirmacao },
        });
      } catch (notificationError) {
        this.logger.warn(
          `Falha ao enviar notificação de confirmação para pagamento ${pagamentoId}: ${notificationError.message}`,
        );
      }

      return confirmacao;
    } catch (error) {
      this.logger.error(
        `Erro ao processar confirmação de recebimento: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Processa a validação de comprovante
   */
  @Process('validar-comprovante')
  async processValidarComprovante(
    job: Job<{
      pagamentoId: string;
      comprovante_id: string;
      userId: string;
    }>,
  ): Promise<any> {
    const { pagamentoId, comprovante_id, userId } = job.data;

    try {
      // Validar comprovante (simulação - implementar conforme necessário)
      const resultado = { valido: true, observacoes: 'Comprovante validado' };

      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { comprovante_validado: false },
        { comprovante_validado: true, comprovante_id, resultado },
        userId,
      );

      // Enviar notificação
      try {
        await this.notificacaoService.enviarNotificacao({
          tipo: 'COMPROVANTE_VALIDADO',
          destinatario_id: userId,
          titulo: 'Comprovante Validado',
          conteudo: 'O comprovante do pagamento foi validado',
          dados: { pagamentoId, comprovante_id, resultado },
        });
      } catch (notificationError) {
        this.logger.warn(
          `Falha ao enviar notificação de validação para pagamento ${pagamentoId}: ${notificationError.message}`,
        );
      }

      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro ao processar validação de comprovante: ${error.message}`,
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
