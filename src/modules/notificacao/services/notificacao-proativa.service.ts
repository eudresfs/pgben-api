import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificacaoSistema, TipoNotificacao, StatusNotificacaoProcessamento } from '../../../entities/notification.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { NotificacaoService } from './notificacao.service';
import { addDays, addHours, isAfter, isBefore, differenceInDays } from 'date-fns';
import { Status } from '../../../enums/status.enum';

/**
 * Interface para configuração de alertas de prazo
 */
interface ConfiguracaoAlertaPrazo {
  tipo: 'solicitacao' | 'pagamento' | 'documento';
  diasAntecedencia: number[];
  horasAntecedencia?: number[];
  statusAlvo: string[];
  template: {
    titulo: string;
    conteudo: string;
  };
}

/**
 * Interface para métricas de sistema
 */
interface MetricasSistema {
  solicitacoesPendentes: number;
  solicitacoesVencidas: number;
  pagamentosAtrasados: number;
  documentosPendentes: number;
  usuariosAtivos: number;
}

/**
 * Serviço de Notificações Proativas
 * 
 * Implementa a Fase 4 do plano de integração SSE:
 * - Alertas de prazos automáticos
 * - Notificações de sistema baseadas em métricas
 * - Monitoramento automático de estados críticos
 */
@Injectable()
export class NotificacaoProativaService {
  private readonly logger = new Logger(NotificacaoProativaService.name);

  constructor(
    @InjectRepository(NotificacaoSistema)
    private notificacaoRepository: Repository<NotificacaoSistema>,
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private readonly notificacaoService: NotificacaoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Configurações padrão para alertas de prazo
   */
  private readonly configuracoesPrazo: ConfiguracaoAlertaPrazo[] = [
    {
      tipo: 'solicitacao',
      diasAntecedencia: [7, 3, 1],
      horasAntecedencia: [24, 12, 6],
      statusAlvo: [StatusSolicitacao.PENDENTE, StatusSolicitacao.APROVADA],
      template: {
        titulo: 'Prazo de Solicitação se Aproximando',
        conteudo: 'Sua solicitação #{id} tem prazo se aproximando. Verifique os detalhes.',
      },
    },
    {
      tipo: 'documento',
      diasAntecedencia: [5, 2],
      horasAntecedencia: [48, 24],
      statusAlvo: [StatusSolicitacao.APROVADA],
      template: {
        titulo: 'Documentos Pendentes',
        conteudo: 'Você possui documentos pendentes para a solicitação #{id}. Envie o quanto antes.',
      },
    },
  ];

  /**
   * Job executado a cada hora para verificar prazos
   * Implementa tarefa 4.1: Alertas de prazos
   */
  @Cron(CronExpression.EVERY_HOUR)
  async verificarPrazos(): Promise<void> {
    this.logger.log('Iniciando verificação de prazos...');

    try {
      for (const config of this.configuracoesPrazo) {
        await this.processarAlertasPrazo(config);
      }

      this.logger.log('Verificação de prazos concluída com sucesso');
    } catch (error) {
      this.logger.error('Erro na verificação de prazos:', error);
    }
  }

  /**
   * Processa alertas de prazo para uma configuração específica
   */
  private async processarAlertasPrazo(config: ConfiguracaoAlertaPrazo): Promise<void> {
    const agora = new Date();

    // Verificar alertas por dias
    for (const dias of config.diasAntecedencia) {
      const dataLimite = addDays(agora, dias);
      await this.enviarAlertasPorPrazo(config, dataLimite, `${dias} dias`);
    }

    // Verificar alertas por horas (se configurado)
    if (config.horasAntecedencia) {
      for (const horas of config.horasAntecedencia) {
        const dataLimite = addHours(agora, horas);
        await this.enviarAlertasPorPrazo(config, dataLimite, `${horas} horas`);
      }
    }
  }

  /**
   * Envia alertas para solicitações que se aproximam do prazo
   */
  private async enviarAlertasPorPrazo(
    config: ConfiguracaoAlertaPrazo,
    dataLimite: Date,
    descricaoPrazo: string,
  ): Promise<void> {
    const solicitacoes = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status IN (:...status)', { status: config.statusAlvo })
      .andWhere('solicitacao.prazo_analise <= :dataLimite', { dataLimite })
      .andWhere('solicitacao.prazo_analise > :agora', { agora: new Date() })
      .getMany();

    for (const solicitacao of solicitacoes) {
      // Verificar se já foi enviado alerta para este prazo
      const alertaExistente = await this.verificarAlertaExistente(
        solicitacao.id,
        config.tipo,
        descricaoPrazo,
      );

      if (!alertaExistente) {
        await this.enviarAlertaPrazo(solicitacao, config, descricaoPrazo);
      }
    }
  }

  /**
   * Verifica se já existe um alerta para o prazo específico
   */
  private async verificarAlertaExistente(
    solicitacaoId: string,
    tipo: string,
    descricaoPrazo: string,
  ): Promise<boolean> {
    const count = await this.notificacaoRepository.count({
      where: {
        dados_contexto: {
          entidade_relacionada_id: solicitacaoId,
          tipo_alerta: 'prazo',
          subtipo: tipo,
          prazo: descricaoPrazo,
        } as any,
      },
    });

    return count > 0;
  }

  /**
   * Envia alerta de prazo para uma solicitação
   */
  private async enviarAlertaPrazo(
    solicitacao: Solicitacao,
    config: ConfiguracaoAlertaPrazo,
    descricaoPrazo: string,
  ): Promise<void> {
    const titulo = config.template.titulo;
    const conteudo = config.template.conteudo.replace('#{id}', solicitacao.id);

    await this.notificacaoService.criarEBroadcast({
      destinatario_id: solicitacao.tecnico_id,
      tipo: TipoNotificacao.ALERTA,
      titulo,
      conteudo,
      entidade_tipo: 'solicitacao',
      link: `/solicitacoes/${solicitacao.id}`,
      prioridade: this.determinarPrioridadePrazo(descricaoPrazo),
      dados: {
        entidade_relacionada_id: solicitacao.id,
        tipo_alerta: 'prazo',
        subtipo: config.tipo,
        prazo: descricaoPrazo,
        prazo_analise: solicitacao.prazo_analise,
        status_solicitacao: solicitacao.status,
      },
    });

    this.logger.log(
      `Alerta de prazo enviado para usuário ${solicitacao.tecnico_id} - Solicitação ${solicitacao.id} (${descricaoPrazo})`,
    );
  }

  /**
   * Determina a prioridade do alerta baseado no prazo
   */
  private determinarPrioridadePrazo(descricaoPrazo: string): 'low' | 'medium' | 'high' {
    if (descricaoPrazo.includes('6 horas') || descricaoPrazo.includes('1 dia')) {
      return 'high';
    }
    if (descricaoPrazo.includes('12 horas') || descricaoPrazo.includes('2 dias')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Job executado a cada 6 horas para monitoramento do sistema
   * Implementa tarefa 4.2: Notificações de sistema
   */
  @Cron('0 */6 * * *') // A cada 6 horas
  async monitorarSistema(): Promise<void> {
    this.logger.log('Iniciando monitoramento do sistema...');

    try {
      const metricas = await this.coletarMetricasSistema();
      await this.processarNotificacoesSistema(metricas);

      this.logger.log('Monitoramento do sistema concluído');
    } catch (error) {
      this.logger.error('Erro no monitoramento do sistema:', error);
    }
  }

  /**
   * Coleta métricas do sistema para análise
   */
  private async coletarMetricasSistema(): Promise<MetricasSistema> {
    const agora = new Date();
    const ontemAgo = addDays(agora, -1);

    const [solicitacoesPendentes, solicitacoesVencidas, usuariosAtivos] = await Promise.all([
      // Solicitações pendentes
      this.solicitacaoRepository.count({
        where: { status: StatusSolicitacao.PENDENTE },
      }),

      // Solicitações vencidas
      this.solicitacaoRepository.count({
        where: {
          status: StatusSolicitacao.PENDENTE,
          prazo_analise: LessThan(agora),
        },
      }),

      // Usuários ativos (com atividade nas últimas 24h)
      this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .select('COUNT(DISTINCT solicitacao.tecnico_id)', 'count')
        .where('solicitacao.updated_at >= :ontem', { ontem: ontemAgo })
        .getRawOne()
        .then((result) => parseInt(result.count) || 0),
    ]);

    return {
      solicitacoesPendentes,
      solicitacoesVencidas,
      pagamentosAtrasados: 0, // TODO: Implementar quando módulo de pagamentos estiver disponível
      documentosPendentes: 0, // TODO: Implementar quando módulo de documentos estiver disponível
      usuariosAtivos,
    };
  }

  /**
   * Processa notificações baseadas nas métricas do sistema
   */
  private async processarNotificacoesSistema(metricas: MetricasSistema): Promise<void> {
    // Alerta para muitas solicitações pendentes
    if (metricas.solicitacoesPendentes > 50) {
      await this.enviarAlertaSistema(
        'sistema-sobrecarga',
        'Sistema com Alta Demanda',
        `Existem ${metricas.solicitacoesPendentes} solicitações pendentes no sistema.`,
        'high',
        { metricas },
      );
    }

    // Alerta para solicitações vencidas
    if (metricas.solicitacoesVencidas > 10) {
      await this.enviarAlertaSistema(
        'solicitacoes-vencidas',
        'Solicitações Vencidas Detectadas',
        `${metricas.solicitacoesVencidas} solicitações estão com prazo vencido.`,
        'high',
        { metricas },
      );
    }

    // Alerta para baixa atividade
    if (metricas.usuariosAtivos < 5) {
      await this.enviarAlertaSistema(
        'baixa-atividade',
        'Baixa Atividade no Sistema',
        `Apenas ${metricas.usuariosAtivos} usuários ativos nas últimas 24 horas.`,
        'medium',
        { metricas },
      );
    }
  }

  /**
   * Envia alerta de sistema para administradores
   */
  private async enviarAlertaSistema(
    tipoAlerta: string,
    titulo: string,
    conteudo: string,
    prioridade: 'low' | 'medium' | 'high',
    dados: Record<string, any>,
  ): Promise<void> {
    // Verificar se alerta similar já foi enviado recentemente (últimas 6 horas)
    const seisHorasAtras = addHours(new Date(), -6);
    const alertaRecente = await this.notificacaoRepository.findOne({
      where: {
        dados_contexto: {
          tipo_alerta: 'sistema',
          subtipo: tipoAlerta,
        } as any,
        created_at: MoreThan(seisHorasAtras),
      },
    });

    if (alertaRecente) {
      this.logger.log(`Alerta de sistema '${tipoAlerta}' já enviado recentemente`);
      return;
    }

    // Buscar IDs de administradores ativos
    const adminIds = await this.buscarAdministradores();
    if (adminIds.length === 0) {
      this.logger.warn('Nenhum administrador ativo encontrado para envio de alerta de sistema');
      return;
    }

    for (const adminId of adminIds) {
      await this.notificacaoService.criarEBroadcast({
        destinatario_id: adminId,
        tipo: TipoNotificacao.SISTEMA,
        titulo,
        conteudo,
        prioridade,
        dados: {
          tipo_alerta: 'sistema',
          subtipo: tipoAlerta,
          timestamp: new Date().toISOString(),
          ...dados,
        },
      });
    }

    this.logger.log(`Alerta de sistema '${tipoAlerta}' enviado para ${adminIds.length} administradores`);
  }

  /**
   * Busca IDs de administradores ativos
   * @returns Lista de IDs de usuários administradores ativos
   */
  private async buscarAdministradores(): Promise<string[]> {
    const administradores = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoin('usuario.role', 'role')
      .select('usuario.id', 'id')
      .where('role.nome = :nome', { nome: 'Administrador' })
      .andWhere('usuario.status = :status', { status: Status.ATIVO })
      .getRawMany<{ id: string }>();

    return administradores.map((a) => a.id);
  }

  /**
   * Job executado diariamente para limpeza de notificações antigas
   * Implementa tarefa 4.3: Configurar monitoramento automático
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async limpezaNotificacoesAntigas(): Promise<void> {
    this.logger.log('Iniciando limpeza de notificações antigas...');

    try {
      const trintaDiasAtras = addDays(new Date(), -30);

      // Arquivar notificações lidas antigas
      const notificacoesArquivadas = await this.notificacaoRepository.update(
        {
          status: StatusNotificacaoProcessamento.LIDA,
          data_leitura: LessThan(trintaDiasAtras),
        },
        {
          status: StatusNotificacaoProcessamento.ARQUIVADA,
        },
      );

      // Remover notificações muito antigas (90 dias)
      const noventaDiasAtras = addDays(new Date(), -90);
      const notificacoesRemovidas = await this.notificacaoRepository.delete({
        status: StatusNotificacaoProcessamento.ARQUIVADA,
        created_at: LessThan(noventaDiasAtras),
      });

      this.logger.log(
        `Limpeza concluída: ${notificacoesArquivadas.affected} arquivadas, ${notificacoesRemovidas.affected} removidas`,
      );
    } catch (error) {
      this.logger.error('Erro na limpeza de notificações:', error);
    }
  }

  /**
   * Método público para forçar verificação de prazos
   * Útil para testes e execução manual
   */
  async executarVerificacaoPrazos(): Promise<void> {
    await this.verificarPrazos();
  }

  /**
   * Método público para forçar monitoramento do sistema
   * Útil para testes e execução manual
   */
  async executarMonitoramentoSistema(): Promise<void> {
    await this.monitorarSistema();
  }

  /**
   * Obtém estatísticas das notificações proativas
   */
  async obterEstatisticas(): Promise<{
    alertasPrazoEnviados: number;
    alertasSistemaEnviados: number;
    notificacoesArquivadas: number;
    proximasVerificacoes: {
      prazos: string;
      sistema: string;
      limpeza: string;
    };
  }> {
    const ultimaSemana = addDays(new Date(), -7);

    const [alertasPrazo, alertasSistema, arquivadas] = await Promise.all([
      this.notificacaoRepository.count({
        where: {
          dados_contexto: {
            tipo_alerta: 'prazo',
          } as any,
          created_at: MoreThan(ultimaSemana),
        },
      }),
      this.notificacaoRepository.count({
        where: {
          dados_contexto: {
            tipo_alerta: 'sistema',
          } as any,
          created_at: MoreThan(ultimaSemana),
        },
      }),
      this.notificacaoRepository.count({
        where: {
          status: StatusNotificacaoProcessamento.ARQUIVADA,
        },
      }),
    ]);

    return {
      alertasPrazoEnviados: alertasPrazo,
      alertasSistemaEnviados: alertasSistema,
      notificacoesArquivadas: arquivadas,
      proximasVerificacoes: {
        prazos: 'A cada hora',
        sistema: 'A cada 6 horas',
        limpeza: 'Diariamente às 02:00',
      },
    };
  }
}