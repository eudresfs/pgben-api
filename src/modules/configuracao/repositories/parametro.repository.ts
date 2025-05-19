import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parametro } from '../entities/parametro.entity';

/**
 * Repositório para gerenciamento de parâmetros do sistema
 * 
 * Fornece operações de acesso a dados para entidade Parametro
 */
@Injectable()
export class ParametroRepository {
  constructor(
    @InjectRepository(Parametro)
    private readonly repository: Repository<Parametro>,
  ) {}

  /**
   * Encontra um parâmetro por sua chave
   * @param chave Chave do parâmetro
   * @returns Parâmetro encontrado ou null
   */
  async findByChave(chave: string): Promise<Parametro | null> {
    return this.repository.findOne({ where: { chave } });
  }

  /**
   * Busca todos os parâmetros do sistema
   * @param categoria Categoria opcional para filtrar parâmetros
   * @returns Lista de parâmetros
   */
  async findAll(categoria?: string): Promise<Parametro[]> {
    const whereClause = categoria ? { categoria } : {};
    return this.repository.find({ 
      where: whereClause,
      order: { categoria: 'ASC', chave: 'ASC' }
    });
  }

  /**
   * Salva um parâmetro no banco de dados
   * @param parametro Parâmetro a ser salvo
   * @returns Parâmetro salvo
   */
  async save(parametro: Parametro): Promise<Parametro> {
    return this.repository.save(parametro);
  }

  /**
   * Remove um parâmetro do banco de dados
   * @param id ID do parâmetro a ser removido
   */
  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Busca parâmetros por categoria
   * @param categoria Categoria dos parâmetros
   * @returns Lista de parâmetros da categoria
   */
  async findByCategoria(categoria: string): Promise<Parametro[]> {
    return this.repository.find({ 
      where: { categoria },
      order: { chave: 'ASC' }
    });
  }

  /**
   * Verifica se existe um parâmetro com a chave especificada
   * @param chave Chave do parâmetro
   * @returns true se existir, false caso contrário
   */
  async existsByChave(chave: string): Promise<boolean> {
    const count = await this.repository.count({ where: { chave } });
    return count > 0;
  }
}
