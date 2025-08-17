import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { Aprovador } from '../entities/aprovador.entity';
import { DelegacaoAprovacao } from '../entities/delegacao-aprovacao.entity';
import { ConfiguracaoAprovacao } from '../entities/configuracao-aprovacao.entity';
import { HistoricoAprovacao } from '../entities/historico-aprovacao.entity';
import { TipoAcaoCritica, TipoAprovador, PrioridadeAprovacao } from '../enums/aprovacao.enums';
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Interface para configuração de notificação
 */
interface ConfiguracaoNotificacao {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
  webhook?: boolean;
  urgente?: boolean;
  template?: string;
  parametros?: Record<string, any>;
}

/**
 * Interface para dados de notificação
 */
interface DadosNotificacao {
  destinatario: Usuario;
  assunto: string;
  conteudo: string;
  tipo: TipoNotificacaoAprovacao;
  prioridade: PrioridadeNotificacao;
  canais: CanalNotificacao[];
  metadados: {
    solicitacaoId?: string;
    aprovadorId?: string;
    delegacaoId?: string;
    tipoAcao?: TipoAcaoCritica;
    data_expiracao?: Date;
    valorEnvolvido?: number;
    [key: string]: any;
  };
}

/**
 * Tipos de notificação do sistema de aprovação
 */
enum TipoNotificacaoAprovacao {
  NOVA_SOLICITACAO = 'NOVA_SOLICITACAO',
  SOLICITACAO_APROVADA = 'SOLICITACAO_APROVADA',
  SOLICITACAO_REJEITADA = 'SOLICITACAO_REJEITADA',
  PRAZO_VENCENDO = 'PRAZO_VENCENDO',
  PRAZO_VENCIDO = 'PRAZO_VENCIDO',
  DELEGACAO_CRIADA = 'DELEGACAO_CRIADA',
  DELEGACAO_REVOGADA = 'DELEGACAO_REVOGADA',
  ESCALACAO_AUTOMATICA = 'ESCALACAO_AUTOMATICA',
  APROVADOR_AUSENTE = 'APROVADOR_AUSENTE',
  LIMITE_VALOR_EXCEDIDO = 'LIMITE_VALOR_EXCEDIDO',
}

/**
 * Prioridades de notificação
 */
enum PrioridadeNotificacao {
  BAIXA = 'BAIXA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

/**
 * Canais de notificação disponíveis
 */
enum CanalNotificacao {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK'
}

/**
 * Serviço responsável pelo sistema de notificações do módulo de aprovação
 * 
 * Este serviço:
 * 1. Gerencia templates de notificação
 * 2. Envia notificações por múltiplos canais
 * 3. Controla preferências de notificação dos usuários
 * 4. Implementa lógica de escalação e urgência
 * 5. Integra com sistemas externos de notificação
 * 6. Monitora entregas e falhas
 * 
 * Funcionalidades implementadas:
 * - Templates de notificação personalizáveis
 * - Suporte a múltiplos canais (email, SMS, push, in-app)
 * - Sistema de retry automático via eventos
 * - Determinação automática de prioridade
 * - Controle de canais baseado em configuração
 * - Auditoria através de logs estruturados
 */
@Injectable()
export class NotificacaoAprovacaoService {
  private readonly logger = new Logger(NotificacaoAprovacaoService.name);
  private readonly templates = new Map<string, string>();
  private readonly configuracoesPadrao = new Map<TipoNotificacaoAprovacao, ConfiguracaoNotificacao>();

  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
    @InjectRepository(DelegacaoAprovacao)
    private readonly delegacaoRepository: Repository<DelegacaoAprovacao>,
    @InjectRepository(ConfiguracaoAprovacao)
    private readonly configuracaoRepository: Repository<ConfiguracaoAprovacao>,
    @InjectRepository(HistoricoAprovacao)
    private readonly historicoRepository: Repository<HistoricoAprovacao>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.inicializarTemplates();
    this.inicializarConfiguracoesPadrao();
  }

  /**
   * Notifica sobre nova solicitação de aprovação
   */
  async notificarNovaSolicitacao(
    solicitacaoId: string,
    aprovadoresIds: string[],
    configuracao?: ConfiguracaoNotificacao,
  ): Promise<void> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['solicitante', 'configuracaoAprovacao'],
      });

      if (!solicitacao) {
        throw new Error(`Solicitação ${solicitacaoId} não encontrada`);
      }

      const aprovadores = await this.aprovadorRepository.find({
        where: { id: In(aprovadoresIds) },
      });

      for (const aprovador of aprovadores) {
        // Busca dados do usuário aprovador se for do tipo USUARIO
        let usuarioAprovador = null;
        if (aprovador.tipo === TipoAprovador.USUARIO && aprovador.usuario_id) {
          usuarioAprovador = await this.usuarioRepository.findOne({
            where: { id: aprovador.usuario_id },
          });
        }

        // Busca dados do solicitante
        const solicitante = await this.usuarioRepository.findOne({
          where: { id: solicitacao.usuario_solicitante_id },
        });

        const dadosNotificacao: DadosNotificacao = {
          destinatario: usuarioAprovador || {
            id: aprovador.usuario_id || aprovador.id,
            nome: aprovador.usuario_nome || 'Aprovador',
            email: aprovador.usuario_email || '',
          },
          assunto: this.gerarAssunto(TipoNotificacaoAprovacao.NOVA_SOLICITACAO, solicitacao),
          conteudo: await this.gerarConteudo(
            TipoNotificacaoAprovacao.NOVA_SOLICITACAO,
            {
              solicitacao,
              aprovador,
              solicitante,
            },
          ),
          tipo: TipoNotificacaoAprovacao.NOVA_SOLICITACAO,
          prioridade: this.determinarPrioridade(solicitacao),
          canais: this.determinarCanais(usuarioAprovador || {
            id: aprovador.usuario_id || aprovador.id,
            nome: aprovador.usuario_nome || 'Aprovador',
            email: aprovador.usuario_email || '',
          }, configuracao),
          metadados: {
            solicitacaoId: solicitacao.id,
            aprovadorId: aprovador.id,
            tipoAcao: solicitacao.acao_critica?.tipo || TipoAcaoCritica.CRIAR_SOLICITACAO_APROVACAO,
            data_expiracao: solicitacao.data_expiracao,
            valorEnvolvido: solicitacao.valor_envolvido,
          },
        };

        await this.enviarNotificacao(dadosNotificacao);
      }

      this.logger.log(
        `Notificações de nova solicitação enviadas para ${aprovadores.length} aprovadores`,
      );
    } catch (erro) {
      this.logger.error('Erro ao notificar nova solicitação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Notifica sobre aprovação de solicitação
   */
  async notificarAprovacao(
    solicitacaoId: string,
    aprovadorId: string,
    observacoes?: string,
  ): Promise<void> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      const aprovador = await this.aprovadorRepository.findOne({
        where: { id: aprovadorId },
      });

      if (!solicitacao || !aprovador) {
        throw new Error('Solicitação ou aprovador não encontrado');
      }

      // Busca dados do solicitante
      const solicitante = await this.usuarioRepository.findOne({
        where: { id: solicitacao.usuario_solicitante_id },
      });

      if (!solicitante) {
        throw new Error('Solicitante não encontrado');
      }

      const dadosNotificacao: DadosNotificacao = {
        destinatario: solicitante,
        assunto: this.gerarAssunto(TipoNotificacaoAprovacao.SOLICITACAO_APROVADA, solicitacao),
        conteudo: await this.gerarConteudo(
          TipoNotificacaoAprovacao.SOLICITACAO_APROVADA,
          {
            solicitacao,
            aprovador,
            observacoes,
          },
        ),
        tipo: TipoNotificacaoAprovacao.SOLICITACAO_APROVADA,
        prioridade: PrioridadeNotificacao.ALTA,
        canais: this.determinarCanais(solicitante),
        metadados: {
            solicitacaoId: solicitacao.id,
            aprovadorId: aprovador.id,
            tipoAcao: solicitacao.acao_critica?.tipo || TipoAcaoCritica.CRIAR_SOLICITACAO_APROVACAO,
            observacoes,
          },
      };

      await this.enviarNotificacao(dadosNotificacao);

      this.logger.log(`Notificação de aprovação enviada para solicitante ${solicitante.id}`);
    } catch (erro) {
      this.logger.error('Erro ao notificar aprovação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Notifica sobre rejeição de solicitação
   */
  async notificarRejeicao(
    solicitacaoId: string,
    aprovadorId: string,
    motivo: string,
  ): Promise<void> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      const aprovador = await this.aprovadorRepository.findOne({
        where: { id: aprovadorId },
      });

      if (!solicitacao || !aprovador) {
        throw new Error('Solicitação ou aprovador não encontrado');
      }

      // Busca dados do solicitante
      const solicitante = await this.usuarioRepository.findOne({
        where: { id: solicitacao.usuario_solicitante_id },
      });

      if (!solicitante) {
        throw new Error('Solicitante não encontrado');
      }

      const dadosNotificacao: DadosNotificacao = {
        destinatario: solicitante,
        assunto: this.gerarAssunto(TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA, solicitacao),
        conteudo: await this.gerarConteudo(
          TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA,
          {
            solicitacao,
            aprovador,
            motivo,
          },
        ),
        tipo: TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA,
        prioridade: PrioridadeNotificacao.ALTA,
        canais: this.determinarCanais(solicitante),
        metadados: {
            solicitacaoId: solicitacao.id,
            aprovadorId: aprovador.id,
            tipoAcao: solicitacao.acao_critica?.tipo || TipoAcaoCritica.CRIAR_SOLICITACAO_APROVACAO,
            motivo,
          },
      };

      await this.enviarNotificacao(dadosNotificacao);

      this.logger.log(`Notificação de rejeição enviada para solicitante ${solicitante.id}`);
    } catch (erro) {
      this.logger.error('Erro ao notificar rejeição:', erro.stack);
      throw erro;
    }
  }

  /**
   * Notifica sobre prazo vencendo
   */
  async notificarPrazoVencendo(solicitacaoId: string): Promise<void> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['aprovadoresPendentes', 'aprovadoresPendentes.usuario'],
      });

      if (!solicitacao) {
        return;
      }

      // Busca aprovadores através da configuração de aprovação
      const configuracao = await this.configuracaoRepository.findOne({
        where: { id: solicitacao.configuracao_aprovacao_id },
        relations: ['aprovadores', 'aprovadores.usuario'],
      });

      if (!configuracao?.aprovadores?.length) {
        return;
      }

      // Filtra apenas aprovadores que ainda não aprovaram
      const historicos = await this.historicoRepository.find({
        where: { solicitacao_aprovacao_id: solicitacao.id },
      });

      const aprovadoresQueJaAprovaram = historicos.map(h => h.aprovador_id);
      const aprovadoresPendentes = configuracao.aprovadores.filter(
        aprovador => !aprovadoresQueJaAprovaram.includes(aprovador.id)
      );

      for (const aprovador of aprovadoresPendentes) {
        // Busca dados do usuário aprovador se for do tipo USUARIO
         let usuarioAprovador = null;
         if (aprovador.tipo === TipoAprovador.USUARIO && aprovador.usuario_id) {
          usuarioAprovador = await this.usuarioRepository.findOne({
            where: { id: aprovador.usuario_id },
          });
        }

        const dadosNotificacao: DadosNotificacao = {
          destinatario: usuarioAprovador || {
            id: aprovador.usuario_id || aprovador.id,
            nome: aprovador.usuario_nome || 'Aprovador',
            email: aprovador.usuario_email || '',
          },
          assunto: this.gerarAssunto(TipoNotificacaoAprovacao.PRAZO_VENCENDO, solicitacao),
          conteudo: await this.gerarConteudo(
            TipoNotificacaoAprovacao.PRAZO_VENCENDO,
            {
              solicitacao,
              aprovador,
              horasRestantes: this.calcularHorasRestantes(solicitacao.data_expiracao),
            },
          ),
          tipo: TipoNotificacaoAprovacao.PRAZO_VENCENDO,
          prioridade: PrioridadeNotificacao.ALTA,
          canais: this.determinarCanais(usuarioAprovador || {
            id: aprovador.usuario_id || aprovador.id,
            nome: aprovador.usuario_nome || 'Aprovador',
            email: aprovador.usuario_email || '',
          }, { urgente: true }),
          metadados: {
            solicitacaoId: solicitacao.id,
            aprovadorId: aprovador.id,
            data_expiracao: solicitacao.data_expiracao,
            horasRestantes: this.calcularHorasRestantes(solicitacao.data_expiracao),
          },
        };

        await this.enviarNotificacao(dadosNotificacao);
      }

      this.logger.warn(
        `Notificações de prazo vencendo enviadas para ${aprovadoresPendentes.length} aprovadores`,
      );
    } catch (erro) {
      this.logger.error('Erro ao notificar prazo vencendo:', erro.stack);
      throw erro;
    }
  }

  /**
   * Notifica sobre delegação criada
   */
  async notificarDelegacao(
    delegacaoId: string,
    notificarOrigem: boolean = true,
    notificarDelegado: boolean = true,
  ): Promise<void> {
    try {
      const delegacao = await this.delegacaoRepository.findOne({
        where: { id: delegacaoId },
      });

      if (!delegacao) {
        throw new Error(`Delegação ${delegacaoId} não encontrada`);
      }

      // Busca os usuários pelos IDs
      const [usuarioOrigem, usuarioDelegado] = await Promise.all([
        this.usuarioRepository.findOne({ where: { id: delegacao.aprovador_origem_id } }),
        this.usuarioRepository.findOne({ where: { id: delegacao.aprovador_delegado_id } }),
      ]);

      if (!usuarioOrigem || !usuarioDelegado) {
        throw new Error('Usuários da delegação não encontrados');
      }

      // Notifica aprovador original
      if (notificarOrigem) {
        const dadosOrigem: DadosNotificacao = {
          destinatario: usuarioOrigem,
          assunto: 'Delegação de Aprovação Criada',
          conteudo: await this.gerarConteudo(
            TipoNotificacaoAprovacao.DELEGACAO_CRIADA,
            {
              delegacao,
              tipoNotificacao: 'origem',
            },
          ),
          tipo: TipoNotificacaoAprovacao.DELEGACAO_CRIADA,
          prioridade: PrioridadeNotificacao.NORMAL,
          canais: this.determinarCanais(usuarioOrigem),
          metadados: {
            delegacaoId: delegacao.id,
            aprovadorOrigemId: delegacao.aprovador_origem_id,
            aprovadorDelegadoId: delegacao.aprovador_delegado_id,
            dataInicio: delegacao.data_inicio,
            dataFim: delegacao.data_fim,
          },
        };

        await this.enviarNotificacao(dadosOrigem);
      }

      // Notifica aprovador delegado
      if (notificarDelegado) {
        const dadosDelegado: DadosNotificacao = {
          destinatario: usuarioDelegado,
          assunto: 'Nova Delegação de Aprovação Recebida',
          conteudo: await this.gerarConteudo(
            TipoNotificacaoAprovacao.DELEGACAO_CRIADA,
            {
              delegacao,
              tipoNotificacao: 'delegado',
            },
          ),
          tipo: TipoNotificacaoAprovacao.DELEGACAO_CRIADA,
          prioridade: PrioridadeNotificacao.ALTA,
          canais: this.determinarCanais(usuarioDelegado),
          metadados: {
            delegacaoId: delegacao.id,
            aprovadorOrigemId: delegacao.aprovador_origem_id,
            aprovadorDelegadoId: delegacao.aprovador_delegado_id,
            dataInicio: delegacao.data_inicio,
            dataFim: delegacao.data_fim,
          },
        };

        await this.enviarNotificacao(dadosDelegado);
      }

      this.logger.log(`Notificações de delegação enviadas para delegação ${delegacaoId}`);
    } catch (erro) {
      this.logger.error('Erro ao notificar delegação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Envia notificação através dos canais especificados
   */
  private async enviarNotificacao(dados: DadosNotificacao): Promise<void> {
    try {
      // Emite evento para processamento assíncrono
      this.eventEmitter.emit('notificacao.enviar', dados);

      // Log da notificação
      this.logger.debug(
        `Notificação ${dados.tipo} enviada para usuário ${dados.destinatario.id} ` +
        `via canais: ${dados.canais.join(', ')}`,
      );

      // Processa cada canal de notificação
      for (const canal of dados.canais) {
        await this.processarCanalNotificacao(canal, dados);
      }
    } catch (erro) {
      this.logger.error('Erro ao enviar notificação:', erro.stack);
      
      // Emite evento de falha para retry ou escalação
      this.eventEmitter.emit('notificacao.falha', {
        dados,
        erro: erro.message,
        timestamp: new Date(),
      });
      
      throw erro;
    }
  }

  /**
   * Processa notificação para um canal específico
   */
  private async processarCanalNotificacao(
    canal: CanalNotificacao,
    dados: DadosNotificacao,
  ): Promise<void> {
    try {
      switch (canal) {
        case CanalNotificacao.EMAIL:
          await this.enviarEmail(dados);
          break;
        case CanalNotificacao.SMS:
          await this.enviarSMS(dados);
          break;
        case CanalNotificacao.PUSH:
          await this.enviarPush(dados);
          break;
        case CanalNotificacao.IN_APP:
          await this.criarNotificacaoInApp(dados);
          break;
        default:
          this.logger.warn(`Canal de notificação não suportado: ${canal}`);
      }
    } catch (erro) {
      this.logger.error(`Erro ao processar canal ${canal}:`, erro.stack);
      throw erro;
    }
  }

  /**
   * Envia notificação por email
   */
  private async enviarEmail(dados: DadosNotificacao): Promise<void> {
    // Implementação do envio de email
    this.eventEmitter.emit('email.enviar', {
      destinatario: dados.destinatario.email,
      assunto: dados.assunto,
      conteudo: dados.conteudo,
      prioridade: dados.prioridade,
      metadados: dados.metadados,
    });
  }

  /**
   * Envia notificação por SMS
   */
  private async enviarSMS(dados: DadosNotificacao): Promise<void> {
    // Implementação do envio de SMS
    this.eventEmitter.emit('sms.enviar', {
      telefone: dados.destinatario.telefone,
      mensagem: this.gerarMensagemCurta(dados),
      prioridade: dados.prioridade,
      metadados: dados.metadados,
    });
  }

  /**
   * Envia notificação push
   */
  private async enviarPush(dados: DadosNotificacao): Promise<void> {
    // Implementação do envio de push notification
    this.eventEmitter.emit('push.enviar', {
      usuarioId: dados.destinatario.id,
      titulo: dados.assunto,
      corpo: this.gerarMensagemCurta(dados),
      dados: dados.metadados,
    });
  }

  /**
   * Cria notificação in-app
   */
  private async criarNotificacaoInApp(dados: DadosNotificacao): Promise<void> {
    // Implementação da notificação in-app
    this.eventEmitter.emit('notificacao.inapp.criar', {
      usuarioId: dados.destinatario.id,
      tipo: dados.tipo,
      titulo: dados.assunto,
      conteudo: dados.conteudo,
      prioridade: dados.prioridade,
      metadados: dados.metadados,
      lida: false,
      dataExpiracao: this.calcularDataExpiracao(dados.tipo),
    });
  }

  /**
   * Gera assunto da notificação
   */
  private gerarAssunto(tipo: TipoNotificacaoAprovacao, solicitacao: SolicitacaoAprovacao): string {
    const prefixos = {
      [TipoNotificacaoAprovacao.NOVA_SOLICITACAO]: '[APROVAÇÃO PENDENTE]',
      [TipoNotificacaoAprovacao.SOLICITACAO_APROVADA]: '[APROVADO]',
      [TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA]: '[REJEITADO]',
      [TipoNotificacaoAprovacao.PRAZO_VENCENDO]: '[URGENTE]',
      [TipoNotificacaoAprovacao.PRAZO_VENCIDO]: '[VENCIDO]',
      [TipoNotificacaoAprovacao.DELEGACAO_CRIADA]: '[DELEGAÇÃO]',
      [TipoNotificacaoAprovacao.ESCALACAO_AUTOMATICA]: '[ESCALAÇÃO]',
    };

    const prefixo = prefixos[tipo] || '[APROVAÇÃO]';
    const descricao = solicitacao.acao_critica?.nome || 'Solicitação de aprovação';
    
    return `${prefixo} ${descricao}`;
  }

  /**
   * Gera conteúdo da notificação usando templates
   */
  private async gerarConteudo(
    tipo: TipoNotificacaoAprovacao,
    contexto: Record<string, any>,
  ): Promise<string> {
    const template = this.templates.get(tipo) || this.templates.get('default');
    
    if (!template) {
      return this.gerarConteudoPadrao(tipo, contexto);
    }

    // Substitui variáveis no template
    return this.processarTemplate(template, contexto);
  }

  /**
   * Processa template substituindo variáveis
   */
  private processarTemplate(template: string, contexto: Record<string, any>): string {
    let conteudo = template;
    
    // Substitui variáveis simples {{variavel}}
    conteudo = conteudo.replace(/\{\{([^}]+)\}\}/g, (match, variavel) => {
      const valor = this.obterValorContexto(variavel.trim(), contexto);
      return valor !== undefined ? String(valor) : match;
    });
    
    return conteudo;
  }

  /**
   * Obtém valor do contexto usando notação de ponto
   */
  private obterValorContexto(caminho: string, contexto: Record<string, any>): any {
    return caminho.split('.').reduce((obj, prop) => obj?.[prop], contexto);
  }

  /**
   * Gera conteúdo padrão quando não há template
   */
  private gerarConteudoPadrao(tipo: TipoNotificacaoAprovacao, contexto: any): string {
    switch (tipo) {
      case TipoNotificacaoAprovacao.NOVA_SOLICITACAO:
        return `Nova solicitação de aprovação: ${contexto.solicitacao?.descricao || 'Sem descrição'}`;
      case TipoNotificacaoAprovacao.SOLICITACAO_APROVADA:
        return `Sua solicitação foi aprovada por ${contexto.aprovador?.usuario?.nome || 'Aprovador'}`;
      case TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA:
        return `Sua solicitação foi rejeitada. Motivo: ${contexto.motivo || 'Não informado'}`;
      default:
        return 'Notificação do sistema de aprovação';
    }
  }

  /**
   * Determina canais de notificação baseado no usuário e configuração
   */
  private determinarCanais(
    usuario: Usuario,
    configuracao?: ConfiguracaoNotificacao,
  ): CanalNotificacao[] {
    const canais: CanalNotificacao[] = [];
    
    // Canais padrão
    canais.push(CanalNotificacao.IN_APP);
    
    if (usuario.email && (configuracao?.email !== false)) {
      canais.push(CanalNotificacao.EMAIL);
    }
    
    if (usuario.telefone && configuracao?.sms) {
      canais.push(CanalNotificacao.SMS);
    }
    
    if (configuracao?.push) {
      canais.push(CanalNotificacao.PUSH);
    }
    
    // Webhook será implementado futuramente quando a propriedade for adicionada à entidade Usuario
    // if (configuracao?.webhook && usuario.webhookUrl) {
    //   canais.push(CanalNotificacao.WEBHOOK);
    // }
    
    // Para notificações urgentes, adiciona mais canais
    if (configuracao?.urgente) {
      if (usuario.telefone) {
        canais.push(CanalNotificacao.SMS);
      }
      canais.push(CanalNotificacao.PUSH);
    }
    
    return [...new Set(canais)]; // Remove duplicatas
  }

  /**
   * Determina a prioridade da notificação baseada na solicitação
   */
  private determinarPrioridade(solicitacao: SolicitacaoAprovacao): PrioridadeNotificacao {
    // Verifica se é alta prioridade pela configuração
    if (solicitacao.prioridade === PrioridadeAprovacao.ALTA || solicitacao.prioridade === PrioridadeAprovacao.CRITICA) {
      return PrioridadeNotificacao.ALTA;
    }

    // Verifica se o prazo está próximo do vencimento
    if (solicitacao.data_expiracao) {
      const horasRestantes = this.calcularHorasRestantes(solicitacao.data_expiracao);
      if (horasRestantes <= 24) {
        return PrioridadeNotificacao.ALTA;
      }
      if (horasRestantes <= 72) {
        return PrioridadeNotificacao.NORMAL;
      }
    }

    // Verifica se tem valor alto envolvido
    if (solicitacao.valor_envolvido && solicitacao.valor_envolvido > 10000) {
      return PrioridadeNotificacao.ALTA;
    }

    // Verifica se é ação crítica de alto nível (4 ou 5)
    if (solicitacao.acao_critica?.nivel_criticidade >= 4) {
      return PrioridadeNotificacao.ALTA;
    }

    return PrioridadeNotificacao.NORMAL;
  }

  /**
   * Calcula horas restantes até o prazo limite
   */
  private calcularHorasRestantes(prazoLimite: Date): number {
    const agora = new Date();
    const diferenca = prazoLimite.getTime() - agora.getTime();
    return Math.max(0, diferenca / (1000 * 60 * 60)); // Converte para horas
  }

  /**
   * Gera mensagem curta para SMS e push
   */
  private gerarMensagemCurta(dados: DadosNotificacao): string {
    const limite = 160; // Limite típico de SMS
    let mensagem = `${dados.assunto}: ${dados.conteudo}`;
    
    if (mensagem.length > limite) {
      mensagem = mensagem.substring(0, limite - 3) + '...';
    }
    
    return mensagem;
  }

  /**
   * Calcula data de expiração para notificações in-app
   */
  private calcularDataExpiracao(tipo: TipoNotificacaoAprovacao): Date {
    const agora = new Date();
    const diasExpiracao = {
      [TipoNotificacaoAprovacao.NOVA_SOLICITACAO]: 30,
      [TipoNotificacaoAprovacao.SOLICITACAO_APROVADA]: 7,
      [TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA]: 7,
      [TipoNotificacaoAprovacao.PRAZO_VENCENDO]: 1,
      [TipoNotificacaoAprovacao.DELEGACAO_CRIADA]: 30,
    };
    
    const dias = diasExpiracao[tipo] || 7;
    agora.setDate(agora.getDate() + dias);
    
    return agora;
  }

  /**
   * Formata mensagem para Slack
   */
  private formatarMensagemSlack(dados: DadosNotificacao): string {
    return `*${dados.assunto}*\n${dados.conteudo}`;
  }

  /**
   * Gera anexos para Slack
   */
  private gerarAnexosSlack(dados: DadosNotificacao): any[] {
    const cor = {
      [PrioridadeNotificacao.BAIXA]: '#36a64f',
      [PrioridadeNotificacao.NORMAL]: '#2196F3',
      [PrioridadeNotificacao.ALTA]: '#ff9800',
      [PrioridadeNotificacao.CRITICA]: '#f44336',
    };
    
    return [{
      color: cor[dados.prioridade],
      fields: [
        {
          title: 'Tipo',
          value: dados.tipo,
          short: true,
        },
        {
          title: 'Prioridade',
          value: dados.prioridade,
          short: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }];
  }

  /**
   * Gera card para Teams
   */
  private gerarCardTeams(dados: DadosNotificacao): any {
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: dados.assunto,
      themeColor: this.obterCorTeams(dados.prioridade),
      sections: [{
        activityTitle: dados.assunto,
        activitySubtitle: dados.conteudo,
        facts: [
          {
            name: 'Tipo:',
            value: dados.tipo,
          },
          {
            name: 'Prioridade:',
            value: dados.prioridade,
          },
        ],
      }],
    };
  }

  /**
   * Obtém cor para Teams baseada na prioridade
   */
  private obterCorTeams(prioridade: PrioridadeNotificacao): string {
    const cores = {
      [PrioridadeNotificacao.BAIXA]: '00FF00',
      [PrioridadeNotificacao.NORMAL]: '0078D4',
      [PrioridadeNotificacao.ALTA]: 'FF8C00',
      [PrioridadeNotificacao.CRITICA]: 'FF0000',
    };
    
    return cores[prioridade] || '0078D4';
  }

  /**
   * Inicializa templates de notificação
   */
  private inicializarTemplates(): void {
    this.templates.set(
      TipoNotificacaoAprovacao.NOVA_SOLICITACAO,
      `Olá {{aprovador.usuario_nome}},

Você tem uma nova solicitação de aprovação pendente:

**Tipo:** {{solicitacao.acao_critica.tipo}}
**Descrição:** {{solicitacao.contexto}}
**Solicitante:** {{solicitante.nome}}
**Data da Solicitação:** {{solicitacao.created_at}}
**Prazo Limite:** {{solicitacao.data_expiracao}}
{{#if solicitacao.valor_envolvido}}**Valor:** R$ {{solicitacao.valor_envolvido}}{{/if}}

**Justificativa:**
{{solicitacao.justificativa}}

Por favor, acesse o sistema para revisar e tomar uma decisão sobre esta solicitação.

Atenciosamente,
Sistema de Aprovação`,
    );

    this.templates.set(
      TipoNotificacaoAprovacao.SOLICITACAO_APROVADA,
      `Olá {{solicitante.nome}},

Sua solicitação foi **APROVADA**!

**Tipo:** {{solicitacao.acao_critica.tipo}}
**Descrição:** {{solicitacao.contexto}}
**Aprovado por:** {{aprovador.usuario_nome}}
**Data da Aprovação:** {{now}}
{{#if observacoes}}**Observações:** {{observacoes}}{{/if}}

Você já pode prosseguir com a ação solicitada.

Atenciosamente,
Sistema de Aprovação`,
    );

    this.templates.set(
      TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA,
      `Olá {{solicitante.nome}},

Sua solicitação foi **REJEITADA**.

**Tipo:** {{solicitacao.acao_critica.tipo}}
**Descrição:** {{solicitacao.contexto}}
**Rejeitado por:** {{aprovador.usuario_nome}}
**Data da Rejeição:** {{now}}
**Motivo:** {{motivo}}

Se necessário, você pode criar uma nova solicitação com as devidas correções.

Atenciosamente,
Sistema de Aprovação`,
    );

    this.templates.set(
      TipoNotificacaoAprovacao.PRAZO_VENCENDO,
      `⚠️ **ATENÇÃO: Prazo Vencendo** ⚠️

Olá {{aprovador.usuario_nome}},

Você tem uma solicitação de aprovação com prazo vencendo em {{horasRestantes}} horas:

**Tipo:** {{solicitacao.acao_critica.tipo}}
**Descrição:** {{solicitacao.contexto}}
**Solicitante:** {{solicitacao.usuario_solicitante_nome}}
**Prazo Limite:** {{solicitacao.data_expiracao}}

**AÇÃO URGENTE NECESSÁRIA**

Por favor, acesse o sistema imediatamente para revisar esta solicitação.

Atenciosamente,
Sistema de Aprovação`,
    );

    this.templates.set(
      'default',
      `Olá,

Você tem uma nova notificação do sistema de aprovação.

Por favor, acesse o sistema para mais detalhes.

Atenciosamente,
Sistema de Aprovação`,
    );
  }

  /**
   * Reenvia notificações para uma solicitação
   */
  async reenviarNotificacoes(
    solicitacaoId: string,
    dados: {
      canais?: string[];
      destinatarios?: string[];
    },
    usuario: any,
  ): Promise<void> {
    try {
      this.logger.log('Reenviando notificações', { solicitacaoId, dados, usuarioId: usuario.id });
      
      // Busca a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['acao_critica', 'usuario_solicitante'],
      });
      
      if (!solicitacao) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Busca configuração de aprovação para obter aprovadores
      const configuracao = await this.configuracaoRepository.findOne({
        where: { id: solicitacao.configuracao_aprovacao_id },
        relations: ['aprovadores'],
      });
      
      if (!configuracao?.aprovadores?.length) {
        throw new Error('Nenhum aprovador encontrado para esta solicitação');
      }
      
      // Define destinatários
      let destinatarios = dados.destinatarios || [];
      if (destinatarios.length === 0) {
        // Se não especificado, envia para todos os aprovadores
        destinatarios = configuracao.aprovadores.map(a => a.usuario_id).filter(Boolean);
      }
      
      // Define canais - converte strings para enum CanalNotificacao
      const canaisString = dados.canais || ['email', 'inApp'];
      const canais = canaisString.map(canal => {
        switch (canal.toLowerCase()) {
          case 'email': return CanalNotificacao.EMAIL;
          case 'inapp': return CanalNotificacao.IN_APP;
          case 'sms': return CanalNotificacao.SMS;
          case 'push': return CanalNotificacao.PUSH;
          default: return CanalNotificacao.EMAIL;
        }
      });
      
      // Reenvia notificações
      for (const destinatarioId of destinatarios) {
        const usuario = await this.usuarioRepository.findOne({
          where: { id: destinatarioId },
        });
        
        if (!usuario) {
          this.logger.warn(`Usuário ${destinatarioId} não encontrado para reenvio`);
          continue;
        }
        
        const dadosNotificacao: DadosNotificacao = {
          destinatario: usuario,
          assunto: this.gerarAssunto(TipoNotificacaoAprovacao.NOVA_SOLICITACAO, solicitacao),
          conteudo: await this.gerarConteudo(
            TipoNotificacaoAprovacao.NOVA_SOLICITACAO,
            {
              solicitacao,
              usuario,
            },
          ),
          tipo: TipoNotificacaoAprovacao.NOVA_SOLICITACAO,
          prioridade: PrioridadeNotificacao.NORMAL,
          canais,
          metadados: {
            solicitacaoId: solicitacao.id,
            reenvio: true,
            reenviado_por: usuario.id,
            reenviado_em: new Date(),
          },
        };
        
        await this.enviarNotificacao(dadosNotificacao);
      }
      
      this.logger.log('Notificações reenviadas com sucesso', { solicitacaoId, destinatarios: destinatarios.length });
    } catch (erro) {
      this.logger.error('Erro ao reenviar notificações:', erro.stack);
      throw erro;
    }
  }

  /**
   * Inicializa configurações padrão de notificação
   */
  private inicializarConfiguracoesPadrao(): void {
    this.configuracoesPadrao.set(TipoNotificacaoAprovacao.NOVA_SOLICITACAO, {
      email: true,
      inApp: true,
      push: true,
    });

    this.configuracoesPadrao.set(TipoNotificacaoAprovacao.SOLICITACAO_APROVADA, {
      email: true,
      inApp: true,
      push: true,
    });

    this.configuracoesPadrao.set(TipoNotificacaoAprovacao.SOLICITACAO_REJEITADA, {
      email: true,
      inApp: true,
      push: true,
    });

    this.configuracoesPadrao.set(TipoNotificacaoAprovacao.PRAZO_VENCENDO, {
      email: true,
      sms: true,
      inApp: true,
      push: true,
      urgente: true,
    });

    this.configuracoesPadrao.set(TipoNotificacaoAprovacao.DELEGACAO_CRIADA, {
      email: true,
      inApp: true,
    });
  }
}