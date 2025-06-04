import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoDinamicoBeneficio } from '../../../entities/campo-dinamico-beneficio.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';

/**
 * Repositório para gerenciamento de campos dinâmicos de benefícios
 */
@Injectable()
export class CampoDinamicoRepository {
  constructor(
    @InjectRepository(CampoDinamicoBeneficio)
    private readonly campoDinamicoRepository: Repository<CampoDinamicoBeneficio>,
  ) {}

  /**
   * Encontra todos os campos dinâmicos
   * @returns Lista de campos dinâmicos
   */
  async findAll(): Promise<CampoDinamicoBeneficio[]> {
    return this.campoDinamicoRepository.find({
      order: {
        ordem: 'ASC',
      },
    });
  }

  /**
   * Encontra um campo dinâmico pelo ID
   * @param id ID do campo dinâmico
   * @returns Campo dinâmico encontrado ou null
   */
  async findOne(id: string): Promise<CampoDinamicoBeneficio | null> {
    return this.campoDinamicoRepository.findOne({
      where: { id },
    });
  }

  /**
   * Encontra um campo dinâmico pelo ID (alias para findOne)
   * @param id ID do campo dinâmico
   * @returns Campo dinâmico encontrado ou null
   */
  async findById(id: string): Promise<CampoDinamicoBeneficio | null> {
    return this.findOne(id);
  }

  /**
   * Encontra campos dinâmicos por tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Lista de campos dinâmicos associados ao tipo de benefício
   */
  async findByTipoBeneficio(
    tipoBeneficioId: string,
  ): Promise<CampoDinamicoBeneficio[]> {
    return this.campoDinamicoRepository.find({
      where: {
        tipo_beneficio: { id: tipoBeneficioId },
      },
      order: {
        ordem: 'ASC',
      },
    });
  }

  /**
   * Encontra campos dinâmicos por tipo de benefício
   * @param tipoBeneficio Entidade do tipo de benefício
   * @returns Lista de campos dinâmicos associados ao tipo de benefício
   */
  async findByTipoBeneficioEntity(
    tipoBeneficio: TipoBeneficio,
  ): Promise<CampoDinamicoBeneficio[]> {
    return this.campoDinamicoRepository.find({
      where: {
        tipo_beneficio: { id: tipoBeneficio.id },
      },
      order: {
        ordem: 'ASC',
      },
    });
  }

  /**
   * Cria um novo campo dinâmico
   * @param campoDinamico Dados do campo dinâmico a ser criado
   * @returns Campo dinâmico criado
   */
  async create(
    campoDinamico: Partial<CampoDinamicoBeneficio>,
  ): Promise<CampoDinamicoBeneficio> {
    const novoCampoDinamico =
      this.campoDinamicoRepository.create(campoDinamico);
    return this.campoDinamicoRepository.save(novoCampoDinamico);
  }

  /**
   * Atualiza um campo dinâmico existente
   * @param id ID do campo dinâmico a ser atualizado
   * @param campoDinamico Dados atualizados do campo dinâmico
   * @returns Campo dinâmico atualizado
   * @throws NotFoundException se o campo dinâmico não for encontrado
   */
  async update(
    id: string,
    campoDinamico: Partial<CampoDinamicoBeneficio>,
  ): Promise<CampoDinamicoBeneficio> {
    const result = await this.campoDinamicoRepository.update(id, campoDinamico);

    if (result.affected === 0) {
      throw new NotFoundException(`Campo dinâmico com ID ${id} não encontrado`);
    }

    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('Erro ao buscar o campo dinâmico atualizado');
    }

    return updated;
  }

  /**
   * Remove um campo dinâmico
   * @param id ID do campo dinâmico a ser removido
   * @returns true se removido com sucesso
   * @throws NotFoundException se o campo dinâmico não for encontrado
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.campoDinamicoRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Campo dinâmico com ID ${id} não encontrado`);
    }

    return result.affected !== undefined && result.affected > 0;
  }
}
