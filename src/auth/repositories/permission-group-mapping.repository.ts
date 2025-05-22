import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PermissionGroupMapping } from '../entities/permission-group-mapping.entity';

/**
 * Repositório para a entidade PermissionGroupMapping.
 * 
 * Fornece métodos para manipulação de mapeamentos entre permissões e grupos no banco de dados,
 * incluindo busca por grupo, permissão e operações de CRUD.
 */
@Injectable()
export class PermissionGroupMappingRepository extends Repository<PermissionGroupMapping> {
  constructor(private dataSource: DataSource) {
    super(PermissionGroupMapping, dataSource.createEntityManager());
  }

  /**
   * Busca mapeamentos por ID de grupo.
   * 
   * @param groupId ID do grupo
   * @returns Lista de mapeamentos encontrados
   */
  async findByGroupId(groupId: string): Promise<PermissionGroupMapping[]> {
    return this.find({ where: { groupId } });
  }

  /**
   * Busca mapeamentos por ID de permissão.
   * 
   * @param permissionId ID da permissão
   * @returns Lista de mapeamentos encontrados
   */
  async findByPermissionId(permissionId: string): Promise<PermissionGroupMapping[]> {
    return this.find({ where: { permissionId } });
  }

  /**
   * Busca mapeamento por ID de grupo e ID de permissão.
   * 
   * @param groupId ID do grupo
   * @param permissionId ID da permissão
   * @returns O mapeamento encontrado ou null
   */
  async findByGroupAndPermission(groupId: string, permissionId: string): Promise<PermissionGroupMapping | null> {
    return this.findOne({ where: { groupId, permissionId } });
  }

  /**
   * Cria um novo mapeamento entre grupo e permissão.
   * 
   * @param data Dados do mapeamento a ser criado
   * @returns O mapeamento criado
   */
  async createMapping(data: Partial<PermissionGroupMapping>): Promise<PermissionGroupMapping> {
    const mapping = this.create(data);
    return this.save(mapping);
  }

  /**
   * Remove um mapeamento entre grupo e permissão.
   * 
   * @param id ID do mapeamento a ser removido
   * @returns true se o mapeamento foi removido, false caso contrário
   */
  async removeMapping(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Remove todos os mapeamentos de um grupo.
   * 
   * @param groupId ID do grupo
   * @returns true se os mapeamentos foram removidos, false caso contrário
   */
  async removeMappingsByGroupId(groupId: string): Promise<boolean> {
    const result = await this.delete({ groupId });
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Remove todos os mapeamentos de uma permissão.
   * 
   * @param permissionId ID da permissão
   * @returns true se os mapeamentos foram removidos, false caso contrário
   */
  async removeMappingsByPermissionId(permissionId: string): Promise<boolean> {
    const result = await this.delete({ permissionId });
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }
}
