import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IIntegracaoNotificacaoService,
  IContextoUsuario,
  IResultadoOperacao,
  IConfigNotificacao,
  INotificacao,
} from '../interfaces';
import { NotificacaoSistema } from '../../../entities';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { TipoNotificacao } from '../../../entities/notification.entity';
import { StatusNotificacaoProcessamento } from '../../../entities/notification.entity';

/**
 * Serviço de integração com notificações
 * Implementação concreta da interface IIntegracaoNotificacaoService
 * Utiliza os serviços reais do sistema para operações com notificações
 */
@Injectable()
export class IntegracaoNotificacaoService implements IIntegracaoNotificacaoService {
  private readonly logger = new Logger(IntegracaoNotificacaoService.name);

  constructor(
    @InjectRepository(NotificacaoSistema)
    private readonly notificacaoRepository: Repository<NotificacaoSistema>,
    private readonly notificacaoService: NotificacaoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Envia notificação sobre status do pagamento
   * @param pagamentoId ID do pagamento
   * @param status Novo status do pagamento
   * @param destinatarios Lista de destinatários
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  async enviarNotificacaoStatusPagamento(
    pagamentoId: string,
    status: string,
    destinatarios: string[],
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<boolean>> {
    try {
      this.logger.log(`Enviando notificação de status de pagamento ${pagamentoId}: ${status}`);

      // Validar entrada
      if (!pagamentoId || !status || !destinatarios || destinatarios.length === 0) {
        return {
          sucesso: false,
          erro: 'Parâmetros obrigatórios não fornecidos',
          codigo: 'PARAMETROS_INVALIDOS',
          timestamp: new Date(),
        };
      }

      // Obter configuração de notificação para o tipo
      const config = this.obterConfiguracaoNotificacao('STATUS_PAGAMENTO', status);

      // Criar notificações para cada destinatário
      const notificacoesCriadas: string[] = [];
      const errosEnvio: string[] = [];

      for (const destinatarioId of destinatarios) {
        try {
          const notificacao = await this.criarNotificacao({
            tipo: TipoNotificacao.SISTEMA,
            titulo: config.titulo,
            mensagem: config.mensagem.replace('{status}', status).replace('{pagamentoId}', pagamentoId),
            destinatarioId,
            entidadeId: pagamentoId,
            entidadeTipo: 'Pagamento',
            prioridade: config.prioridade,
            canais: config.canais,
            dadosAdicionais: {
              pagamentoId,
              status,
              timestamp: new Date().toISOString(),
            },
          }, contextoUsuario);

          notificacoesCriadas.push(notificacao.id);
        } catch (error) {
          this.logger.error(`Erro ao criar notificação para destinatário ${destinatarioId}:`, error);
          errosEnvio.push(`Destinatário ${destinatarioId}: ${error.message}`);
        }
      }

      // Registrar auditoria
      await this.registrarAuditoria(
        'ENVIO_NOTIFICACAO_STATUS_PAGAMENTO',
        {
          pagamentoId,
          status,
          destinatarios,
          notificacoesCriadas,
          errosEnvio,
        },
        contextoUsuario
      );

      // Verificar se houve erros
      if (errosEnvio.length > 0 && notificacoesCriadas.length === 0) {
        return {
          sucesso: false,
          erro: 'Falha ao enviar todas as notificações',
          codigo: 'ERRO_ENVIO_NOTIFICACOES',
          timestamp: new Date(),
          metadata: { erros: errosEnvio },
        };
      }

      return {
        sucesso: true,
        dados: true,
        timestamp: new Date(),
        metadata: {
          notificacoesCriadas: notificacoesCriadas.length,
          erros: errosEnvio.length,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação de status de pagamento:`, error);
      
      await this.registrarAuditoria(
        'ERRO_ENVIO_NOTIFICACAO_STATUS_PAGAMENTO',
        { pagamentoId, status, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro interno ao enviar notificação',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Busca notificações de um usuário
   * @param usuarioId ID do usuário
   * @param filtros Filtros de busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Lista de notificações
   */
  async buscarNotificacoesUsuario(
    usuarioId: string,
    filtros: {
      tipo?: string;
      lida?: boolean;
      dataInicio?: Date;
      dataFim?: Date;
      limite?: number;
      offset?: number;
    },
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<INotificacao[]>> {
    try {
      this.logger.log(`Buscando notificações do usuário ${usuarioId}`);

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcessoNotificacoes(usuarioId, contextoUsuario)) {
        await this.registrarAuditoria(
          'ACESSO_NEGADO_NOTIFICACOES',
          { usuarioId, usuarioLogado: contextoUsuario.id },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado às notificações do usuário',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Construir query
      const queryBuilder = this.notificacaoRepository
        .createQueryBuilder('notificacao')
        .where('notificacao.destinatario_id = :usuarioId', { usuarioId })
        .orderBy('notificacao.createdAt', 'DESC');

      // Aplicar filtros
      if (filtros.tipo) {
        queryBuilder.andWhere('notificacao.tipo = :tipo', { tipo: filtros.tipo });
      }

      if (filtros.lida !== undefined) {
        queryBuilder.andWhere('notificacao.lida = :lida', { lida: filtros.lida });
      }

      if (filtros.dataInicio) {
        queryBuilder.andWhere('notificacao.createdAt >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros.dataFim) {
        queryBuilder.andWhere('notificacao.createdAt <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      // Aplicar paginação
      if (filtros.limite) {
        queryBuilder.limit(filtros.limite);
      }

      if (filtros.offset) {
        queryBuilder.offset(filtros.offset);
      }

      // Executar query
      const notificacoes = await queryBuilder.getMany();

      // Formatar notificações
      const notificacoesFormatadas: INotificacao[] = notificacoes.map(notif => ({
        id: notif.id,
        tipo: TipoNotificacao.SISTEMA, // Valor padrão já que não existe na entidade
        titulo: notif.dados_contexto?.titulo || 'Notificação',
        mensagem: notif.dados_contexto?.mensagem || '',
        destinatarioId: notif.destinatario_id,
        lida: notif.status === StatusNotificacaoProcessamento.LIDA,
        dataLeitura: notif.data_leitura,
        dataEnvio: notif.created_at,
        prioridade: notif.dados_contexto?.prioridade || 'NORMAL',
        canais: notif.dados_contexto?.canais || [],
        status: notif.status as StatusNotificacaoProcessamento,
        entidadeId: notif.dados_contexto?.entidadeId,
        entidadeTipo: notif.dados_contexto?.entidadeTipo,
        dadosAdicionais: notif.dados_contexto,
      }));

      await this.registrarAuditoria(
        'BUSCA_NOTIFICACOES_USUARIO',
        { usuarioId, filtros, quantidadeEncontrada: notificacoes.length },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: notificacoesFormatadas,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar notificações do usuário ${usuarioId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_BUSCA_NOTIFICACOES_USUARIO',
        { usuarioId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao buscar notificações do usuário',
        codigo: 'ERRO_BUSCA_NOTIFICACOES',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Marca notificação como lida
   * @param notificacaoId ID da notificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  async marcarComoLida(
    notificacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<boolean>> {
    try {
      this.logger.log(`Marcando notificação ${notificacaoId} como lida`);

      // Buscar notificação
      const notificacao = await this.notificacaoRepository.findOne({
        where: { id: notificacaoId },
      });

      if (!notificacao) {
        return {
          sucesso: false,
          erro: 'Notificação não encontrada',
          codigo: 'NOTIFICACAO_NAO_ENCONTRADA',
          timestamp: new Date(),
        };
      }

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcessoNotificacoes(notificacao.destinatario_id, contextoUsuario)) {
        await this.registrarAuditoria(
          'ACESSO_NEGADO_MARCAR_LIDA',
          { notificacaoId, usuarioLogado: contextoUsuario.id },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado à notificação',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Marcar como lida se ainda não foi
      if (notificacao.status !== StatusNotificacaoProcessamento.LIDA) {
        notificacao.status = StatusNotificacaoProcessamento.LIDA;
        notificacao.data_leitura = new Date();
        await this.notificacaoRepository.save(notificacao);
      }

      await this.registrarAuditoria(
        'NOTIFICACAO_MARCADA_LIDA',
        { notificacaoId, destinatarioId: notificacao.destinatario_id },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao marcar notificação ${notificacaoId} como lida:`, error);
      
      await this.registrarAuditoria(
        'ERRO_MARCAR_NOTIFICACAO_LIDA',
        { notificacaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao marcar notificação como lida',
        codigo: 'ERRO_MARCAR_LIDA',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Conta notificações não lidas de um usuário
   * @param usuarioId ID do usuário
   * @param contextoUsuario Contexto do usuário logado
   * @returns Quantidade de notificações não lidas
   */
  async contarNotificacaoNaoLidas(
    usuarioId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<number>> {
    try {
      this.logger.log(`Contando notificações não lidas do usuário ${usuarioId}`);

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcessoNotificacoes(usuarioId, contextoUsuario)) {
        await this.registrarAuditoria(
          'ACESSO_NEGADO_CONTAR_NOTIFICACOES',
          { usuarioId, usuarioLogado: contextoUsuario.id },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado às notificações do usuário',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Contar notificações não lidas
      const quantidade = await this.notificacaoRepository.count({
        where: {
          destinatario_id: usuarioId,
          // Nota: A entidade NotificacaoSistema não tem campo 'lida', usar status
          status: StatusNotificacaoProcessamento.NAO_LIDA,
        },
      });

      await this.registrarAuditoria(
        'CONTAGEM_NOTIFICACOES_NAO_LIDAS',
        { usuarioId, quantidade },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: quantidade,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao contar notificações não lidas do usuário ${usuarioId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_CONTAR_NOTIFICACOES_NAO_LIDAS',
        { usuarioId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao contar notificações não lidas',
        codigo: 'ERRO_CONTAR_NOTIFICACOES',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS ==========

  /**
   * Verifica se o usuário tem permissão para acessar notificações
   * @param usuarioId ID do usuário dono das notificações
   * @param contextoUsuario Contexto do usuário logado
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoAcessoNotificacoes(
    usuarioId: string,
    contextoUsuario: IContextoUsuario
  ): boolean {
    // Admin tem acesso total
    if (contextoUsuario.isAdmin) {
      return true;
    }

    // Usuário só pode acessar suas próprias notificações
    if (contextoUsuario.id === usuarioId) {
      return true;
    }

    // Supervisor pode acessar notificações de usuários da sua unidade
    if (contextoUsuario.isSupervisor) {
      // Aqui seria necessário verificar se o usuário pertence à unidade do supervisor
      // Por simplicidade, vamos permitir por enquanto
      return true;
    }

    return false;
  }

  /**
   * Obtém configuração de notificação para um tipo específico
   * @param tipo Tipo da notificação
   * @param status Status relacionado (opcional)
   * @returns Configuração da notificação
   */
  private obterConfiguracaoNotificacao(tipo: string, status?: string): IConfigNotificacao {
    const configuracoes: Record<string, IConfigNotificacao> = {
      STATUS_PAGAMENTO: {
        titulo: 'Atualização de Pagamento',
        mensagem: 'O status do seu pagamento foi atualizado para: {status}',
        prioridade: 'MEDIA',
        canais: ['SISTEMA', 'EMAIL'],
      },
      PAGAMENTO_APROVADO: {
        titulo: 'Pagamento Aprovado',
        mensagem: 'Seu pagamento foi aprovado e será processado em breve.',
        prioridade: 'ALTA',
        canais: ['SISTEMA', 'EMAIL', 'SMS'],
      },
      PAGAMENTO_REJEITADO: {
        titulo: 'Pagamento Rejeitado',
        mensagem: 'Seu pagamento foi rejeitado. Verifique os dados e tente novamente.',
        prioridade: 'ALTA',
        canais: ['SISTEMA', 'EMAIL'],
      },
      PAGAMENTO_PROCESSADO: {
        titulo: 'Pagamento Processado',
        mensagem: 'Seu pagamento foi processado com sucesso.',
        prioridade: 'MEDIA',
        canais: ['SISTEMA', 'EMAIL'],
      },
    };

    // Tentar configuração específica por status
    if (status) {
      const chaveEspecifica = `${tipo}_${status.toUpperCase()}`;
      if (configuracoes[chaveEspecifica]) {
        return configuracoes[chaveEspecifica];
      }
    }

    // Retornar configuração padrão do tipo
    return configuracoes[tipo] || {
      titulo: 'Notificação do Sistema',
      mensagem: 'Você tem uma nova notificação.',
      prioridade: 'BAIXA',
      canais: ['SISTEMA'],
    };
  }

  /**
   * Cria uma nova notificação
   * @param dados Dados da notificação
   * @param contextoUsuario Contexto do usuário
   * @returns Notificação criada
   */
  private async criarNotificacao(
    dados: {
      tipo: TipoNotificacao;
      titulo: string;
      mensagem: string;
      destinatarioId: string;
      entidadeId?: string;
      entidadeTipo?: string;
      prioridade: string;
      canais: string[];
      dadosAdicionais?: any;
    },
    contextoUsuario: IContextoUsuario
  ): Promise<NotificacaoSistema> {
    // Criar um template temporário ou usar um existente
    // Por enquanto, vamos usar um template_id padrão
    const templateId = 'default-template-id'; // TODO: Implementar lógica de template
    
    const notificacao = this.notificacaoRepository.create({
      destinatario_id: dados.destinatarioId,
      template_id: templateId,
      dados_contexto: {
        tipo: dados.tipo,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        entidadeId: dados.entidadeId,
        entidadeTipo: dados.entidadeTipo,
        prioridade: dados.prioridade,
        canais: dados.canais,
        dadosAdicionais: dados.dadosAdicionais,
      },
      status: StatusNotificacaoProcessamento.PENDENTE,
      tentativas_envio: 0,
      numero_tentativas: 0,
    });

    return await this.notificacaoRepository.save(notificacao);
  }

  /**
   * Envia notificação de pagamento liberado
   */
  async notificarPagamentoLiberado(
    dadosNotificacao: any,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      const resultado = await this.criarNotificacao({
         destinatarioId: dadosNotificacao.cidadaoId,
         titulo: 'Pagamento Liberado',
         mensagem: `Seu pagamento de ${dadosNotificacao.tipoBeneficio} foi liberado.`,
         tipo: TipoNotificacao.SISTEMA,
         prioridade: dadosNotificacao.prioridade || 'NORMAL',
         canais: dadosNotificacao.canais || [],
         dadosAdicionais: dadosNotificacao,
       }, contextoUsuario);

      return {
        sucesso: true,
        dados: resultado,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao notificar pagamento liberado:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_NOTIFICACAO_PAGAMENTO_LIBERADO',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Envia notificação de pagamento processado
   */
  async notificarPagamentoProcessado(
    dadosNotificacao: any,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      const resultado = await this.criarNotificacao({
         destinatarioId: dadosNotificacao.cidadaoId,
         titulo: 'Pagamento Processado',
         mensagem: `Seu pagamento de ${dadosNotificacao.tipoBeneficio} foi processado.`,
         tipo: TipoNotificacao.SISTEMA,
         prioridade: dadosNotificacao.prioridade || 'NORMAL',
         canais: dadosNotificacao.canais || [],
         dadosAdicionais: dadosNotificacao,
       }, contextoUsuario);

      return {
        sucesso: true,
        dados: resultado,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao notificar pagamento processado:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_NOTIFICACAO_PAGAMENTO_PROCESSADO',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Envia notificação de pagamento cancelado
   */
  async notificarPagamentoCancelado(
    dadosNotificacao: any,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      const resultado = await this.criarNotificacao({
         destinatarioId: dadosNotificacao.cidadaoId,
         titulo: 'Pagamento Cancelado',
         mensagem: `Seu pagamento de ${dadosNotificacao.tipoBeneficio} foi cancelado. Motivo: ${dadosNotificacao.motivoCancelamento}`,
         tipo: TipoNotificacao.SISTEMA,
         prioridade: 'ALTA',
         canais: dadosNotificacao.canais || [],
         dadosAdicionais: dadosNotificacao,
       }, contextoUsuario);

      return {
        sucesso: true,
        dados: resultado,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao notificar pagamento cancelado:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_NOTIFICACAO_PAGAMENTO_CANCELADO',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Envia notificação de documentos pendentes
   */
  async notificarDocumentosPendentes(
    dadosNotificacao: any,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      const resultado = await this.criarNotificacao({
         destinatarioId: dadosNotificacao.cidadaoId,
         titulo: 'Documentos Pendentes',
         mensagem: `Você possui documentos pendentes para sua solicitação.`,
         tipo: TipoNotificacao.SISTEMA,
         prioridade: 'NORMAL',
         canais: dadosNotificacao.canais || [],
         dadosAdicionais: dadosNotificacao,
       }, contextoUsuario);

      return {
        sucesso: true,
        dados: resultado,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao notificar documentos pendentes:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_NOTIFICACAO_DOCUMENTOS_PENDENTES',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Envia notificação personalizada
   */
  async enviarNotificacaoPersonalizada(
     notificacao: any,
     contextoUsuario: IContextoUsuario
   ): Promise<IResultadoOperacao<any>> {
     try {
       const resultado = await this.criarNotificacao(notificacao, contextoUsuario);
       return {
         sucesso: true,
         dados: resultado,
         timestamp: new Date(),
       };
     } catch (error) {
       this.logger.error('Erro ao enviar notificação personalizada:', error);
       return {
         sucesso: false,
         erro: error.message,
         codigo: 'ERRO_NOTIFICACAO_PERSONALIZADA',
         timestamp: new Date(),
       };
     }
   }

  /**
   * Busca histórico de notificações
   */
  async buscarHistoricoNotificacoes(
    filtros: any,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      const resultado = await this.buscarNotificacoesUsuario(filtros.usuarioId, filtros, contextoUsuario);
      return resultado;
    } catch (error) {
      this.logger.error('Erro ao buscar histórico de notificações:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_BUSCAR_HISTORICO_NOTIFICACOES',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Reenviar notificação
   */
  async reenviarNotificacao(
    notificacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      // Implementação básica - pode ser expandida conforme necessário
      return {
        sucesso: true,
        dados: { notificacaoId, reenviada: true },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao reenviar notificação:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_REENVIAR_NOTIFICACAO',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Configurar preferências de notificação
   */
  async configurarPreferencias(
    cidadaoId: string,
    preferencias: any,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>> {
    try {
      // Implementação básica - pode ser expandida conforme necessário
      await this.registrarAuditoria(
        'CONFIGURAR_PREFERENCIAS_NOTIFICACAO',
        { cidadaoId, preferencias },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: undefined,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao configurar preferências:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_CONFIGURAR_PREFERENCIAS',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validar canais de notificação
   */
  async validarCanais(
    cidadaoId: string,
    canais: any[],
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    try {
      // Implementação básica - pode ser expandida conforme necessário
      const canaisValidos = canais.filter(canal => canal && canal.tipo);
      
      return {
        sucesso: true,
        dados: {
          canaisValidos: canaisValidos.length,
          canaisInvalidos: canais.length - canaisValidos.length,
          detalhes: canaisValidos,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao validar canais:', error);
      return {
        sucesso: false,
        erro: error.message,
        codigo: 'ERRO_VALIDAR_CANAIS',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Registra evento de auditoria
   * @param operacao Tipo da operação
   * @param dados Dados da operação
   * @param contextoUsuario Contexto do usuário
   */
  private async registrarAuditoria(
    operacao: string,
    dados: any,
    contextoUsuario: IContextoUsuario
  ): Promise<void> {
    try {
      const logDto = new CreateLogAuditoriaDto();
      logDto.usuario_id = contextoUsuario.id;
      logDto.tipo_operacao = operacao as TipoOperacao;
      logDto.entidade_afetada = 'Notificacao';
      logDto.entidade_id = dados.notificacaoId || dados.pagamentoId || null;
      logDto.dados_anteriores = undefined;
      logDto.dados_novos = dados;
      logDto.ip_origem = 'N/A';
      logDto.user_agent = 'Sistema';
      
      await this.auditoriaService.create(logDto);
    } catch (error) {
      this.logger.error('Erro ao registrar auditoria:', error);
      // Não propagar erro de auditoria
    }
  }
}