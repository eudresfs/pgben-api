import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TipoNotificacao } from '../../../entities/notification.entity';

/**
 * Enum para canais de notificação
 */
export enum CanalNotificacao {
  SSE = 'sse',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

/**
 * Enum para frequência de agrupamento
 */
export enum FrequenciaAgrupamento {
  IMEDIATO = 'imediato',
  CADA_15_MIN = '15min',
  CADA_30_MIN = '30min',
  CADA_HORA = '1hora',
  CADA_2_HORAS = '2horas',
  DIARIO = 'diario',
}

/**
 * Interface para preferências de notificação por tipo
 */
interface PreferenciaTipo {
  tipo: TipoNotificacao;
  ativo: boolean;
  canais: CanalNotificacao[];
  prioridade_minima: 'low' | 'medium' | 'high';
  horario_silencioso: {
    ativo: boolean;
    inicio: string; // HH:mm
    fim: string; // HH:mm
  };
  agrupamento: {
    ativo: boolean;
    frequencia: FrequenciaAgrupamento;
    maximo_por_grupo: number;
  };
}

/**
 * Interface para preferências do usuário
 */
export interface PreferenciasUsuario {
  usuario_id: string;
  ativo: boolean;
  idioma: string;
  timezone: string;
  tipos: PreferenciaTipo[];
  configuracoes_globais: {
    pausar_todas: boolean;
    pausar_ate: Date | null;
    limite_diario: number;
    som_ativo: boolean;
    vibrar_ativo: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface para notificação agrupada
 */
interface NotificacaoAgrupada {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacao;
  quantidade: number;
  primeira_notificacao: Date;
  ultima_notificacao: Date;
  notificacoes_ids: string[];
  titulo_agrupado: string;
  conteudo_agrupado: string;
  prioridade_maxima: 'low' | 'medium' | 'high';
  status: 'pendente' | 'enviado' | 'cancelado';
  data_envio_programada: Date;
  created_at: Date;
}

/**
 * Serviço de Preferências de Notificação
 *
 * Implementa a Fase 5 do plano de integração SSE:
 * - Agrupamento de notificações
 * - Preferências de usuário
 * - Otimização de performance
 */
@Injectable()
export class NotificacaoPreferenciasService {
  private readonly logger = new Logger(NotificacaoPreferenciasService.name);

  // Cache em memória para preferências (otimização)
  private readonly cachePreferencias = new Map<string, PreferenciasUsuario>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutos

  // Fila de notificações para agrupamento
  private readonly filaAgrupamento = new Map<string, NotificacaoAgrupada>();

  constructor(
    // TODO: Criar entidade PreferenciasNotificacao quando necessário
    // @InjectRepository(PreferenciasNotificacao)
    // private preferenciasRepository: Repository<PreferenciasNotificacao>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Inicializar processamento de agrupamento
    this.iniciarProcessamentoAgrupamento();
  }

  /**
   * Obtém as preferências de um usuário
   * Implementa cache para otimização de performance
   */
  async obterPreferencias(usuarioId: string): Promise<PreferenciasUsuario> {
    // Verificar cache primeiro
    const cached = this.cachePreferencias.get(usuarioId);
    if (cached && this.isCacheValido(cached.updated_at)) {
      return cached;
    }

    // TODO: Buscar do banco de dados quando entidade estiver criada
    // const preferencias = await this.preferenciasRepository.findOne({
    //   where: { usuario_id: usuarioId },
    // });

    // Por enquanto, retornar preferências padrão
    const preferenciasDefault = this.criarPreferenciasDefault(usuarioId);

    // Adicionar ao cache
    this.cachePreferencias.set(usuarioId, preferenciasDefault);

    return preferenciasDefault;
  }

  /**
   * Atualiza as preferências de um usuário
   */
  async atualizarPreferencias(
    usuarioId: string,
    novasPreferencias: Partial<PreferenciasUsuario>,
  ): Promise<PreferenciasUsuario> {
    const preferenciasAtuais = await this.obterPreferencias(usuarioId);

    const preferenciasAtualizadas: PreferenciasUsuario = {
      ...preferenciasAtuais,
      ...novasPreferencias,
      usuario_id: usuarioId,
      updated_at: new Date(),
    };

    // TODO: Salvar no banco de dados
    // await this.preferenciasRepository.save(preferenciasAtualizadas);

    // Atualizar cache
    this.cachePreferencias.set(usuarioId, preferenciasAtualizadas);

    this.logger.log(`Preferências atualizadas para usuário ${usuarioId}`);

    return preferenciasAtualizadas;
  }

  /**
   * Verifica se uma notificação deve ser enviada baseada nas preferências
   */
  async deveEnviarNotificacao(
    usuarioId: string,
    tipo: TipoNotificacao,
    prioridade: 'low' | 'medium' | 'high',
    canal: CanalNotificacao,
  ): Promise<boolean> {
    const preferencias = await this.obterPreferencias(usuarioId);

    // Verificar se notificações estão ativas globalmente
    if (!preferencias.ativo) {
      return false;
    }

    // Verificar se todas as notificações estão pausadas
    if (preferencias.configuracoes_globais.pausar_todas) {
      const agora = new Date();
      if (
        !preferencias.configuracoes_globais.pausar_ate ||
        agora < preferencias.configuracoes_globais.pausar_ate
      ) {
        return false;
      }
    }

    // Verificar preferências específicas do tipo
    const prefTipo = preferencias.tipos.find((p) => p.tipo === tipo);
    if (!prefTipo || !prefTipo.ativo) {
      return false;
    }

    // Verificar canal
    if (!prefTipo.canais.includes(canal)) {
      return false;
    }

    // Verificar prioridade mínima
    const prioridades = { low: 1, medium: 2, high: 3 };
    if (prioridades[prioridade] < prioridades[prefTipo.prioridade_minima]) {
      return false;
    }

    // Verificar horário silencioso
    if (prefTipo.horario_silencioso.ativo) {
      const agora = new Date();
      const horaAtual = agora.getHours() * 100 + agora.getMinutes();
      const inicio = this.parseHorario(prefTipo.horario_silencioso.inicio);
      const fim = this.parseHorario(prefTipo.horario_silencioso.fim);

      if (inicio <= fim) {
        // Mesmo dia
        if (horaAtual >= inicio && horaAtual <= fim) {
          return false;
        }
      } else {
        // Atravessa meia-noite
        if (horaAtual >= inicio || horaAtual <= fim) {
          return false;
        }
      }
    }

    // Verificar limite diário
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const notificacoesHoje = await this.contarNotificacoesDia(usuarioId, hoje);
    if (notificacoesHoje >= preferencias.configuracoes_globais.limite_diario) {
      return false;
    }

    return true;
  }

  /**
   * Adiciona notificação à fila de agrupamento
   * Implementa tarefa 5.1: Agrupamento de notificações
   */
  async adicionarParaAgrupamento(
    usuarioId: string,
    tipo: TipoNotificacao,
    notificacaoId: string,
    titulo: string,
    conteudo: string,
    prioridade: 'low' | 'medium' | 'high',
  ): Promise<void> {
    const preferencias = await this.obterPreferencias(usuarioId);
    const prefTipo = preferencias.tipos.find((p) => p.tipo === tipo);

    // Se agrupamento não está ativo, enviar imediatamente
    if (!prefTipo?.agrupamento.ativo) {
      await this.enviarNotificacaoImediata(notificacaoId);
      return;
    }

    const chaveAgrupamento = `${usuarioId}-${tipo}`;
    const agora = new Date();

    let grupo = this.filaAgrupamento.get(chaveAgrupamento);

    if (!grupo) {
      // Criar novo grupo
      const proximoEnvio = this.calcularProximoEnvio(
        agora,
        prefTipo.agrupamento.frequencia,
      );

      grupo = {
        id: `grupo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        usuario_id: usuarioId,
        tipo,
        quantidade: 0,
        primeira_notificacao: agora,
        ultima_notificacao: agora,
        notificacoes_ids: [],
        titulo_agrupado: '',
        conteudo_agrupado: '',
        prioridade_maxima: prioridade,
        status: 'pendente',
        data_envio_programada: proximoEnvio,
        created_at: agora,
      };

      this.filaAgrupamento.set(chaveAgrupamento, grupo);
    }

    // Adicionar notificação ao grupo
    grupo.quantidade++;
    grupo.ultima_notificacao = agora;
    grupo.notificacoes_ids.push(notificacaoId);

    // Atualizar prioridade máxima
    const prioridades = { low: 1, medium: 2, high: 3 };
    if (prioridades[prioridade] > prioridades[grupo.prioridade_maxima]) {
      grupo.prioridade_maxima = prioridade;
    }

    // Verificar se atingiu o máximo por grupo
    if (grupo.quantidade >= prefTipo.agrupamento.maximo_por_grupo) {
      await this.enviarGrupoImediatamente(chaveAgrupamento);
    } else {
      // Atualizar conteúdo agrupado
      this.atualizarConteudoAgrupado(grupo, titulo, conteudo);
    }

    this.logger.debug(
      `Notificação ${notificacaoId} adicionada ao grupo ${chaveAgrupamento} (${grupo.quantidade}/${prefTipo.agrupamento.maximo_por_grupo})`,
    );
  }

  /**
   * Calcula o próximo horário de envio baseado na frequência
   */
  private calcularProximoEnvio(
    agora: Date,
    frequencia: FrequenciaAgrupamento,
  ): Date {
    const proximo = new Date(agora);

    switch (frequencia) {
      case FrequenciaAgrupamento.CADA_15_MIN:
        proximo.setMinutes(proximo.getMinutes() + 15);
        break;
      case FrequenciaAgrupamento.CADA_30_MIN:
        proximo.setMinutes(proximo.getMinutes() + 30);
        break;
      case FrequenciaAgrupamento.CADA_HORA:
        proximo.setHours(proximo.getHours() + 1);
        break;
      case FrequenciaAgrupamento.CADA_2_HORAS:
        proximo.setHours(proximo.getHours() + 2);
        break;
      case FrequenciaAgrupamento.DIARIO:
        proximo.setDate(proximo.getDate() + 1);
        proximo.setHours(9, 0, 0, 0); // 9h da manhã
        break;
      default:
        // IMEDIATO
        break;
    }

    return proximo;
  }

  /**
   * Atualiza o conteúdo agrupado de um grupo de notificações
   */
  private atualizarConteudoAgrupado(
    grupo: NotificacaoAgrupada,
    titulo: string,
    conteudo: string,
  ): void {
    if (grupo.quantidade === 1) {
      grupo.titulo_agrupado = titulo;
      grupo.conteudo_agrupado = conteudo;
    } else {
      grupo.titulo_agrupado = `${grupo.quantidade} notificações de ${this.getTipoLabel(grupo.tipo)}`;
      grupo.conteudo_agrupado = `Você tem ${grupo.quantidade} notificações pendentes. Clique para ver todas.`;
    }
  }

  /**
   * Obtém o label amigável para um tipo de notificação
   */
  private getTipoLabel(tipo: TipoNotificacao): string {
    const labels = {
      [TipoNotificacao.SISTEMA]: 'sistema',
      [TipoNotificacao.SOLICITACAO]: 'solicitação',
      [TipoNotificacao.PENDENCIA]: 'pendência',
      [TipoNotificacao.APROVACAO]: 'aprovação',
      [TipoNotificacao.LIBERACAO]: 'liberação',
      [TipoNotificacao.ALERTA]: 'alerta',
    };
    return labels[tipo] || 'notificação';
  }

  /**
   * Envia um grupo de notificações imediatamente
   */
  private async enviarGrupoImediatamente(
    chaveAgrupamento: string,
  ): Promise<void> {
    const grupo = this.filaAgrupamento.get(chaveAgrupamento);
    if (!grupo) return;

    await this.processarEnvioGrupo(grupo);
    this.filaAgrupamento.delete(chaveAgrupamento);
  }

  /**
   * Processa o envio de um grupo de notificações
   */
  private async processarEnvioGrupo(grupo: NotificacaoAgrupada): Promise<void> {
    try {
      // Emitir evento para envio da notificação agrupada
      this.eventEmitter.emit('notificacao.grupo.enviar', {
        grupo,
        timestamp: new Date(),
      });

      grupo.status = 'enviado';

      this.logger.log(
        `Grupo de notificações enviado: ${grupo.quantidade} notificações para usuário ${grupo.usuario_id}`,
      );
    } catch (error) {
      this.logger.error('Erro ao enviar grupo de notificações:', error);
      grupo.status = 'cancelado';
    }
  }

  /**
   * Envia notificação individual imediatamente
   */
  private async enviarNotificacaoImediata(
    notificacaoId: string,
  ): Promise<void> {
    this.eventEmitter.emit('notificacao.individual.enviar', {
      notificacaoId,
      timestamp: new Date(),
    });
  }

  /**
   * Inicializa o processamento automático de agrupamento
   */
  private iniciarProcessamentoAgrupamento(): void {
    // Verificar grupos pendentes a cada minuto
    setInterval(async () => {
      await this.processarGruposPendentes();
    }, 60 * 1000); // 1 minuto
  }

  /**
   * Processa grupos de notificações que estão prontos para envio
   */
  private async processarGruposPendentes(): Promise<void> {
    const agora = new Date();
    const gruposParaEnviar: string[] = [];

    for (const [chave, grupo] of this.filaAgrupamento.entries()) {
      if (grupo.status === 'pendente' && agora >= grupo.data_envio_programada) {
        gruposParaEnviar.push(chave);
      }
    }

    for (const chave of gruposParaEnviar) {
      await this.enviarGrupoImediatamente(chave);
    }

    if (gruposParaEnviar.length > 0) {
      this.logger.log(
        `Processados ${gruposParaEnviar.length} grupos de notificações`,
      );
    }
  }

  /**
   * Cria preferências padrão para um usuário
   */
  private criarPreferenciasDefault(usuarioId: string): PreferenciasUsuario {
    const agora = new Date();

    return {
      usuario_id: usuarioId,
      ativo: true,
      idioma: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      tipos: Object.values(TipoNotificacao).map((tipo) => ({
        tipo,
        ativo: true,
        canais: [CanalNotificacao.SSE, CanalNotificacao.EMAIL],
        prioridade_minima: 'low' as const,
        horario_silencioso: {
          ativo: false,
          inicio: '22:00',
          fim: '07:00',
        },
        agrupamento: {
          ativo: tipo !== TipoNotificacao.ALERTA, // Alertas sempre imediatos
          frequencia: FrequenciaAgrupamento.CADA_30_MIN,
          maximo_por_grupo: 5,
        },
      })),
      configuracoes_globais: {
        pausar_todas: false,
        pausar_ate: null,
        limite_diario: 50,
        som_ativo: true,
        vibrar_ativo: true,
      },
      created_at: agora,
      updated_at: agora,
    };
  }

  /**
   * Verifica se o cache ainda é válido
   */
  private isCacheValido(ultimaAtualizacao: Date): boolean {
    const agora = new Date();
    return agora.getTime() - ultimaAtualizacao.getTime() < this.cacheTimeout;
  }

  /**
   * Converte string de horário (HH:mm) para número (HHmm)
   */
  private parseHorario(horario: string): number {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 100 + minutos;
  }

  /**
   * Conta notificações enviadas em um dia específico
   */
  private async contarNotificacoesDia(
    usuarioId: string,
    data: Date,
  ): Promise<number> {
    // TODO: Implementar consulta real ao banco
    // Por enquanto, retornar 0
    return 0;
  }

  /**
   * Pausa todas as notificações de um usuário por um período
   */
  async pausarNotificacoes(
    usuarioId: string,
    duracao: number, // em minutos
  ): Promise<void> {
    const pausarAte = new Date();
    pausarAte.setMinutes(pausarAte.getMinutes() + duracao);

    await this.atualizarPreferencias(usuarioId, {
      configuracoes_globais: {
        pausar_todas: true,
        pausar_ate: pausarAte,
        limite_diario: 50,
        som_ativo: true,
        vibrar_ativo: true,
      },
    });

    this.logger.log(
      `Notificações pausadas para usuário ${usuarioId} até ${pausarAte}`,
    );
  }

  /**
   * Reativa todas as notificações de um usuário
   */
  async reativarNotificacoes(usuarioId: string): Promise<void> {
    await this.atualizarPreferencias(usuarioId, {
      configuracoes_globais: {
        pausar_todas: false,
        pausar_ate: null,
        limite_diario: 50,
        som_ativo: true,
        vibrar_ativo: true,
      },
    });

    this.logger.log(`Notificações reativadas para usuário ${usuarioId}`);
  }

  /**
   * Obtém estatísticas de agrupamento
   */
  obterEstatisticasAgrupamento(): {
    gruposAtivos: number;
    notificacoesNaFila: number;
    proximosEnvios: Array<{
      chave: string;
      dataEnvio: Date;
      quantidade: number;
    }>;
  } {
    const gruposAtivos = this.filaAgrupamento.size;
    let notificacoesNaFila = 0;
    const proximosEnvios: Array<{
      chave: string;
      dataEnvio: Date;
      quantidade: number;
    }> = [];

    for (const [chave, grupo] of this.filaAgrupamento.entries()) {
      notificacoesNaFila += grupo.quantidade;
      if (grupo.status === 'pendente') {
        proximosEnvios.push({
          chave,
          dataEnvio: grupo.data_envio_programada,
          quantidade: grupo.quantidade,
        });
      }
    }

    // Ordenar por data de envio
    proximosEnvios.sort(
      (a, b) => a.dataEnvio.getTime() - b.dataEnvio.getTime(),
    );

    return {
      gruposAtivos,
      notificacoesNaFila,
      proximosEnvios: proximosEnvios.slice(0, 10), // Primeiros 10
    };
  }

  /**
   * Limpa cache de preferências (útil para testes)
   */
  limparCache(): void {
    this.cachePreferencias.clear();
    this.logger.log('Cache de preferências limpo');
  }
}
