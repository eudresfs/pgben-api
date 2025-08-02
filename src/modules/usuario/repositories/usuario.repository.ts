import { Injectable } from '@nestjs/common';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../../../entities/usuario.entity';
import { Status } from '../../../enums/status.enum';
import { throwUserNotFound } from '../../../shared/exceptions/error-catalog/domains/usuario.errors';

/**
 * Repositório de usuários
 *
 * Responsável por operações de acesso a dados relacionadas a usuários
 */
@Injectable()
export class UsuarioRepository {
  private repository: Repository<Usuario>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Usuario);
  }

  /**
   * Busca todos os usuários com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de usuários paginada
   */
  async findAll(options?: {
    relations?: boolean;
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Usuario[], number]> {
    const {
      relations = false,
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
    } = options || {};

    const queryBuilder = this.repository.createQueryBuilder('usuario');

    if (relations) {
      queryBuilder
        .leftJoinAndSelect('usuario.unidade', 'unidade')
        .leftJoinAndSelect('usuario.role', 'role');
    }

    // Aplicar filtros where se fornecidos
    if (where && Object.keys(where).length > 0) {
      queryBuilder.where(where);
    }

    // Aplicar ordenação com prefixo correto da tabela
    if (order && Object.keys(order).length > 0) {
      const orderEntries = Object.entries(order);
      orderEntries.forEach(([field, direction], index) => {
        const columnName = field.includes('.') ? field : `usuario.${field}`;
        if (index === 0) {
          queryBuilder.orderBy(columnName, direction as 'ASC' | 'DESC');
        } else {
          queryBuilder.addOrderBy(columnName, direction as 'ASC' | 'DESC');
        }
      });
    }

    queryBuilder.skip(skip).take(take);

    return queryBuilder.getManyAndCount();
  }

  /**
   * Busca um usuário pelo ID
   * @param id ID do usuário
   * @returns Usuário encontrado
   * @throws UsuarioError quando usuário não encontrado
   */
  async findById(id: string): Promise<Usuario> {
    const usuario = await this.repository.findOne({
      where: { id },
      relations: ['role', 'unidade', 'setor'],
    });

    if (!usuario) {
      throwUserNotFound(id);
    }

    return usuario;
  }

  /**
   * Busca um usuário pelo email
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Busca um usuário pelo CPF
   * @param cpf CPF do usuário
   * @returns Usuário encontrado ou null
   */
  async findByCpf(cpf: string): Promise<Usuario | null> {
    return this.repository.findOne({
      where: { cpf },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Busca um usuário pela matrícula
   * @param matricula Matrícula do usuário
   * @returns Usuário encontrado ou null
   */
  async findByMatricula(matricula: string): Promise<Usuario | null> {
    return this.repository.findOne({
      where: { matricula },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Cria um novo usuário
   * @param data Dados do usuário
   * @returns Usuário criado
   */
  async create(data: Partial<Usuario>): Promise<Usuario> {
    const usuario = this.repository.create(data);
    return this.repository.save(usuario);
  }

  /**
   * Atualiza um usuário existente
   * @param id ID do usuário
   * @param data Dados a serem atualizados
   * @returns Usuário atualizado
   */
  async update(id: string, data: Partial<Usuario>): Promise<Usuario> {
    const result = await this.repository.update(id, data);
    if (result.affected === 0) {
      throwUserNotFound(id);
    }
    const usuario = await this.findById(id);
    if (!usuario) {
      throwUserNotFound(id);
    }
    return usuario;
  }

  /**
   * Atualiza o status de um usuário
   * @param id ID do usuário
   * @param status Novo status
   * @returns Usuário atualizado
   */
  async updateStatus(id: string, status: Status): Promise<Usuario> {
    const dadosAtualizacao: DeepPartial<Usuario> = { status };

    await this.repository.update(id, dadosAtualizacao);
    const usuario = await this.findById(id);
    if (!usuario) {
      throwUserNotFound(id);
    }
    return usuario;
  }

  /**
   * Atualiza a senha de um usuário
   * @param id ID do usuário
   * @param senhaHash Hash da nova senha
   * @returns Usuário atualizado
   */
  async updateSenha(id: string, senhaHash: string): Promise<Usuario> {
    const dadosAtualizacao: DeepPartial<Usuario> = {
      senhaHash,
      primeiro_acesso: false,
    };

    await this.repository.update(id, dadosAtualizacao);
    const usuario = await this.findById(id);
    if (!usuario) {
      throwUserNotFound(id);
    }
    return usuario;
  }

  /**
   * Remove um usuário (soft delete)
   * @param id ID do usuário
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    const result = await this.repository.softDelete(id);
    if (result.affected === 0) {
      throwUserNotFound(id);
    }
  }

  /**
   * Conta o total de usuários
   * @param where Condições de filtro
   * @returns Número total de usuários
   */
  async count(where?: any): Promise<number> {
    return this.repository.count({ where });
  }
}
