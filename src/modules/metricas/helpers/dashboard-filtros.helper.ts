import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { DashboardFiltrosDto } from '../dto/dashboard-filtros.dto';
import { QueryScopeHelper } from '../../../common/helpers/query-scope.helper';
import { IScopeContext } from '../../../common/interfaces/scope-context.interface';
import { ScopeType } from '../../../enums/scope-type.enum';

/**
 * Helper para aplicar filtros padronizados do dashboard
 *
 * Integra os filtros de query parameters com o sistema de escopo
 * de forma consistente em todos os endpoints de métricas
 */
export class DashboardFiltrosHelper {
  /**
   * Aplica todos os filtros padronizados do dashboard em uma query
   *
   * @param qb QueryBuilder do TypeORM
   * @param filtros Filtros vindos dos query parameters
   * @param scopeContext Contexto de escopo do usuário
   * @param alias Alias da tabela principal (default: 'solicitacao')
   * @param cidadaoAlias Alias da tabela de cidadão (default: 'cidadao')
   * @param beneficioAlias Alias da tabela de benefício (default: 'beneficio')
   */
  static aplicarFiltros<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filtros: DashboardFiltrosDto,
    scopeContext: IScopeContext,
    alias = 'solicitacao',
    cidadaoAlias = 'cidadao',
    beneficioAlias = 'beneficio',
  ): SelectQueryBuilder<T> {
    // 1. Aplicar filtros de escopo (sistema existente)
    this.aplicarFiltrosEscopo(qb, scopeContext, alias);

    // 2. Aplicar filtros de query parameters
    this.aplicarFiltrosQueryParams(
      qb,
      filtros,
      alias,
      cidadaoAlias,
      beneficioAlias,
    );

    return qb;
  }

  /**
   * Aplica filtros baseados no contexto de escopo do usuário
   */
  private static aplicarFiltrosEscopo<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    scopeContext: IScopeContext,
    alias: string,
  ): void {
    // Se o usuário tem escopo de unidade, aplicar filtro automaticamente
    if (scopeContext.tipo === ScopeType.UNIDADE && scopeContext.unidade_id) {
      QueryScopeHelper.applyUnidadeFilter(qb, scopeContext.unidade_id, alias);
    }
  }

  /**
   * Aplica filtros vindos dos query parameters
   */
  private static aplicarFiltrosQueryParams<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filtros: DashboardFiltrosDto,
    alias: string,
    cidadaoAlias: string,
    beneficioAlias: string,
  ): void {
    // Filtro por unidade (sobrescreve escopo se fornecido explicitamente)
    if (filtros.unidade) {
      qb.andWhere(`${alias}.unidade_id = :filtroUnidade`, {
        filtroUnidade: filtros.unidade,
      });
    }

    // Filtro por benefício
    if (filtros.beneficio) {
      qb.andWhere(`${alias}.beneficio_id = :filtroBeneficio`, {
        filtroBeneficio: filtros.beneficio,
      });
    }

    // Filtro por bairro (requer join com cidadão)
    if (filtros.bairro) {
      qb.andWhere(`LOWER(${cidadaoAlias}.bairro) LIKE LOWER(:filtroBairro)`, {
        filtroBairro: `%${filtros.bairro}%`,
      });
    }

    // Filtro por status
    if (filtros.status) {
      qb.andWhere(`${alias}.status = :filtroStatus`, {
        filtroStatus: filtros.status,
      });
    }

    // Filtro por período
    if (filtros.dataInicio) {
      qb.andWhere(`${alias}.created_at >= :dataInicio`, {
        dataInicio: filtros.dataInicio,
      });
    }

    if (filtros.dataFim) {
      qb.andWhere(`${alias}.created_at <= :dataFim`, {
        dataFim: filtros.dataFim,
      });
    }
  }

  /**
   * Adiciona joins necessários para os filtros funcionarem
   *
   * @param qb QueryBuilder
   * @param filtros Filtros aplicados
   * @param alias Alias da tabela principal
   */
  static adicionarJoinsNecessarios<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filtros: DashboardFiltrosDto,
    alias = 'solicitacao',
  ): SelectQueryBuilder<T> {
    // Join com cidadão se filtro de bairro for usado
    if (filtros.bairro) {
      qb.leftJoin(`${alias}.cidadao`, 'cidadao');
    }

    // Join com benefício se filtro de benefício for usado
    if (filtros.beneficio) {
      qb.leftJoin(`${alias}.beneficio`, 'beneficio');
    }

    return qb;
  }

  /**
   * Valida se os filtros de período são consistentes
   */
  static validarPeriodo(filtros: DashboardFiltrosDto): void {
    if (filtros.dataInicio && filtros.dataFim) {
      const inicio = new Date(filtros.dataInicio);
      const fim = new Date(filtros.dataFim);

      if (inicio > fim) {
        throw new Error('Data de início não pode ser maior que data de fim');
      }
    }
  }
}
