import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { Aprovador } from '../entities/aprovador.entity';
import { ConfiguracaoAprovacao } from '../entities/configuracao-aprovacao.entity';
import { HistoricoAprovacao } from '../entities/historico-aprovacao.entity';
import { AcaoCritica } from '../entities/acao-critica.entity';
import { StatusSolicitacaoAprovacao, TipoAcaoCritica, AcaoAprovacao } from '../enums/aprovacao.enums';
import { NotificacaoAprovacaoService } from './notificacao-aprovacao.service';
import { AprovacaoService } from './aprovacao.service';
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Interface para configuração de escalação
 */
interface ConfiguracaoEscalacao {
  habilitada: boolean;
  tempoLimiteHoras: number;
  nivelMaximo: number;
  estrategia: EstrategiaEscalacao;
  notificarOriginal: boolean;
  criarNovaAprovacao: boolean;
  manterHistorico: boolean;
}

/**
 * Estratégias de escalação disponíveis
 */
export enum EstrategiaEscalacao {
  HIERARQUICA = 'HIERARQUICA', // Escala para superior hierárquico
  PARALELA = 'PARALELA', // Adiciona aprovadores paralelos
  SUBSTITUTA = 'SUBSTITUTA', // Substitui aprovador atual
  COMITE = 'COMITE', // Escala para comitê de aprovação
  AUTOMATICA = 'AUTOMATICA', // Aprovação automática após escalação
  MANUAL = 'MANUAL', // Aprovação manual por parte do usuário
}

/**
 * Interface para dados de escalação
 */
interface DadosEscalacao {
  solicitacaoId: string;
  aprovadorOriginalId: string;
  aprovadoresEscalacao: string[];
  nivel: number;
  motivo: string;
  estrategia: EstrategiaEscalacao;
  dataEscalacao: Date;
  prazoOriginal: Date;
  novoPrazo?: Date;
  metadados: {
    tempoEspera: number;
    tentativasNotificacao: number;
    valorEnvolvido?: number;
    tipoAcao: TipoAcaoCritica;
    [key: string]: any;
  };
}

/**
 * Interface para regra de escalação
 */
interface RegraEscalacao {
  id: string;
  nome: string;
  condicoes: {
    tiposAcao?: TipoAcaoCritica[];
    valorMinimo?: number;
    valorMaximo?: number;
    tempoLimiteHoras?: number;
    departamentos?: string[];
    cargos?: string[];
  };
  escalacao: {
    estrategia: EstrategiaEscalacao;
    aprovadores: string[];
    tempoEsperaHoras: number;
    nivelMaximo: number;
    notificacoes: {
      antecedenciaHoras: number[];
      canais: string[];
    };
  };
  ativa: boolean;
  prioridade: number;
}

/**
 * Serviço responsável pela escalação automática de aprovações
 * 
 * Este serviço:
 * 1. Monitora solicitações pendentes próximas ao vencimento
 * 2. Implementa diferentes estratégias de escalação
 * 3. Gerencia hierarquias de aprovação
 * 4. Controla prazos e notificações de escalação
 * 5. Mantém histórico completo de escalações
 * 6. Integra com sistema de notificações
 */
@Injectable()
export class EscalacaoAprovacaoService {
  private readonly logger = new Logger(EscalacaoAprovacaoService.name);
  private readonly regrasEscalacao = new Map<string, RegraEscalacao>();
  private readonly configuracoesEscalacao = new Map<string, ConfiguracaoEscalacao>();
  private readonly configuracoesPadrao = new Map<string, ConfiguracaoEscalacao>();

  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
    @InjectRepository(ConfiguracaoAprovacao)
    private readonly configuracaoRepository: Repository<ConfiguracaoAprovacao>,
    @InjectRepository(HistoricoAprovacao)
    private readonly historicoRepository: Repository<HistoricoAprovacao>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly notificacaoService: NotificacaoAprovacaoService,
    private readonly aprovacaoService: AprovacaoService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.inicializarRegrasEscalacao();
    this.inicializarConfiguracoes();
  }

  /**
   * Job que executa a cada 30 minutos para verificar escalações
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async verificarEscalacoes(): Promise<void> {
    try {
      this.logger.log('Iniciando verificação de escalações automáticas');
      
      const solicitacoesPendentes = await this.buscarSolicitacoesPendentes();
      
      for (const solicitacao of solicitacoesPendentes) {
        await this.processarSolicitacaoParaEscalacao(solicitacao);
      }
      
      this.logger.log(
        `Verificação de escalações concluída. ${solicitacoesPendentes.length} solicitações processadas`,
      );
    } catch (erro) {
      this.logger.error('Erro na verificação de escalações:', erro.stack);
    }
  }

  /**
   * Job que executa a cada hora para notificações de prazo
   */
  @Cron(CronExpression.EVERY_HOUR)
  async verificarPrazosVencimento(): Promise<void> {
    try {
      this.logger.log('Verificando prazos de vencimento');
      
      const solicitacoesProximasVencimento = await this.buscarSolicitacoesProximasVencimento();
      
      for (const solicitacao of solicitacoesProximasVencimento) {
        await this.notificarPrazoVencendo(solicitacao);
      }
      
      this.logger.log(
        `Verificação de prazos concluída. ${solicitacoesProximasVencimento.length} notificações enviadas`,
      );
    } catch (erro) {
      this.logger.error('Erro na verificação de prazos:', erro.stack);
    }
  }

  /**
   * Escala uma solicitação manualmente
   */
  async escalarSolicitacao(
    solicitacaoId: string,
    aprovadoresEscalacao: string[],
    estrategia: EstrategiaEscalacao,
    motivo: string,
    usuarioEscalacao: string,
  ): Promise<DadosEscalacao> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['aprovadoresPendentes', 'configuracaoAprovacao'],
      });

      if (!solicitacao) {
        throw new Error(`Solicitação ${solicitacaoId} não encontrada`);
      }

      if (solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE) {
        throw new Error('Apenas solicitações pendentes podem ser escaladas');
      }

      // Valida aprovadores de escalação
      await this.validarAprovadoresEscalacao(aprovadoresEscalacao, solicitacao);

      // Calcula nível de escalação atual
      const nivelAtual = await this.calcularNivelEscalacao(solicitacaoId);

      const dadosEscalacao: DadosEscalacao = {
        solicitacaoId,
        aprovadorOriginalId: null, // Será determinado pela configuração
        aprovadoresEscalacao,
        nivel: nivelAtual + 1,
        motivo,
        estrategia,
        dataEscalacao: new Date(),
        prazoOriginal: solicitacao.data_expiracao,
        novoPrazo: this.calcularNovoPrazo(solicitacao.data_expiracao, estrategia),
        metadados: {
          tempoEspera: this.calcularTempoEspera(solicitacao.created_at),
          tentativasNotificacao: await this.contarTentativasNotificacao(solicitacaoId),
          valorEnvolvido: solicitacao.valor_envolvido,
          tipoAcao: solicitacao.acao_critica?.tipo as TipoAcaoCritica,
          usuarioEscalacao,
          escalacaoManual: true,
        },
      };

      // Executa escalação
      await this.executarEscalacao(dadosEscalacao);

      this.logger.log(
        `Solicitação ${solicitacaoId} escalada manualmente para nível ${dadosEscalacao.nivel}`,
      );

      return dadosEscalacao;
    } catch (erro) {
      this.logger.error('Erro ao escalar solicitação manualmente:', erro.stack);
      throw erro;
    }
  }

  /**
   * Configura regra de escalação personalizada
   */
  async configurarRegraEscalacao(regra: RegraEscalacao): Promise<void> {
    try {
      // Valida regra
      this.validarRegraEscalacao(regra);

      // Armazena regra
      this.regrasEscalacao.set(regra.id, regra);

      // Persiste no banco de dados (implementar conforme necessário)
      await this.persistirRegraEscalacao(regra);

      this.logger.log(`Regra de escalação '${regra.nome}' configurada com sucesso`);

      // Emite evento para notificar mudança
      this.eventEmitter.emit('escalacao.regra.configurada', regra);
    } catch (erro) {
      this.logger.error('Erro ao configurar regra de escalação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Busca solicitações pendentes que podem precisar de escalação
   */
  private async buscarSolicitacoesPendentes(): Promise<SolicitacaoAprovacao[]> {
    const agora = new Date();
    const limite = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // Próximas 24 horas

    return this.solicitacaoRepository.find({
      where: {
        status: StatusSolicitacaoAprovacao.PENDENTE,
        data_expiracao: LessThan(limite),
      },
      relations: [
        'configuracao_aprovacao',
        'acao_critica',
      ],
    });
  }

  /**
   * Busca solicitações próximas ao vencimento para notificação
   */
  private async buscarSolicitacoesProximasVencimento(): Promise<SolicitacaoAprovacao[]> {
    const agora = new Date();
    const limite2h = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // Próximas 2 horas
    const limite24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // Próximas 24 horas

    return this.solicitacaoRepository.find({
      where: [
        {
          status: StatusSolicitacaoAprovacao.PENDENTE,
          data_expiracao: LessThan(limite2h),
        },
        {
          status: StatusSolicitacaoAprovacao.PENDENTE,
          data_expiracao: LessThan(limite24h),
        },
      ],
      relations: ['configuracao_aprovacao', 'acao_critica'],
    });
  }

  /**
   * Processa uma solicitação para verificar se precisa de escalação
   */
  private async processarSolicitacaoParaEscalacao(
    solicitacao: SolicitacaoAprovacao,
  ): Promise<void> {
    try {
      // Verifica se já foi escalada recentemente
      const ultimaEscalacao = await this.buscarUltimaEscalacao(solicitacao.id);
      if (ultimaEscalacao && this.foiEscaladaRecentemente(ultimaEscalacao)) {
        return;
      }

      // Busca regra de escalação aplicável
      const regra = this.buscarRegraAplicavel(solicitacao);
      if (!regra) {
        return;
      }

      // Verifica se atende critérios de tempo
      const tempoEspera = this.calcularTempoEspera(solicitacao.created_at);
      if (tempoEspera < regra.escalacao.tempoEsperaHoras) {
        return;
      }

      // Verifica nível máximo de escalação
      const nivelAtual = await this.calcularNivelEscalacao(solicitacao.id);
      if (nivelAtual >= regra.escalacao.nivelMaximo) {
        await this.processarEscalacaoMaxima(solicitacao, regra);
        return;
      }

      // Busca aprovadores para escalação
      const aprovadoresEscalacao = await this.buscarAprovadoresEscalacao(
        solicitacao,
        regra,
        nivelAtual + 1,
      );

      if (!aprovadoresEscalacao.length) {
        this.logger.warn(
          `Nenhum aprovador encontrado para escalação da solicitação ${solicitacao.id}`,
        );
        return;
      }

      // Executa escalação automática
      const dadosEscalacao: DadosEscalacao = {
        solicitacaoId: solicitacao.id,
        aprovadorOriginalId: null, // Será determinado pela configuração
        aprovadoresEscalacao: aprovadoresEscalacao.map(a => a.id),
        nivel: nivelAtual + 1,
        motivo: `Escalação automática - Prazo limite: ${solicitacao.data_expiracao.toLocaleString()}`,
        estrategia: regra.escalacao.estrategia,
        dataEscalacao: new Date(),
        prazoOriginal: solicitacao.data_expiracao,
        novoPrazo: this.calcularNovoPrazo(solicitacao.data_expiracao, regra.escalacao.estrategia),
        metadados: {
          tempoEspera,
          tentativasNotificacao: await this.contarTentativasNotificacao(solicitacao.id),
          valorEnvolvido: solicitacao.valor_envolvido,
          tipoAcao: solicitacao.acao_critica?.tipo as TipoAcaoCritica,
          regraId: regra.id,
          escalacaoAutomatica: true,
        },
      };

      await this.executarEscalacao(dadosEscalacao);

      this.logger.log(
        `Solicitação ${solicitacao.id} escalada automaticamente para nível ${dadosEscalacao.nivel}`,
      );
    } catch (erro) {
      this.logger.error(
        `Erro ao processar escalação para solicitação ${solicitacao.id}:`,
        erro.stack,
      );
    }
  }

  /**
   * Executa a escalação conforme estratégia definida
   */
  private async executarEscalacao(dados: DadosEscalacao): Promise<void> {
    try {
      // Registra escalação no histórico
      await this.registrarEscalacaoHistorico(dados);

      // Executa estratégia específica
      switch (dados.estrategia) {
        case EstrategiaEscalacao.HIERARQUICA:
          await this.executarEscalacaoHierarquica(dados);
          break;
        case EstrategiaEscalacao.PARALELA:
          await this.executarEscalacaoParalela(dados);
          break;
        case EstrategiaEscalacao.SUBSTITUTA:
          await this.executarEscalacaoSubstituta(dados);
          break;
        case EstrategiaEscalacao.COMITE:
          await this.executarEscalacaoComite(dados);
          break;
        case EstrategiaEscalacao.AUTOMATICA:
          await this.executarAprovacaoAutomatica(dados);
          break;
        default:
          throw new Error(`Estratégia de escalação não suportada: ${dados.estrategia}`);
      }

      // Atualiza prazo se necessário
      if (dados.novoPrazo) {
        await this.atualizarPrazoSolicitacao(dados.solicitacaoId, dados.novoPrazo);
      }

      // Envia notificações
      await this.notificarEscalacao(dados);

      // Emite evento
      this.eventEmitter.emit('aprovacao.escalada', dados);
    } catch (erro) {
      this.logger.error('Erro ao executar escalação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Executa escalação hierárquica (substitui aprovador atual)
   */
  private async executarEscalacaoHierarquica(dados: DadosEscalacao): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: dados.solicitacaoId },
      relations: ['configuracao_aprovacao'],
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    // Busca novos aprovadores para escalação
    const novosAprovadores = await this.aprovadorRepository.find({
      where: { id: In(dados.aprovadoresEscalacao) },
    });

    // Atualiza a configuração de aprovação se necessário
    if (solicitacao.configuracao_aprovacao) {
      solicitacao.configuracao_aprovacao.min_aprovacoes = novosAprovadores.length;
      await this.configuracaoRepository.save(solicitacao.configuracao_aprovacao);
    }

    await this.solicitacaoRepository.save(solicitacao);
  }

  /**
   * Executa escalação paralela (adiciona aprovadores)
   */
  private async executarEscalacaoParalela(dados: DadosEscalacao): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: dados.solicitacaoId },
      relations: ['configuracao_aprovacao'],
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    // Busca novos aprovadores para adicionar
    const novosAprovadores = await this.aprovadorRepository.find({
      where: { id: In(dados.aprovadoresEscalacao) },
    });

    // Atualiza a configuração para incluir mais aprovadores
    if (solicitacao.configuracao_aprovacao) {
      const aprovadoresAtuais = solicitacao.configuracao_aprovacao.min_aprovacoes || 1;
      solicitacao.configuracao_aprovacao.min_aprovacoes = aprovadoresAtuais + novosAprovadores.length;
      await this.configuracaoRepository.save(solicitacao.configuracao_aprovacao);
    }

    await this.solicitacaoRepository.save(solicitacao);
  }

  /**
   * Executa escalação substituta (troca aprovador)
   */
  private async executarEscalacaoSubstituta(dados: DadosEscalacao): Promise<void> {
    await this.executarEscalacaoHierarquica(dados); // Mesmo comportamento
  }

  /**
   * Executa escalação para comitê
   */
  private async executarEscalacaoComite(dados: DadosEscalacao): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: dados.solicitacaoId },
      relations: ['configuracao_aprovacao'],
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    // Atualiza configuração para exigir aprovação de todos os membros do comitê
    if (solicitacao.configuracao_aprovacao) {
        solicitacao.configuracao_aprovacao.min_aprovacoes = dados.aprovadoresEscalacao.length;
        await this.configuracaoRepository.save(solicitacao.configuracao_aprovacao);
      }

    // Adiciona todos os membros do comitê
    await this.executarEscalacaoParalela(dados);
  }

  /**
   * Executa aprovação automática após escalação
   */
  private async executarAprovacaoAutomatica(dados: DadosEscalacao): Promise<void> {
    try {
      // Busca um aprovador do sistema para registrar a aprovação
      const aprovadorSistema = await this.aprovadorRepository.findOne({
        where: { id: dados.aprovadoresEscalacao[0] },
      });

      if (!aprovadorSistema) {
        throw new Error('Aprovador do sistema não encontrado');
      }

      // Executa aprovação automática
      const dadosAprovacao = {
        aprovador_id: aprovadorSistema.id,
        justificativa: `Aprovação automática após escalação - Nível ${dados.nivel}`,
      };
      
      await this.aprovacaoService.aprovarSolicitacao(
        dados.solicitacaoId,
        dadosAprovacao,
        aprovadorSistema.id,
      );

      this.logger.log(
        `Aprovação automática executada para solicitação ${dados.solicitacaoId}`,
      );
    } catch (erro) {
      this.logger.error('Erro na aprovação automática:', erro.stack);
      throw erro;
    }
  }

  /**
   * Processa escalação quando atinge nível máximo
   */
  private async processarEscalacaoMaxima(
    solicitacao: SolicitacaoAprovacao,
    regra: RegraEscalacao,
  ): Promise<void> {
    this.logger.warn(
      `Solicitação ${solicitacao.id} atingiu nível máximo de escalação (${regra.escalacao.nivelMaximo})`,
    );

    // Notifica administradores
    await this.notificarEscalacaoMaxima(solicitacao, regra);

    // Emite evento crítico
    this.eventEmitter.emit('aprovacao.escalacao.maxima', {
      solicitacao,
      regra,
      timestamp: new Date(),
    });
  }

  /**
   * Busca regra de escalação aplicável à solicitação
   */
  private buscarRegraAplicavel(solicitacao: SolicitacaoAprovacao): RegraEscalacao | null {
    const regrasOrdenadas = Array.from(this.regrasEscalacao.values())
      .filter(regra => regra.ativa)
      .sort((a, b) => b.prioridade - a.prioridade);

    for (const regra of regrasOrdenadas) {
      if (this.verificarCondicoesRegra(regra, solicitacao)) {
        return regra;
      }
    }

    return null;
  }

  /**
   * Verifica se uma regra se aplica à solicitação
   */
  private verificarCondicoesRegra(
    regra: RegraEscalacao,
    solicitacao: SolicitacaoAprovacao,
  ): boolean {
    const { condicoes } = regra;

    // Verifica tipo de ação
    if (condicoes.tiposAcao && !condicoes.tiposAcao.includes(solicitacao.acao_critica?.tipo as TipoAcaoCritica)) {
      return false;
    }

    // Verifica valor
    if (solicitacao.valor_envolvido) {
      if (condicoes.valorMinimo && solicitacao.valor_envolvido < condicoes.valorMinimo) {
        return false;
      }
      if (condicoes.valorMaximo && solicitacao.valor_envolvido > condicoes.valorMaximo) {
        return false;
      }
    }

    // Verifica tempo limite
    if (condicoes.tempoLimiteHoras) {
      const tempoEspera = this.calcularTempoEspera(solicitacao.created_at);
      if (tempoEspera < condicoes.tempoLimiteHoras) {
        return false;
      }
    }

    return true;
  }

  /**
   * Busca aprovadores para escalação baseado na estratégia
   */
  private async buscarAprovadoresEscalacao(
    solicitacao: SolicitacaoAprovacao,
    regra: RegraEscalacao,
    nivel: number,
  ): Promise<Aprovador[]> {
    // Se a regra especifica aprovadores, usa eles
    if (regra.escalacao.aprovadores.length > 0) {
      return this.aprovadorRepository.find({
        where: { id: In(regra.escalacao.aprovadores) },
        relations: ['usuario'],
      });
    }

    // Busca aprovadores baseado na estratégia
    switch (regra.escalacao.estrategia) {
      case EstrategiaEscalacao.HIERARQUICA:
        return this.buscarAprovadoresHierarquicos(solicitacao, nivel);
      case EstrategiaEscalacao.COMITE:
        return this.buscarComiteAprovacao(solicitacao.acao_critica);
      default:
        return this.buscarAprovadoresGenericos(solicitacao.acao_critica);
    }
  }

  /**
   * Busca aprovadores hierárquicos
   */
  private async buscarAprovadoresHierarquicos(
    solicitacao: SolicitacaoAprovacao,
    nivel: number,
  ): Promise<Aprovador[]> {
    // Implementa lógica de busca hierárquica
    // Por exemplo, buscar superiores do solicitante
    return this.aprovadorRepository.find({
      where: {
        ativo: true,
        // Adicionar critérios hierárquicos conforme estrutura organizacional
      },
      relations: ['usuario'],
      take: 1, // Apenas um aprovador hierárquico
    });
  }

  /**
   * Busca comitê de aprovação
   */
  private async buscarComiteAprovacao(acaoCritica: AcaoCritica): Promise<Aprovador[]> {
    // Implementa lógica de busca de comitê baseado no tipo de ação
    return this.aprovadorRepository.find({
      where: {
        ativo: true,
        // Adicionar critérios de comitê conforme tipo de ação
      },
      relations: ['usuario'],
      take: 3, // Comitê de 3 membros
    });
  }

  /**
   * Busca aprovadores genéricos
   */
  private async buscarAprovadoresGenericos(acaoCritica: AcaoCritica): Promise<Aprovador[]> {
    return this.aprovadorRepository.find({
      where: {
        ativo: true,
        // Adicionar critérios baseados no tipo de ação
      },
      relations: ['usuario'],
      take: 1,
    });
  }

  /**
   * Calcula tempo de espera em horas
   */
  private calcularTempoEspera(dataInicio: Date): number {
    const agora = new Date();
    const diferenca = agora.getTime() - dataInicio.getTime();
    return diferenca / (1000 * 60 * 60); // Converte para horas
  }

  /**
   * Calcula novo prazo baseado na estratégia
   */
  private calcularNovoPrazo(
    prazoOriginal: Date,
    estrategia: EstrategiaEscalacao,
  ): Date | undefined {
    const agora = new Date();
    
    // Se o prazo já passou, define novo prazo
    if (prazoOriginal <= agora) {
      const novoPrazo = new Date(agora);
      
      switch (estrategia) {
        case EstrategiaEscalacao.HIERARQUICA:
          novoPrazo.setHours(novoPrazo.getHours() + 24); // 24 horas
          break;
        case EstrategiaEscalacao.COMITE:
          novoPrazo.setHours(novoPrazo.getHours() + 48); // 48 horas
          break;
        case EstrategiaEscalacao.AUTOMATICA:
          novoPrazo.setHours(novoPrazo.getHours() + 1); // 1 hora
          break;
        default:
          novoPrazo.setHours(novoPrazo.getHours() + 12); // 12 horas
      }
      
      return novoPrazo;
    }
    
    return undefined;
  }

  /**
   * Calcula nível atual de escalação
   */
  private async calcularNivelEscalacao(solicitacaoId: string): Promise<number> {
    const escalacoes = await this.historicoRepository.count({
      where: {
        solicitacao_aprovacao: { id: solicitacaoId },
        acao: AcaoAprovacao.ESCALAR,
      },
    });
    
    return escalacoes;
  }

  /**
   * Conta tentativas de notificação
   */
  private async contarTentativasNotificacao(solicitacaoId: string): Promise<number> {
    // Implementar contagem baseada em logs de notificação
    return 0;
  }

  /**
   * Busca última escalação
   */
  private async buscarUltimaEscalacao(solicitacaoId: string): Promise<HistoricoAprovacao | null> {
    return this.historicoRepository.findOne({
      where: {
        solicitacao_aprovacao: { id: solicitacaoId },
        acao: AcaoAprovacao.ESCALAR,
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Verifica se foi escalada recentemente
   */
  private foiEscaladaRecentemente(ultimaEscalacao: HistoricoAprovacao): boolean {
    const agora = new Date();
    const diferenca = agora.getTime() - ultimaEscalacao.created_at.getTime();
    const horasDesdeUltimaEscalacao = diferenca / (1000 * 60 * 60);
    
    return horasDesdeUltimaEscalacao < 2; // Menos de 2 horas
  }

  /**
   * Registra escalação no histórico
   */
  private async registrarEscalacaoHistorico(dados: DadosEscalacao): Promise<void> {
    const historico = this.historicoRepository.create({
      solicitacao_aprovacao: { id: dados.solicitacaoId },
      aprovador: dados.aprovadorOriginalId ? { id: dados.aprovadorOriginalId } : null,
      acao: AcaoAprovacao.ESCALAR,
      observacoes: dados.motivo,
      metadados: dados.metadados,
    });
    
    await this.historicoRepository.save(historico);
  }

  /**
   * Atualiza prazo da solicitação
   */
  private async atualizarPrazoSolicitacao(solicitacaoId: string, novoPrazo: Date): Promise<void> {
    await this.solicitacaoRepository.update(
      { id: solicitacaoId },
      { data_expiracao: novoPrazo },
    );
  }

  /**
   * Notifica sobre escalação
   */
  private async notificarEscalacao(dados: DadosEscalacao): Promise<void> {
    try {
      // Notifica novos aprovadores
      await this.notificacaoService.notificarNovaSolicitacao(
        dados.solicitacaoId,
        dados.aprovadoresEscalacao,
        { urgente: true },
      );
      
      // Notifica aprovador original se configurado
      if (dados.aprovadorOriginalId) {
        // Implementar notificação para aprovador original
      }
    } catch (erro) {
      this.logger.error('Erro ao notificar escalação:', erro.stack);
    }
  }

  /**
   * Notifica sobre prazo vencendo
   */
  private async notificarPrazoVencendo(solicitacao: SolicitacaoAprovacao): Promise<void> {
    try {
      await this.notificacaoService.notificarPrazoVencendo(solicitacao.id);
    } catch (erro) {
      this.logger.error('Erro ao notificar prazo vencendo:', erro.stack);
    }
  }

  /**
   * Notifica escalação máxima
   */
  private async notificarEscalacaoMaxima(
    solicitacao: SolicitacaoAprovacao,
    regra: RegraEscalacao,
  ): Promise<void> {
    // Implementar notificação para administradores
    this.logger.error(
      `ESCALAÇÃO MÁXIMA ATINGIDA - Solicitação: ${solicitacao.id}, Regra: ${regra.nome}`,
    );
  }

  /**
   * Valida aprovadores de escalação
   */
  private async validarAprovadoresEscalacao(
    aprovadoresIds: string[],
    solicitacao: SolicitacaoAprovacao,
  ): Promise<void> {
    if (!aprovadoresIds.length) {
      throw new Error('Pelo menos um aprovador deve ser especificado para escalação');
    }
    
    const aprovadores = await this.aprovadorRepository.find({
      where: { id: In(aprovadoresIds), ativo: true },
    });
    
    if (aprovadores.length !== aprovadoresIds.length) {
      throw new Error('Um ou mais aprovadores especificados são inválidos ou inativos');
    }
  }

  /**
   * Valida regra de escalação
   */
  private validarRegraEscalacao(regra: RegraEscalacao): void {
    if (!regra.id || !regra.nome) {
      throw new Error('ID e nome da regra são obrigatórios');
    }
    
    if (!regra.escalacao.estrategia) {
      throw new Error('Estratégia de escalação é obrigatória');
    }
    
    if (regra.escalacao.tempoEsperaHoras < 0) {
      throw new Error('Tempo de espera deve ser positivo');
    }
    
    if (regra.escalacao.nivelMaximo < 1) {
      throw new Error('Nível máximo deve ser pelo menos 1');
    }
  }

  /**
   * Configura escalação automática
   */
  async configurarEscalacao(configuracao: any, usuario: any): Promise<any> {
    try {
      this.logger.log(`Configurando escalação automática para usuário ${usuario.id}`);
      
      // Valida configuração
      if (!configuracao.nome || !configuracao.estrategia) {
        throw new Error('Nome e estratégia são obrigatórios para configuração de escalação');
      }
      
      // Cria regra de escalação baseada na configuração
      const regra: RegraEscalacao = {
        id: configuracao.id || `escalacao-${Date.now()}`,
        nome: configuracao.nome,
        condicoes: {
          tiposAcao: configuracao.tiposAcao || [],
          valorMinimo: configuracao.valorMinimo,
          valorMaximo: configuracao.valorMaximo,
          tempoLimiteHoras: configuracao.tempoLimiteHoras || 24,
          departamentos: configuracao.departamentos || [],
          cargos: configuracao.cargos || [],
        },
        escalacao: {
          estrategia: configuracao.estrategia,
          aprovadores: configuracao.aprovadores || [],
          tempoEsperaHoras: configuracao.tempoEsperaHoras || 24,
          nivelMaximo: configuracao.nivelMaximo || 3,
          notificacoes: {
            antecedenciaHoras: configuracao.antecedenciaHoras || [4, 2],
            canais: configuracao.canais || ['email', 'push'],
          },
        },
        ativa: configuracao.ativa !== false,
        prioridade: configuracao.prioridade || 1,
      };
      
      // Salva a regra
      await this.configurarRegraEscalacao(regra);
      
      return {
        id: regra.id,
        nome: regra.nome,
        ativa: regra.ativa,
        configuracao: regra,
        message: 'Configuração de escalação salva com sucesso',
      };
    } catch (erro) {
      this.logger.error('Erro ao configurar escalação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Obtém métricas de escalação
   */
  async obterMetricasEscalacao(periodo: { data_inicio: Date; data_fim: Date }): Promise<any> {
    try {
      const { data_inicio, data_fim } = periodo;
      
      // Busca escalações no período
      const escalacoes = await this.historicoRepository.find({
        where: {
          acao: AcaoAprovacao.ESCALAR,
          created_at: LessThan(data_fim),
        },
        relations: ['solicitacao_aprovacao'],
      });
      
      const totalEscalacoes = escalacoes.length;
      const escalacoesPorTipo = {};
      const escalacoesPorNivel = {};
      
      escalacoes.forEach(escalacao => {
        const tipo = escalacao.solicitacao_aprovacao?.acao_critica_id || 'desconhecido';
        escalacoesPorTipo[tipo] = (escalacoesPorTipo[tipo] || 0) + 1;
        
        const nivel = escalacao.metadados?.nivel || 1;
        escalacoesPorNivel[nivel] = (escalacoesPorNivel[nivel] || 0) + 1;
      });
      
      return {
        periodo: { data_inicio, data_fim },
        total_escalacoes: totalEscalacoes,
        escalacoes_por_tipo: escalacoesPorTipo,
        escalacoes_por_nivel: escalacoesPorNivel,
        taxa_escalacao: totalEscalacoes > 0 ? (totalEscalacoes / 100) : 0,
        tempo_medio_escalacao: this.calcularTempoMedioEscalacao(escalacoes),
      };
    } catch (erro) {
      this.logger.error('Erro ao obter métricas de escalação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Lista configurações de escalação
   */
  async listarConfiguracoes(filtros: { acaoCriticaId?: string; ativo?: boolean } = {}): Promise<any[]> {
    try {
      const { acaoCriticaId, ativo } = filtros;
      
      // Busca configurações de escalação baseadas nos filtros
      const configuracoes = Array.from(this.regrasEscalacao.values())
        .filter(regra => {
          if (ativo !== undefined && regra.ativa !== ativo) {
            return false;
          }
          
          if (acaoCriticaId && regra.condicoes.tiposAcao) {
            // Verifica se a ação crítica está nas condições da regra
            return regra.condicoes.tiposAcao.some(tipo => tipo === acaoCriticaId);
          }
          
          return true;
        })
        .map(regra => ({
          id: regra.id,
          nome: regra.nome,
          ativa: regra.ativa,
          prioridade: regra.prioridade,
          condicoes: regra.condicoes,
          escalacao: regra.escalacao,
        }));
      
      return configuracoes;
    } catch (erro) {
      this.logger.error('Erro ao listar configurações de escalação:', erro.stack);
      throw erro;
    }
  }

  /**
   * Persiste regra de escalação no banco
   */
  private async persistirRegraEscalacao(regra: RegraEscalacao): Promise<void> {
    // Implementar persistência conforme modelo de dados
    // Por exemplo, criar tabela de regras de escalação
  }

  /**
   * Inicializa regras de escalação padrão
   */
  private inicializarRegrasEscalacao(): void {
    // Regra para ações críticas de alto valor
    this.regrasEscalacao.set('critica-alto-valor', {
      id: 'critica-alto-valor',
      nome: 'Escalação para Ações Críticas de Alto Valor',
      condicoes: {
        tiposAcao: [TipoAcaoCritica.EXCLUSAO_BENEFICIARIO, TipoAcaoCritica.CONFIGURACAO_SISTEMA],
        valorMinimo: 50000,
        tempoLimiteHoras: 4,
      },
      escalacao: {
        estrategia: EstrategiaEscalacao.HIERARQUICA,
        aprovadores: [],
        tempoEsperaHoras: 4,
        nivelMaximo: 3,
        notificacoes: {
          antecedenciaHoras: [2, 1],
          canais: ['email', 'sms', 'push'],
        },
      },
      ativa: true,
      prioridade: 10,
    });

    // Regra para aprovações gerais
    this.regrasEscalacao.set('geral', {
      id: 'geral',
      nome: 'Escalação Geral',
      condicoes: {
        tempoLimiteHoras: 24,
      },
      escalacao: {
        estrategia: EstrategiaEscalacao.HIERARQUICA,
        aprovadores: [],
        tempoEsperaHoras: 24,
        nivelMaximo: 2,
        notificacoes: {
          antecedenciaHoras: [4, 2],
          canais: ['email', 'push'],
        },
      },
      ativa: true,
      prioridade: 1,
    });
  }

  /**
   * Calcula tempo médio de escalação
   */
  private calcularTempoMedioEscalacao(escalacoes: any[]): number {
    if (escalacoes.length === 0) return 0;
    
    const tempos = escalacoes
      .filter(e => e.metadados?.tempoEspera)
      .map(e => e.metadados.tempoEspera);
    
    if (tempos.length === 0) return 0;
    
    const soma = tempos.reduce((acc, tempo) => acc + tempo, 0);
    return soma / tempos.length;
  }

  /**
   * Inicializa configurações padrão
   */
  private inicializarConfiguracoes(): void {
    this.configuracoesPadrao.set('default', {
      habilitada: true,
      tempoLimiteHoras: 24,
      nivelMaximo: 3,
      estrategia: EstrategiaEscalacao.HIERARQUICA,
      notificarOriginal: true,
      criarNovaAprovacao: false,
      manterHistorico: true,
    });
  }
}