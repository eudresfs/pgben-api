import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { PrazoSolicitacaoService } from './prazo-solicitacao.service';
import { PriorizacaoSolicitacaoService } from './priorizacao-solicitacao.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Pendencia, Usuario } from '@/entities';
import { NotificacaoService as NotificacaoSistemaService } from '../../notificacao/services/notificacao.service';
import { TipoNotificacao } from '../../../entities/notification.entity';

/**
 * Tipos de notificação específicos do módulo de solicitação
 */
export enum TipoNotificacaoSolicitacao {
  PRAZO_EXPIRADO = 'prazo_expirado',
  PRAZO_PROXIMO = 'prazo_proximo',
  DETERMINACAO_JUDICIAL = 'determinacao_judicial',
  PENDENCIA_ABERTA = 'pendencia_aberta',
  ALTERACAO_STATUS = 'alteracao_status',
  SOLICITACAO_ATRIBUIDA = 'solicitacao_atribuida',
  MONITORAMENTO_PENDENTE = 'monitoramento_pendente',
  MONITORAMENTO_PROXIMO = 'monitoramento_proximo',
  VISITA_MONITORAMENTO_REGISTRADA = 'visita_monitoramento_registrada',
}

/**
 * Interface para os dados de uma notificação de solicitação
 */
export interface DadosNotificacaoSolicitacao {
  tipo: TipoNotificacaoSolicitacao;
  titulo: string;
  mensagem: string;
  solicitacaoId?: string;
  protocolo?: string;
  destinatarioId?: string;
  dados?: Record<string, any>;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  dataVencimento?: Date;
  lida?: boolean;
}

/**
 * Serviço responsável pelo gerenciamento de notificações contextuais
 *
 * Este serviço implementa funcionalidades para:
 * - Gerar notificações para eventos importantes
 * - Verificar regularmente prazos e emitir alertas
 * - Notificar usuários sobre alterações em solicitações
 * - Emitir alertas para determinações judiciais
 */
@Injectable()
export class NotificacaoService {
  /**
   * Notifica sobre criação de pendência
   */
  async notificarPendenciaCriada(
    pendenciaSalva: Pendencia,
    solicitacao: Solicitacao,
    usuario: Usuario,
  ): Promise<void> {
    this.logger.log(
      `Pendência criada: ${pendenciaSalva.id} para solicitação ${solicitacao.id}`,
    );

    try {
      await this.notificacaoSistemaService.criarNotificacaoPendencia({
        destinatario_id: solicitacao.tecnico_id,
        titulo: 'Nova pendência criada',
        conteudo: `Pendência criada para a solicitação ${solicitacao.protocolo}`,
        solicitacao_id: solicitacao.id,
        link: `${this.configService.get('FRONTEND_URL') || 'https://pgben-front.kemosoft.com.br'}/solicitacoes/${solicitacao.id}`,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de pendência criada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Notifica sobre resolução de pendência
   */
  async notificarPendenciaResolvida(
    pendenciaAtualizada: Pendencia,
    solicitacao: Solicitacao,
    usuario: Usuario,
  ): Promise<void> {
    this.logger.log(
      `Pendência resolvida: ${pendenciaAtualizada.id} para solicitação ${solicitacao.id}`,
    );

    try {
      await this.notificacaoSistemaService.criarNotificacaoPendencia({
        destinatario_id: solicitacao.tecnico_id,
        titulo: 'Pendência resolvida',
        conteudo: `Pendência resolvida para a solicitação ${solicitacao.protocolo}`,
        solicitacao_id: solicitacao.id,
        link: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/solicitacoes/${solicitacao.id}`,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de pendência resolvida: ${error.message}`,
        error.stack,
      );
    }
  }
  private readonly logger = new Logger(NotificacaoService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly prazoService: PrazoSolicitacaoService,
    private readonly priorizacaoService: PriorizacaoSolicitacaoService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => NotificacaoSistemaService))
    private readonly notificacaoSistemaService: NotificacaoSistemaService,
  ) {}

  /**
   * Envia uma notificação para o sistema
   * @param notificacao Dados da notificação a ser enviada
   */
  async enviarNotificacao(
    notificacao: DadosNotificacaoSolicitacao,
  ): Promise<void> {
    try {
      this.logger.log(`Enviando notificação: ${notificacao.titulo}`);

      // Criar notificação usando o serviço principal
      await this.notificacaoSistemaService.criarNotificacaoSolicitacao({
        destinatario_id: notificacao.destinatarioId!,
        titulo: notificacao.titulo,
        conteudo: notificacao.mensagem,
        solicitacao_id: notificacao.solicitacaoId!,
        link: notificacao.dados?.link,
      });

      // Emitir evento SSE para notificação em tempo real
      this.eventEmitter.emit('sse.notificacao', {
        userId: notificacao.destinatarioId,
        tipo: 'solicitacao_notificacao',
        dados: {
          titulo: notificacao.titulo,
          mensagem: notificacao.mensagem,
          solicitacaoId: notificacao.solicitacaoId,
          protocolo: notificacao.protocolo,
          prioridade: notificacao.prioridade,
        },
      });

      this.logger.log(`Notificação enviada com sucesso: ${notificacao.titulo}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Mapeia tipos de notificação específicos para tipos do sistema principal
   */
  private mapearTipoNotificacao(
    tipo: TipoNotificacaoSolicitacao,
  ): TipoNotificacao {
    const mapeamento: Record<TipoNotificacaoSolicitacao, TipoNotificacao> = {
      [TipoNotificacaoSolicitacao.PRAZO_EXPIRADO]: TipoNotificacao.ALERTA,
      [TipoNotificacaoSolicitacao.PRAZO_PROXIMO]: TipoNotificacao.ALERTA,
      [TipoNotificacaoSolicitacao.DETERMINACAO_JUDICIAL]:
        TipoNotificacao.SISTEMA,
      [TipoNotificacaoSolicitacao.PENDENCIA_ABERTA]: TipoNotificacao.PENDENCIA,
      [TipoNotificacaoSolicitacao.ALTERACAO_STATUS]:
        TipoNotificacao.SOLICITACAO,
      [TipoNotificacaoSolicitacao.SOLICITACAO_ATRIBUIDA]:
        TipoNotificacao.SOLICITACAO,
      [TipoNotificacaoSolicitacao.MONITORAMENTO_PENDENTE]:
        TipoNotificacao.ALERTA,
      [TipoNotificacaoSolicitacao.MONITORAMENTO_PROXIMO]:
        TipoNotificacao.ALERTA,
      [TipoNotificacaoSolicitacao.VISITA_MONITORAMENTO_REGISTRADA]:
        TipoNotificacao.SISTEMA,
    };

    return mapeamento[tipo] || TipoNotificacao.SOLICITACAO;
  }

  /**
   * Notifica sobre uma alteração de status de solicitação
   * @param solicitacao Solicitação que teve o status alterado
   * @param statusAnterior Status anterior da solicitação
   * @param observacao Observação opcional sobre a alteração
   */
  async notificarAlteracaoStatus(
    solicitacao: Solicitacao,
    statusAnterior: StatusSolicitacao,
    observacao?: string,
  ): Promise<void> {
    // Identificar os destinatários da notificação
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);

    // Construir a mensagem da notificação
    const mensagem = `A solicitação ${solicitacao.protocolo} foi alterada de ${statusAnterior} para ${solicitacao.status}${
      observacao ? `: ${observacao}` : '.'
    }`;

    // Determinar a prioridade da notificação
    const prioridade = solicitacao.determinacao_judicial_flag
      ? 'alta'
      : 'normal';

    // Enviar notificação para cada destinatário
    const promises = destinatarios.map((destinatarioId) =>
      this.enviarNotificacao({
        tipo: TipoNotificacaoSolicitacao.ALTERACAO_STATUS,
        titulo: `Solicitação ${solicitacao.protocolo} - Alteração de Status`,
        mensagem,
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        destinatarioId,
        dados: {
          statusAnterior,
          statusAtual: solicitacao.status,
          determinacaoJudicial: solicitacao.determinacao_judicial_flag,
        },
        prioridade,
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Identifica os destinatários para uma notificação de alteração de solicitação
   * @param solicitacao Solicitação alterada
   * @returns Lista de IDs de usuários que devem receber a notificação
   */
  private identificarDestinatariosAlteracao(
    solicitacao: Solicitacao,
  ): string[] {
    const destinatarios = new Set<string>();

    // Técnico responsável
    if (solicitacao.tecnico_id) {
      destinatarios.add(solicitacao.tecnico_id);
    }

    // Aprovador (se houver)
    if (solicitacao.aprovador_id) {
      destinatarios.add(solicitacao.aprovador_id);
    }

    // Liberador (se houver)
    if (solicitacao.liberador_id) {
      destinatarios.add(solicitacao.liberador_id);
    }

    // Em um ambiente real, aqui também buscaríamos:
    // - Gerentes da unidade
    // - Usuários com papel específico de acompanhamento
    // - Administradores do sistema

    return Array.from(destinatarios);
  }

  /**
   * Notifica sobre um prazo expirado de solicitação
   * @param solicitacao Solicitação com prazo expirado
   * @param tipoPrazo Tipo de prazo expirado
   */
  notificarPrazoExpirado(
    solicitacao: Solicitacao,
    tipoPrazo: 'analise' | 'documentos' | 'processamento',
  ): void {
    const prazoData = solicitacao[`prazo_${tipoPrazo}`] as Date;
    if (!prazoData) {
      return;
    }

    const diasAtraso = Math.floor(
      (new Date().getTime() - prazoData.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Construir a mensagem da notificação
    const mensagem = `O prazo de ${tipoPrazo} da solicitação ${solicitacao.protocolo} expirou há ${diasAtraso} dias. Estado atual: ${solicitacao.status}.`;

    // Determinar prioridade com base no atraso e determinação judicial
    let prioridade: 'baixa' | 'normal' | 'alta' | 'urgente' = 'normal';

    if (solicitacao.determinacao_judicial_flag) {
      prioridade = diasAtraso > 5 ? 'urgente' : 'alta';
    } else {
      prioridade = diasAtraso > 10 ? 'alta' : 'normal';
    }

    // Enviar notificação para os destinatários
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacaoSolicitacao.PRAZO_EXPIRADO,
        titulo: `PRAZO EXPIRADO - Solicitação ${solicitacao.protocolo}`,
        mensagem,
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        destinatarioId,
        dados: {
          tipoPrazo,
          diasAtraso,
          determinacaoJudicial: solicitacao.determinacao_judicial_flag,
        },
        prioridade,
        dataVencimento: prazoData,
      });
    }
  }

  /**
   * Notifica sobre a atribuição de uma nova solicitação a um técnico
   * @param solicitacao Solicitação atribuída
   * @param tecnicoId ID do técnico responsável
   */
  notificarSolicitacaoAtribuida(
    solicitacao: Solicitacao,
    tecnicoId: string,
  ): void {
    // Determinar prioridade com base na determinação judicial
    const prioridade = solicitacao.determinacao_judicial_flag
      ? 'alta'
      : 'normal';

    // Construir a mensagem da notificação
    const mensagem = `A solicitação ${solicitacao.protocolo} foi atribuída a você. Estado atual: ${solicitacao.status}.${
      solicitacao.determinacao_judicial_flag
        ? ' ATENÇÃO: Esta solicitação tem determinação judicial e requer tratamento prioritário.'
        : ''
    }`;

    // Enviar notificação para o técnico
    this.enviarNotificacao({
      tipo: TipoNotificacaoSolicitacao.SOLICITACAO_ATRIBUIDA,
      titulo: `Nova Solicitação Atribuída - ${solicitacao.protocolo}`,
      mensagem,
      solicitacaoId: solicitacao.id,
      protocolo: solicitacao.protocolo,
      destinatarioId: tecnicoId,
      dados: {
        determinacaoJudicial: solicitacao.determinacao_judicial_flag,
        status: solicitacao.status,
      },
      prioridade,
    });
  }

  /**
   * Notifica sobre uma determinação judicial associada a uma solicitação
   * @param solicitacao Solicitação com determinação judicial
   */
  notificarDeterminacaoJudicial(solicitacao: Solicitacao): void {
    if (!solicitacao.determinacao_judicial_flag) {
      return;
    }

    // Construir a mensagem da notificação
    const mensagem = `ATENÇÃO: A solicitação ${solicitacao.protocolo} está associada a uma determinação judicial e requer tratamento prioritário. Estado atual: ${solicitacao.status}.`;

    // Enviar notificação para os destinatários
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacaoSolicitacao.DETERMINACAO_JUDICIAL,
        titulo: `DETERMINAÇÃO JUDICIAL - Solicitação ${solicitacao.protocolo}`,
        mensagem,
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        destinatarioId,
        dados: {
          determinacaoJudicialId: solicitacao.determinacao_judicial_id,
          status: solicitacao.status,
        },
        prioridade: 'urgente',
      });
    }
  }

  /**
   * Executa verificação diária de prazos e gera notificações para prazos vencidos ou próximos
   * Este método deve ser executado por um agendador (scheduler) em intervalos regulares
   */
  /**
   * Notifica sobre visita de monitoramento pendente para Aluguel Social
   * @param solicitacao Solicitação de Aluguel Social com visita pendente
   * @param dataLimite Data limite para realizar a visita
   */
  notificarMonitoramentoPendente(
    solicitacao: Solicitacao,
    dataLimite: Date,
  ): void {
    // Identificar os destinatários da notificação
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);

    // Formatar a data limite para exibição
    const dataFormatada = dataLimite.toLocaleDateString('pt-BR');

    // Construir a mensagem da notificação
    const mensagem =
      `A solicitação de Aluguel Social ${solicitacao.protocolo} requer visita de monitoramento. ` +
      `Data limite: ${dataFormatada}. Por favor, realize a visita e registre no sistema.`;

    // Enviar notificação para cada destinatário
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacaoSolicitacao.MONITORAMENTO_PENDENTE,
        titulo: `Monitoramento Pendente - Aluguel Social ${solicitacao.protocolo}`,
        mensagem,
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        destinatarioId,
        dados: {
          tipoBeneficio: 'aluguel_social',
          dataLimite: dataLimite.toISOString(),
          ultimaVisita:
            solicitacao.dados_complementares?.visitas_monitoramento?.[
              solicitacao.dados_complementares.visitas_monitoramento.length - 1
            ]?.data || null,
        },
        prioridade: 'alta',
        dataVencimento: dataLimite,
      });
    }
  }

  /**
   * Notifica sobre visita de monitoramento que está se aproximando
   * @param solicitacao Solicitação de Aluguel Social com visita se aproximando
   * @param dataProximaVisita Data da próxima visita programada
   * @param diasRestantes Número de dias restantes até a data da visita
   */
  notificarMonitoramentoProximo(
    solicitacao: Solicitacao,
    dataProximaVisita: Date,
    diasRestantes: number,
  ): void {
    // Identificar os destinatários da notificação
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);

    // Formatar a data da próxima visita para exibição
    const dataFormatada = dataProximaVisita.toLocaleDateString('pt-BR');

    // Construir a mensagem da notificação
    const mensagem =
      `A solicitação de Aluguel Social ${solicitacao.protocolo} requer visita de monitoramento em breve. ` +
      `Data programada: ${dataFormatada} (${diasRestantes} dias restantes). ` +
      `Por favor, planeje a visita.`;

    // Enviar notificação para cada destinatário
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacaoSolicitacao.MONITORAMENTO_PROXIMO,
        titulo: `Monitoramento Próximo - Aluguel Social ${solicitacao.protocolo}`,
        mensagem,
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        destinatarioId,
        dados: {
          tipoBeneficio: 'aluguel_social',
          dataProximaVisita: dataProximaVisita.toISOString(),
          diasRestantes,
          ultimaVisita:
            solicitacao.dados_complementares?.visitas_monitoramento?.[
              solicitacao.dados_complementares.visitas_monitoramento.length - 1
            ]?.data || null,
        },
        prioridade: 'normal',
        dataVencimento: dataProximaVisita,
      });
    }
  }

  /**
   * Notifica sobre o registro de uma visita de monitoramento
   * @param solicitacao Solicitação de Aluguel Social com visita registrada
   * @param dataVisita Data da visita realizada
   * @param proximaVisita Data da próxima visita programada
   */
  notificarVisitaMonitoramentoRegistrada(
    solicitacao: Solicitacao,
    dataVisita: Date,
    proximaVisita: Date,
  ): void {
    // Identificar os destinatários da notificação
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);

    // Formatar as datas para exibição
    const dataVisitaFormatada = dataVisita.toLocaleDateString('pt-BR');
    const proximaVisitaFormatada = proximaVisita.toLocaleDateString('pt-BR');

    // Construir a mensagem da notificação
    const mensagem =
      `Foi registrada uma visita de monitoramento para a solicitação de Aluguel Social ${solicitacao.protocolo} ` +
      `em ${dataVisitaFormatada}. A próxima visita está programada para ${proximaVisitaFormatada}.`;

    // Enviar notificação para cada destinatário
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacaoSolicitacao.VISITA_MONITORAMENTO_REGISTRADA,
        titulo: `Visita de Monitoramento Registrada - Aluguel Social ${solicitacao.protocolo}`,
        mensagem,
        solicitacaoId: solicitacao.id,
        protocolo: solicitacao.protocolo,
        destinatarioId,
        dados: {
          tipoBeneficio: 'aluguel_social',
          dataVisita: dataVisita.toISOString(),
          proximaVisita: proximaVisita.toISOString(),
          totalVisitas:
            solicitacao.dados_complementares?.visitas_monitoramento?.length ||
            1,
        },
        prioridade: 'baixa',
      });
    }
  }

  async verificarPrazosENotificar(): Promise<void> {
    this.logger.log('Iniciando verificação diária de prazos...');

    try {
      // Buscar solicitações com prazos vencidos
      const solicitacoesComPrazosVencidos =
        await this.prazoService.listarSolicitacoesComPrazosVencidos();

      this.logger.log(
        `Encontradas ${solicitacoesComPrazosVencidos.length} solicitações com prazos vencidos`,
      );

      // Gerar notificações para cada solicitação com prazo vencido
      for (const solicitacao of solicitacoesComPrazosVencidos) {
        // Verificar cada tipo de prazo
        if (
          solicitacao.prazo_analise &&
          new Date() > solicitacao.prazo_analise
        ) {
          this.notificarPrazoExpirado(solicitacao, 'analise');
        }

        if (
          solicitacao.prazo_documentos &&
          new Date() > solicitacao.prazo_documentos
        ) {
          this.notificarPrazoExpirado(solicitacao, 'documentos');
        }

        if (
          solicitacao.prazo_processamento &&
          new Date() > solicitacao.prazo_processamento
        ) {
          this.notificarPrazoExpirado(solicitacao, 'processamento');
        }
      }

      this.logger.log('Verificação de prazos concluída com sucesso');
    } catch (error) {
      this.logger.error(
        `Erro ao verificar prazos: ${error.message}`,
        error.stack,
      );
    }
  }
}
