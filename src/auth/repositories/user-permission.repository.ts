import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UserPermission, ScopeType } from '../entities/user-permission.entity';

/**
 * Repositório para a entidade UserPermission.
 * 
 * Fornece métodos para manipulação de permissões atribuídas diretamente a usuários no banco de dados,
 * incluindo busca por usuário, permissão, escopo e operações de CRUD.
 */
@Injectable()
export class UserPermissionRepository extends Repository<UserPermission> {
  constructor(private dataSource: DataSource) {
    super(UserPermission, dataSource.createEntityManager());
  }

  /**
   * Busca permissões por ID de usuário.
   * 
   * @param userId ID do usuário
   * @returns Lista de permissões encontradas
   */
  async findByUserId(userId: string): Promise<UserPermission[]> {
    return this.find({ where: { userId } });
  }

  /**
   * Busca permissões por ID de usuário com permissões relacionadas.
   * 
   * @param userId ID do usuário
   * @returns Lista de permissões encontradas com permissões relacionadas
   */
  async findByUserIdWithPermissions(userId: string): Promise<UserPermission[]> {
    return this.createQueryBuilder('userPermission')
      .leftJoinAndSelect('userPermission.permission', 'permission')
      .where('userPermission.userId = :userId', { userId })
      .getMany();
  }

  /**
   * Busca permissões por ID de permissão.
   * 
   * @param permissionId ID da permissão
   * @returns Lista de permissões encontradas
   */
  async findByPermissionId(permissionId: string): Promise<UserPermission[]> {
    return this.find({ where: { permissionId } });
  }

  /**
   * Busca permissão por ID de usuário, ID de permissão, tipo de escopo e ID de escopo.
   * 
   * @param userId ID do usuário
   * @param permissionId ID da permissão
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo (opcional)
   * @returns A permissão encontrada ou null
   */
  async findByUserAndPermission(
    userId: string,
    permissionId: string,
    scopeType: ScopeType,
    scopeId?: string
  ): Promise<UserPermission | null> {
    return this.findOne({
      where: {
        userId,
        permissionId,
        scopeType,
        ...(scopeId && { scopeId })
      }
    });
  }

  /**
   * Busca permissões por ID de usuário e tipo de escopo.
   * 
   * @param userId ID do usuário
   * @param scopeType Tipo de escopo
   * @returns Lista de permissões encontradas
   */
  async findByUserIdAndScopeType(userId: string, scopeType: ScopeType): Promise<UserPermission[]> {
    return this.find({ where: { userId, scopeType } });
  }

  /**
   * Busca permissões por ID de usuário, tipo de escopo e ID de escopo.
   * 
   * @param userId ID do usuário
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo
   * @returns Lista de permissões encontradas
   */
  async findByUserIdAndScope(userId: string, scopeType: ScopeType, scopeId: string): Promise<UserPermission[]> {
    return this.find({ where: { userId, scopeType, scopeId } });
  }

  /**
   * Busca permissões válidas (não expiradas) por ID de usuário.
   * 
   * @param userId ID do usuário
   * @returns Lista de permissões válidas encontradas
   */
  async findValidByUserId(userId: string): Promise<UserPermission[]> {
    const now = new Date();
    return this.createQueryBuilder('userPermission')
      .leftJoinAndSelect('userPermission.permission', 'permission')
      .where('userPermission.userId = :userId', { userId })
      .andWhere('(userPermission.validUntil IS NULL OR userPermission.validUntil > :now)', { now })
      .getMany();
  }

  /**
   * Cria uma nova permissão para um usuário.
   * 
   * @param data Dados da permissão a ser criada
   * @returns A permissão criada
   */
  async createUserPermission(data: Partial<UserPermission>): Promise<UserPermission> {
    const userPermission = this.create(data);
    return this.save(userPermission);
  }

  /**
   * Atualiza uma permissão existente de um usuário.
   * 
   * @param id ID da permissão a ser atualizada
   * @param data Dados atualizados da permissão
   * @returns A permissão atualizada
   */
  async updateUserPermission(id: string, data: Partial<UserPermission>): Promise<UserPermission | null> {
    await this.update(id, data);
    return this.findOneBy({ id });
  }

  /**
   * Remove uma permissão de um usuário.
   * 
   * @param id ID da permissão a ser removida
   * @returns true se a permissão foi removida, false caso contrário
   */
  async removeUserPermission(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Remove todas as permissões de um usuário.
   * 
   * @param userId ID do usuário
   * @returns true se as permissões foram removidas, false caso contrário
   */
  async removeUserPermissionsByUserId(userId: string): Promise<boolean> {
    const result = await this.delete({ userId });
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Remove todas as permissões de um tipo específico.
   * 
   * @param permissionId ID da permissão
   * @returns true se as permissões foram removidas, false caso contrário
   */
  async removeUserPermissionsByPermissionId(permissionId: string): Promise<boolean> {
    const result = await this.delete({ permissionId });
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Remove todas as permissões de um escopo específico.
   * 
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo
   * @returns true se as permissões foram removidas, false caso contrário
   */
  async removeUserPermissionsByScope(scopeType: ScopeType, scopeId: string): Promise<boolean> {
    const result = await this.delete({ scopeType, scopeId });
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }
}
