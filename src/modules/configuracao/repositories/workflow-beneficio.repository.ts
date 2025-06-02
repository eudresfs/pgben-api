import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowBeneficio } from '../../../entities';

/**
 * Repositório para gerenciamento de workflows de benefícios
 * 
 * Fornece operações de acesso a dados para entidade WorkflowBeneficio
 */
@Injectable()
export class WorkflowBeneficioRepository {
  constructor(
    @InjectRepository(WorkflowBeneficio)
    private readonly repository: Repository<WorkflowBeneficio>,
  ) {}

  /**
   * Encontra um workflow pelo ID do tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Workflow encontrado ou null
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<WorkflowBeneficio | null> {
    return this.repository.findOne({ where: { tipo_beneficio_id: tipoBeneficioId } });
  }

  /**
   * Busca todos os workflows de benefício
   * @returns Lista de workflows
   */
  async findAll(): Promise<WorkflowBeneficio[]> {
    return this.repository.find({ 
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Salva um workflow no banco de dados
   * @param workflow Workflow a ser salvo
   * @returns Workflow salvo
   */
  async save(workflow: WorkflowBeneficio): Promise<WorkflowBeneficio> {
    return this.repository.save(workflow);
  }

  /**
   * Remove um workflow do banco de dados
   * @param id ID do workflow a ser removido
   */
  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Verifica se existe um workflow para o tipo de benefício especificado
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns true se existir, false caso contrário
   */
  async existsByTipoBeneficio(tipoBeneficioId: string): Promise<boolean> {
    const count = await this.repository.count({ 
      where: { tipo_beneficio_id: tipoBeneficioId } 
    });
    return count > 0;
  }
}
