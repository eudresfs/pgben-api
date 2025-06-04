import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegraConflitoPapel } from '../../../entities/regra-conflito-papel.entity';

/**
 * Repositório para operações relacionadas às regras de conflito de papéis
 */
@Injectable()
export class RegraConflitoPapelRepository {
  constructor(
    @InjectRepository(RegraConflitoPapel)
    private readonly repository: Repository<RegraConflitoPapel>,
  ) {}

  /**
   * Cria uma nova regra de conflito
   * @param data Dados da regra
   * @returns Regra criada
   */
  async create(data: Partial<RegraConflitoPapel>): Promise<RegraConflitoPapel> {
    const regra = this.repository.create(data);
    return this.repository.save(regra);
  }

  /**
   * Busca todas as regras de conflito
   * @param includeInactive Se deve incluir regras inativas
   * @returns Lista de regras
   */
  async findAll(includeInactive = false): Promise<RegraConflitoPapel[]> {
    const query = this.repository
      .createQueryBuilder('regra')
      .leftJoinAndSelect('regra.papel_origem', 'papel_origem')
      .leftJoinAndSelect('regra.papel_destino', 'papel_destino');

    if (!includeInactive) {
      query.where('regra.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('regra.created_at', 'DESC').getMany();
  }

  /**
   * Busca uma regra pelo ID
   * @param id ID da regra
   * @returns Regra encontrada ou null
   */
  async findById(id: string): Promise<RegraConflitoPapel | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['papel_origem', 'papel_destino'],
    });
  }

  /**
   * Busca regras por papel de origem
   * @param papelOrigemId ID do papel de origem
   * @param includeInactive Se deve incluir regras inativas
   * @returns Lista de regras
   */
  async findByPapelOrigem(
    papelOrigemId: string,
    includeInactive = false,
  ): Promise<RegraConflitoPapel[]> {
    const query = this.repository
      .createQueryBuilder('regra')
      .leftJoinAndSelect('regra.papel_origem', 'papel_origem')
      .leftJoinAndSelect('regra.papel_destino', 'papel_destino')
      .where('regra.papel_origem_id = :papelOrigemId', { papelOrigemId });

    if (!includeInactive) {
      query.andWhere('regra.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('regra.created_at', 'DESC').getMany();
  }

  /**
   * Busca regras por papel de destino
   * @param papelDestinoId ID do papel de destino
   * @param includeInactive Se deve incluir regras inativas
   * @returns Lista de regras
   */
  async findByPapelDestino(
    papelDestinoId: string,
    includeInactive = false,
  ): Promise<RegraConflitoPapel[]> {
    const query = this.repository
      .createQueryBuilder('regra')
      .leftJoinAndSelect('regra.papel_origem', 'papel_origem')
      .leftJoinAndSelect('regra.papel_destino', 'papel_destino')
      .where('regra.papel_destino_id = :papelDestinoId', { papelDestinoId });

    if (!includeInactive) {
      query.andWhere('regra.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('regra.created_at', 'DESC').getMany();
  }

  /**
   * Verifica se existe conflito entre dois papéis
   * @param papelOrigemId ID do papel de origem
   * @param papelDestinoId ID do papel de destino
   * @returns Regra de conflito ou null
   */
  async verificarConflito(
    papelOrigemId: string,
    papelDestinoId: string,
  ): Promise<RegraConflitoPapel | null> {
    return this.repository.findOne({
      where: [
        {
          papel_origem_id: papelOrigemId,
          papel_destino_id: papelDestinoId,
          ativo: true,
        },
        {
          papel_origem_id: papelDestinoId,
          papel_destino_id: papelOrigemId,
          ativo: true,
        },
      ],
      relations: ['papel_origem', 'papel_destino'],
    });
  }

  /**
   * Atualiza uma regra existente
   * @param id ID da regra
   * @param data Dados para atualização
   * @returns Regra atualizada
   */
  async update(
    id: string,
    data: Partial<RegraConflitoPapel>,
  ): Promise<RegraConflitoPapel> {
    await this.repository.update(id, data);
    const regra = await this.findById(id);
    if (!regra) {
      throw new NotFoundException(
        `Regra de conflito com ID ${id} não encontrada`,
      );
    }
    return regra;
  }

  /**
   * Ativa ou desativa uma regra
   * @param id ID da regra
   * @param ativo Status de ativação
   * @returns Regra atualizada
   */
  async toggleAtivo(id: string, ativo: boolean): Promise<RegraConflitoPapel> {
    await this.repository.update(id, { ativo });
    const regra = await this.findById(id);
    if (!regra) {
      throw new NotFoundException(
        `Regra de conflito com ID ${id} não encontrada`,
      );
    }
    return regra;
  }

  /**
   * Remove uma regra
   * @param id ID da regra
   */
  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
