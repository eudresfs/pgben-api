import { Injectable } from '@nestjs/common';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';

/**
 * Repository para operações de banco de dados relacionadas a Comprovantes
 */
@Injectable()
export class ComprovanteRepository {
  constructor(
    @InjectScopedRepository(ComprovantePagamento)
    private readonly scopedRepository: ScopedRepository<ComprovantePagamento>,
  ) {}

  /**
   * Cria um novo comprovante
   */
  async create(
    dadosComprovante: Partial<ComprovantePagamento>,
  ): Promise<ComprovantePagamento> {
    const comprovante = this.scopedRepository.create(dadosComprovante);
    return await this.scopedRepository.saveWithScope(comprovante);
  }

  /**
   * Busca comprovante por ID
   */
  async findById(id: string): Promise<ComprovantePagamento | null> {
    return await this.scopedRepository.createScopedQueryBuilder('comprovante')
      .leftJoin('comprovante.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .where('comprovante.id = :id', { id })
      .getOne();
  }

  /**
   * Busca comprovante por ID com relacionamentos específicos
   */
  async findByIdWithRelations(
    id: string,
    relations: string[] = [],
  ): Promise<ComprovantePagamento | null> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('comprovante')
      .leftJoin('comprovante.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .where('comprovante.id = :id', { id });

    // Adicionar relações dinamicamente
    relations.forEach(relation => {
      queryBuilder.leftJoinAndSelect(`comprovante.${relation}`, relation);
    });

    return await queryBuilder.getOne();
  }

  /**
   * Busca comprovantes por pagamento
   */
  async findByPagamento(pagamentoId: string): Promise<ComprovantePagamento[]> {
    return await this.scopedRepository.createScopedQueryBuilder('comprovante')
      .leftJoin('comprovante.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .where('comprovante.pagamento_id = :pagamentoId', { pagamentoId })
      .orderBy('comprovante.data_upload', 'DESC')
      .getMany();
  }

  /**
   * Remove comprovante
   */
  async remove(id: string): Promise<void> {
    const comprovante = await this.findById(id);
    if (!comprovante) {
      throw new Error('Comprovante não encontrado');
    }
    await this.scopedRepository.deleteWithScope(comprovante.id);
  }

  /**
   * Atualiza comprovante
   */
  async update(
    id: string,
    dados: Partial<ComprovantePagamento>,
  ): Promise<ComprovantePagamento> {
    const comprovante = await this.findById(id);
    if (!comprovante) {
      throw new Error('Comprovante não encontrado');
    }
    
    Object.assign(comprovante, dados);
    return await this.scopedRepository.saveWithScope(comprovante);
  }

  /**
   * Verifica se pagamento tem comprovantes
   */
  async hasComprovantes(pagamentoId: string): Promise<boolean> {
    const count = await this.scopedRepository.createScopedQueryBuilder('comprovante')
      .leftJoin('comprovante.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .where('comprovante.pagamento_id = :pagamentoId', { pagamentoId })
      .getCount();
    return count > 0;
  }
}
