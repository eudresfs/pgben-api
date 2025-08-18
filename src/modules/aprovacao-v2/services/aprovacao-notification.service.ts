import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacaoSistema, PrioridadeNotificacao, StatusNotificacaoProcessamento } from '../../../entities/notification.entity';
import { NotificationType } from '../../notificacao/interfaces/ably.interface';
import { NotificationManagerService } from '../../notificacao/services/notification-manager.service';
import { CreateNotificationDto } from '../../notificacao/dto/create-notification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Interface para dados de contexto de notificações de aprovação
 */
export interface AprovacaoNotificationContext {
  solicitacao_id: string;
  codigo_solicitacao: string;
  tipo_acao: string;
  status_anterior?: string;
  novo_status?: string;
  aprovador_id?: string;
  solicitante_id: string;
  justificativa?: string;
  dados_acao?: Record<string, any>;
  timestamp: Date;
  metadados_adicionais?: Record<string, any>;
}

/**
 * Interface para configuração de notificação de aprovação
 */
export interface AprovacaoNotificationConfig {
  tipo: NotificationType;
  prioridade: PrioridadeNotificacao;
  titulo: string;
  conteudo: string;
  template_id?: string;
  data_agendamento?: Date;
  canais?: string[];
}

/**
 * Serviço especializado para notificações do módulo de aprovação
 * Garante a persistência adequada dos dados de contexto e integração com o sistema de notificações
 */
@Injectable()
export class AprovacaoNotificationService {
  private readonly logger = new Logger(AprovacaoNotificationService.name);

  constructor(
    @InjectRepository(NotificacaoSistema)
    private readonly notificacaoRepository: Repository<NotificacaoSistema>,
    private readonly notificationManager: NotificationManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cria e persiste notificação de aprovação com dados de contexto completos
   */
  async criarNotificacaoAprovacao(
    destinatario_id: string,
    config: AprovacaoNotificationConfig,
    context: AprovacaoNotificationContext,
  ): Promise<NotificacaoSistema> {
    try {
      // Preparar dados de contexto enriquecidos
      const dadosContexto = {
        // Dados principais da solicitação
        solicitacao: {
          id: context.solicitacao_id,
          codigo: context.codigo_solicitacao,
          tipo_acao: context.tipo_acao,
          status_anterior: context.status_anterior,
          novo_status: context.novo_status,
          dados_acao: context.dados_acao,
        },
        // Dados dos usuários envolvidos
        usuarios: {
          solicitante_id: context.solicitante_id,
          aprovador_id: context.aprovador_id,
        },
        // Dados temporais
        temporal: {
          timestamp: context.timestamp,
          data_criacao: new Date(),
        },
        // Dados de processo
        processo: {
          justificativa: context.justificativa,
          origem: 'modulo_aprovacao_v2',
          versao_contexto: '1.0',
        },
        // Metadados adicionais
        metadados: context.metadados_adicionais || {},
      };

      // Criar DTO para o NotificationManager
      const createNotificationDto: CreateNotificationDto = {
        userId: destinatario_id,
        type: config.tipo,
        title: config.titulo,
        message: config.conteudo,
        dados_contexto: dadosContexto,
        template_id: config.template_id,
        data_agendamento: config.data_agendamento?.toISOString(),
      };

      // Usar o NotificationManager para criar e persistir a notificação
      const notificacao = await this.notificationManager.criarNotificacao(createNotificationDto);

      this.logger.log(
        `Notificação de aprovação criada e persistida: ${notificacao.id} para usuário ${destinatario_id} (solicitação: ${context.codigo_solicitacao})`
      );

      return notificacao;
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação de aprovação para usuário ${destinatario_id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Cria notificação para solicitação criada
   */
  async notificarSolicitacaoCriada(
    solicitanteId: string,
    aprovadores: string[],
    context: AprovacaoNotificationContext,
  ): Promise<NotificacaoSistema[]> {
    const notificacoes: NotificacaoSistema[] = [];

    try {
      // Notificar solicitante
      const notifSolicitante = await this.criarNotificacaoAprovacao(
        solicitanteId,
        {
          tipo: NotificationType.SYSTEM,
          prioridade: PrioridadeNotificacao.MEDIA,
          titulo: 'Solicitação Criada',
          conteudo: `Sua solicitação ${context.codigo_solicitacao} foi criada e está aguardando aprovação.`,
        },
        {
          ...context,
          metadados_adicionais: {
            tipo_notificacao: 'solicitacao_criada',
            destinatario_tipo: 'solicitante',
          },
        }
      );
      notificacoes.push(notifSolicitante);

      // Notificar aprovadores
      for (const aprovadorId of aprovadores) {
        const notifAprovador = await this.criarNotificacaoAprovacao(
          aprovadorId,
          {
            tipo: NotificationType.SYSTEM,
            prioridade: PrioridadeNotificacao.ALTA,
            titulo: 'Nova Solicitação para Aprovação',
            conteudo: `Nova solicitação ${context.codigo_solicitacao} aguarda sua aprovação.`,
          },
          {
            ...context,
            metadados_adicionais: {
              tipo_notificacao: 'solicitacao_pendente_aprovacao',
              destinatario_tipo: 'aprovador',
            },
          }
        );
        notificacoes.push(notifAprovador);
      }

      return notificacoes;
    } catch (error) {
      this.logger.error(
        `Erro ao notificar criação de solicitação ${context.codigo_solicitacao}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Cria notificação para solicitação aprovada
   */
  async notificarSolicitacaoAprovada(
    solicitanteId: string,
    context: AprovacaoNotificationContext,
  ): Promise<NotificacaoSistema> {
    return this.criarNotificacaoAprovacao(
      solicitanteId,
      {
        tipo: NotificationType.SUCCESS,
        prioridade: PrioridadeNotificacao.ALTA,
        titulo: 'Solicitação Aprovada',
        conteudo: `Sua solicitação ${context.codigo_solicitacao} foi aprovada.`,
      },
      {
        ...context,
        metadados_adicionais: {
          tipo_notificacao: 'solicitacao_aprovada',
          destinatario_tipo: 'solicitante',
        },
      }
    );
  }

  /**
   * Cria notificação para solicitação rejeitada
   */
  async notificarSolicitacaoRejeitada(
    solicitanteId: string,
    context: AprovacaoNotificationContext,
  ): Promise<NotificacaoSistema> {
    return this.criarNotificacaoAprovacao(
      solicitanteId,
      {
        tipo: NotificationType.ERROR,
        prioridade: PrioridadeNotificacao.ALTA,
        titulo: 'Solicitação Rejeitada',
        conteudo: `Sua solicitação ${context.codigo_solicitacao} foi rejeitada.`,
      },
      {
        ...context,
        metadados_adicionais: {
          tipo_notificacao: 'solicitacao_rejeitada',
          destinatario_tipo: 'solicitante',
        },
      }
    );
  }

  /**
   * Cria notificação para solicitação executada
   */
  async notificarSolicitacaoExecutada(
    solicitanteId: string,
    context: AprovacaoNotificationContext,
    resultado?: any,
  ): Promise<NotificacaoSistema> {
    return this.criarNotificacaoAprovacao(
      solicitanteId,
      {
        tipo: NotificationType.SUCCESS,
        prioridade: PrioridadeNotificacao.MEDIA,
        titulo: 'Solicitação Executada',
        conteudo: `Sua solicitação ${context.codigo_solicitacao} foi executada com sucesso.`,
      },
      {
        ...context,
        metadados_adicionais: {
          tipo_notificacao: 'solicitacao_executada',
          destinatario_tipo: 'solicitante',
          resultado_execucao: resultado,
        },
      }
    );
  }

  /**
   * Cria notificação para erro de execução
   */
  async notificarErroExecucao(
    solicitanteId: string,
    context: AprovacaoNotificationContext,
    erro: string,
  ): Promise<NotificacaoSistema> {
    return this.criarNotificacaoAprovacao(
      solicitanteId,
      {
        tipo: NotificationType.ERROR,
        prioridade: PrioridadeNotificacao.URGENTE,
        titulo: 'Erro na Execução',
        conteudo: `Erro ao executar sua solicitação ${context.codigo_solicitacao}.`,
      },
      {
        ...context,
        metadados_adicionais: {
          tipo_notificacao: 'erro_execucao',
          destinatario_tipo: 'solicitante',
          erro_detalhes: erro,
        },
      }
    );
  }

  /**
   * Busca notificações por solicitação
   */
  async buscarNotificacoesPorSolicitacao(solicitacaoId: string): Promise<NotificacaoSistema[]> {
    return this.notificacaoRepository.find({
      where: {
        dados_contexto: {
          solicitacao: {
            id: solicitacaoId,
          },
        } as any,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Busca notificações por usuário e tipo
   */
  async buscarNotificacoesPorUsuarioETipo(
    usuarioId: string,
    tipo: NotificationType,
  ): Promise<NotificacaoSistema[]> {
    return this.notificacaoRepository.find({
      where: {
        destinatario_id: usuarioId,
        dados_contexto: {
          tipo: tipo,
        } as any,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }
}