import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Setor } from '../entities/setor.entity';

/**
 * Repositório de setores
 * 
 * Responsável por operações de acesso a dados relacionadas a setores
 */
@Injectable()
export class SetorRepository {
  private repository: Repository<Setor>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Setor);
  }

  /**
   * Busca todos os setores com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de setores paginada
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Setor[], number]> {
    const { skip = 0, take = 10, where = {}, order = { createdAt: 'DESC' } } = options || {};
    
    return this.repository.findAndCount({
      skip,
      take,
      where,
      order,
    });
  }

  /**
   * Busca um setor pelo ID
   * @param id ID do setor
   * @returns Setor encontrado ou null
   */
  async findById(id: string): Promise<Setor | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Busca setores por unidade
   * @param unidadeId ID da unidade
   * @returns Lista de setores da unidade
   */
  async findByUnidadeId(unidadeId: string): Promise<Setor[]> {
    return this.repository.find({ 
      where: { unidadeId },
      order: { nome: 'ASC' }
    });
  }

  /**
   * Cria um novo setor
   * @param data Dados do setor
   * @returns Setor criado
   */
  async create(data: Partial<Setor>): Promise<Setor> {
    const setor = this.repository.create(data);
    return this.repository.save(setor);
  }

  /**
   * Atualiza um setor existente
   * @param id ID do setor
   * @param data Dados a serem atualizados
   * @returns Setor atualizado
   */
  async update(id: string, data: Partial<Setor>): Promise<Setor> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  /**
   * Remove um setor (soft delete)
   * @param id ID do setor
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
