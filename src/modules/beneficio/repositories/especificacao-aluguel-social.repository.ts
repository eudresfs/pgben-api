import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspecificacaoAluguelSocial } from '../entities/especificacao-aluguel-social.entity';

/**
 * Repositório para gerenciamento da Especificação de Aluguel Social
 * 
 * Fornece métodos para acesso e manipulação das configurações específicas
 * do benefício de Aluguel Social.
 */
@Injectable()
export class EspecificacaoAluguelSocialRepository {
  constructor(
    @InjectRepository(EspecificacaoAluguelSocial)
    private readonly repository: Repository<EspecificacaoAluguelSocial>
  ) {}

  /**
   * Busca uma especificação por ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada ou null
   */
  async findOne(id: string): Promise<EspecificacaoAluguelSocial | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Busca a especificação de aluguel social para um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Especificação do benefício de aluguel social ou null se não existir
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<EspecificacaoAluguelSocial | null> {
    return this.repository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId },
    });
  }

  /**
   * Cria uma nova especificação de aluguel social
   * 
   * @param data Dados da especificação
   * @returns Especificação criada
   */
  async create(data: Partial<EspecificacaoAluguelSocial>): Promise<EspecificacaoAluguelSocial> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Atualiza uma especificação de aluguel social existente
   * 
   * @param id ID da especificação
   * @param data Dados a serem atualizados
   * @returns Especificação atualizada
   * @throws NotFoundException se a especificação não for encontrada
   */
  async update(
    id: string, 
    data: Partial<EspecificacaoAluguelSocial>
  ): Promise<EspecificacaoAluguelSocial> {
    const result = await this.repository.update(id, data);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Aluguel Social com ID ${id} não encontrada`);
    }
    
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('Erro ao buscar a especificação atualizada');
    }
    
    return updated;
  }

  /**
   * Remove uma especificação de aluguel social
   * 
   * @param id ID da especificação
   * @returns true se removido com sucesso
   * @throws NotFoundException se a especificação não for encontrada
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Aluguel Social com ID ${id} não encontrada`);
    }
    
    return result.affected !== undefined && result.affected > 0;
  }
}
