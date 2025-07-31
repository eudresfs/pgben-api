import { Injectable } from '@nestjs/common';
import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';

/**
 * Repository para operações de banco de dados relacionadas a Confirmações de Recebimento
 */
@Injectable()
export class ConfirmacaoRepository {
  constructor(
    @InjectScopedRepository(ConfirmacaoRecebimento)
    private readonly scopedRepository: ScopedRepository<ConfirmacaoRecebimento>,
  ) {}

  /**
   * Cria uma nova confirmação
   */
  async create(
    dadosConfirmacao: Partial<ConfirmacaoRecebimento>,
  ): Promise<ConfirmacaoRecebimento> {
    const confirmacao = this.scopedRepository.create(dadosConfirmacao);
    return await this.scopedRepository.saveWithScope(confirmacao);
  }

  /**
   * Busca confirmação por ID
   */
  async findById(id: string): Promise<ConfirmacaoRecebimento | null> {
    return await this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .where('confirmacao.id = :id', { id })
      .getOne();
  }

  /**
   * Busca confirmação por ID com relacionamentos
   */
  async findByIdWithRelations(
    id: string,
    relations: string[] = [],
  ): Promise<ConfirmacaoRecebimento | null> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .where('confirmacao.id = :id', { id });

    // Adicionar relações dinamicamente
    relations.forEach(relation => {
      queryBuilder.leftJoinAndSelect(`confirmacao.${relation}`, relation);
    });

    return await queryBuilder.getOne();
  }

  /**
   * Busca confirmações por pagamento
   */
  async findByPagamento(
    pagamentoId: string,
  ): Promise<ConfirmacaoRecebimento[]> {
    return await this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('confirmacao.usuario', 'usuario')
      .leftJoinAndSelect('confirmacao.destinatario', 'destinatario')
      .where('confirmacao.pagamento_id = :pagamentoId', { pagamentoId })
      .orderBy('confirmacao.data_confirmacao', 'DESC')
      .getMany();
  }

  /**
   * Busca confirmações por usuário responsável
   */
  async findByUsuario(usuarioId: string): Promise<ConfirmacaoRecebimento[]> {
    return await this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('confirmacao.pagamento', 'pagamento_rel')
      .where('confirmacao.confirmado_por = :usuarioId', { usuarioId })
      .orderBy('confirmacao.data_confirmacao', 'DESC')
      .getMany();
  }

  /**
   * Busca confirmações por destinatário
   */
  async findByDestinatario(
    destinatarioId: string,
  ): Promise<ConfirmacaoRecebimento[]> {
    return await this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('confirmacao.pagamento', 'pagamento_rel')
      .leftJoinAndSelect('confirmacao.usuario', 'usuario')
      .where('confirmacao.destinatario_id = :destinatarioId', { destinatarioId })
      .orderBy('confirmacao.data_confirmacao', 'DESC')
      .getMany();
  }

  /**
   * Busca confirmações por período
   */
  async findByPeriodo(
    data_inicio: Date,
    data_fim: Date,
  ): Promise<ConfirmacaoRecebimento[]> {
    return await this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('confirmacao.pagamento', 'pagamento_rel')
      .leftJoinAndSelect('confirmacao.usuario', 'usuario')
      .leftJoinAndSelect('confirmacao.destinatario', 'destinatario')
      .where('confirmacao.data_confirmacao BETWEEN :data_inicio AND :data_fim', {
        data_inicio,
        data_fim,
      })
      .orderBy('confirmacao.data_confirmacao', 'DESC')
      .getMany();
  }

  /**
   * Busca confirmações com filtros
   */
  async findWithFilters(filtros: {
    pagamentoId?: string;
    usuarioId?: string;
    destinatarioId?: string;
    metodoConfirmacao?: string;
    data_inicio?: Date;
    data_fim?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: ConfirmacaoRecebimento[]; total: number }> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('confirmacao')
      .leftJoin('confirmacao.pagamento', 'pagamento')
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('confirmacao.pagamento', 'pagamento_rel')
      .leftJoinAndSelect('confirmacao.usuario', 'usuario')
      .leftJoinAndSelect('confirmacao.destinatario', 'destinatario');

    // Aplicar filtros
    if (filtros.pagamentoId) {
      queryBuilder.andWhere('confirmacao.pagamento_id = :pagamentoId', {
        pagamentoId: filtros.pagamentoId,
      });
    }

    if (filtros.usuarioId) {
      queryBuilder.andWhere('confirmacao.confirmado_por = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });
    }

    if (filtros.destinatarioId) {
      queryBuilder.andWhere('confirmacao.destinatario_id = :destinatarioId', {
        destinatarioId: filtros.destinatarioId,
      });
    }

    if (filtros.metodoConfirmacao) {
      queryBuilder.andWhere(
        'confirmacao.metodo_confirmacao = :metodoConfirmacao',
        {
          metodoConfirmacao: filtros.metodoConfirmacao,
        },
      );
    }

    if (filtros.data_inicio && filtros.data_fim) {
      queryBuilder.andWhere(
        'confirmacao.data_confirmacao BETWEEN :data_inicio AND :data_fim',
        {
          data_inicio: filtros.data_inicio,
          data_fim: filtros.data_fim,
        },
      );
    }

    // Paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('confirmacao.data_confirmacao', 'DESC');

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  /**
   * Atualiza confirmação
   */
  async update(
    id: string,
    dados: Partial<ConfirmacaoRecebimento>,
  ): Promise<ConfirmacaoRecebimento> {
    const confirmacao = await this.findById(id);
    if (!confirmacao) {
      throw new Error('Confirmação não encontrada');
    }
    
    Object.assign(confirmacao, dados);
    return await this.scopedRepository.saveWithScope(confirmacao);
  }

  /**
   * Remove confirmação
   */
  async remove(id: string): Promise<void> {
    const confirmacao = await this.findById(id);
    if (!confirmacao) {
      throw new Error('Confirmação não encontrada');
    }
    await this.scopedRepository.deleteWithScope(confirmacao.id);
  }

  /**
   * Verifica se pagamento tem confirmação
   */
  async hasConfirmacao(pagamentoId: string): Promise<boolean> {
    const count = await this.scopedRepository.count({
      where: { pagamento_id: pagamentoId },
    });
    return count > 0;
  }

  /**
   * Conta confirmações por método
   */
  async countByMetodo(): Promise<Record<string, number>> {
    const result = await this.scopedRepository
      .createQueryBuilder('confirmacao')
      .select('confirmacao.metodo_confirmacao', 'metodo')
      .addSelect('COUNT(*)', 'count')
      .groupBy('confirmacao.metodo_confirmacao')
      .getRawMany();

    const contagem: Record<string, number> = {};
    result.forEach((item) => {
      contagem[item.metodo] = parseInt(item.count);
    });

    return contagem;
  }

  /**
   * Busca confirmações recentes
   */
  async findRecentes(limite: number = 10): Promise<ConfirmacaoRecebimento[]> {
    return await this.scopedRepository.find({
      relations: ['pagamento', 'usuario', 'destinatario'],
      order: { data_confirmacao: 'DESC' },
      take: limite,
    });
  }

  /**
   * Conta total de confirmações
   */
  async count(): Promise<number> {
    return await this.scopedRepository.count();
  }

  /**
   * Busca estatísticas de confirmações
   */
  async getEstatisticas(): Promise<{
    total: number;
    porMetodo: Record<string, number>;
    confirmacoesMes: number;
    mediaPorDia: number;
  }> {
    const total = await this.count();
    const porMetodo = await this.countByMetodo();

    // Confirmações do mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const confirmacoesMes = await this.scopedRepository.count({
      where: {
        data_confirmacao: {
          gte: inicioMes,
        } as any,
      },
    });

    // Média por dia (baseada no mês atual)
    const diasNoMes = new Date().getDate();
    const mediaPorDia = confirmacoesMes / diasNoMes;

    return {
      total,
      porMetodo,
      confirmacoesMes,
      mediaPorDia: Math.round(mediaPorDia * 100) / 100, // 2 casas decimais
    };
  }

  /**
   * Busca estatísticas de confirmações por mês (database-agnostic)
   * Evita SQL específico como DATE_FORMAT do MySQL
   */
  async getEstatisticasPorMes(ano: number): Promise<Record<string, number>> {
    const estatisticas: Record<string, number> = {};

    // Para cada mês do ano, busca as confirmações
    for (let mes = 1; mes <= 12; mes++) {
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

      const count = await this.scopedRepository.count({
         where: {
           data_confirmacao: {
             gte: inicioMes,
             lte: fimMes,
           } as any,
         },
       });

      const chaveAnoMes = `${ano}-${mes.toString().padStart(2, '0')}`;
      estatisticas[chaveAnoMes] = count;
    }

    return estatisticas;
  }
}
