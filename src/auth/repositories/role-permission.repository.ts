import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';

/**
 * Repositório para a entidade RolePermission.
 * 
 * Fornece métodos para manipulação de mapeamentos entre roles e permissões no banco de dados,
 * incluindo busca por role, permissão e operações de CRUD.
 */
@Injectable()
export class RolePermissionRepository extends Repository<RolePermission> {
  constructor(private dataSource: DataSource) {
    super(RolePermission, dataSource.createEntityManager());
  }

  /**
   * Busca mapeamentos por ID de role.
   * 
   * @param roleId ID da role
   * @returns Lista de mapeamentos encontrados
   */
  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    return this.find({ where: { roleId } });
  }

  /**
   * Busca mapeamentos por ID de permissão.
   * 
   * @param permissionId ID da permissão
   * @returns Lista de mapeamentos encontrados
   */
  async findByPermissionId(permissionId: string): Promise<RolePermission[]> {
    return this.find({ where: { permissionId } });
  }

  /**
   * Busca mapeamento por ID de role e ID de permissão.
   * 
   * @param roleId ID da role
   * @param permissionId ID da permissão
   * @returns O mapeamento encontrado ou null
   */
  async findByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermission | null> {
    return this.findOne({ where: { roleId, permissionId } });
  }

  /**
   * Busca mapeamentos por ID de role com permissões relacionadas.
   * 
   * @param roleId ID da role
   * @returns Lista de mapeamentos encontrados com permissões relacionadas
   */
  async findByRoleIdWithPermissions(roleId: string): Promise<RolePermission[]> {
    return this.createQueryBuilder('rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('rolePermission.roleId = :roleId', { roleId })
      .getMany();
  }

  /**
   * Cria um novo mapeamento entre role e permissão.
   * 
   * @param data Dados do mapeamento a ser criado
   * @returns O mapeamento criado
   */
  async createMapping(data: Partial<RolePermission>): Promise<RolePermission> {
    const mapping = this.create(data);
    return this.save(mapping);
  }

  /**
   * Remove um mapeamento entre role e permissão.
   * 
   * @param id ID do mapeamento a ser removido
   * @returns true se o mapeamento foi removido, false caso contrário
   */
  async removeMapping(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Remove todos os mapeamentos de uma role.
   * 
   * @param roleId ID da role
   * @returns true se os mapeamentos foram removidos, false caso contrário
   */
  async removeMappingsByRoleId(roleId: string): Promise<boolean> {
    const result = await this.delete({ roleId });
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

  /**
   * Busca permissões associadas às roles de um usuário.
   * 
   * @param userId ID do usuário
   * @returns Lista de permissões associadas às roles do usuário
   */
  async findPermissionsByUserRoles(userId: string): Promise<Permission[]> {
    // Busca as permissões associadas às roles do usuário
    const permissions = await this.createQueryBuilder('rolePermission')
      .innerJoin('usuario_role', 'ur', 'ur.role_id = rolePermission.role_id')
      .innerJoinAndSelect('rolePermission.permission', 'permission')
      .where('ur.user_id = :userId', { userId })
      .getMany();

    // Retorna apenas as permissões
    return permissions.map(rp => rp.permission);
  }
}
