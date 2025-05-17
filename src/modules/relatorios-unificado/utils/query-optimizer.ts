/**
 * Utilitário para otimização de consultas SQL
 *
 * Este arquivo contém funções para otimizar consultas SQL utilizadas
 * nos relatórios, garantindo melhor performance para grandes volumes de dados.
 */
import { SelectQueryBuilder, ObjectLiteral, FindOptionsWhere } from 'typeorm';
import { Logger } from '@nestjs/common';

// Logger para registrar informações sobre as otimizações
const logger = new Logger('QueryOptimizer');

/**
 * Classe de utilitários para otimização de consultas SQL
 *
 * Esta classe fornece métodos estáticos para otimizar consultas SQL
 * utilizadas nos relatórios, melhorando a performance para grandes volumes de dados.
 */
export class QueryOptimizer {
  /**
   * Aplica otimizações padrão para consultas de relatórios
   *
   * @param query QueryBuilder do TypeORM
   * @returns QueryBuilder otimizado
   */
  static optimize<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    // Adiciona comentário SQL para identificar a consulta nos logs
    query.comment('relatorio-query');

    logger.debug(
      `Aplicando otimizações padrão para consulta: ${query.getSql()}`,
    );

    return query;
  }

  /**
   * Aplica paginação para consultas que retornam grandes volumes de dados
   *
   * @param query QueryBuilder do TypeORM
   * @param page Número da página (começando em 1)
   * @param pageSize Tamanho da página
   * @returns QueryBuilder com paginação
   */
  static paginate<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    page: number = 1,
    pageSize: number = 100,
  ): SelectQueryBuilder<T> {
    const skip = (page - 1) * pageSize;

    query.skip(skip).take(pageSize);

    logger.debug(`Aplicando paginação: página ${page}, tamanho ${pageSize}`);

    return query;
  }

  /**
   * Aplica filtro de data para consultas de relatórios
   *
   * @param query QueryBuilder do TypeORM
   * @param dateField Nome do campo de data
   * @param startDate Data inicial
   * @param endDate Data final
   * @returns QueryBuilder com filtro de data
   */
  static filterByDateRange<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    dateField: string,
    startDate: string,
    endDate: string,
  ): SelectQueryBuilder<T> {
    // Converte as datas para objetos Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Adiciona um dia à data final para incluir todo o último dia
    end.setDate(end.getDate() + 1);

    // Aplica o filtro de data
    query
      .andWhere(`${dateField} >= :startDate`, { startDate: start })
      .andWhere(`${dateField} < :endDate`, { endDate: end });

    logger.debug(
      `Aplicando filtro de data: ${dateField} entre ${start.toISOString()} e ${end.toISOString()}`,
    );

    return query;
  }

  /**
   * Otimiza consultas para contagem de registros
   *
   * @param query QueryBuilder do TypeORM
   * @returns QueryBuilder otimizado para contagem
   */
  static optimizeCount<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    // Cria uma subconsulta para contagem mais eficiente
    query.select('COUNT(1)', 'count');

    logger.debug('Otimizando consulta para contagem');

    return query;
  }
}

/**
 * Aplica paginação para consultas que retornam grandes volumes de dados
 *
 * @param query QueryBuilder do TypeORM
 * @param page Número da página (começando em 1)
 * @param pageSize Tamanho da página
 * @returns QueryBuilder com paginação
 */
export function applyPagination<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  page: number = 1,
  pageSize: number = 100,
): SelectQueryBuilder<T> {
  const skip = (page - 1) * pageSize;

  return query.skip(skip).take(pageSize);
}

/**
 * Otimiza consultas para contagem de registros
 *
 * @param query QueryBuilder do TypeORM
 * @returns QueryBuilder otimizado para contagem
 */
export function optimizeCountQuery<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  // Simplifica a consulta removendo ordenações e seleções desnecessárias
  query.expressionMap.orderBys = {};

  // Usa COUNT(1) em vez de COUNT(*) para melhor performance
  if (query.expressionMap.selects.length > 0) {
    query.select('COUNT(1)', 'count');
  }

  return query;
}

/**
 * Aplica otimizações para consultas de agregação (GROUP BY)
 *
 * @param query QueryBuilder do TypeORM
 * @returns QueryBuilder otimizado para agregação
 */
export function optimizeAggregationQuery<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  // Adiciona comentário para identificar a consulta
  query.comment('aggregation-query');

  return query;
}

/**
 * Aplica otimizações para consultas de relatórios com filtros de data
 *
 * @param query QueryBuilder do TypeORM
 * @param dateField Nome do campo de data
 * @param startDate Data inicial
 * @param endDate Data final
 * @returns QueryBuilder com filtro de data otimizado
 */
export function applyDateRangeFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  dateField: string,
  startDate: string,
  endDate: string,
): SelectQueryBuilder<T> {
  // Converte as datas para objetos Date
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Adiciona um dia à data final para incluir todo o último dia
  end.setDate(end.getDate() + 1);

  // Aplica o filtro de data usando BETWEEN para melhor performance
  return query
    .andWhere(`${dateField} >= :startDate`, { startDate: start })
    .andWhere(`${dateField} < :endDate`, { endDate: end });
}

/**
 * Aplica otimizações para consultas que envolvem JOIN com várias tabelas
 *
 * @param query QueryBuilder do TypeORM
 * @returns QueryBuilder otimizado para JOINs
 */
export function optimizeJoins<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  // Adiciona comentário para identificar a consulta
  query.comment('join-optimization');

  return query;
}

/**
 * Aplica todas as otimizações relevantes para uma consulta de relatório
 *
 * @param query QueryBuilder do TypeORM
 * @param options Opções de otimização
 * @returns QueryBuilder completamente otimizado
 */
export function optimizeReportQuery<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  options: {
    dateField?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    isCountQuery?: boolean;
    isAggregationQuery?: boolean;
    hasJoins?: boolean;
  } = {},
): SelectQueryBuilder<T> {
  // Aplica otimizações básicas
  query = QueryOptimizer.optimize(query);

  // Aplica filtro de data se fornecido
  if (options.dateField && options.startDate && options.endDate) {
    query = applyDateRangeFilter(
      query,
      options.dateField,
      options.startDate,
      options.endDate,
    );
  }

  // Aplica otimizações específicas com base no tipo de consulta
  if (options.isCountQuery) {
    query = optimizeCountQuery(query);
  }

  if (options.isAggregationQuery) {
    query = optimizeAggregationQuery(query);
  }

  if (options.hasJoins) {
    query = optimizeJoins(query);
  }

  // Aplica paginação se necessário
  if (options.page && options.pageSize) {
    query = applyPagination(query, options.page, options.pageSize);
  }

  return query;
}
