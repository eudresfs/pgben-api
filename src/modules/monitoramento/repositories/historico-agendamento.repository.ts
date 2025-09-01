import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HistoricoMonitoramento, TipoAcaoHistorico, CategoriaHistorico } from '../entities/historico-monitoramento.entity';

/**
 * Interface para filtros de consulta do histórico de agendamentos
 */
export interface HistoricoAgendamentoFilters {
  /** ID do agendamento específico */
  agendamento_id?: string;
  /** ID do cidadão/beneficiário */
  cidadao_id?: string;
  /** ID do usuário que realizou a ação */
  usuario_id?: string;
  /** Tipos de ação específicos */
  tipos_acao?: TipoAcaoHistorico[];
  /** Categorias de histórico */
  categorias?: CategoriaHistorico[];
  /** Data de início do período */
  data_inicio?: Date;
  /** Data de fim do período */
  data_fim?: Date;
  /** Apenas ações bem-sucedidas */
  apenas_sucessos?: boolean;
  /** Busca textual na descrição */
  busca_texto?: string;
}

/**
 * Interface para parâmetros de paginação e ordenação
 */
export interface HistoricoAgendamentoPaginacao {
  /** Página atual (padrão: 1) */
  page?: number;
  /** Itens por página (padrão: 20, máximo: 100) */
  limit?: number;
  /** Campo para ordenação (padrão: created_at) */
  orderBy?: string;
  /** Direção da ordenação (padrão: DESC) */
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Repository especializado para consultas otimizadas do histórico de agendamentos
 * 
 * @description
 * Fornece métodos otimizados para consultar o histórico de mudanças e eventos
 * relacionados aos agendamentos de visitas domiciliares, com suporte a filtros
 * avançados, paginação e agregações estatísticas.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class HistoricoAgendamentoRepository {
  constructor(
    @InjectRepository(HistoricoMonitoramento)
    private readonly historicoRepository: Repository<HistoricoMonitoramento>,
  ) {}

  /**
   * Busca histórico de um agendamento específico com filtros e paginação
   * 
   * @param agendamentoId ID do agendamento
   * @param filters Filtros adicionais
   * @param paginacao Parâmetros de paginação
   * @returns Lista paginada do histórico
   */
  async findByAgendamentoId(
    agendamentoId: string,
    filters?: Omit<HistoricoAgendamentoFilters, 'agendamento_id'>,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<{ data: HistoricoMonitoramento[]; total: number }> {
    const queryBuilder = this.createBaseQuery({
      ...filters,
      agendamento_id: agendamentoId,
    });

    return this.executePaginatedQuery(queryBuilder, paginacao);
  }

  /**
   * Busca histórico de um cidadão específico relacionado a agendamentos
   * 
   * @param cidadaoId ID do cidadão
   * @param filters Filtros adicionais
   * @param paginacao Parâmetros de paginação
   * @returns Lista paginada do histórico
   */
  async findByCidadaoId(
    cidadaoId: string,
    filters?: Omit<HistoricoAgendamentoFilters, 'cidadao_id'>,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<{ data: HistoricoMonitoramento[]; total: number }> {
    const queryBuilder = this.createBaseQuery({
      ...filters,
      cidadao_id: cidadaoId,
      categorias: [CategoriaHistorico.AGENDAMENTO], // Filtrar apenas histórico de agendamentos
    });

    return this.executePaginatedQuery(queryBuilder, paginacao);
  }

  /**
   * Busca histórico geral de agendamentos com filtros avançados
   * 
   * @param filters Filtros de consulta
   * @param paginacao Parâmetros de paginação
   * @returns Lista paginada do histórico
   */
  async findWithFilters(
    filters?: HistoricoAgendamentoFilters,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<{ data: HistoricoMonitoramento[]; total: number }> {
    const queryBuilder = this.createBaseQuery(filters);
    return this.executePaginatedQuery(queryBuilder, paginacao);
  }

  /**
   * Obtém estatísticas do histórico de agendamentos
   * 
   * @param filters Filtros para as estatísticas
   * @returns Estatísticas agregadas
   */
  async getEstatisticas(
    filters?: HistoricoAgendamentoFilters,
  ): Promise<{
    total_acoes: number;
    acoes_por_tipo: Record<TipoAcaoHistorico, number>;
    taxa_sucesso: number;
    periodo_analise: { inicio: Date; fim: Date };
  }> {
    const queryBuilder = this.createBaseQuery(filters);

    // Contagem total
    const total = await queryBuilder.getCount();

    // Contagem por tipo de ação
    const acoesPorTipo = await this.historicoRepository
      .createQueryBuilder('h')
      .select('h.tipo_acao', 'tipo_acao')
      .addSelect('COUNT(*)', 'count')
      .where(this.buildWhereClause(filters))
      .groupBy('h.tipo_acao')
      .getRawMany();

    // Taxa de sucesso
    const sucessos = await queryBuilder.clone().andWhere('h.sucesso = :sucesso', { sucesso: true }).getCount();
    const taxaSucesso = total > 0 ? (sucessos / total) * 100 : 0;

    // Período de análise
    const periodoQuery = this.historicoRepository
      .createQueryBuilder('h')
      .select('MIN(h.created_at)', 'inicio')
      .addSelect('MAX(h.created_at)', 'fim')
      .where(this.buildWhereClause(filters));

    const periodo = await periodoQuery.getRawOne();

    // Converter contagens por tipo em objeto
    const acoesPorTipoObj = Object.values(TipoAcaoHistorico).reduce(
      (acc, tipo) => {
        acc[tipo] = 0;
        return acc;
      },
      {} as Record<TipoAcaoHistorico, number>,
    );

    acoesPorTipo.forEach((item) => {
      acoesPorTipoObj[item.tipo_acao as TipoAcaoHistorico] = parseInt(item.count, 10);
    });

    return {
      total_acoes: total,
      acoes_por_tipo: acoesPorTipoObj,
      taxa_sucesso: Math.round(taxaSucesso * 100) / 100,
      periodo_analise: {
        inicio: periodo?.inicio || new Date(),
        fim: periodo?.fim || new Date(),
      },
    };
  }

  /**
   * Busca as últimas ações de um agendamento específico
   * 
   * @param agendamentoId ID do agendamento
   * @param limit Número máximo de registros (padrão: 10)
   * @returns Últimas ações do agendamento
   */
  async findUltimasAcoes(
    agendamentoId: string,
    limit: number = 10,
  ): Promise<HistoricoMonitoramento[]> {
    return this.historicoRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.usuario', 'usuario')
      .leftJoinAndSelect('h.agendamento', 'agendamento')
      .where('h.agendamento_id = :agendamentoId', { agendamentoId })
      .orderBy('h.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Cria a query base com joins necessários
   * 
   * @param filters Filtros a serem aplicados
   * @returns QueryBuilder configurado
   */
  private createBaseQuery(
    filters?: HistoricoAgendamentoFilters,
  ): SelectQueryBuilder<HistoricoMonitoramento> {
    const queryBuilder = this.historicoRepository
      .createQueryBuilder('h')
      .leftJoin('h.usuario', 'tecnico')
      .addSelect([
        'tecnico.id',
        'tecnico.nome',
        'tecnico.email',
        'tecnico.telefone',
      ])
      .leftJoin('h.cidadao', 'beneficiario')
      .addSelect([
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
      ])
      .leftJoinAndSelect('h.agendamento', 'agendamento')
      .leftJoinAndSelect('h.visita', 'visita')
      .leftJoin('agendamento.pagamento', 'pagamento')
      .addSelect([
        'pagamento.valor',
        'pagamento.status',
        'pagamento.numero_parcela',
        'pagamento.total_parcelas'
      ]);

    if (filters) {
      this.applyFilters(queryBuilder, filters);
    }

    return queryBuilder;
  }

  /**
   * Aplica filtros ao QueryBuilder
   * 
   * @param queryBuilder QueryBuilder a ser configurado
   * @param filters Filtros a serem aplicados
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<HistoricoMonitoramento>,
    filters: HistoricoAgendamentoFilters,
  ): void {
    if (filters.agendamento_id) {
      queryBuilder.andWhere('h.agendamento_id = :agendamentoId', {
        agendamentoId: filters.agendamento_id,
      });
    }

    if (filters.cidadao_id) {
      queryBuilder.andWhere('h.cidadao_id = :cidadaoId', {
        cidadaoId: filters.cidadao_id,
      });
    }

    if (filters.usuario_id) {
      queryBuilder.andWhere('h.usuario_id = :usuarioId', {
        usuarioId: filters.usuario_id,
      });
    }

    if (filters.tipos_acao && filters.tipos_acao.length > 0) {
      queryBuilder.andWhere('h.tipo_acao IN (:...tiposAcao)', {
        tiposAcao: filters.tipos_acao,
      });
    }

    if (filters.categorias && filters.categorias.length > 0) {
      queryBuilder.andWhere('h.categoria IN (:...categorias)', {
        categorias: filters.categorias,
      });
    }

    if (filters.data_inicio) {
      queryBuilder.andWhere('h.created_at >= :dataInicio', {
        dataInicio: filters.data_inicio,
      });
    }

    if (filters.data_fim) {
      queryBuilder.andWhere('h.created_at <= :dataFim', {
        dataFim: filters.data_fim,
      });
    }

    if (filters.apenas_sucessos !== undefined) {
      queryBuilder.andWhere('h.sucesso = :sucesso', {
        sucesso: filters.apenas_sucessos,
      });
    }

    if (filters.busca_texto) {
      queryBuilder.andWhere(
        '(h.descricao ILIKE :buscaTexto OR h.observacoes ILIKE :buscaTexto)',
        {
          buscaTexto: `%${filters.busca_texto}%`,
        },
      );
    }
  }

  /**
   * Constrói cláusula WHERE para queries raw
   * 
   * @param filters Filtros a serem aplicados
   * @returns Cláusula WHERE como string
   */
  private buildWhereClause(filters?: HistoricoAgendamentoFilters): string {
    const conditions: string[] = ['1=1']; // Condição sempre verdadeira como base

    if (filters?.agendamento_id) {
      conditions.push(`h.agendamento_id = '${filters.agendamento_id}'`);
    }

    if (filters?.cidadao_id) {
      conditions.push(`h.cidadao_id = '${filters.cidadao_id}'`);
    }

    if (filters?.categorias && filters.categorias.length > 0) {
      const categoriasStr = filters.categorias.map(c => `'${c}'`).join(',');
      conditions.push(`h.categoria IN (${categoriasStr})`);
    }

    return conditions.join(' AND ');
  }

  /**
   * Executa query paginada e retorna resultados com contagem total
   * 
   * @param queryBuilder QueryBuilder configurado
   * @param paginacao Parâmetros de paginação
   * @returns Dados paginados com total
   */
  private async executePaginatedQuery(
    queryBuilder: SelectQueryBuilder<HistoricoMonitoramento>,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<{ data: HistoricoMonitoramento[]; total: number }> {
    // Configurar paginação
    const page = paginacao?.page || 1;
    const limit = Math.min(paginacao?.limit || 20, 100); // Máximo 100 itens por página
    const offset = (page - 1) * limit;

    // Configurar ordenação
    const orderBy = paginacao?.orderBy || 'created_at';
    const orderDirection = paginacao?.orderDirection || 'DESC';

    // Aplicar ordenação, paginação e executar
    queryBuilder
      .orderBy(`h.${orderBy}`, orderDirection)
      .skip(offset)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }
}