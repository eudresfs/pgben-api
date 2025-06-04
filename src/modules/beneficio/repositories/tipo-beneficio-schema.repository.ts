import { DataSource, Repository } from 'typeorm';
import { TipoBeneficioSchema } from '../../../entities/tipo-beneficio-schema.entity';
import { Injectable } from '@nestjs/common';

/**
 * Repositório customizado para TipoBeneficioSchema
 * Fornece métodos otimizados para consultas específicas de schemas de benefícios
 */
@Injectable()
export class TipoBeneficioSchemaRepository extends Repository<TipoBeneficioSchema> {
  constructor(private dataSource: DataSource) {
    super(TipoBeneficioSchema, dataSource.createEntityManager());
  }

  /**
   * Busca o schema ativo para um tipo de benefício específico
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Schema ativo ou null se não encontrado
   */
  async findByTipoBeneficioId(
    tipoBeneficioId: string,
  ): Promise<TipoBeneficioSchema | null> {
    return this.findOne({
      where: {
        tipo_beneficio_id: tipoBeneficioId,
        ativo: true,
      },
      relations: ['tipo_beneficio'],
    });
  }

  /**
   * Busca schema por entidade de dados
   *
   * @param entidadeDados Nome da entidade de dados
   * @returns Lista de schemas que usam a entidade especificada
   */
  async findByEntidadeDados(
    entidadeDados: string,
  ): Promise<TipoBeneficioSchema[]> {
    return this.find({
      where: {
        entidade_dados: entidadeDados,
        ativo: true,
      },
      relations: ['tipo_beneficio'],
    });
  }

  /**
   * Busca todos os schemas ativos com seus tipos de benefícios
   *
   * @returns Lista de schemas ativos
   */
  async findAllAtivos(): Promise<TipoBeneficioSchema[]> {
    return this.find({
      where: { ativo: true },
      relations: ['tipo_beneficio'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca schemas por versão
   *
   * @param versao Versão do schema
   * @returns Lista de schemas da versão especificada
   */
  async findByVersao(versao: string): Promise<TipoBeneficioSchema[]> {
    return this.find({
      where: {
        versao,
        ativo: true,
      },
      relations: ['tipo_beneficio'],
    });
  }

  /**
   * Busca schemas criados recentemente (últimas 24 horas)
   *
   * @returns Lista de schemas recentes
   */
  async findRecentes(): Promise<TipoBeneficioSchema[]> {
    const umDiaAtras = new Date();
    umDiaAtras.setDate(umDiaAtras.getDate() - 1);

    return this.createQueryBuilder('schema')
      .leftJoinAndSelect('schema.tipo_beneficio', 'tipo_beneficio')
      .where('schema.created_at > :dataLimite', { dataLimite: umDiaAtras })
      .andWhere('schema.ativo = :ativo', { ativo: true })
      .orderBy('schema.created_at', 'DESC')
      .getMany();
  }

  /**
   * Busca schemas que contêm um campo específico
   *
   * @param nomeCampo Nome do campo a ser buscado
   * @returns Lista de schemas que contêm o campo
   */
  async findByCampo(nomeCampo: string): Promise<TipoBeneficioSchema[]> {
    return this.createQueryBuilder('schema')
      .leftJoinAndSelect('schema.tipo_beneficio', 'tipo_beneficio')
      .where('schema.ativo = :ativo', { ativo: true })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(schema.schema_estrutura->'campos') AS campo
          WHERE campo->>'nome' = :nomeCampo
        )`,
        { nomeCampo },
      )
      .getMany();
  }

  /**
   * Atualiza a versão de um schema
   *
   * @param id ID do schema
   * @param novaVersao Nova versão
   * @returns Schema atualizado
   */
  async atualizarVersao(
    id: string,
    novaVersao: string,
  ): Promise<TipoBeneficioSchema> {
    await this.update(id, { versao: novaVersao });
    const schema = await this.findOne({
      where: { id },
      relations: ['tipo_beneficio'],
    });
    if (!schema) {
      throw new Error(`Schema com ID ${id} não encontrado`);
    }
    return schema;
  }

  /**
   * Desativa um schema
   *
   * @param id ID do schema
   * @returns Resultado da operação
   */
  async desativar(id: string): Promise<void> {
    await this.update(id, { ativo: false });
  }

  /**
   * Ativa um schema
   *
   * @param id ID do schema
   * @returns Resultado da operação
   */
  async ativar(id: string): Promise<void> {
    await this.update(id, { ativo: true });
  }

  /**
   * Conta quantos schemas existem por entidade de dados
   *
   * @returns Objeto com contagem por entidade
   */
  async contarPorEntidade(): Promise<Record<string, number>> {
    const resultado = await this.createQueryBuilder('schema')
      .select('schema.entidade_dados', 'entidade')
      .addSelect('COUNT(*)', 'total')
      .where('schema.ativo = :ativo', { ativo: true })
      .groupBy('schema.entidade_dados')
      .getRawMany();

    return resultado.reduce((acc, item) => {
      acc[item.entidade] = parseInt(item.total);
      return acc;
    }, {});
  }

  /**
   * Valida se existe conflito de schema para um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @param excludeId ID do schema a ser excluído da validação (opcional)
   * @returns True se existe conflito
   */
  async existeConflito(
    tipoBeneficioId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.createQueryBuilder('schema')
      .where('schema.tipo_beneficio_id = :tipoBeneficioId', { tipoBeneficioId })
      .andWhere('schema.ativo = :ativo', { ativo: true });

    if (excludeId) {
      query.andWhere('schema.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
