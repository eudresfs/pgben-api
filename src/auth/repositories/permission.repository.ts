import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Permission } from '../../entities/permission.entity';

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
    try {
      // Usar SQL nativo para evitar problemas com nomes de colunas
      const result = await this.dataSource.manager.query(
        `SELECT * FROM permissao WHERE nome = $1 LIMIT 1`,
        [name]
      );

      if (!result || result.length === 0) {
        return null;
      }

      // Converter o resultado para uma entidade Permission usando o método auxiliar
      return this.toEntity(result[0]);
    } catch (error) {
      console.error('Erro ao buscar permissão por nome:', error);
      return null;
    }
  }

  /**
   * Busca permissões por um padrão de nome (usando LIKE).
   * Útil para buscar permissões compostas como `modulo.*`.
   * 
   * @param pattern Padrão de nome para busca (ex: 'cidadao.%')
   * @returns Lista de permissões que correspondem ao padrão
   */
  async findByPattern(pattern: string): Promise<Permission[]> {
    try {
      // Usar SQL nativo para evitar problemas com nomes de colunas
      const result = await this.dataSource.manager.query(
        `SELECT * FROM permissao WHERE nome LIKE $1`,
        [pattern]
      );

      if (!result || result.length === 0) {
        return [];
      }

      // Converter o resultado para entidades Permission usando o método auxiliar
      return result.map(row => this.toEntity(row));
    } catch (error) {
      console.error('Erro ao buscar permissões por padrão:', error);
      return [];
    }
  }

  /**
   * Busca todas as permissões compostas (aquelas com nomes que contém '*').
   * 
   * @returns Lista de permissões compostas
   */
  async findAllComposite(): Promise<Permission[]> {
    try {
      // Usar SQL nativo para evitar problemas com nomes de colunas
      // Identificamos permissões compostas pelo padrão do nome (contendo '*')
      const result = await this.dataSource.manager.query(
        `SELECT * FROM permissao WHERE nome LIKE '%.*%'`
      );

      if (!result || result.length === 0) {
        return [];
      }

      // Converter o resultado para entidades Permission usando o método auxiliar
      return result.map(row => this.toEntity(row));
    } catch (error) {
      console.error('Erro ao buscar permissões compostas:', error);
      return [];
    }
  }

  /**
   * Busca todas as permissões de um módulo específico.
   * 
   * @param moduleName Nome do módulo
   * @returns Lista de permissões do módulo
   */
  async findByModule(moduleName: string): Promise<Permission[]> {
    try {
      // Usar SQL nativo para evitar problemas com nomes de colunas
      const result = await this.dataSource.manager.query(
        `SELECT * FROM permissao WHERE modulo = $1`,
        [moduleName]
      );

      if (!result || result.length === 0) {
        return [];
      }

      // Converter o resultado para entidades Permission usando o método auxiliar
      return result.map(row => this.toEntity(row));
    } catch (error) {
      console.error(`Erro ao buscar permissões do módulo ${moduleName}:`, error);
      return [];
    }
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
  /**
   * Converte um objeto de resultado de consulta SQL em uma entidade Permission
   * 
   * @param row Linha de resultado da consulta SQL
   * @returns Entidade Permission
   */
  private toEntity(row: any): Permission {
    const permission = new Permission();
    permission.id = row.id;
    permission.nome = row.nome;
    permission.descricao = row.descricao;
    
    // Campos adicionais que existem no banco mas não na entidade
    // usamos casting para any para evitar erros de typescript
    (permission as any).modulo = row.modulo;
    (permission as any).acao = row.acao;
    (permission as any).ativo = row.ativo;
    
    permission.created_at = row.created_at;
    permission.updated_at = row.updated_at;
    return permission;
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    
    try {
      // Usar SQL nativo para evitar problemas com nomes de colunas
      const result = await this.dataSource.manager.query(
        `SELECT * FROM permissao WHERE id = ANY($1)`,
        [ids]
      );

      if (!result || result.length === 0) {
        return [];
      }

      // Converter o resultado para entidades Permission usando o método auxiliar
      return result.map(row => this.toEntity(row));
    } catch (error) {
      console.error('Erro ao buscar permissões por IDs:', error);
      return [];
    }
  }
}
