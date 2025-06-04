import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InfoBancaria } from '../../../entities/info-bancaria.entity';
import { CreateInfoBancariaDto } from '../dto/create-info-bancaria.dto';
import { UpdateInfoBancariaDto } from '../dto/update-info-bancaria.dto';

/**
 * Repository para gerenciamento de informações bancárias
 *
 * Responsável por operações de banco de dados relacionadas às informações bancárias dos cidadãos,
 * incluindo contas poupança social do Banco do Brasil e dados PIX.
 */
@Injectable()
export class InfoBancariaRepository {
  private repository: Repository<InfoBancaria>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(InfoBancaria);
  }

  /**
   * Cria uma nova informação bancária
   * @param createInfoBancariaDto Dados para criação
   * @returns Informação bancária criada
   */
  async create(
    createInfoBancariaDto: CreateInfoBancariaDto,
  ): Promise<InfoBancaria> {
    const infoBancaria = this.repository.create(createInfoBancariaDto);
    return await this.repository.save(infoBancaria);
  }

  /**
   * Busca todas as informações bancárias com filtros opcionais
   * @param options Opções de filtro e paginação
   * @returns Lista de informações bancárias e contagem total
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
    includeRelations?: boolean;
  }): Promise<[InfoBancaria[], number]> {
    const {
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
      includeRelations = false,
    } = options || {};

    const queryBuilder = this.repository.createQueryBuilder('info_bancaria');

    // Adiciona relações se solicitado
    if (includeRelations) {
      queryBuilder.leftJoinAndSelect('info_bancaria.cidadao', 'cidadao');
    }

    // Aplica filtros
    if (where.cidadao_id) {
      queryBuilder.andWhere('info_bancaria.cidadao_id = :cidadao_id', {
        cidadao_id: where.cidadao_id,
      });
    }

    if (where.banco) {
      queryBuilder.andWhere('info_bancaria.banco = :banco', {
        banco: where.banco,
      });
    }

    if (where.ativo !== undefined) {
      queryBuilder.andWhere('info_bancaria.ativo = :ativo', {
        ativo: where.ativo,
      });
    }

    if (where.tipo_conta) {
      queryBuilder.andWhere('info_bancaria.tipo_conta = :tipo_conta', {
        tipo_conta: where.tipo_conta,
      });
    }

    // Aplica ordenação
    Object.entries(order).forEach(([field, direction]) => {
      queryBuilder.addOrderBy(
        `info_bancaria.${field}`,
        direction as 'ASC' | 'DESC',
      );
    });

    // Aplica paginação
    queryBuilder.skip(skip).take(take);

    return await queryBuilder.getManyAndCount();
  }

  /**
   * Busca informação bancária por ID
   * @param id ID da informação bancária
   * @param includeRelations Se deve incluir relações
   * @returns Informação bancária encontrada ou null
   */
  async findById(
    id: string,
    includeRelations = false,
  ): Promise<InfoBancaria | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('info_bancaria')
      .where('info_bancaria.id = :id', { id });

    if (includeRelations) {
      queryBuilder.leftJoinAndSelect('info_bancaria.cidadao', 'cidadao');
    }

    return await queryBuilder.getOne();
  }

  /**
   * Busca informação bancária por ID do cidadão
   * @param cidadaoId ID do cidadão
   * @param includeRelations Se deve incluir relações
   * @returns Informação bancária encontrada ou null
   */
  async findByCidadaoId(
    cidadaoId: string,
    includeRelations = false,
  ): Promise<InfoBancaria | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('info_bancaria')
      .where('info_bancaria.cidadao_id = :cidadaoId', { cidadaoId })
      .andWhere('info_bancaria.ativo = :ativo', { ativo: true });

    if (includeRelations) {
      queryBuilder.leftJoinAndSelect('info_bancaria.cidadao', 'cidadao');
    }

    return await queryBuilder.getOne();
  }

  /**
   * Busca informações bancárias por chave PIX
   * @param chavePix Chave PIX
   * @returns Lista de informações bancárias
   */
  async findByChavePix(chavePix: string): Promise<InfoBancaria[]> {
    return await this.repository.find({
      where: {
        chave_pix: chavePix,
        ativo: true,
      },
      relations: ['cidadao'],
    });
  }

  /**
   * Atualiza informação bancária
   * @param id ID da informação bancária
   * @param updateInfoBancariaDto Dados para atualização
   * @returns Informação bancária atualizada
   */
  async update(
    id: string,
    updateInfoBancariaDto: UpdateInfoBancariaDto,
  ): Promise<InfoBancaria | null> {
    await this.repository.update(id, updateInfoBancariaDto);
    return await this.findById(id);
  }

  /**
   * Remove informação bancária (soft delete)
   * @param id ID da informação bancária
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Desativa informação bancária
   * @param id ID da informação bancária
   * @returns Informação bancária atualizada
   */
  async deactivate(id: string): Promise<InfoBancaria | null> {
    await this.repository.update(id, { ativo: false });
    return await this.findById(id);
  }

  /**
   * Verifica se existe informação bancária ativa para um cidadão
   * @param cidadaoId ID do cidadão
   * @returns True se existe, false caso contrário
   */
  async existsActiveByCidadaoId(cidadaoId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        cidadao_id: cidadaoId,
        ativo: true,
      },
    });
    return count > 0;
  }

  /**
   * Verifica se uma chave PIX já está em uso
   * @param chavePix Chave PIX
   * @param excludeId ID para excluir da verificação (útil em atualizações)
   * @returns True se já existe, false caso contrário
   */
  async existsByChavePix(
    chavePix: string,
    excludeId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('info_bancaria')
      .where('info_bancaria.chave_pix = :chavePix', { chavePix })
      .andWhere('info_bancaria.ativo = :ativo', { ativo: true });

    if (excludeId) {
      queryBuilder.andWhere('info_bancaria.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }
}
