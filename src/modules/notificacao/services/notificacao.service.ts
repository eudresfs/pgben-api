import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificacaoSistema,
  StatusNotificacaoProcessamento,
  TipoNotificacao,
} from '../../../entities/notification.entity';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_CREATED } from '../events/notification.events';
import { NotificationCreatedEvent } from '../events/notification-created.event';

/**
 * Serviço de Notificações
 *
 * Responsável pela lógica de negócio relacionada às notificações
 * enviadas aos usuários do sistema
 */
@Injectable()
export class NotificacaoService {
  constructor(
    @InjectRepository(NotificacaoSistema)
    private notificacaoRepository: Repository<NotificacaoSistema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Lista todas as notificações de um usuário com paginação e filtros
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: StatusNotificacaoProcessamento;
    userId: string;
  }) {
    const { page = 1, limit = 10, status, userId } = options;

    const queryBuilder = this.notificacaoRepository
      .createQueryBuilder('notificacao')
      .where('notificacao.destinatario_id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('notificacao.status = :status', { status });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação padrão (mais recentes primeiro)
    queryBuilder.orderBy('notificacao.created_at', 'DESC');

    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma notificação pelo ID
   */
  async findById(id: string, userId: string) {
    const notificacao = await this.notificacaoRepository.findOne({
      where: { id },
    });

    if (!notificacao) {
      throw new NotFoundException(`Notificação com ID ${id} não encontrada`);
    }

    // Verificar se a notificação pertence ao usuário
    if (notificacao.destinatario_id !== userId) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta notificação',
      );
    }

    return notificacao;
  }

  /**
   * Marca uma notificação como lida
   */
  async marcarComoLida(id: string, userId: string) {
    const notificacao = await this.findById(id, userId);

    if (notificacao.status === StatusNotificacaoProcessamento.LIDA) {
      return notificacao; // Já está marcada como lida
    }

    // Normalizar o status antes de atualizar
    const statusNormalizado = normalizeEnumFields({
      status: StatusNotificacaoProcessamento.LIDA,
    }).status;

    notificacao.status = statusNormalizado;
    notificacao.data_leitura = new Date();

    return this.notificacaoRepository.save(notificacao);
  }

  /**
   * Marca uma notificação como arquivada
   */
  async arquivar(id: string, userId: string) {
    const notificacao = await this.findById(id, userId);

    if (notificacao.status === StatusNotificacaoProcessamento.ARQUIVADA) {
      return notificacao; // Já está arquivada
    }

    // Normalizar o status antes de atualizar
    const statusNormalizado = normalizeEnumFields({
      status: StatusNotificacaoProcessamento.ARQUIVADA,
    }).status;

    notificacao.status = statusNormalizado;

    return this.notificacaoRepository.save(notificacao);
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  async marcarTodasComoLidas(userId: string) {
    const agora = new Date();

    await this.notificacaoRepository.update(
      {
        destinatario_id: userId,
        status: StatusNotificacaoProcessamento.NAO_LIDA,
      },
      {
        status: StatusNotificacaoProcessamento.LIDA,
        data_leitura: agora,
      },
    );

    return { message: 'Todas as notificações foram marcadas como lidas' };
  }

  /**
   * Obtém o contador de notificações não lidas do usuário
   */
  async contadorNaoLidas(userId: string) {
    const count = await this.notificacaoRepository.count({
      where: {
        destinatario_id: userId,
        status: StatusNotificacaoProcessamento.NAO_LIDA,
      },
    });

    return { count };
  }

  /**
   * Cria uma nova notificação
   * Este método é utilizado internamente por outros serviços
   */
  async criar(dados: {
    destinatario_id: string;
    tipo: TipoNotificacao;
    titulo: string;
    conteudo: string;
    entidade_relacionada_id?: string;
    entidade_tipo?: string;
    link?: string;
  }) {
    // Normalizar campos de enum antes de criar a notificação
    const dadosNormalizados = normalizeEnumFields({
      ...dados,
      status: StatusNotificacaoProcessamento.NAO_LIDA,
    });

    const notificacao = this.notificacaoRepository.create(dadosNormalizados);

    const saved = await this.notificacaoRepository.save(notificacao);

    // Emite evento de criação para tratamento assíncrono (ex.: SSE, e-mail, etc.)
    this.eventEmitter.emit(
      NOTIFICATION_CREATED,
      new NotificationCreatedEvent(saved),
    );

    return saved;
  }

  /**
   * Cria uma notificação de sistema
   */
  async criarNotificacaoSistema(dados: {
    destinatario_id: string;
    titulo: string;
    conteudo: string;
    link?: string;
  }) {
    return this.criar({
      ...dados,
      tipo: TipoNotificacao.SISTEMA,
    });
  }

  /**
   * Cria uma notificação de solicitação
   */
  async criarNotificacaoSolicitacao(dados: {
    destinatario_id: string;
    titulo: string;
    conteudo: string;
    solicitacao_id: string;
    link?: string;
  }) {
    return this.criar({
      destinatario_id: dados.destinatario_id,
      tipo: TipoNotificacao.SOLICITACAO,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      entidade_relacionada_id: dados.solicitacao_id,
      entidade_tipo: 'solicitacao',
      link: dados.link,
    });
  }

  /**
   * Cria uma notificação de pendência
   */
  async criarNotificacaoPendencia(dados: {
    destinatario_id: string;
    titulo: string;
    conteudo: string;
    solicitacao_id: string;
    link?: string;
  }) {
    return this.criar({
      destinatario_id: dados.destinatario_id,
      tipo: TipoNotificacao.PENDENCIA,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      entidade_relacionada_id: dados.solicitacao_id,
      entidade_tipo: 'solicitacao',
      link: dados.link,
    });
  }

  /**
   * Cria uma notificação de aprovação
   */
  async criarNotificacaoAprovacao(dados: {
    destinatario_id: string;
    titulo: string;
    conteudo: string;
    solicitacao_id: string;
    link?: string;
  }) {
    return this.criar({
      destinatario_id: dados.destinatario_id,
      tipo: TipoNotificacao.APROVACAO,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      entidade_relacionada_id: dados.solicitacao_id,
      entidade_tipo: 'solicitacao',
      link: dados.link,
    });
  }

  /**
   * Cria uma notificação de liberação
   */
  async criarNotificacaoLiberacao(dados: {
    destinatario_id: string;
    titulo: string;
    conteudo: string;
    solicitacao_id: string;
    link?: string;
  }) {
    return this.criar({
      destinatario_id: dados.destinatario_id,
      tipo: TipoNotificacao.LIBERACAO,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      entidade_relacionada_id: dados.solicitacao_id,
      entidade_tipo: 'solicitacao',
      link: dados.link,
    });
  }

  /**
   * Cria uma notificação de alerta
   */
  async criarNotificacaoAlerta(dados: {
    destinatario_id: string;
    titulo: string;
    conteudo: string;
    entidade_relacionada_id?: string;
    entidade_tipo?: string;
    link?: string;
  }) {
    return this.criar({
      ...dados,
      tipo: TipoNotificacao.ALERTA,
    });
  }

  /**
   * Envia uma notificação com base no tipo fornecido
   * @param dados Dados da notificação a ser enviada
   */
  async enviarNotificacao(dados: {
    destinatario_id: string;
    tipo: TipoNotificacao | string;
    titulo: string;
    conteudo: string;
    dados?: Record<string, any>;
    entidade_relacionada_id?: string;
    entidade_tipo?: string;
    link?: string;
  }) {
    // Extrair entidade relacionada dos dados, se fornecida
    const entidadeRelacionadaId =
      dados.entidade_relacionada_id ||
      (dados.dados && dados.dados.historico_id) ||
      (dados.dados && dados.dados.solicitacao_id);

    const entidadeTipo =
      dados.entidade_tipo ||
      (dados.dados && dados.dados.historico_id ? 'historico' : undefined) ||
      (dados.dados && dados.dados.solicitacao_id ? 'solicitacao' : undefined);

    // Determinar o tipo de notificação
    let tipoNotificacao: TipoNotificacao;
    if (typeof dados.tipo === 'string') {
      switch (dados.tipo.toUpperCase()) {
        case 'SISTEMA':
          tipoNotificacao = TipoNotificacao.SISTEMA;
          break;
        case 'SOLICITACAO':
          tipoNotificacao = TipoNotificacao.SOLICITACAO;
          break;
        case 'PENDENCIA':
          tipoNotificacao = TipoNotificacao.PENDENCIA;
          break;
        case 'APROVACAO':
          tipoNotificacao = TipoNotificacao.APROVACAO;
          break;
        case 'LIBERACAO':
          tipoNotificacao = TipoNotificacao.LIBERACAO;
          break;
        case 'ALERTA':
          tipoNotificacao = TipoNotificacao.ALERTA;
          break;
        case 'CONVERSAO_PAPEL':
          tipoNotificacao = TipoNotificacao.ALERTA;
          break;
        default:
          tipoNotificacao = TipoNotificacao.SISTEMA;
      }
    } else {
      tipoNotificacao = dados.tipo;
    }

    // Criar a notificação usando o método genérico
    return this.criar({
      destinatario_id: dados.destinatario_id,
      tipo: tipoNotificacao,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      entidade_relacionada_id: entidadeRelacionadaId,
      entidade_tipo: entidadeTipo,
      link: dados.link,
    });
  }

  /**
   * Cria notificação e envia via SSE em tempo real
   * @param dados Dados da notificação
   * @returns Notificação criada
   */
  async criarEBroadcast(dados: {
    destinatario_id: string;
    tipo: TipoNotificacao | string;
    titulo: string;
    conteudo: string;
    dados?: Record<string, any>;
    entidade_relacionada_id?: string;
    entidade_tipo?: string;
    link?: string;
    prioridade?: 'low' | 'medium' | 'high';
  }): Promise<NotificacaoSistema> {
    // Cria a notificação no banco de dados
    const notificacao = await this.criar({
      destinatario_id: dados.destinatario_id,
      tipo: dados.tipo as TipoNotificacao,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      entidade_relacionada_id: dados.entidade_relacionada_id,
      entidade_tipo: dados.entidade_tipo,
      link: dados.link,
    });

    // Retorna a notificação; entrega em tempo real será tratada por listeners
    return notificacao;
  }

  /**
   * Envia notificação em massa via SSE
   * @param userIds Lista de IDs dos usuários
   * @param dados Dados da notificação
   * @returns Lista de notificações criadas
   */
  async broadcastParaUsuarios(
    userIds: string[],
    dados: {
      tipo: TipoNotificacao | string;
      titulo: string;
      conteudo: string;
      dados?: Record<string, any>;
      entidade_relacionada_id?: string;
      entidade_tipo?: string;
      link?: string;
      prioridade?: 'low' | 'medium' | 'high';
    },
  ): Promise<NotificacaoSistema[]> {
    // Cria notificações no banco para todos os usuários
    const notificacoes = await Promise.all(
      userIds.map((userId) =>
        this.criar({
          destinatario_id: userId,
          tipo: dados.tipo as TipoNotificacao,
          titulo: dados.titulo,
          conteudo: dados.conteudo,
          entidade_relacionada_id: dados.entidade_relacionada_id,
          entidade_tipo: dados.entidade_tipo,
          link: dados.link,
        }),
      ),
    );

    // A entrega será tratada pelos listeners registrados
    return notificacoes;
  }

  /**
   * Envia notificação broadcast para todos os usuários conectados
   * @param dados Dados da notificação
   */
  async broadcastGeral(): Promise<void> {
    // No-op
  }
}
