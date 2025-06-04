import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PermissionScope } from '../../entities/permission-scope.entity';
import { TipoEscopo } from '../../entities/user-permission.entity';

/**
 * Repositório para a entidade PermissionScope.
 *
 * Fornece métodos para manipulação de escopos padrão para permissões no banco de dados,
 * incluindo busca por permissão, tipo de escopo e operações de CRUD.
 */
@Injectable()
export class PermissionScopeRepository extends Repository<PermissionScope> {
  constructor(private dataSource: DataSource) {
    super(PermissionScope, dataSource.createEntityManager());
  }

  /**
   * Busca escopo por ID de permissão.
   *
   * @param permissionId ID da permissão
   * @returns O escopo encontrado ou null
   */
  async findByPermissionId(
    permissionId: string,
  ): Promise<PermissionScope | null> {
    return this.findOne({ where: { permissao_id: permissionId } });
  }

  /**
   * Busca escopos por tipo de escopo padrão.
   *
   * @param defaultScopeType Tipo de escopo padrão
   * @returns Lista de escopos encontrados
   */
  async findByDefaultScopeType(
    defaultScopeType: TipoEscopo,
  ): Promise<PermissionScope[]> {
    return this.find({ where: { tipo_escopo_padrao: defaultScopeType } });
  }

  /**
   * Busca escopos por tipo de escopo padrão com permissões relacionadas.
   *
   * @param defaultScopeType Tipo de escopo padrão
   * @returns Lista de escopos encontrados com permissões relacionadas
   */
  async findByDefaultScopeTypeWithPermissions(
    defaultScopeType: TipoEscopo,
  ): Promise<PermissionScope[]> {
    return this.createQueryBuilder('escopo_permissao')
      .leftJoinAndSelect('escopo_permissao.permissao', 'permissao')
      .where('escopo_permissao.tipo_escopo_padrao = :defaultScopeType', {
        defaultScopeType,
      })
      .getMany();
  }

  /**
   * Cria um novo escopo padrão para uma permissão.
   *
   * @param data Dados do escopo a ser criado
   * @returns O escopo criado
   */
  async createPermissionScope(
    data: Partial<PermissionScope>,
  ): Promise<PermissionScope> {
    const permissionScope = this.create(data);
    return this.save(permissionScope);
  }

  /**
   * Atualiza um escopo padrão existente.
   *
   * @param id ID do escopo a ser atualizado
   * @param data Dados atualizados do escopo
   * @returns O escopo atualizado ou null se não encontrado
   */
  async updatePermissionScope(
    id: string,
    data: Partial<PermissionScope>,
  ): Promise<PermissionScope | null> {
    await this.update(id, data);
    return this.findOneBy({ id });
  }

  /**
   * Remove um escopo padrão.
   *
   * @param id ID do escopo a ser removido
   * @returns true se o escopo foi removido, false caso contrário
   */
  async removePermissionScope(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
  }

  /**
   * Remove todos os escopos padrão de uma permissão.
   *
   * @param permissionId ID da permissão
   * @returns true se os escopos foram removidos, false caso contrário
   */
  async removePermissionScopesByPermissionId(
    permissionId: string,
  ): Promise<boolean> {
    const result = await this.delete({ permissao_id: permissionId });
    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
  }
}
