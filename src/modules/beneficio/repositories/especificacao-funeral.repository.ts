import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspecificacaoFuneral } from '../entities/especificacao-funeral.entity';
import { CreateEspecificacaoFuneralDto } from '../dto/create-especificacao-funeral.dto';

/**
 * Repositório para gerenciar as especificações do Auxílio Funeral
 */
@Injectable()
export class EspecificacaoFuneralRepository {
  constructor(
    @InjectRepository(EspecificacaoFuneral)
    private readonly repository: Repository<EspecificacaoFuneral>,
  ) {}

  /**
   * Cria uma nova especificação de Auxílio Funeral
   * 
   * @param createDto DTO com os dados para criação
   * @returns A especificação criada
   */
  async create(createDto: CreateEspecificacaoFuneralDto): Promise<EspecificacaoFuneral> {
    const entity = this.repository.create(createDto);
    return this.repository.save(entity);
  }

  /**
   * Busca uma especificação pelo ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada ou null
   */
  async findOne(id: string): Promise<EspecificacaoFuneral | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Busca uma especificação pelo ID do tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns A especificação encontrada ou null
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<EspecificacaoFuneral | null> {
    return this.repository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId },
    });
  }

  /**
   * Atualiza uma especificação existente
   * 
   * @param id ID da especificação
   * @param updateData Dados para atualização
   * @returns A especificação atualizada
   * @throws NotFoundException se a especificação não for encontrada
   */
  async update(id: string, updateData: Partial<EspecificacaoFuneral>): Promise<EspecificacaoFuneral> {
    const result = await this.repository.update(id, updateData);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Auxílio Funeral com ID ${id} não encontrada`);
    }
    
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(`Erro ao buscar a especificação atualizada`);
    }
    
    return updated;
  }

  /**
   * Remove uma especificação
   * 
   * @param id ID da especificação
   * @returns true se removido com sucesso
   * @throws NotFoundException se a especificação não for encontrada
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Auxílio Funeral com ID ${id} não encontrada`);
    }
    
    return result.affected !== undefined && result.affected > 0;
  }
}
