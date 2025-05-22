import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspecificacaoNatalidade } from '../entities/especificacao-natalidade.entity';

/**
 * Repositório para gerenciamento da Especificação de Auxílio Natalidade
 * 
 * Fornece métodos para acesso e manipulação das configurações específicas
 * do benefício de Auxílio Natalidade.
 */
@Injectable()
export class EspecificacaoNatalidadeRepository {
  constructor(
    @InjectRepository(EspecificacaoNatalidade)
    private readonly repository: Repository<EspecificacaoNatalidade>
  ) {}

  /**
   * Busca uma especificação por ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada ou null
   */
  async findOne(id: string): Promise<EspecificacaoNatalidade | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Busca a especificação de natalidade para um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Especificação do benefício de natalidade ou null se não existir
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<EspecificacaoNatalidade | null> {
    return this.repository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId },
    });
  }

  /**
   * Cria uma nova especificação de natalidade
   * 
   * @param data Dados da especificação
   * @returns Especificação criada
   */
  async create(data: Partial<EspecificacaoNatalidade>): Promise<EspecificacaoNatalidade> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Atualiza uma especificação de natalidade existente
   * 
   * @param id ID da especificação
   * @param data Dados a serem atualizados
   * @returns Especificação atualizada
   * @throws NotFoundException se a especificação não for encontrada
   */
  async update(
    id: string, 
    data: Partial<EspecificacaoNatalidade>
  ): Promise<EspecificacaoNatalidade> {
    const result = await this.repository.update(id, data);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Natalidade com ID ${id} não encontrada`);
    }
    
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('Erro ao buscar a especificação atualizada');
    }
    
    return updated;
  }

  /**
   * Remove uma especificação de natalidade
   * 
   * @param id ID da especificação
   * @returns true se removido com sucesso
   * @throws NotFoundException se a especificação não for encontrada
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Natalidade com ID ${id} não encontrada`);
    }
    
    return result.affected !== undefined && result.affected > 0;
  }
}
