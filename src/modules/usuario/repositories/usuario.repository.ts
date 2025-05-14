import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../entities/usuario.entity';

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
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Usuario[], number]> {
    const { skip = 0, take = 10, where = {}, order = { createdAt: 'DESC' } } = options || {};
    
    return this.repository.findAndCount({
      skip,
      take,
      where,
      order,
    });
  }

  /**
   * Busca um usuário pelo ID
   * @param id ID do usuário
   * @returns Usuário encontrado ou null
   */
  async findById(id: string): Promise<Usuario | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Busca um usuário pelo email
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.repository.findOne({ where: { email } });
  }

  /**
   * Busca um usuário pelo CPF
   * @param cpf CPF do usuário
   * @returns Usuário encontrado ou null
   */
  async findByCpf(cpf: string): Promise<Usuario | null> {
    return this.repository.findOne({ where: { cpf } });
  }

  /**
   * Busca um usuário pela matrícula
   * @param matricula Matrícula do usuário
   * @returns Usuário encontrado ou null
   */
  async findByMatricula(matricula: string): Promise<Usuario | null> {
    return this.repository.findOne({ where: { matricula } });
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
    await this.repository.update(id, data);
    const usuario = await this.findById(id);
    if (!usuario) {
      throw new Error(`Usuário com ID ${id} não encontrado`);
    }
    return usuario;
  }

  /**
   * Atualiza o status de um usuário
   * @param id ID do usuário
   * @param status Novo status
   * @returns Usuário atualizado
   */
  async updateStatus(id: string, status: string): Promise<Usuario> {
    await this.repository.update(id, { status });
    const usuario = await this.findById(id);
    if (!usuario) {
      throw new Error(`Usuário com ID ${id} não encontrado`);
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
    await this.repository.update(id, { senhaHash, primeiro_acesso: false });
    const usuario = await this.findById(id);
    if (!usuario) {
      throw new Error(`Usuário com ID ${id} não encontrado`);
    }
    return usuario;
  }

  /**
   * Remove um usuário (soft delete)
   * @param id ID do usuário
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
