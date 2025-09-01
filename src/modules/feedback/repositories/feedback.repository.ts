import { Injectable } from '@nestjs/common';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { TipoFeedbackEnum, PrioridadeFeedbackEnum } from '../enums';

/**
 * Interface para filtros de busca de feedbacks
 */
export interface FeedbackFilters {
  usuario_id?: string;
  tipo?: TipoFeedbackEnum;
  prioridade?: PrioridadeFeedbackEnum;
  lido?: boolean;
  resolvido?: boolean;
  data_inicio?: Date;
  data_fim?: Date;
  pagina_origem?: string;
  tag_ids?: string[];
  busca_texto?: string;
}

/**
 * Interface para opções de paginação
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Repository customizado para a entidade Feedback
 */
@Injectable()
export class FeedbackRepository extends Repository<Feedback> {
  constructor(private dataSource: DataSource) {
    super(Feedback, dataSource.createEntityManager());
  }

  /**
   * Busca feedbacks com filtros e paginação
   */
  async findWithFilters(
    filters: FeedbackFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = pagination;

    const queryBuilder = this.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.anexos', 'anexos')
      .leftJoinAndSelect('feedback.tags', 'tags')
      .leftJoinAndSelect('feedback.usuario', 'usuario');

    this.applyFilters(queryBuilder, filters);

    // Aplicar ordenação
    queryBuilder.orderBy(`feedback.${orderBy}`, orderDirection);

    // Aplicar paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [feedbacks, total] = await queryBuilder.getManyAndCount();

    return { feedbacks, total };
  }

  /**
   * Busca um feedback por ID com todas as relações
   */
  async findByIdWithRelations(id: string): Promise<Feedback | null> {
    return this.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.anexos', 'anexos')
      .leftJoinAndSelect('feedback.tags', 'tags')
      .leftJoinAndSelect('feedback.usuario', 'usuario')
      .where('feedback.id = :id', { id })
      .getOne();
  }

  /**
   * Busca feedbacks por usuário
   */
  async findByUsuario(
    usuario_id: string,
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    return this.findWithFilters({ usuario_id }, pagination);
  }

  /**
   * Busca feedbacks não lidos
   */
  async findNaoLidos(
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    return this.findWithFilters({ lido: false }, pagination);
  }

  /**
   * Busca feedbacks não resolvidos
   */
  async findNaoResolvidos(
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    return this.findWithFilters({ resolvido: false }, pagination);
  }

  /**
   * Busca feedbacks por prioridade
   */
  async findByPrioridade(
    prioridade: PrioridadeFeedbackEnum,
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    return this.findWithFilters({ prioridade }, pagination);
  }

  /**
   * Busca feedbacks por tipo
   */
  async findByTipo(
    tipo: TipoFeedbackEnum,
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    return this.findWithFilters({ tipo }, pagination);
  }

  /**
   * Busca feedbacks por tags
   */
  async findByTags(
    tag_ids: string[],
    pagination: PaginationOptions = {}
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    return this.findWithFilters({ tag_ids }, pagination);
  }

  /**
   * Marca um feedback como lido
   */
  async marcarComoLido(id: string): Promise<void> {
    await this.update(id, { lido: true });
  }

  /**
   * Marca um feedback como resolvido
   */
  async marcarComoResolvido(
    id: string,
    resposta: string,
    respondido_por: string
  ): Promise<void> {
    await this.update(id, {
      resolvido: true,
      resposta,
      respondido_por,
      data_resposta: new Date()
    });
  }

  /**
   * Obtém estatísticas de feedbacks
   */
  async getEstatisticas(): Promise<{
    total: number;
    por_tipo: Record<TipoFeedbackEnum, number>;
    por_prioridade: Record<PrioridadeFeedbackEnum, number>;
    nao_lidos: number;
    nao_resolvidos: number;
    resolvidos_hoje: number;
  }> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [total, naoLidos, naoResolvidos, resolvidosHoje] = await Promise.all([
      this.count(),
      this.count({ where: { lido: false } }),
      this.count({ where: { resolvido: false } }),
      this.count({
        where: {
          resolvido: true,
          data_resposta: {
            gte: hoje,
            lt: amanha
          } as any
        }
      })
    ]);

    // Contar por tipo
    const porTipo = {} as Record<TipoFeedbackEnum, number>;
    for (const tipo of Object.values(TipoFeedbackEnum)) {
      porTipo[tipo] = await this.count({ where: { tipo } });
    }

    // Contar por prioridade
    const porPrioridade = {} as Record<PrioridadeFeedbackEnum, number>;
    for (const prioridade of Object.values(PrioridadeFeedbackEnum)) {
      porPrioridade[prioridade] = await this.count({ where: { prioridade } });
    }

    return {
      total,
      por_tipo: porTipo,
      por_prioridade: porPrioridade,
      nao_lidos: naoLidos,
      nao_resolvidos: naoResolvidos,
      resolvidos_hoje: resolvidosHoje
    };
  }

  /**
   * Aplica filtros ao query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Feedback>,
    filters: FeedbackFilters
  ): void {
    const {
      usuario_id,
      tipo,
      prioridade,
      lido,
      resolvido,
      data_inicio,
      data_fim,
      pagina_origem,
      tag_ids,
      busca_texto
    } = filters;

    if (usuario_id) {
      queryBuilder.andWhere('feedback.usuario_id = :usuario_id', { usuario_id });
    }

    if (tipo) {
      queryBuilder.andWhere('feedback.tipo = :tipo', { tipo });
    }

    if (prioridade) {
      queryBuilder.andWhere('feedback.prioridade = :prioridade', { prioridade });
    }

    if (typeof lido === 'boolean') {
      queryBuilder.andWhere('feedback.lido = :lido', { lido });
    }

    if (typeof resolvido === 'boolean') {
      queryBuilder.andWhere('feedback.resolvido = :resolvido', { resolvido });
    }

    if (data_inicio) {
      queryBuilder.andWhere('feedback.created_at >= :data_inicio', { data_inicio });
    }

    if (data_fim) {
      queryBuilder.andWhere('feedback.created_at <= :data_fim', { data_fim });
    }

    if (pagina_origem) {
      queryBuilder.andWhere('feedback.pagina_origem ILIKE :pagina_origem', {
        pagina_origem: `%${pagina_origem}%`
      });
    }

    if (tag_ids && tag_ids.length > 0) {
      queryBuilder.andWhere('tags.id IN (:...tag_ids)', { tag_ids });
    }

    if (busca_texto) {
      queryBuilder.andWhere(
        '(feedback.titulo ILIKE :busca OR feedback.descricao ILIKE :busca)',
        { busca: `%${busca_texto}%` }
      );
    }
  }
}