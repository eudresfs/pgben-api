import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bull';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';
import { PagamentoService } from './pagamento.service';
import { ComprovanteService } from './comprovante.service';
import { PagamentoEventosService } from './pagamento-eventos.service';
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
    private readonly comprovanteService: ComprovanteService,
    private readonly pagamentoEventosService: PagamentoEventosService,
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

      // Emitir evento de pagamento criado
      await this.pagamentoEventosService.emitirEventoPagamentoCriado({
        concessaoId: pagamento.concessao_id,
        valor: pagamento.valor,
        dataVencimento: pagamento.data_vencimento,
        usuarioCriadorId: userId,
        observacao: 'Pagamento criado via processamento em lote'
      });

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

    const pagamento =
      await this.pagamentoService.findPagamentoCompleto(pagamentoId);

    if (!pagamento) {
      this.logger.error(`Pagamento com ID ${pagamentoId} não encontrado.`);
      return;
    }

    // Verificar se o pagamento já foi confirmado como recebido
    if (pagamento.status === StatusPagamentoEnum.RECEBIDO) {
      this.logger.warn(
        `Pagamento ${pagamentoId} já foi confirmado como recebido`,
      );
      return;
    }

    // Verificar se o pagamento já está liberado
    if (pagamento.status === StatusPagamentoEnum.LIBERADO) {
      this.logger.warn(`Pagamento ${pagamentoId} já está liberado`);
      return;
    }

    // Validar se o pagamento está em status válido para liberação (PENDENTE ou AGENDADO)
    if (
      ![StatusPagamentoEnum.PENDENTE, StatusPagamentoEnum.AGENDADO].includes(
        pagamento.status,
      )
    ) {
      this.logger.warn(
        `Pagamento ${pagamentoId} não está em status válido para liberação. Status atual: ${pagamento.status}`,
      );
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

      // Obter informações do beneficiário para a mensagem
      const beneficiarioNome =
        pagamento.concessao?.solicitacao?.beneficiario?.nome || 'Beneficiário';

      // Emitir evento de pagamento liberado
      await this.pagamentoEventosService.emitirPagamentoLiberado(
        pagamentoId,
        {
          valorProcessado: pagamentoAtualizado.valor,
          dataProcessamento: new Date(),
          usuarioProcessadorId: userId,
        },
      );

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

      // Emitir evento de pagamento cancelado
      await this.pagamentoEventosService.emitirEventoPagamentoCancelado({
        canceladoPorId: userId,
        motivoCancelamento: motivo,
        dataCancelamento: new Date(),
      });

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
      const pagamento =
        await this.pagamentoService.findPagamentoCompleto(pagamentoId);

      if (!pagamento) {
        this.logger.error(`Pagamento com ID ${pagamentoId} não encontrado.`);
        return;
      }

      // Verificar se o pagamento já foi recebido
      if (pagamento.status === StatusPagamentoEnum.RECEBIDO) {
        this.logger.warn(
          `Pagamento ${pagamentoId} já foi confirmado como recebido.`,
        );
        return;
      }

      // Verificar se o pagamento está em um status válido para confirmação
      const statusValidosParaConfirmacao = [
        StatusPagamentoEnum.CONFIRMADO,
        StatusPagamentoEnum.LIBERADO,
      ];

      if (!statusValidosParaConfirmacao.includes(pagamento.status)) {
        this.logger.warn(
          `Pagamento ${pagamentoId} não está em um status válido para confirmação de recebimento. Status atual: ${pagamento.status}`,
        );
        return;
      }

      // Confirmar recebimento (usando updateStatus)
      const confirmacao = await this.pagamentoService.updateStatus(
        pagamentoId,
        {
          status: StatusPagamentoEnum.RECEBIDO,
          observacoes: 'Recebimento confirmado',
        },
        userId,
      );

      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: pagamento.status },
        { status: StatusPagamentoEnum.RECEBIDO, confirmacaoData: data },
        userId,
      );

      // Emitir evento de recebimento confirmado
      await this.pagamentoEventosService.emitirRecebimentoConfirmado(
        pagamentoId,
        {
          valorProcessado: confirmacao.valor,
          dataProcessamento: new Date(),
          usuarioProcessadorId: userId,
        },
      );

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
      const pagamento =
        await this.pagamentoService.findPagamentoCompleto(pagamentoId);

      if (!pagamento) {
        this.logger.error(`Pagamento com ID ${pagamentoId} não encontrado.`);
        return;
      }

      // Verificar se o pagamento está em status válido para validação de comprovante
      const statusValidosParaValidacao = [
        StatusPagamentoEnum.CONFIRMADO,
        StatusPagamentoEnum.RECEBIDO,
      ];

      if (!statusValidosParaValidacao.includes(pagamento.status)) {
        this.logger.warn(
          `Pagamento ${pagamentoId} não está em status válido para validação de comprovante. Status atual: ${pagamento.status}`,
        );
        return;
      }

      // Verificar se existe comprovante para validar
      if (!comprovante_id) {
        this.logger.error(
          `ID do comprovante não fornecido para validação do pagamento ${pagamentoId}`,
        );
        return;
      }

      // Buscar o comprovante
      const comprovante =
        await this.comprovanteService.findById(comprovante_id);
      if (!comprovante) {
        this.logger.error(
          `Comprovante ${comprovante_id} não encontrado para validação.`,
        );
        return;
      }

      // Simular validação do comprovante (implementar lógica específica conforme necessário)
      const resultado = {
        valido: true, // Por enquanto, sempre válido - implementar lógica real
        observacoes: 'Comprovante validado automaticamente',
      };

      // Atualizar o pagamento com o resultado da validação
      const statusAtualizado = resultado.valido
        ? StatusPagamentoEnum.CONFIRMADO
        : StatusPagamentoEnum.PENDENTE;

      await this.pagamentoService.updateStatus(
        pagamentoId,
        {
          status: statusAtualizado,
          observacoes:
            resultado.observacoes ||
            (resultado.valido
              ? 'Comprovante validado com sucesso'
              : 'Comprovante rejeitado'),
        },
        userId,
      );

      // Registrar auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Pagamento',
        pagamentoId,
        { status: pagamento.status },
        { status: statusAtualizado, comprovante_id, resultado },
        userId,
      );

      // Emitir evento de comprovante validado
      await this.pagamentoEventosService.emitirComprovanteValidado(
        pagamentoId,
        {
          validadorId: userId,
          resultadoValidacao: resultado.valido ? 'APROVADO' : 'REJEITADO',
          dataValidacao: new Date(),
          observacaoValidacao: resultado.observacoes,
        },
      );

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
