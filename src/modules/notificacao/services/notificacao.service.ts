import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  UnauthorizedException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacao, StatusNotificacao, TipoNotificacao } from '../entities/notificacao.entity';

/**
 * Serviço de Notificações
 * 
 * Responsável pela lógica de negócio relacionada às notificações
 * enviadas aos usuários do sistema
 */
@Injectable()
export class NotificacaoService {
  constructor(
    @InjectRepository(Notificacao)
    private notificacaoRepository: Repository<Notificacao>,
  ) {}

  /**
   * Lista todas as notificações de um usuário com paginação e filtros
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: StatusNotificacao;
    userId: string;
  }) {
    const { page = 1, limit = 10, status, userId } = options;
    
    const queryBuilder = this.notificacaoRepository.createQueryBuilder('notificacao')
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
      throw new UnauthorizedException('Você não tem permissão para acessar esta notificação');
    }
    
    return notificacao;
  }

  /**
   * Marca uma notificação como lida
   */
  async marcarComoLida(id: string, userId: string) {
    const notificacao = await this.findById(id, userId);
    
    if (notificacao.status === StatusNotificacao.LIDA) {
      return notificacao; // Já está marcada como lida
    }
    
    notificacao.status = StatusNotificacao.LIDA;
    notificacao.data_leitura = new Date();
    
    return this.notificacaoRepository.save(notificacao);
  }

  /**
   * Marca uma notificação como arquivada
   */
  async arquivar(id: string, userId: string) {
    const notificacao = await this.findById(id, userId);
    
    if (notificacao.status === StatusNotificacao.ARQUIVADA) {
      return notificacao; // Já está arquivada
    }
    
    notificacao.status = StatusNotificacao.ARQUIVADA;
    
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
        status: StatusNotificacao.NAO_LIDA 
      },
      { 
        status: StatusNotificacao.LIDA, 
        data_leitura: agora 
      }
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
        status: StatusNotificacao.NAO_LIDA
      }
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
      status: StatusNotificacao.NAO_LIDA,
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
}
