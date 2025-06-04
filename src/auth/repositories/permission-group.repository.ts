import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PermissionGroup } from '../../entities/permission-group.entity';

/**
 * Repositório para a entidade PermissionGroup.
 *
 * Fornece métodos para manipulação de grupos de permissões no banco de dados,
 * incluindo busca por nome e operações de CRUD.
 */
@Injectable()
export class PermissionGroupRepository extends Repository<PermissionGroup> {
  constructor(private dataSource: DataSource) {
    super(PermissionGroup, dataSource.createEntityManager());
  }

  /**
   * Busca um grupo de permissões pelo nome.
   *
   * @param name Nome do grupo
   * @returns O grupo encontrado ou null
   */
  async findByName(name: string): Promise<PermissionGroup | null> {
    return this.findOne({ where: { name } });
  }

  /**
   * Busca um grupo de permissões pelo ID.
   *
   * @param id ID do grupo
   * @returns O grupo encontrado ou null
   */
  async findById(id: string): Promise<PermissionGroup | null> {
    return this.findOneBy({ id });
  }

  /**
   * Cria um novo grupo de permissões.
   *
   * @param data Dados do grupo a ser criado
   * @returns O grupo criado
   */
  async createGroup(data: Partial<PermissionGroup>): Promise<PermissionGroup> {
    const group = this.create(data);
    return this.save(group);
  }

  /**
   * Atualiza um grupo de permissões existente.
   *
   * @param id ID do grupo a ser atualizado
   * @param data Dados atualizados do grupo
   * @returns O grupo atualizado
   */
  async updateGroup(
    id: string,
    data: Partial<PermissionGroup>,
  ): Promise<PermissionGroup | null> {
    await this.update(id, data);
    return this.findOneBy({ id });
  }

  /**
   * Remove um grupo de permissões.
   *
   * @param id ID do grupo a ser removido
   * @returns true se o grupo foi removido, false caso contrário
   */
  async removeGroup(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
  }
}
