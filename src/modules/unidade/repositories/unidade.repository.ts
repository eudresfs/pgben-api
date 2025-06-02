import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { StatusUnidade, Unidade } from '../../../entities/unidade.entity';
import { EntityNotFoundException } from '../../../shared/exceptions';

/**
 * Repositório de unidades
 *
 * Responsável por operações de acesso a dados relacionadas a unidades
 */
@Injectable()
export class UnidadeRepository {
  private repository: Repository<Unidade>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Unidade);
  }

  /**
   * Busca todas as unidades com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de unidades paginada
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Unidade[], number]> {
    const {
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
    } = options || {};

    return this.repository.findAndCount({
      skip,
      take,
      where,
      order,
    });
  }

  /**
   * Busca uma unidade pelo ID
   * @param id ID da unidade
   * @returns Unidade encontrada ou null
   */
  async findById(id: string): Promise<Unidade | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Busca uma unidade pelo código
   * @param codigo Código da unidade
   * @returns Unidade encontrada ou null
   */
  async findByCodigo(codigo: string): Promise<Unidade | null> {
    return this.repository.findOne({ where: { codigo } });
  }

  /**
   * Cria uma nova unidade
   * @param data Dados da unidade
   * @returns Unidade criada
   */
  async create(data: Partial<Unidade>): Promise<Unidade> {
    const unidade = this.repository.create(data);
    return this.repository.save(unidade);
  }

  /**
   * Atualiza uma unidade existente
   * @param id ID da unidade
   * @param data Dados a serem atualizados
   * @returns Unidade atualizada
   */
  async update(id: string, data: Partial<Unidade>): Promise<Unidade> {
    await this.repository.update(id, data);
    const unidade = await this.findById(id);
    if (!unidade) {
      throw new EntityNotFoundException('Unidade', id);
    }
    return unidade;
  }

  /**
   * Atualiza o status de uma unidade
   * @param id ID da unidade
   * @param status Novo status
   * @returns Unidade atualizada
   */
  async updateStatus(id: string, status: StatusUnidade): Promise<Unidade> {
    await this.repository.update(id, { status });
    const unidade = await this.findById(id);
    if (!unidade) {
      throw new EntityNotFoundException('Unidade', id);
    }
    return unidade;
  }

  /**
   * Remove uma unidade (soft delete)
   * @param id ID da unidade
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
