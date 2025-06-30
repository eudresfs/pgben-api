import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
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
export class PagamentoQueueProcessor {
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
  async processCreatePagamento(job: Job<{
    data: PagamentoCreateDto;
    userId: string;
  }>): Promise<any> {
    const { data, userId } = job.data;
    
    try {
      this.logger.log(`Processando criação de pagamento - Job ID: ${job.id}`);
      
      // Criar o pagamento
      const pagamento = await this.pagamentoService.create(data, userId);
      
      // Registrar auditoria
      await this.auditEventEmitter.emitEntityCreated(
        'Pagamento',
        pagamento.id,
        { pagamentoData: data },
        userId
      );
      
      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'PAGAMENTO_CRIADO',
        destinatario_id: userId,
        titulo: 'Pagamento Criado',
        conteudo: 'Seu pagamento foi criado com sucesso',
        dados: { pagamento },
      });
      
      this.logger.log(`Pagamento criado com sucesso - ID: ${pagamento.id}`);
      return pagamento;
      
    } catch (error) {
      this.logger.error(`Erro ao processar criação de pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Processa a liberação de um pagamento
   */
  @Process('liberar-pagamento')
  async processLiberarPagamento(job: Job<{
    pagamentoId: string;
    data: any;
    userId: string;
  }>): Promise<any> {
    const { pagamentoId, data, userId } = job.data;
    
    try {
      this.logger.log(`Processando liberação de pagamento - ID: ${pagamentoId}`);
      
      // Liberar pagamento (usando updateStatus)
      const pagamento = await this.pagamentoService.updateStatus(pagamentoId, {
        status: StatusPagamentoEnum.LIBERADO,
        observacoes: 'Pagamento liberado via fila',
      }, userId);
      
      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: 'PENDENTE' },
        { status: StatusPagamentoEnum.LIBERADO, liberacaoData: data },
        userId
      );
      
      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'PAGAMENTO_LIBERADO',
        destinatario_id: userId,
        titulo: 'Pagamento Liberado',
        conteudo: 'Seu pagamento foi liberado com sucesso',
        dados: { pagamento },
      });
      
      this.logger.log(`Pagamento liberado com sucesso - ID: ${pagamentoId}`);
      return pagamento;
      
    } catch (error) {
      this.logger.error(`Erro ao processar liberação de pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Processa o cancelamento de um pagamento
   */
  @Process('cancelar-pagamento')
  async processCancelarPagamento(job: Job<{
    pagamentoId: string;
    motivo: string;
    userId: string;
  }>): Promise<any> {
    const { pagamentoId, motivo, userId } = job.data;
    
    try {
      this.logger.log(`Processando cancelamento de pagamento - ID: ${pagamentoId}`);
      
      // Cancelar o pagamento
      const pagamento = await this.pagamentoService.cancelar(pagamentoId, motivo, userId);
      
      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: pagamento.status },
        { status: StatusPagamentoEnum.CANCELADO, motivo },
        userId
      );
      
      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'PAGAMENTO_CANCELADO',
        destinatario_id: userId,
        titulo: 'Pagamento Cancelado',
        conteudo: 'Seu pagamento foi cancelado',
        dados: { pagamento, motivo },
      });
      
      this.logger.log(`Pagamento cancelado com sucesso - ID: ${pagamentoId}`);
      return pagamento;
      
    } catch (error) {
      this.logger.error(`Erro ao processar cancelamento de pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Processa a confirmação de recebimento
   */
  @Process('confirmar-recebimento')
  async processConfirmarRecebimento(job: Job<{
    pagamentoId: string;
    data: ConfirmacaoRecebimentoDto;
    userId: string;
  }>): Promise<any> {
    const { pagamentoId, data, userId } = job.data;
    
    try {
      this.logger.log(`Processando confirmação de recebimento - ID: ${pagamentoId}`);
      
      // Confirmar recebimento (usando updateStatus)
      const confirmacao = await this.pagamentoService.updateStatus(pagamentoId, {
        status: StatusPagamentoEnum.CONFIRMADO,
        observacoes: 'Recebimento confirmado',
      }, userId);
      
      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: 'LIBERADO' },
        { status: StatusPagamentoEnum.CONFIRMADO, confirmacaoData: data },
        userId
      );
      
      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'RECEBIMENTO_CONFIRMADO',
        destinatario_id: userId,
        titulo: 'Recebimento Confirmado',
        conteudo: 'O recebimento do pagamento foi confirmado',
        dados: { confirmacao },
      });
      
      this.logger.log(`Recebimento confirmado com sucesso - ID: ${pagamentoId}`);
      return confirmacao;
      
    } catch (error) {
      this.logger.error(`Erro ao processar confirmação de recebimento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Processa a validação de comprovante
   */
  @Process('validar-comprovante')
  async processValidarComprovante(job: Job<{
    pagamentoId: string;
    comprovanteId: string;
    userId: string;
  }>): Promise<any> {
    const { pagamentoId, comprovanteId, userId } = job.data;
    
    try {
      this.logger.log(`Processando validação de comprovante - Pagamento ID: ${pagamentoId}`);
      
      // Validar comprovante (simulação - implementar conforme necessário)
      const resultado = { valido: true, observacoes: 'Comprovante validado' };
      
      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { comprovante_validado: false },
        { comprovante_validado: true, comprovanteId, resultado },
        userId
      );
      
      // Enviar notificação
      await this.notificacaoService.enviarNotificacao({
        tipo: 'COMPROVANTE_VALIDADO',
        destinatario_id: userId,
        titulo: 'Comprovante Validado',
        conteudo: 'O comprovante do pagamento foi validado',
        dados: { pagamentoId, comprovanteId, resultado },
      });
      
      this.logger.log(`Comprovante validado com sucesso - Pagamento ID: ${pagamentoId}`);
      return resultado;
      
    } catch (error) {
      this.logger.error(`Erro ao processar validação de comprovante: ${error.message}`, error.stack);
      throw error;
    }
  }
}