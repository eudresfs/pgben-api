import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao, StatusSolicitacao } from '../entities/solicitacao.entity';
import { PrazoSolicitacaoService } from './prazo-solicitacao.service';
import { PriorizacaoSolicitacaoService } from './priorizacao-solicitacao.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Tipos de notificação disponíveis no sistema
 */
export enum TipoNotificacao {
  PRAZO_EXPIRADO = 'prazo_expirado',
  PRAZO_PROXIMO = 'prazo_proximo',
  DETERMINACAO_JUDICIAL = 'determinacao_judicial',
  PENDENCIA_ABERTA = 'pendencia_aberta',
  ALTERACAO_STATUS = 'alteracao_status',
  SOLICITACAO_ATRIBUIDA = 'solicitacao_atribuida',
}

/**
 * Interface para os dados de uma notificação
 */
export interface DadosNotificacao {
  tipo: TipoNotificacao;
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
  private readonly logger = new Logger(NotificacaoService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly prazoService: PrazoSolicitacaoService,
    private readonly priorizacaoService: PriorizacaoSolicitacaoService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Envia uma notificação para o sistema
   * @param notificacao Dados da notificação a ser enviada
   */
  enviarNotificacao(notificacao: DadosNotificacao): void {
    try {
      this.logger.log(`Enviando notificação: ${notificacao.titulo}`);
      
      // Emitir evento para o sistema de notificações
      this.eventEmitter.emit('notificacao.criada', notificacao);
      
      // Em um ambiente real, aqui poderia haver integrações com:
      // - Sistema de e-mail
      // - Notificações push
      // - SMS
      // - Webhooks para sistemas externos
      
      this.logger.log(`Notificação enviada com sucesso: ${notificacao.titulo}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Notifica sobre uma alteração de status de solicitação
   * @param solicitacao Solicitação que teve o status alterado
   * @param statusAnterior Status anterior da solicitação
   * @param observacao Observação opcional sobre a alteração
   */
  notificarAlteracaoStatus(
    solicitacao: Solicitacao,
    statusAnterior: StatusSolicitacao,
    observacao?: string,
  ): void {
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
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacao.ALTERACAO_STATUS,
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
      });
    }
  }
  
  /**
   * Identifica os destinatários para uma notificação de alteração de solicitação
   * @param solicitacao Solicitação alterada
   * @returns Lista de IDs de usuários que devem receber a notificação
   */
  private identificarDestinatariosAlteracao(solicitacao: Solicitacao): string[] {
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
    if (!prazoData) return;
    
    const diasAtraso = Math.floor(
      (new Date().getTime() - prazoData.getTime()) / (1000 * 60 * 60 * 24)
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
        tipo: TipoNotificacao.PRAZO_EXPIRADO,
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
  notificarSolicitacaoAtribuida(solicitacao: Solicitacao, tecnicoId: string): void {
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
      tipo: TipoNotificacao.SOLICITACAO_ATRIBUIDA,
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
    if (!solicitacao.determinacao_judicial_flag) return;
    
    // Construir a mensagem da notificação
    const mensagem = `ATENÇÃO: A solicitação ${solicitacao.protocolo} está associada a uma determinação judicial e requer tratamento prioritário. Estado atual: ${solicitacao.status}.`;
    
    // Enviar notificação para os destinatários
    const destinatarios = this.identificarDestinatariosAlteracao(solicitacao);
    for (const destinatarioId of destinatarios) {
      this.enviarNotificacao({
        tipo: TipoNotificacao.DETERMINACAO_JUDICIAL,
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
  async verificarPrazosENotificar(): Promise<void> {
    this.logger.log('Iniciando verificação diária de prazos...');
    
    try {
      // Buscar solicitações com prazos vencidos
      const solicitacoesComPrazosVencidos = await this.prazoService.listarSolicitacoesComPrazosVencidos();
      
      this.logger.log(`Encontradas ${solicitacoesComPrazosVencidos.length} solicitações com prazos vencidos`);
      
      // Gerar notificações para cada solicitação com prazo vencido
      for (const solicitacao of solicitacoesComPrazosVencidos) {
        // Verificar cada tipo de prazo
        if (solicitacao.prazo_analise && new Date() > solicitacao.prazo_analise) {
          this.notificarPrazoExpirado(solicitacao, 'analise');
        }
        
        if (solicitacao.prazo_documentos && new Date() > solicitacao.prazo_documentos) {
          this.notificarPrazoExpirado(solicitacao, 'documentos');
        }
        
        if (solicitacao.prazo_processamento && new Date() > solicitacao.prazo_processamento) {
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
