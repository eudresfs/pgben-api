import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspecificacaoCestaBasica } from '../entities/especificacao-cesta-basica.entity';
import { CreateEspecificacaoCestaBasicaDto } from '../dto/create-especificacao-cesta-basica.dto';
import { NotFoundException } from '@nestjs/common';

/**
 * Repositório para gerenciar as especificações da Cesta Básica
 */
@Injectable()
export class EspecificacaoCestaBasicaRepository {
  constructor(
    @InjectRepository(EspecificacaoCestaBasica)
    private readonly repository: Repository<EspecificacaoCestaBasica>,
  ) {}

  /**
   * Cria uma nova especificação de Cesta Básica
   * 
   * @param createDto DTO com os dados para criação
   * @returns A especificação criada
   */
  async create(createDto: CreateEspecificacaoCestaBasicaDto): Promise<EspecificacaoCestaBasica> {
    const entity = this.repository.create(createDto);
    return this.repository.save(entity);
  }

  /**
   * Busca uma especificação pelo ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada ou null
   */
  async findOne(id: string): Promise<EspecificacaoCestaBasica | null> {
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
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<EspecificacaoCestaBasica | null> {
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
  async update(id: string, updateData: Partial<EspecificacaoCestaBasica>): Promise<EspecificacaoCestaBasica> {
    const result = await this.repository.update(id, updateData);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Especificação de Cesta Básica com ID ${id} não encontrada`);
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
      throw new NotFoundException(`Especificação de Cesta Básica com ID ${id} não encontrada`);
    }
    
    return result.affected !== undefined && result.affected > 0;
  }
}
