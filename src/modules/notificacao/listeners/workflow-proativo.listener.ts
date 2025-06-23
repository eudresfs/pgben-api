import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificacaoProativaService } from '../services/notificacao-proativa.service';
import { NotificacaoPreferenciasService } from '../services/notificacao-preferencias.service';
import { NotificacaoService } from '../services/notificacao.service';
import { TipoNotificacao } from '../../../entities/notification.entity';
import { CanalNotificacao } from '../services/notificacao-preferencias.service';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';

/**
 * Eventos do sistema de workflow
 */
interface WorkflowEvent {
  solicitacaoId: string;
  usuarioId: string;
  statusAnterior?: StatusSolicitacao;
  statusNovo: StatusSolicitacao;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface SolicitacaoEvent extends WorkflowEvent {
  tipoBeneficio: string;
  prazoLimite?: Date;
  prioridade?: 'low' | 'medium' | 'high';
}

interface AprovacaoEvent extends WorkflowEvent {
  aprovadorId: string;
  observacoes?: string;
  documentosAnexados?: string[];
}

interface LiberacaoEvent extends WorkflowEvent {
  valorLiberado?: number;
  formaPagamento?: string;
  contaBancaria?: string;
}

/**
 * Listener para eventos de workflow que dispara notificações proativas
 * 
 * Este listener integra o sistema de notificações com os eventos do workflow,
 * implementando as funcionalidades das Fases 4 e 5:
 * - Notificações proativas baseadas em eventos
 * - Aplicação de preferências de usuário
 * - Agrupamento inteligente de notificações
 */
@Injectable()
export class WorkflowProativoListener {
  private readonly logger = new Logger(WorkflowProativoListener.name);

  constructor(
    private readonly notificacaoProativaService: NotificacaoProativaService,
    private readonly preferenciasService: NotificacaoPreferenciasService,
    private readonly notificacaoService: NotificacaoService,
  ) {}

  // ==========================================
  // EVENTOS DE SOLICITAÇÃO
  // ==========================================

  @OnEvent('solicitacao.criada')
  async handleSolicitacaoCriada(event: SolicitacaoEvent) {
    this.logger.log(`Processando solicitação criada: ${event.solicitacaoId}`);

    try {
      // Notificar usuário sobre criação da solicitação
      await this.enviarNotificacaoComPreferencias({
        usuarioId: event.usuarioId,
        tipo: TipoNotificacao.SOLICITACAO,
        titulo: 'Solicitação Criada',
        mensagem: `Sua solicitação de ${event.tipoBeneficio} foi criada com sucesso.`,
        prioridade: 'medium',
        contexto: {
          solicitacaoId: event.solicitacaoId,
          tipoBeneficio: event.tipoBeneficio,
          status: event.statusNovo,
        },
      });

      // Executar verificação de prazos para alertas automáticos
      if (event.prazoLimite) {
        await this.notificacaoProativaService.executarVerificacaoPrazos();
      }

      // Notificar administradores sobre nova solicitação
      await this.notificarAdministradores({
        tipo: TipoNotificacao.SISTEMA,
        titulo: 'Nova Solicitação Recebida',
        mensagem: `Nova solicitação de ${event.tipoBeneficio} aguardando análise.`,
        prioridade: 'low',
        contexto: {
          solicitacaoId: event.solicitacaoId,
          tipoBeneficio: event.tipoBeneficio,
          usuarioSolicitante: event.usuarioId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar solicitação criada ${event.solicitacaoId}:`,
        error,
      );
    }
  }

  @OnEvent('solicitacao.atualizada')
  async handleSolicitacaoAtualizada(event: SolicitacaoEvent) {
    this.logger.log(`Processando solicitação atualizada: ${event.solicitacaoId}`);

    try {
      // Determinar prioridade baseada na mudança de status
      const prioridade = this.determinarPrioridadeTransicao(
        event.statusAnterior,
        event.statusNovo,
      );

      // Notificar usuário sobre atualização
      await this.enviarNotificacaoComPreferencias({
        usuarioId: event.usuarioId,
        tipo: this.mapearTipoNotificacao(event.statusNovo),
        titulo: 'Solicitação Atualizada',
        mensagem: this.gerarMensagemTransicao(
          event.statusAnterior,
          event.statusNovo,
          event.tipoBeneficio,
        ),
        prioridade,
        contexto: {
          solicitacaoId: event.solicitacaoId,
          statusAnterior: event.statusAnterior,
          statusNovo: event.statusNovo,
          tipoBeneficio: event.tipoBeneficio,
        },
      });

      // Alertas de prazo são gerenciados automaticamente pelo scheduler
      if (this.isStatusFinal(event.statusNovo)) {
        this.logger.log(`Solicitação ${event.solicitacaoId} finalizada - alertas serão limpos automaticamente`);
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar solicitação atualizada ${event.solicitacaoId}:`,
        error,
      );
    }
  }

  // ==========================================
  // EVENTOS DE APROVAÇÃO
  // ==========================================

  @OnEvent('solicitacao.aprovada')
  async handleSolicitacaoAprovada(event: AprovacaoEvent) {
    this.logger.log(`Processando solicitação aprovada: ${event.solicitacaoId}`);

    try {
      // Notificar usuário sobre aprovação
      await this.enviarNotificacaoComPreferencias({
        usuarioId: event.usuarioId,
        tipo: TipoNotificacao.APROVACAO,
        titulo: 'Solicitação Aprovada',
        mensagem: 'Sua solicitação foi aprovada! Aguarde a liberação do benefício.',
        prioridade: 'high',
        contexto: {
          solicitacaoId: event.solicitacaoId,
          aprovadorId: event.aprovadorId,
          observacoes: event.observacoes,
          dataAprovacao: event.timestamp,
        },
      });

      // Notificar setor financeiro sobre aprovação
      await this.notificarSetorFinanceiro({
        tipo: TipoNotificacao.APROVACAO,
        titulo: 'Solicitação Aprovada para Liberação',
        mensagem: 'Nova solicitação aprovada aguardando liberação financeira.',
        prioridade: 'medium',
        contexto: {
          solicitacaoId: event.solicitacaoId,
          aprovadorId: event.aprovadorId,
          usuarioSolicitante: event.usuarioId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar solicitação aprovada ${event.solicitacaoId}:`,
        error,
      );
    }
  }

  @OnEvent('solicitacao.indeferida')
  async handleSolicitacaoIndeferida(event: AprovacaoEvent) {
    this.logger.log(`Processando solicitação indeferida: ${event.solicitacaoId}`);

    try {
      // Notificar usuário sobre indeferimento
      await this.enviarNotificacaoComPreferencias({
        usuarioId: event.usuarioId,
        tipo: TipoNotificacao.APROVACAO,
        titulo: 'Solicitação Indeferida',
        mensagem: 'Sua solicitação foi indeferida. Verifique os motivos e documentação necessária.',
        prioridade: 'high',
        contexto: {
          solicitacaoId: event.solicitacaoId,
          aprovadorId: event.aprovadorId,
          observacoes: event.observacoes,
          dataIndeferimento: event.timestamp,
        },
      });

      // Alertas de prazo são gerenciados automaticamente pelo scheduler
      this.logger.log(`Solicitação ${event.solicitacaoId} indeferida - alertas serão limpos automaticamente`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar solicitação indeferida ${event.solicitacaoId}:`,
        error,
      );
    }
  }

  // ==========================================
  // EVENTOS DE LIBERAÇÃO
  // ==========================================

  // Método handleSolicitacaoLiberada removido - no novo ciclo de vida simplificado
  // APROVADA é o status final e não há mais transição para LIBERADA

  // ==========================================
  // EVENTOS DE SISTEMA
  // ==========================================

  @OnEvent('sistema.manutencao.iniciada')
  async handleManutencaoIniciada(event: { duracao: number; motivo: string }) {
    this.logger.log('Processando início de manutenção do sistema');

    try {
      await this.notificarTodosUsuarios({
        tipo: TipoNotificacao.SISTEMA,
        titulo: 'Manutenção do Sistema',
        mensagem: `O sistema entrará em manutenção. Duração estimada: ${event.duracao} minutos. Motivo: ${event.motivo}`,
        prioridade: 'high',
        contexto: {
          duracao: event.duracao,
          motivo: event.motivo,
          tipo: 'manutencao_iniciada',
        },
      });
    } catch (error) {
      this.logger.error('Erro ao processar início de manutenção:', error);
    }
  }

  @OnEvent('sistema.manutencao.finalizada')
  async handleManutencaoFinalizada() {
    this.logger.log('Processando fim de manutenção do sistema');

    try {
      await this.notificarTodosUsuarios({
        tipo: TipoNotificacao.SISTEMA,
        titulo: 'Sistema Disponível',
        mensagem: 'A manutenção foi concluída. O sistema está novamente disponível.',
        prioridade: 'medium',
        contexto: {
          tipo: 'manutencao_finalizada',
        },
      });
    } catch (error) {
      this.logger.error('Erro ao processar fim de manutenção:', error);
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  /**
   * Envia notificação respeitando as preferências do usuário
   */
  private async enviarNotificacaoComPreferencias(dados: {
    usuarioId: string;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    prioridade: 'low' | 'medium' | 'high';
    contexto?: Record<string, any>;
  }) {
    // Verificar se deve enviar baseado nas preferências
    const deveEnviar = await this.preferenciasService.deveEnviarNotificacao(
      dados.usuarioId,
      dados.tipo,
      dados.prioridade,
      CanalNotificacao.SSE,
    );

    if (!deveEnviar) {
      this.logger.debug(
        `Notificação bloqueada pelas preferências do usuário ${dados.usuarioId}`,
      );
      return;
    }

    // Por enquanto, não implementamos agrupamento automático
    // O agrupamento será feito pelo serviço de preferências quando necessário
    const deveAgrupar = false;

    if (deveAgrupar) {
      // Agrupamento será implementado futuramente
      this.logger.log('Agrupamento de notificações não implementado ainda');
    } else {
      // Enviar imediatamente
      await this.notificacaoService.criar({
        destinatario_id: dados.usuarioId,
        tipo: dados.tipo,
        titulo: dados.titulo,
        conteudo: dados.mensagem,
        dados_contexto: dados.contexto,
      });
    }
  }

  /**
   * Notifica todos os administradores
   */
  private async notificarAdministradores(dados: {
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    prioridade: 'low' | 'medium' | 'high';
    contexto?: Record<string, any>;
  }) {
    // TODO: Implementar busca de administradores
    // const administradores = await this.usuarioService.buscarAdministradores();
    // for (const admin of administradores) {
    //   await this.enviarNotificacaoComPreferencias({
    //     usuarioId: admin.id,
    //     ...dados,
    //   });
    // }
    this.logger.debug('Notificação para administradores (implementação pendente)');
  }

  /**
   * Notifica o setor financeiro
   */
  private async notificarSetorFinanceiro(dados: {
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    prioridade: 'low' | 'medium' | 'high';
    contexto?: Record<string, any>;
  }) {
    // TODO: Implementar busca de usuários do setor financeiro
    this.logger.debug('Notificação para setor financeiro (implementação pendente)');
  }

  /**
   * Notifica todos os usuários do sistema
   */
  private async notificarTodosUsuarios(dados: {
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    prioridade: 'low' | 'medium' | 'high';
    contexto?: Record<string, any>;
  }) {
    // TODO: Implementar notificação em massa
    this.logger.debug('Notificação para todos os usuários (implementação pendente)');
  }

  /**
   * Agenda acompanhamento pós-liberação
   */
  private async agendarAcompanhamentoPosLiberacao(event: LiberacaoEvent) {
    // Agendar notificação de acompanhamento em 7 dias
    const dataAcompanhamento = new Date();
    dataAcompanhamento.setDate(dataAcompanhamento.getDate() + 7);

    // TODO: Implementar agendamento de notificação de acompanhamento
    // Por enquanto, apenas logamos a intenção
    this.logger.log(
      `Agendamento de acompanhamento pós-liberação para usuário ${event.usuarioId} em 7 dias`,
      {
        usuarioId: event.usuarioId,
        solicitacaoId: event.solicitacaoId,
        dataAcompanhamento: dataAcompanhamento.toISOString(),
        tipo: 'acompanhamento_pos_liberacao',
      },
    );
  }

  /**
   * Determina a prioridade baseada na transição de status
   */
  private determinarPrioridadeTransicao(
    statusAnterior?: StatusSolicitacao,
    statusNovo?: StatusSolicitacao,
  ): 'low' | 'medium' | 'high' {
    if (!statusNovo) return 'low';

    // Status críticos têm prioridade alta
    if (
      statusNovo === StatusSolicitacao.APROVADA ||
      statusNovo === StatusSolicitacao.INDEFERIDA
    ) {
      return 'high';
    }

    // Pendências têm prioridade média
    if (statusNovo === StatusSolicitacao.PENDENTE) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Mapeia status para tipo de notificação
   */
  private mapearTipoNotificacao(status: StatusSolicitacao): TipoNotificacao {
    switch (status) {
      case StatusSolicitacao.APROVADA:
      case StatusSolicitacao.INDEFERIDA:
        return TipoNotificacao.APROVACAO;
      // Status LIBERADA removido - no novo ciclo de vida APROVADA é final
      case StatusSolicitacao.PENDENTE:
        return TipoNotificacao.PENDENCIA;
      default:
        return TipoNotificacao.SOLICITACAO;
    }
  }

  /**
   * Gera mensagem de transição de status
   */
  private gerarMensagemTransicao(
    statusAnterior?: StatusSolicitacao,
    statusNovo?: StatusSolicitacao,
    tipoBeneficio?: string,
  ): string {
    if (!statusNovo) return 'Status da solicitação foi atualizado.';

    const mensagens = {
      [StatusSolicitacao.PENDENTE]: `Sua solicitação de ${tipoBeneficio} está pendente de documentação.`,
      [StatusSolicitacao.APROVADA]: `Sua solicitação de ${tipoBeneficio} foi aprovada!`,
      [StatusSolicitacao.INDEFERIDA]: `Sua solicitação de ${tipoBeneficio} foi indeferida.`,
      [StatusSolicitacao.CANCELADA]: `Sua solicitação de ${tipoBeneficio} foi cancelada.`,
    };

    return mensagens[statusNovo] || `Status da solicitação atualizado para ${statusNovo}.`;
  }

  /**
   * Gera mensagem de liberação
   */
  private gerarMensagemLiberacao(event: LiberacaoEvent): string {
    let mensagem = 'Seu benefício foi liberado!';

    if (event.valorLiberado) {
      mensagem += ` Valor: R$ ${event.valorLiberado.toFixed(2)}.`;
    }

    if (event.formaPagamento) {
      mensagem += ` Forma de pagamento: ${event.formaPagamento}.`;
    }

    return mensagem;
  }

  /**
   * Verifica se o status é final
   */
  private isStatusFinal(status: StatusSolicitacao): boolean {
    return [
      StatusSolicitacao.APROVADA,
      StatusSolicitacao.INDEFERIDA,
      StatusSolicitacao.CANCELADA,
    ].includes(status);
  }

  /**
   * Mapeia prioridade string para enum
   */
  private mapearPrioridade(prioridade: 'low' | 'medium' | 'high') {
    const mapeamento = {
      low: 'BAIXA',
      medium: 'MEDIA',
      high: 'ALTA',
    };
    return mapeamento[prioridade] as any;
  }
}