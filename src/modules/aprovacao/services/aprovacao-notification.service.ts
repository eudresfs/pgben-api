import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacaoSistema, PrioridadeNotificacao, StatusNotificacaoProcessamento } from '../../../entities/notification.entity';
import { NotificationType } from '../../notificacao/interfaces/ably.interface';
import { NotificationManagerService } from '../../notificacao/services/notification-manager.service';
import { CreateNotificationDto } from '../../notificacao/dto/create-notification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AprovacaoTemplateMappingService, TipoNotificacaoAprovacao } from './aprovacao-template-mapping.service';

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
  solicitante_nome?: string;
  aprovador_nome?: string;
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
    private readonly templateMappingService: AprovacaoTemplateMappingService,
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
      // Preparar dados de contexto no formato esperado pelos templates
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Calcular prazo limite (assumindo 72 horas como padrão)
      const prazoLimite = new Date(agora.getTime() + (72 * 60 * 60 * 1000));
      const prazoFormatado = prazoLimite.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Calcular tempo restante em horas
      const tempoRestanteHoras = Math.ceil((prazoLimite.getTime() - agora.getTime()) / (1000 * 60 * 60));

      const dadosContexto = {
        // Variáveis principais esperadas pelos templates
         aprovador_nome: context.aprovador_nome,
         acao_nome: context.tipo_acao,
         solicitante_nome: context.solicitante_nome,
        data_solicitacao: dataFormatada,
        prazo_limite: prazoFormatado,
        valor_envolvido: context.dados_acao?.valor || 'N/A',
        codigo_solicitacao: context.codigo_solicitacao,
        justificativa: context.justificativa || 'Não informada',
        link_aprovacao: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/aprovacoes/${context.codigo_solicitacao}`,
        tempo_restante: `${tempoRestanteHoras}h`,
        prioridade: context.metadados_adicionais?.prioridade || 'media',
        email_suporte: process.env.EMAIL_SUPORTE || 'suporte@pgben.gov.br',
        data_envio: dataFormatada,
        
        // Variáveis específicas para template de processamento
        aprovada: context.novo_status === 'aprovada',
        status: context.novo_status,
        data_processamento: dataFormatada,
        observacoes: context.metadados_adicionais?.observacoes || '',
        link_solicitacao: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/solicitacoes/${context.codigo_solicitacao}`,
        link_nova_solicitacao: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/solicitacoes/nova`,
        
        // Variáveis para template de prazo vencendo
        horas_restantes: tempoRestanteHoras,
        
        // Dados estruturados originais (mantidos para compatibilidade)
        solicitacao: {
          id: context.codigo_solicitacao,
          codigo: context.codigo_solicitacao,
          tipo_acao: context.tipo_acao,
          status: context.novo_status,
          dados_acao: context.dados_acao,
        },
        solicitante: {
          nome: context.solicitante_nome || 'N/A',
          email: context.metadados_adicionais?.solicitante_email || 'N/A',
          id: context.solicitante_id,
        },
        aprovador: {
          nome: context.aprovador_nome || 'N/A',
          email: context.metadados_adicionais?.aprovador_email || 'N/A',
          id: context.aprovador_id,
        },
        temporal: {
          timestamp: context.timestamp,
          data_criacao: agora,
        },
        processo: {
          justificativa: context.justificativa,
          origem: 'modulo_aprovacao_v2',
          versao_contexto: '1.0',
        },
        metadados: context.metadados_adicionais || {},
      };

      // Buscar template apropriado se não foi fornecido
      let templateId = config.template_id;
      if (!templateId && context.metadados_adicionais?.tipo_notificacao) {
        const tipoNotificacao = context.metadados_adicionais.tipo_notificacao.toUpperCase();
        if (this.templateMappingService.temTemplateMapeado(tipoNotificacao)) {
          const dadosTemplate = await this.templateMappingService.prepararDadosTemplate(
            tipoNotificacao as keyof typeof TipoNotificacaoAprovacao
          );
          templateId = dadosTemplate.template_id;
          
          this.logger.debug(
            `Template ${dadosTemplate.templateEncontrado ? 'encontrado' : 'não encontrado'} para tipo '${tipoNotificacao}': ${dadosTemplate.codigoTemplate || 'N/A'}`
          );
        }
      }

      // Criar DTO para o NotificationManager
      const createNotificationDto: CreateNotificationDto = {
        userId: destinatario_id,
        type: config.tipo,
        title: config.titulo,
        message: config.conteudo,
        dados_contexto: dadosContexto,
        template_id: templateId,
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
            tipo_notificacao: 'SOLICITACAO_CRIADA',
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
              tipo_notificacao: 'SOLICITACAO_CRIADA',
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
          tipo_notificacao: 'SOLICITACAO_APROVADA',
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
          tipo_notificacao: 'SOLICITACAO_REJEITADA',
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
          tipo_notificacao: 'SOLICITACAO_EXECUTADA',
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
          tipo_notificacao: 'ERRO_EXECUCAO',
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