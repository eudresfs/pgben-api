import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { SystemContextService } from '../../../common/services/system-context.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { AuditEventType, RiskLevel } from '../../auditoria/events/types/audit-event.types';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

/**
 * Listener para eventos de auditoria específicos do módulo de aprovação
 * Captura eventos do sistema de aprovação e registra auditoria detalhada
 */
@Injectable()
export class AprovacaoAuditListener {
  private readonly logger = new Logger(AprovacaoAuditListener.name);

  constructor(
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly systemContextService: SystemContextService,
  ) {}

  /**
   * Processa eventos de mudança de status de solicitação
   */
  @OnEvent('solicitacao.status.alterado')
  async handleStatusAlterado(payload: {
    solicitacaoId: string;
    statusAnterior: string;
    novoStatus: string;
    aprovadorId: string;
    decisao: string;
    justificativa?: string;
    timestamp: Date;
  }) {
    try {
      await this.auditEventEmitter.emit({
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'SolicitacaoAprovacao',
        entityId: payload.solicitacaoId,
        userId: payload.aprovadorId,
        timestamp: payload.timestamp,
        riskLevel: RiskLevel.HIGH,
        lgpdRelevant: false,
        metadata: {
          operation: TipoOperacao.UPDATE,
          description: `Mudança de status: ${payload.statusAnterior} → ${payload.novoStatus}`,
          status_anterior: payload.statusAnterior,
          novo_status: payload.novoStatus,
          decisao: payload.decisao,
          justificativa: payload.justificativa
        }
      });

      this.logger.log(
        `Auditoria registrada para mudança de status da solicitação ${payload.solicitacaoId}: ${payload.statusAnterior} → ${payload.novoStatus}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de mudança de status: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Processa eventos de aprovação final
   */
  @OnEvent('solicitacao.aprovada')
  async handleSolicitacaoAprovada(payload: {
    solicitacao: any;
    aprovadorId: string;
    justificativa?: string;
    timestamp: Date;
  }) {
    try {
      await this.auditEventEmitter.emit({
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'SolicitacaoAprovacao',
        entityId: payload.solicitacao.id,
        userId: payload.aprovadorId,
        timestamp: payload.timestamp,
        riskLevel: RiskLevel.HIGH,
        lgpdRelevant: false,
        metadata: {
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          operation: TipoOperacao.APPROVE,
          description: `Solicitação ${payload.solicitacao.codigo} aprovada definitivamente`,
          justificativa: payload.justificativa
        }
      });

      this.logger.log(
        `Auditoria registrada para aprovação final da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de aprovação final: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Processa eventos de rejeição
   */
  @OnEvent('solicitacao.rejeitada')
  async handleSolicitacaoRejeitada(payload: {
    solicitacao: any;
    aprovadorId: string;
    justificativa?: string;
    timestamp: Date;
  }) {
    try {
      await this.auditEventEmitter.emit({
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'SolicitacaoAprovacao',
        entityId: payload.solicitacao.id,
        userId: payload.aprovadorId,
        timestamp: payload.timestamp,
        riskLevel: RiskLevel.HIGH,
        lgpdRelevant: false,
        metadata: {
          operation: TipoOperacao.REJECT,
          description: `Solicitação ${payload.solicitacao.codigo} rejeitada`,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          aprovador_rejeitou: payload.aprovadorId,
          justificativa: payload.justificativa
        }
      });

      this.logger.log(
        `Auditoria registrada para rejeição da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de rejeição: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Processa eventos de execução bem-sucedida
   */
  @OnEvent('solicitacao.executada')
  async handleSolicitacaoExecutada(payload: {
    solicitacao: any;
    dadosExecucao?: any;
    timestamp: Date;
  }) {
    try {
      await this.systemContextService.runWithSystemContext(async () => {
        await this.auditEventEmitter.emit({
          eventType: AuditEventType.ENTITY_UPDATED,
          entityName: 'SolicitacaoAprovacao',
          entityId: payload.solicitacao.id,
          userId: SYSTEM_USER_UUID,
          timestamp: payload.timestamp,
          riskLevel: RiskLevel.CRITICAL,
          lgpdRelevant: false,
          metadata: {
            codigo: payload.solicitacao.codigo,
            tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
            operation: TipoOperacao.EXECUTION,
            description: `Ação executada com sucesso para solicitação ${payload.solicitacao.codigo}`,
            dados_execucao: payload.dadosExecucao,
            executado_em: payload.solicitacao.executado_em
          }
        });
      });

      this.logger.log(
        `Auditoria registrada para execução da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de execução: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Processa eventos de erro de execução
   */
  @OnEvent('solicitacao.erro_execucao')
  async handleErroExecucao(payload: {
    solicitacao: any;
    erro: string;
    timestamp: Date;
  }) {
    try {
      await this.systemContextService.runWithSystemContext(async () => {
        await this.auditEventEmitter.emit({
          eventType: AuditEventType.SYSTEM_ERROR,
          entityName: 'SolicitacaoAprovacao',
          entityId: payload.solicitacao.id,
          userId: SYSTEM_USER_UUID,
          timestamp: payload.timestamp,
          riskLevel: RiskLevel.CRITICAL,
          lgpdRelevant: false,
          metadata: {
            operation: TipoOperacao.EXECUTION,
            description: `Erro na execução da solicitação ${payload.solicitacao.codigo}: ${payload.erro}`,
            codigo: payload.solicitacao.codigo,
            tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
            erro_execucao: payload.erro
          }
        });
      });

      this.logger.error(
        `Auditoria registrada para erro de execução da solicitação ${payload.solicitacao.codigo}: ${payload.erro}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de erro de execução: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Processa eventos de cancelamento
   */
  @OnEvent('solicitacao.cancelada')
  async handleSolicitacaoCancelada(payload: {
    solicitacao: any;
    usuarioId: string;
    statusAnterior: string;
    timestamp: Date;
  }) {
    try {
      await this.auditEventEmitter.emit({
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'SolicitacaoAprovacao',
        entityId: payload.solicitacao.id,
        userId: payload.usuarioId,
        timestamp: payload.timestamp,
        riskLevel: RiskLevel.MEDIUM,
        lgpdRelevant: false,
        metadata: {
          operation: TipoOperacao.CANCEL,
          description: `Solicitação ${payload.solicitacao.codigo} cancelada pelo solicitante`,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          status_anterior: payload.statusAnterior,
          cancelado_por: payload.usuarioId
        }
      });

      this.logger.log(
        `Auditoria registrada para cancelamento da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de cancelamento: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Processa eventos de criação de solicitação
   */
  @OnEvent('solicitacao.criada')
  async handleSolicitacaoCriada(payload: {
    solicitacao: any;
    solicitanteId: string;
    configuracao: any;
    timestamp: Date;
  }) {
    try {
      await this.auditEventEmitter.emit({
        eventType: AuditEventType.ENTITY_CREATED,
        entityName: 'SolicitacaoAprovacao',
        entityId: payload.solicitacao.id,
        userId: payload.solicitanteId,
        timestamp: payload.timestamp,
        riskLevel: RiskLevel.MEDIUM,
        lgpdRelevant: false,
        metadata: {
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.configuracao.tipo_acao,
          operation: TipoOperacao.CREATE,
          description: `Nova solicitação criada: ${payload.solicitacao.codigo}`,
          configuracao_nome: payload.configuracao.nome
        }
      });

      this.logger.log(
        `Auditoria registrada para criação da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar auditoria de criação: ${error.message}`,
        error.stack
      );
    }
  }
}