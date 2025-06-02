import { EntityRepository, Repository } from 'typeorm';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';

/**
 * Repository customizado para TipoBeneficio
 *
 * Implementa consultas otimizadas para campos JSON
 */
@EntityRepository(TipoBeneficio)
export class TipoBeneficioRepository extends Repository<TipoBeneficio> {
  /**
   * Busca tipos de benefício por critérios em campos JSON
   *
   * @param criteria Critérios de busca em formato de objeto
   * @returns Lista de tipos de benefício que atendem aos critérios
   */
  async findByJsonCriteria(criteria: {
    [key: string]: any;
  }): Promise<TipoBeneficio[]> {
    const queryBuilder = this.createQueryBuilder('tipo_beneficio');

    Object.keys(criteria).forEach((key) => {
      const value = criteria[key];

      // Construir condição para busca em campo JSON
      queryBuilder.andWhere(
        `tipo_beneficio.criterios_elegibilidade->>'${key}' = :${key}`,
        { [key]: value },
      );
    });

    return queryBuilder.getMany();
  }

  /**
   * Busca tipos de benefício por critérios de idade e renda
   *
   * @param idade Idade do cidadão
   * @param renda Renda per capita do cidadão
   * @returns Lista de tipos de benefício elegíveis para os critérios informados
   */
  async findByCriteriosElegibilidade(
    idade: number,
    renda: number,
  ): Promise<TipoBeneficio[]> {
    return this.createQueryBuilder('tipo_beneficio')
      .where('tipo_beneficio.ativo = :ativo', { ativo: true })
      .andWhere(
        `
        (
          (tipo_beneficio.criterios_elegibilidade->>'idade_minima')::int IS NULL OR
          (tipo_beneficio.criterios_elegibilidade->>'idade_minima')::int <= :idade
        )
      `,
        { idade },
      )
      .andWhere(
        `
        (
          (tipo_beneficio.criterios_elegibilidade->>'idade_maxima')::int IS NULL OR
          (tipo_beneficio.criterios_elegibilidade->>'idade_maxima')::int >= :idade
        )
      `,
        { idade },
      )
      .andWhere(
        `
        (
          (tipo_beneficio.criterios_elegibilidade->>'renda_maxima')::float IS NULL OR
          (tipo_beneficio.criterios_elegibilidade->>'renda_maxima')::float >= :renda
        )
      `,
        { renda },
      )
      .getMany();
  }

  /**
   * Busca tipos de benefício por texto em campos JSON
   *
   * Utiliza índice GIN para busca eficiente
   *
   * @param termo Termo de busca
   * @returns Lista de tipos de benefício que contêm o termo
   */
  async findByJsonText(termo: string): Promise<TipoBeneficio[]> {
    // Usar operador @> para busca em campos JSONB
    return this.createQueryBuilder('tipo_beneficio')
      .where(`tipo_beneficio.criterios_elegibilidade::text ILIKE :termo`, {
        termo: `%${termo}%`,
      })
      .getMany();
  }
}
