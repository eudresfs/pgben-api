import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificacaoSistema,
  StatusNotificacaoProcessamento,
  TipoNotificacao,
} from '../entities/notification.entity';

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

    notificacao.status = StatusNotificacaoProcessamento.LIDA;
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

    notificacao.status = StatusNotificacaoProcessamento.ARQUIVADA;

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
    const notificacao = this.notificacaoRepository.create({
      ...dados,
      status: StatusNotificacaoProcessamento.NAO_LIDA,
    });

    return this.notificacaoRepository.save(notificacao);
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
    const entidadeRelacionadaId = dados.entidade_relacionada_id || 
      (dados.dados && dados.dados.historico_id) || 
      (dados.dados && dados.dados.solicitacao_id);
    
    const entidadeTipo = dados.entidade_tipo || 
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
}
