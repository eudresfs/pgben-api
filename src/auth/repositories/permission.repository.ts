import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Permission } from '../entities/permission.entity';

/**
 * Repositório para a entidade Permission.
 * 
 * Fornece métodos para manipulação de permissões no banco de dados,
 * incluindo busca por nome, verificação de permissões compostas e
 * operações de CRUD.
 */
@Injectable()
export class PermissionRepository extends Repository<Permission> {
  constructor(private dataSource: DataSource) {
    super(Permission, dataSource.createEntityManager());
  }

  /**
   * Busca uma permissão pelo nome.
   * 
   * @param name Nome da permissão no formato `modulo.recurso.operacao`
   * @returns A permissão encontrada ou null
   */
  async findByName(name: string): Promise<Permission | null> {
    return this.findOne({ where: { name } });
  }

  /**
   * Busca permissões por um padrão de nome (usando LIKE).
   * Útil para buscar permissões compostas como `modulo.*`.
   * 
   * @param pattern Padrão de nome para busca (ex: 'cidadao.%')
   * @returns Lista de permissões que correspondem ao padrão
   */
  async findByPattern(pattern: string): Promise<Permission[]> {
    return this.createQueryBuilder('permission')
      .where('permission.name LIKE :pattern', { pattern })
      .getMany();
  }

  /**
   * Busca todas as permissões compostas.
   * 
   * @returns Lista de permissões compostas
   */
  async findAllComposite(): Promise<Permission[]> {
    return this.find({ where: { isComposite: true } });
  }

  /**
   * Busca todas as permissões filhas de uma permissão composta.
   * 
   * @param parentId ID da permissão pai
   * @returns Lista de permissões filhas
   */
  async findChildrenByParentId(parentId: string): Promise<Permission[]> {
    return this.find({ where: { parentId } });
  }

  /**
   * Cria uma nova permissão.
   * 
   * @param data Dados da permissão a ser criada
   * @returns A permissão criada
   */
  async createPermission(data: Partial<Permission>): Promise<Permission> {
    const permission = this.create(data);
    return this.save(permission);
  }

  /**
   * Atualiza uma permissão existente.
   * 
   * @param id ID da permissão a ser atualizada
   * @param data Dados atualizados da permissão
   * @returns A permissão atualizada
   */
  async updatePermission(id: string, data: Partial<Permission>): Promise<Permission | null> {
    await this.update(id, data);
    return this.findOneBy({ id });
  }

  /**
   * Remove uma permissão.
   * 
   * @param id ID da permissão a ser removida
   * @returns true se a permissão foi removida, false caso contrário
   */
  async removePermission(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }

  /**
   * Busca permissões por IDs.
   * 
   * @param ids Lista de IDs das permissões
   * @returns Lista de permissões encontradas
   */
  async findByIds(ids: string[]): Promise<Permission[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.createQueryBuilder('permission')
      .where('permission.id IN (:...ids)', { ids })
      .getMany();
  }
}
