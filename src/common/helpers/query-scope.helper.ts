import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * Helper utilitário para aplicar filtros de escopo (unidade, usuário) em
 * QueryBuilders do TypeORM de forma consistente e reutilizável.
 */
export class QueryScopeHelper {
  /**
   * Aplica filtro de unidade (unidade_id) se o valor estiver presente.
   * Não sobrescreve cláusulas já existentes.
   * @param qb QueryBuilder
   * @param unidadeId ID da unidade
   * @param alias Alias da tabela principal (default: 'entidade')
   */
  static applyUnidadeFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    unidadeId?: string,
    alias = 'entidade',
  ): SelectQueryBuilder<T> {
    if (unidadeId) {
      qb.andWhere(`${alias}.unidade_id = :unidadeId`, { unidadeId });
    }
    return qb;
  }

  /**
   * Aplica filtro por usuário (user_id) se fornecido.
   * @param qb QueryBuilder
   * @param userId ID do usuário
   * @param alias Alias principal
   */
  static applyUserFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    userId?: string,
    alias = 'entidade',
  ): SelectQueryBuilder<T> {
    if (userId) {
      qb.andWhere(`${alias}.usuario_id = :userId`, { userId });
    }
    return qb;
  }
}
