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
      // Processando criação de pagamento

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

      // Enviar notificação (se houver técnico responsável)
      const tecnicoId = pagamento.solicitacao?.tecnico_id;
      if (tecnicoId) {
        try {
          await this.notificacaoService.enviarNotificacao({
            tipo: 'PAGAMENTO_CRIADO',
            destinatario_id: tecnicoId,
            titulo: 'Pagamento Criado',
            conteudo: 'Seu pagamento foi criado e está sendo processado.',
            dados: { pagamentoId: pagamento.id },
          });
        } catch (notificationError) {
          this.logger.warn(
            `Falha ao enviar notificação de criação para pagamento ${pagamento.id}: ${notificationError.message}`,
          );
        }
      } else {
        this.logger.warn(
          `Pagamento ${pagamento.id} criado sem técnico responsável definido - notificação não enviada`,
        );
      }

      // Pagamento criado com sucesso
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
      // Processando liberação de pagamento

      // Buscar o pagamento completo com suas relações
      const pagamento = await this.pagamentoService.findPagamentoCompleto(pagamentoId);
      if (!pagamento) {
        this.logger.error(`Pagamento ${pagamentoId} não encontrado`);
        return;
      }

      // Verificar se o pagamento está em status válido para liberação
      if (pagamento.status === StatusPagamentoEnum.LIBERADO) {
        this.logger.warn(`Pagamento ${pagamentoId} já está liberado`);
        return;
      }
      
      if (pagamento.status !== StatusPagamentoEnum.PENDENTE && pagamento.status !== StatusPagamentoEnum.AGENDADO) {
        this.logger.warn(`Pagamento ${pagamentoId} não está em status válido para liberação. Status atual: ${pagamento.status}`);
        return;
      }

      // Verificar se existe liberado_por
      if (!pagamento.liberado_por) {
        this.logger.error(`Liberador não encontrado para pagamento ${pagamentoId}`);
        return;
      }

      // Obter informações do beneficiário para a mensagem
      const beneficiarioId = pagamento.concessao?.solicitacao?.beneficiario_id;
      const beneficiarioNome = pagamento.concessao?.solicitacao?.beneficiario?.nome || 'Beneficiário';

      // Liberar pagamento (usando updateStatus)
      const pagamentoAtualizado = await this.pagamentoService.updateStatus(
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

      // Enviar notificação para o liberador (se existir)
      if (pagamento.liberado_por) {
        try {
          await this.notificacaoService.enviarNotificacao({
            tipo: 'PAGAMENTO_LIBERADO',
            destinatario_id: pagamento.liberado_por,
            titulo: 'Pagamento Liberado com Sucesso',
            conteudo: `O pagamento para ${beneficiarioNome} foi liberado com sucesso e está disponível para processamento.`,
            dados: { pagamentoId, valor: pagamento.valor, beneficiarioNome },
          });
        } catch (notificationError) {
          this.logger.warn(
            `Falha ao enviar notificação de liberação para pagamento ${pagamentoId}: ${notificationError.message}`,
          );
        }
      } else {
        this.logger.warn(
          `Pagamento ${pagamentoId} liberado sem responsável definido - notificação não enviada`,
        );
      }

      // Pagamento liberado com sucesso
      return pagamentoAtualizado;
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
      // Processando cancelamento de pagamento

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

      // Enviar notificação (se houver técnico responsável)
      const tecnicoId = pagamento.solicitacao?.tecnico_id;
      if (tecnicoId) {
        try {
          await this.notificacaoService.enviarNotificacao({
            tipo: 'PAGAMENTO_CANCELADO',
            destinatario_id: tecnicoId,
            titulo: 'Pagamento Cancelado',
            conteudo:
              'Seu pagamento foi cancelado. Verifique os detalhes na sua conta.',
            dados: { pagamentoId, motivo },
          });
        } catch (notificationError) {
          this.logger.warn(
            `Falha ao enviar notificação de cancelamento para pagamento ${pagamentoId}: ${notificationError.message}`,
          );
        }
      } else {
        this.logger.warn(
          `Pagamento ${pagamentoId} cancelado sem técnico responsável definido - notificação não enviada`,
        );
      }

      // Pagamento cancelado com sucesso
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
      // Processando confirmação de recebimento

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

      // Recebimento confirmado com sucesso
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
      // Processando validação de comprovante

      // Buscar comprovante
      const comprovante = await this.comprovanteService.findById(comprovante_id);

      // Registrar auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.READ;
      logDto.entidade_afetada = 'ComprovantePagamento';
      logDto.entidade_id = comprovante_id;
      logDto.usuario_id = usuarioId;

      await this.auditoriaService.create(logDto);

      // Comprovante validado com sucesso
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
