import { Repository, DataSource, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { RolePermission } from '../../entities/role-permission.entity';
import { Permission } from '../../entities/permission.entity';
import { Usuario } from '../../entities/usuario.entity';

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
   * Busca mapeamentos por ID de role com cache.
   *
   * @param roleId ID da role
   * @returns Lista de mapeamentos encontrados
   */
  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    return this.find({
      where: { role_id: roleId },
      cache: {
        id: `role_mappings_${roleId}`,
        milliseconds: 300000, // 5 minutos
      },
    });
  }

  /**
   * Busca mapeamentos por múltiplos IDs de role.
   *
   * @param roleIds IDs das roles
   * @returns Lista de mapeamentos encontrados
   */
  async findByRoleIds(roleIds: string[]): Promise<RolePermission[]> {
    if (roleIds.length === 0) {
      return [];
    }

    return this.find({
      where: { role_id: In(roleIds) },
      cache: {
        id: `role_mappings_multiple_${roleIds.sort().join('_')}`,
        milliseconds: 300000, // 5 minutos
      },
    });
  }

  /**
   * Busca mapeamentos por ID de permissão com cache.
   *
   * @param permissionId ID da permissão
   * @returns Lista de mapeamentos encontrados
   */
  async findByPermissionId(permissionId: string): Promise<RolePermission[]> {
    return this.find({
      where: { permissao_id: permissionId },
      cache: {
        id: `permission_mappings_${permissionId}`,
        milliseconds: 300000, // 5 minutos
      },
    });
  }

  /**
   * Busca mapeamento por ID de role e ID de permissão.
   *
   * @param roleId ID da role
   * @param permissionId ID da permissão
   * @returns O mapeamento encontrado ou null
   */
  async findByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return this.findOne({
      where: { role_id: roleId, permissao_id: permissionId },
      cache: {
        id: `role_permission_${roleId}_${permissionId}`,
        milliseconds: 300000, // 5 minutos
      },
    });
  }

  /**
   * Busca mapeamentos por ID de role com permissões relacionadas.
   *
   * @param roleId ID da role
   * @returns Lista de mapeamentos encontrados com permissões relacionadas
   */
  async findByRoleIdWithPermissions(roleId: string): Promise<RolePermission[]> {
    return this.createQueryBuilder('role_permissao')
      .leftJoinAndSelect('role_permissao.permissao', 'permissao')
      .where('role_permissao.role_id = :roleId', { roleId })
      .cache(`role_permissions_detailed_${roleId}`, 300000)
      .getMany();
  }

  /**
   * Cria um novo mapeamento entre role e permissão.
   *
   * @param data Dados do mapeamento a ser criado
   * @returns O mapeamento criado
   */
  async createMapping(data: Partial<RolePermission>): Promise<RolePermission> {
    // Verifica se já existe o mapeamento
    if (data.role_id && data.permissao_id) {
      const existing = await this.findByRoleAndPermission(
        data.role_id,
        data.permissao_id,
      );
      if (existing) {
        return existing;
      }
    }

    const mapping = this.create(data);
    const saved = await this.save(mapping);

    // Limpa cache relacionado
    if (data.role_id) {
      await this.clearCacheForRole(data.role_id);
    }
    if (data.permissao_id) {
      await this.clearCacheForPermission(data.permissao_id);
    }

    return saved;
  }

  /**
   * Cria múltiplos mapeamentos em batch
   *
   * @param mappings Lista de mapeamentos a serem criados
   * @returns Lista de mapeamentos criados
   */
  async createMultipleMappings(
    mappings: Partial<RolePermission>[],
  ): Promise<RolePermission[]> {
    if (mappings.length === 0) {
      return [];
    }

    const entities = mappings.map((mapping) => this.create(mapping));
    const saved = await this.save(entities);

    // Limpa cache para todas as roles e permissões afetadas
    const uniqueRoleIds = [
      ...new Set(mappings.map((m) => m.role_id).filter(Boolean)),
    ];
    const uniquePermissionIds = [
      ...new Set(mappings.map((m) => m.permissao_id).filter(Boolean)),
    ];

    await Promise.all([
      ...uniqueRoleIds.map((roleId) => this.clearCacheForRole(roleId!)),
      ...uniquePermissionIds.map((permissionId) =>
        this.clearCacheForPermission(permissionId!),
      ),
    ]);

    return saved;
  }

  /**
   * Remove um mapeamento entre role e permissão.
   *
   * @param id ID do mapeamento a ser removido
   * @returns true se o mapeamento foi removido, false caso contrário
   */
  async removeMapping(id: string): Promise<boolean> {
    // Busca o mapeamento antes de remover para limpar cache
    const mapping = await this.findOne({ where: { id } });

    const result = await this.delete(id);
    const removed =
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0;

    // Limpa cache se removido com sucesso
    if (removed && mapping) {
      await this.clearCacheForRole(mapping.role_id);
      await this.clearCacheForPermission(mapping.permissao_id);
    }

    return removed;
  }

  /**
   * Remove todos os mapeamentos de uma role.
   *
   * @param roleId ID da role
   * @returns true se os mapeamentos foram removidos, false caso contrário
   */
  async removeMappingsByRoleId(roleId: string): Promise<boolean> {
    // Busca os mapeamentos antes de remover para limpar cache das permissões
    const mappings = await this.findByRoleId(roleId);

    const result = await this.delete({ role_id: roleId });
    const removed =
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0;

    // Limpa cache se removido com sucesso
    if (removed) {
      await this.clearCacheForRole(roleId);
      // Limpa cache das permissões afetadas
      const uniquePermissionIds = [
        ...new Set(mappings.map((m) => m.permissao_id)),
      ];
      await Promise.all(
        uniquePermissionIds.map((permissionId) =>
          this.clearCacheForPermission(permissionId),
        ),
      );
    }

    return removed;
  }

  /**
   * Remove todos os mapeamentos de uma permissão.
   *
   * @param permissionId ID da permissão
   * @returns true se os mapeamentos foram removidos, false caso contrário
   */
  async removeMappingsByPermissionId(permissionId: string): Promise<boolean> {
    // Busca os mapeamentos antes de remover para limpar cache das roles
    const mappings = await this.findByPermissionId(permissionId);

    const result = await this.delete({ permissao_id: permissionId });
    const removed =
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0;

    // Limpa cache se removido com sucesso
    if (removed) {
      await this.clearCacheForPermission(permissionId);
      // Limpa cache das roles afetadas
      const uniqueRoleIds = [...new Set(mappings.map((m) => m.role_id))];
      await Promise.all(
        uniqueRoleIds.map((roleId) => this.clearCacheForRole(roleId)),
      );
    }

    return removed;
  }

  /**
   * Busca permissões associadas às roles de um usuário.
   *
   * @param userId ID do usuário
   * @returns Lista de permissões associadas às roles do usuário
   */
  async findPermissionsByUserRoles(userId: string): Promise<Permission[]> {
    try {
      // Query otimizada com JOIN único para buscar permissões do usuário
      const permissions = await this.dataSource.manager
        .createQueryBuilder(Permission, 'p')
        .innerJoin('role_permissao', 'rp', 'p.id = rp.permissao_id')
        .innerJoin('usuario', 'u', 'u.role_id = rp.role_id')
        .where('u.id = :userId', { userId })
        .orderBy('p.nome', 'ASC')
        .cache(`user_role_permissions_${userId}`, 300000) // Cache por 5 minutos
        .getMany();

      return permissions;
    } catch (error) {
      console.error('Erro ao buscar permissões do usuário:', error);
      return [];
    }
  }

  /**
   * Busca permissões por múltiplas roles
   *
   * @param roleIds IDs das roles
   * @returns Lista de permissões únicas
   */
  async findPermissionsByRoleIds(roleIds: string[]): Promise<Permission[]> {
    if (roleIds.length === 0) {
      return [];
    }

    return this.createQueryBuilder('role_permissao')
      .leftJoinAndSelect('role_permissao.permissao', 'permissao')
      .where('role_permissao.role_id IN (:...roleIds)', { roleIds })
      .cache(`permissions_roles_${roleIds.sort().join('_')}`, 300000)
      .getMany()
      .then((mappings) => {
        const uniquePermissions = new Map<string, Permission>();
        mappings.forEach((mapping) => {
          if (
            mapping.permissao &&
            !uniquePermissions.has(mapping.permissao.id)
          ) {
            uniquePermissions.set(mapping.permissao.id, mapping.permissao);
          }
        });
        return Array.from(uniquePermissions.values());
      });
  }

  /**
   * Limpa cache relacionado a uma role
   */
  private async clearCacheForRole(roleId: string): Promise<void> {
    try {
      // Limpa cache usando o query cache do TypeORM
      await this.dataSource.queryResultCache?.remove([
        `role_permissions_${roleId}`,
        `permissions_roles_${roleId}`,
      ]);
    } catch (error) {
      // Cache clearing é opcional, não deve quebrar a operação
      console.warn('Erro ao limpar cache da role:', error);
    }
  }

  /**
   * Limpa cache relacionado a uma permissão
   */
  private async clearCacheForPermission(permissionId: string): Promise<void> {
    try {
      // Limpa cache usando o query cache do TypeORM
      await this.dataSource.queryResultCache?.remove([
        `permission_roles_${permissionId}`,
      ]);
    } catch (error) {
      // Cache clearing é opcional, não deve quebrar a operação
      console.warn('Erro ao limpar cache da permissão:', error);
    }
  }
}
