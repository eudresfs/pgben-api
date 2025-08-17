import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationOrchestratorService } from '../../notificacao/services/notification-orchestrator.service';
import { NotificationType, NotificationPriority } from '../../notificacao/interfaces/ably.interface';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { RiskLevel, AuditEventType } from '../../auditoria/events/types/audit-event.types';

/**
 * Listener para eventos Ably específicos do módulo de aprovação
 * Envia notificações em tempo real para usuários conectados via Ably
 * Substitui o sistema SSE anterior
 */
@Injectable()
export class AprovacaoAblyListener {
  private readonly logger = new Logger(AprovacaoAblyListener.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Envia notificação Ably quando uma solicitação é criada
   */
  @OnEvent('solicitacao.criada')
  async handleSolicitacaoCriada(payload: {
    solicitacao: any;
    solicitanteId: string;
    configuracao: any;
    aprovadores: string[];
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código`);
        return;
      }

      // Notificar solicitante sobre criação
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Solicitação Criada',
        message: `Sua solicitação ${payload.solicitacao.codigo} foi criada e está aguardando aprovação.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.configuracao?.tipo_acao,
          status: 'PENDENTE',
          timestamp: payload.timestamp
        }
      });

      // Notificar administradores sobre nova solicitação
      await this.notificationOrchestrator.publishBroadcast({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Nova Solicitação Criada',
        message: `Nova solicitação ${payload.solicitacao.codigo} foi criada e aguarda aprovação.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.configuracao?.tipo_acao,
          status: 'PENDENTE',
          timestamp: payload.timestamp
        }
      }, {
        type: 'role',
        value: 'ADMIN'
      });

      // Notificar aprovadores sobre nova solicitação
      if (payload.aprovadores && Array.isArray(payload.aprovadores)) {
        for (const aprovadorId of payload.aprovadores) {
          await this.notificationOrchestrator.publishNotification(aprovadorId, {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: NotificationType.INFO,
            priority: NotificationPriority.HIGH,
            title: 'Nova Solicitação para Aprovação',
            message: `Nova solicitação ${payload.solicitacao.codigo} aguarda sua aprovação.`,
            timestamp: new Date(),
            data: {
              id: payload.solicitacao.id,
              codigo: payload.solicitacao.codigo,
              tipo_acao: payload.configuracao?.tipo_acao,
              solicitante: payload.solicitanteId,
              timestamp: payload.timestamp
            }
          });
        }
      }

      // Auditoria
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          userId: payload.solicitanteId,
          operation: TipoOperacao.CREATE,
          entityName: 'Solicitação',
          entityId: payload.solicitacao.id,
          message: `Notificação Ably enviada para criação da solicitação ${payload.solicitacao.codigo}`,
          riskLevel: RiskLevel.LOW
        }
      );

      this.logger.log(
        `Notificações Ably enviadas sobre criação da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificações Ably de criação: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando uma solicitação é aprovada
   */
  @OnEvent('solicitacao.aprovada')
  async handleSolicitacaoAprovada(payload: {
    solicitacao: any;
    aprovadorId: string;
    solicitanteId: string;
    justificativa?: string;
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null no evento aprovada');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código no evento aprovada`);
        return;
      }
      // Notificar solicitante sobre aprovação
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Solicitação Aprovada',
        message: `Sua solicitação ${payload.solicitacao.codigo} foi aprovada.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          aprovador: payload.aprovadorId,
          justificativa: payload.justificativa,
          timestamp: payload.timestamp
        }
      });

      // Notificar setor financeiro se aplicável
      if (payload.solicitacao.acao_aprovacao.notificar_financeiro) {
        await this.notificationOrchestrator.publishBroadcast({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: NotificationType.INFO,
          priority: NotificationPriority.NORMAL,
          title: 'Solicitação Aprovada - Financeiro',
          message: `Solicitação ${payload.solicitacao.codigo} aprovada e requer atenção do financeiro.`,
          timestamp: new Date(),
          data: {
            id: payload.solicitacao.id,
            codigo: payload.solicitacao.codigo,
            tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
            solicitante: payload.solicitanteId,
            aprovador: payload.aprovadorId,
            timestamp: payload.timestamp
          }
        }, {
          type: 'role',
          value: 'FINANCEIRO'
        });
      }

      // Auditoria
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          userId: payload.solicitanteId,
          operation: TipoOperacao.APPROVE,
          entityName: 'Solicitação',
          entityId: payload.solicitacao.id,
          message: `Notificação Ably enviada para aprovação da solicitação ${payload.solicitacao.codigo}`,
          riskLevel: RiskLevel.LOW
        }
      );

      this.logger.log(
        `Notificações Ably enviadas sobre aprovação da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificações Ably de aprovação: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando uma solicitação é rejeitada
   */
  @OnEvent('solicitacao.rejeitada')
  async handleSolicitacaoRejeitada(payload: {
    solicitacao: any;
    aprovadorId: string;
    solicitanteId: string;
    justificativa?: string;
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null no evento rejeitada');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código no evento rejeitada`);
        return;
      }
      // Notificar solicitante sobre rejeição
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: 'Solicitação Rejeitada',
        message: `Sua solicitação ${payload.solicitacao.codigo} foi rejeitada.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          aprovador: payload.aprovadorId,
          justificativa: payload.justificativa,
          timestamp: payload.timestamp
        }
      });

      // Auditoria
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          userId: payload.solicitanteId,
          operation: TipoOperacao.REJECT,
          entityName: 'Solicitação',
          entityId: payload.solicitacao.id,
          message: `Notificação Ably enviada para rejeição da solicitação ${payload.solicitacao.codigo}`,
          riskLevel: RiskLevel.LOW
        }
      );

      this.logger.log(
        `Notificação Ably enviada sobre rejeição da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação Ably de rejeição: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando uma solicitação é executada
   */
  @OnEvent('solicitacao.executada')
  async handleSolicitacaoExecutada(payload: {
    solicitacao: any;
    solicitanteId: string;
    resultado: any;
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null no evento executada');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código no evento executada`);
        return;
      }
      // Notificar solicitante sobre execução
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Solicitação Executada',
        message: `Sua solicitação ${payload.solicitacao.codigo} foi executada com sucesso.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          resultado: payload.resultado,
          timestamp: payload.timestamp
        }
      });

      // Auditoria
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          userId: payload.solicitanteId,
          operation: TipoOperacao.EXECUTION,
          entityName: 'Solicitação',
          entityId: payload.solicitacao.id,
          message: `Notificação Ably enviada sobre execução da solicitação ${payload.solicitacao.codigo}`,
          riskLevel: RiskLevel.LOW
        }
      );

      this.logger.log(
        `Notificação Ably enviada sobre execução da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação Ably de execução: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando há erro na execução
   */
  @OnEvent('solicitacao.erro_execucao')
  async handleSolicitacaoErroExecucao(payload: {
    solicitacao: any;
    solicitanteId: string;
    erro: string;
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null no evento erro_execucao');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código no evento erro_execucao`);
        return;
      }
      // Notificar solicitante sobre erro
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: 'Erro na Execução',
        message: `Erro ao executar sua solicitação ${payload.solicitacao.codigo}.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          erro: payload.erro,
          timestamp: payload.timestamp
        }
      });

      // Notificar administradores sobre erro crítico
      await this.notificationOrchestrator.publishBroadcast({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: 'Erro Crítico na Execução',
        message: `Erro crítico ao executar solicitação ${payload.solicitacao.codigo}.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao.tipo_acao,
          solicitante: payload.solicitanteId,
          erro: payload.erro,
          timestamp: payload.timestamp
        }
      }, {
        type: 'role',
        value: 'ADMIN'
      });

      this.logger.log(
        `Notificações Ably enviadas sobre erro de execução da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificações Ably de erro de execução: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando uma decisão é tomada por um aprovador
   */
  @OnEvent('aprovador.decisao_tomada')
  async handleAprovadorDecisaoTomada(payload: {
    solicitacaoId: string;
    codigo: string;
    aprovadorId: string;
    decisao: 'APROVADO' | 'REJEITADO';
    justificativa?: string;
    outrosAprovadores: string[];
    timestamp: Date;
  }) {
    try {
      // Notificar outros aprovadores sobre a decisão
      for (const aprovadorId of payload.outrosAprovadores) {
        if (aprovadorId !== payload.aprovadorId) {
          await this.notificationOrchestrator.publishNotification(aprovadorId, {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: payload.decisao === 'APROVADO' ? NotificationType.SUCCESS : NotificationType.ERROR,
            priority: NotificationPriority.NORMAL,
            title: 'Decisão Tomada',
            message: `Solicitação ${payload.codigo} foi ${payload.decisao.toLowerCase()} por outro aprovador.`,
            timestamp: new Date(),
            data: {
              solicitacaoId: payload.solicitacaoId,
              codigo: payload.codigo,
              aprovador: payload.aprovadorId,
              decisao: payload.decisao,
              justificativa: payload.justificativa,
              timestamp: payload.timestamp
            }
          });
        }
      }

      // Auditoria
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          userId: payload.aprovadorId,
          operation: TipoOperacao.APPROVE,
          entityName: 'Solicitação',
          entityId: payload.solicitacaoId,
          message: `Notificação Ably enviada sobre decisão do aprovador na solicitação ${payload.codigo}`,
          riskLevel: RiskLevel.LOW
        }
      );

      this.logger.log(
        `Notificações Ably enviadas sobre decisão tomada na solicitação ${payload.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificações Ably de decisão tomada: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando uma solicitação é cancelada
   */
  @OnEvent('solicitacao.cancelada')
  async handleSolicitacaoCancelada(payload: {
    solicitacao: any;
    solicitanteId: string;
    motivo?: string;
    aprovadores: string[];
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null no evento cancelada');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código no evento cancelada`);
        return;
      }
      // Notificar solicitante sobre cancelamento
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.ERROR,
        priority: NotificationPriority.NORMAL,
        title: 'Solicitação Cancelada',
        message: `Sua solicitação ${payload.solicitacao.codigo} foi cancelada.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao?.tipo_acao,
          motivo: payload.motivo,
          timestamp: payload.timestamp
        }
      });

      // Notificar aprovadores sobre cancelamento
      for (const aprovadorId of payload.aprovadores) {
        await this.notificationOrchestrator.publishNotification(aprovadorId, {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: 'Solicitação Cancelada',
          message: `Solicitação ${payload.solicitacao.codigo} foi cancelada pelo solicitante.`,
          timestamp: new Date(),
          data: {
            id: payload.solicitacao.id,
            codigo: payload.solicitacao.codigo,
            tipo_acao: payload.solicitacao.acao_aprovacao?.tipo_acao,
            solicitante: payload.solicitanteId,
            motivo: payload.motivo,
            timestamp: payload.timestamp
          }
        });
      }

      // Auditoria
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_INFO,
        {
          userId: payload.solicitanteId,
          operation: TipoOperacao.CANCEL,
          entityName: 'Solicitação',
          entityId: payload.solicitacao.id,
          message: `Notificação Ably enviada sobre cancelamento da solicitação ${payload.solicitacao.codigo}`,
          riskLevel: RiskLevel.MEDIUM
        }
      );

      this.logger.log(
        `Notificações Ably enviadas sobre cancelamento da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificações Ably de cancelamento: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Envia notificação Ably quando o status de uma solicitação é alterado
   */
  @OnEvent('solicitacao.status.alterado')
  async handleSolicitacaoStatusAlterado(payload: {
    solicitacao: any;
    solicitanteId: string;
    statusAnterior: string;
    novoStatus: string;
    aprovadores: string[];
    timestamp: Date;
  }) {
    try {
      // Verificar se a solicitação existe e possui as propriedades necessárias
      if (!payload.solicitacao) {
        this.logger.error('Payload da solicitação está undefined ou null no evento status.alterado');
        return;
      }

      if (!payload.solicitacao.codigo) {
        this.logger.error(`Solicitação ${payload.solicitacao.id || 'ID indefinido'} não possui código no evento status.alterado`);
        return;
      }
      // Notificar solicitante sobre mudança de status
      await this.notificationOrchestrator.publishNotification(payload.solicitanteId, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Status Alterado',
        message: `Status da solicitação ${payload.solicitacao.codigo} alterado para ${payload.novoStatus}.`,
        timestamp: new Date(),
        data: {
          id: payload.solicitacao.id,
          codigo: payload.solicitacao.codigo,
          tipo_acao: payload.solicitacao.acao_aprovacao?.tipo_acao,
          statusAnterior: payload.statusAnterior,
          novoStatus: payload.novoStatus,
          timestamp: payload.timestamp
        }
      });

      this.logger.log(
        `Notificação Ably enviada sobre alteração de status da solicitação ${payload.solicitacao.codigo}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação Ably de alteração de status: ${error.message}`,
        error.stack
      );
    }
  }
}