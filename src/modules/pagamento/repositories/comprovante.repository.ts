import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';

/**
 * Repository para operações de banco de dados relacionadas a Comprovantes
 */
@Injectable()
export class ComprovanteRepository {
  constructor(
    @InjectRepository(ComprovantePagamento)
    private readonly repository: Repository<ComprovantePagamento>,
  ) {}

  /**
   * Cria um novo comprovante
   */
  async create(
    dadosComprovante: Partial<ComprovantePagamento>,
  ): Promise<ComprovantePagamento> {
    const comprovante = this.repository.create(dadosComprovante);
    return await this.repository.save(comprovante);
  }

  /**
   * Busca comprovante por ID
   */
  async findById(id: string): Promise<ComprovantePagamento | null> {
    return await this.repository.findOne({ where: { id } });
  }

  /**
   * Busca comprovante por ID com relacionamentos específicos
   */
  async findByIdWithRelations(
    id: string,
    relations: string[] = [],
  ): Promise<ComprovantePagamento | null> {
    return await this.repository.findOne({
      where: { id },
      relations,
    });
  }

  /**
   * Busca comprovantes por pagamento
   */
  async findByPagamento(pagamentoId: string): Promise<ComprovantePagamento[]> {
    return await this.repository.find({
      where: { pagamento_id: pagamentoId },
      order: { data_upload: 'DESC' },
    });
  }

  /**
   * Remove comprovante
   */
  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Atualiza comprovante
   */
  async update(
    id: string,
    dados: Partial<ComprovantePagamento>,
  ): Promise<ComprovantePagamento> {
    await this.repository.update(id, dados);
    const comprovante = await this.findById(id);
    if (!comprovante) {
      throw new Error('Comprovante não encontrado após atualização');
    }
    return comprovante;
  }

  /**
   * Verifica se pagamento tem comprovantes
   */
  async hasComprovantes(pagamentoId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { pagamento_id: pagamentoId },
    });
    return count > 0;
  }
}
