import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThanOrEqual, IsNull } from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Repository para operações de banco de dados relacionadas a Pagamentos
 * Implementa o padrão Repository para isolar a lógica de acesso a dados
 */
@Injectable()
export class PagamentoRepository {
  constructor(
    @InjectRepository(Pagamento)
    private readonly repository: Repository<Pagamento>,
  ) { }

  /**
   * Cria um novo pagamento
   */
  async create(dadosPagamento: Partial<Pagamento>): Promise<Pagamento> {
    const pagamento = this.repository.create(dadosPagamento);
    return await this.repository.save(pagamento);
  }

  /**
   * Busca pagamento por ID
   */
  async findById(id: string): Promise<Pagamento | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['solicitacao', 'concessao', 'comprovantes']
    });
  }

  /**
   * Busca pagamento por ID com relacionamentos específicos
   */
  async findByIdWithRelations(id: string, relations: string[] = []): Promise<Pagamento | null> {
    return await this.repository.findOne({
      where: { id },
      relations
    });
  }

  /**
   * Busca pagamentos por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<Pagamento[]> {
    return await this.repository.find({
      where: { solicitacaoId },
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Busca pagamentos por concessão
   */
  async findByConcessao(concessaoId: string): Promise<Pagamento[]> {
    return await this.repository.find({
      where: { concessaoId },
      order: { numeroParcela: 'ASC' }
    });
  }

  /**
   * Busca pagamentos por status
   */
  async findByStatus(status: StatusPagamentoEnum, limit?: number): Promise<Pagamento[]> {
    const options: any = {
      where: { status },
      order: { created_at: 'DESC' },
      relations: ['solicitacao', 'concessao']
    };

    if (limit) {
      options.take = limit;
    }

    return await this.repository.find(options);
  }

  /**
   * Busca pagamentos elegíveis para liberação
   */
  async findElegiveisParaLiberacao(limite: number = 100): Promise<Pagamento[]> {
    const agora = new Date();

    return await this.repository.find({
      where: [
        {
          status: StatusPagamentoEnum.PENDENTE,
          dataPrevistaLiberacao: LessThanOrEqual(agora)
        },
        {
          status: StatusPagamentoEnum.PENDENTE,
          dataPrevistaLiberacao: IsNull()
        }
      ],
      relations: ['solicitacao', 'concessao'],
      order: {
        dataPrevistaLiberacao: 'ASC',
        created_at: 'ASC'
      },
      take: limite
    });
  }

  /**
   * Busca pagamentos vencidos
   */
  async findVencidos(): Promise<Pagamento[]> {
    const agora = new Date();

    return await this.repository.find({
      where: {
        status: StatusPagamentoEnum.PENDENTE,
        dataVencimento: LessThanOrEqual(agora)
      },
      relations: ['solicitacao', 'concessao']
    });
  }

  /**
   * Busca pagamentos próximos ao vencimento (para notificação)
   */
  async findPagamentosProximosVencimento(dataLimite: Date): Promise<Pagamento[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(dataLimite);
    limite.setHours(23, 59, 59, 999);

    return await this.repository.find({
      where: {
        status: StatusPagamentoEnum.PENDENTE,
        dataVencimento: Between(hoje, limite)
      },
      relations: ['solicitacao', 'concessao']
    });
  }

  /**
   * Lista com filtros e paginação
   */
  async findWithFilters(filtros: {
    status?: StatusPagamentoEnum;
    solicitacaoId?: string;
    concessaoId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    valorMinimo?: number;
    valorMaximo?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: Pagamento[]; total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pagamento.concessao', 'concessao');


    // Aplicar filtros
    if (filtros.status) {
      queryBuilder.andWhere('pagamento.status = :status', { status: filtros.status });
    }

    if (filtros.solicitacaoId) {
      queryBuilder.andWhere('pagamento.solicitacaoId = :solicitacaoId', {
        solicitacaoId: filtros.solicitacaoId
      });
    }

    if (filtros.concessaoId) {
      queryBuilder.andWhere('pagamento.concessaoId = :concessaoId', {
        concessaoId: filtros.concessaoId
      });
    }

    if (filtros.dataInicio && filtros.dataFim) {
      queryBuilder.andWhere('pagamento.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim
      });
    }

    if (filtros.valorMinimo) {
      queryBuilder.andWhere('pagamento.valor >= :valorMinimo', {
        valorMinimo: filtros.valorMinimo
      });
    }

    if (filtros.valorMaximo) {
      queryBuilder.andWhere('pagamento.valor <= :valorMaximo', {
        valorMaximo: filtros.valorMaximo
      });
    }

    // Paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('pagamento.created_at', 'DESC')
      .addOrderBy('pagamento.numeroParcela', 'ASC');

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  /**
   * Atualiza um pagamento
   */
  async update(id: string, dadosAtualizacao: Partial<Pagamento>): Promise<Pagamento> {
    await this.repository.update(id, {
      ...dadosAtualizacao,
      updated_at: new Date()
    });

    const pagamentoAtualizado = await this.findById(id);
    if (!pagamentoAtualizado) {
      throw new Error('Pagamento não encontrado após atualização');
    }

    return pagamentoAtualizado;
  }

  /**
   * Salva um pagamento (create ou update)
   */
  async save(pagamento: Pagamento): Promise<Pagamento> {
    return await this.repository.save(pagamento);
  }

  /**
   * Salva múltiplos pagamentos
   */
  async saveMany(pagamentos: Pagamento[]): Promise<Pagamento[]> {
    return await this.repository.save(pagamentos);
  }

  /**
   * Remove um pagamento
   */
  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Conta pagamentos por status
   */
  async countByStatus(status: StatusPagamentoEnum): Promise<number> {
    return await this.repository.count({ where: { status } });
  }

  /**
   * Verifica se existe pagamento para solicitação
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { solicitacaoId } });
    return count > 0;
  }

  /**
   * Busca estatísticas de pagamentos
   */
  async getEstatisticas(): Promise<{
    totalPagamentos: number;
    porStatus: Record<StatusPagamentoEnum, number>;
    valorTotal: number;
  }> {
    // Total de pagamentos
    const totalPagamentos = await this.repository.count();

    // Count por status
    const statusCounts = await this.repository
      .createQueryBuilder('pagamento')
      .select('pagamento.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pagamento.status')
      .getRawMany();

    const porStatus = {} as Record<StatusPagamentoEnum, number>;
    statusCounts.forEach(item => {
      porStatus[item.status] = parseInt(item.count);
    });

    // Valor total
    const valorTotalResult = await this.repository
      .createQueryBuilder('pagamento')
      .select('SUM(pagamento.valor)', 'total')
      .getRawOne();

    const valorTotal = valorTotalResult?.total || 0;

    return {
      totalPagamentos,
      porStatus,
      valorTotal: parseFloat(valorTotal)
    };
  }
}