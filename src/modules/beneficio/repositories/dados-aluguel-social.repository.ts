import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { PublicoPrioritarioAluguel, EspecificacaoAluguel } from '@/enums';

/**
 * Repositório customizado para DadosAluguelSocial
 * Extende o repositório base do TypeORM com métodos específicos
 */
@Injectable()
export class DadosAluguelSocialRepository extends Repository<DadosAluguelSocial> {
  constructor(private dataSource: DataSource) {
    super(DadosAluguelSocial, dataSource.createEntityManager());
  }

  /**
   * Buscar dados de aluguel social por solicitação com relacionamentos
   */
  async findBySolicitacaoWithRelations(
    solicitacaoId: string,
  ): Promise<DadosAluguelSocial | null> {
    return this.findOne({
      where: { solicitacao_id: solicitacaoId },
      relations: [
        'solicitacao',
        'solicitacao.cidadao',
        'solicitacao.tipo_beneficio',
      ],
    });
  }

  /**
   * Buscar dados por público prioritário
   */
  async findByPublicoPrioritario(
    publicoPrioritario: PublicoPrioritarioAluguel,
  ): Promise<DadosAluguelSocial[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.publico_prioritario = :publicoPrioritario', {
        publicoPrioritario,
      })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por especificação do aluguel
   */
  async findByEspecificacao(
    especificacao: EspecificacaoAluguel,
  ): Promise<DadosAluguelSocial[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.especificacao_aluguel = :especificacao', { especificacao })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por faixa de valor do aluguel
   */
  async findByFaixaValor(
    valorMinimo: number,
    valorMaximo: number,
  ): Promise<DadosAluguelSocial[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.valor_aluguel BETWEEN :valorMinimo AND :valorMaximo', {
        valorMinimo,
        valorMaximo,
      })
      .orderBy('dados.valor_aluguel', 'ASC')
      .getMany();
  }

  /**
   * Buscar dados por período de início do aluguel
   */
  async findByPeriodoInicio(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<DadosAluguelSocial[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.data_inicio_aluguel BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .orderBy('dados.data_inicio_aluguel', 'DESC')
      .getMany();
  }

  /**
   * Buscar estatísticas de aluguel social
   */
  async getEstatisticas(): Promise<{
    totalSolicitacoes: number;
    valorMedioAluguel: number;
    valorTotalAlugueis: number;
    porPublicoPrioritario: Record<string, number>;
    porEspecificacao: Record<string, number>;
    porFaixaValor: Record<string, number>;
  }> {
    const totalSolicitacoes = await this.count();

    // Valor médio e total dos aluguéis
    const valoresResult = await this.createQueryBuilder('dados')
      .select('AVG(dados.valor_aluguel)', 'valorMedio')
      .addSelect('SUM(dados.valor_aluguel)', 'valorTotal')
      .where('dados.valor_aluguel IS NOT NULL')
      .getRawOne();

    const valorMedioAluguel = parseFloat(valoresResult.valorMedio) || 0;
    const valorTotalAlugueis = parseFloat(valoresResult.valorTotal) || 0;

    // Estatísticas por público prioritário
    const porPublicoResult = await this.createQueryBuilder('dados')
      .select('dados.publico_prioritario', 'publico')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.publico_prioritario')
      .getRawMany();

    const porPublicoPrioritario = porPublicoResult.reduce((acc, item) => {
      acc[item.publico] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por especificação
    const porEspecificacaoResult = await this.createQueryBuilder('dados')
      .select('dados.especificacao_aluguel', 'especificacao')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.especificacao_aluguel')
      .getRawMany();

    const porEspecificacao = porEspecificacaoResult.reduce((acc, item) => {
      acc[item.especificacao] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por faixa de valor
    const porFaixaValorResult = await this.createQueryBuilder('dados')
      .select(
        `CASE 
          WHEN dados.valor_aluguel <= 500 THEN 'Até R$ 500'
          WHEN dados.valor_aluguel <= 1000 THEN 'R$ 501 - R$ 1.000'
          WHEN dados.valor_aluguel <= 1500 THEN 'R$ 1.001 - R$ 1.500'
          WHEN dados.valor_aluguel <= 2000 THEN 'R$ 1.501 - R$ 2.000'
          ELSE 'Acima de R$ 2.000'
        END`,
        'faixa',
      )
      .addSelect('COUNT(*)', 'quantidade')
      .where('dados.valor_aluguel IS NOT NULL')
      .groupBy('faixa')
      .getRawMany();

    const porFaixaValor = porFaixaValorResult.reduce((acc, item) => {
      acc[item.faixa] = parseInt(item.quantidade);
      return acc;
    }, {});

    return {
      totalSolicitacoes,
      valorMedioAluguel,
      valorTotalAlugueis,
      porPublicoPrioritario,
      porEspecificacao,
      porFaixaValor,
    };
  }

  /**
   * Verificar duplicatas por endereço
   */
  async findDuplicatesByEndereco(
    endereco: string,
    excludeId?: string,
  ): Promise<DadosAluguelSocial[]> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .where('LOWER(dados.endereco_imovel) = LOWER(:endereco)', { endereco });

    if (excludeId) {
      query.andWhere('dados.id != :excludeId', { excludeId });
    }

    return query.getMany();
  }

  /**
   * Buscar dados de aluguel social com filtros avançados
   */
  async findWithFilters(filters: {
    publicoPrioritario?: PublicoPrioritarioAluguel;
    especificacao?: EspecificacaoAluguel;
    valorMinimo?: number;
    valorMaximo?: number;
    dataInicioMin?: Date;
    dataInicioMax?: Date;
    endereco?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DadosAluguelSocial[]; total: number }> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao');

    if (filters.publicoPrioritario) {
      query.andWhere('dados.publico_prioritario = :publicoPrioritario', {
        publicoPrioritario: filters.publicoPrioritario,
      });
    }

    if (filters.especificacao) {
      query.andWhere('dados.especificacao_aluguel = :especificacao', {
        especificacao: filters.especificacao,
      });
    }

    if (filters.valorMinimo) {
      query.andWhere('dados.valor_aluguel >= :valorMinimo', {
        valorMinimo: filters.valorMinimo,
      });
    }

    if (filters.valorMaximo) {
      query.andWhere('dados.valor_aluguel <= :valorMaximo', {
        valorMaximo: filters.valorMaximo,
      });
    }

    if (filters.dataInicioMin && filters.dataInicioMax) {
      query.andWhere(
        'dados.data_inicio_aluguel BETWEEN :dataInicioMin AND :dataInicioMax',
        {
          dataInicioMin: filters.dataInicioMin,
          dataInicioMax: filters.dataInicioMax,
        },
      );
    }

    if (filters.endereco) {
      query.andWhere('LOWER(dados.endereco_imovel) LIKE LOWER(:endereco)', {
        endereco: `%${filters.endereco}%`,
      });
    }

    const total = await query.getCount();

    if (filters.page && filters.limit) {
      query.skip((filters.page - 1) * filters.limit).take(filters.limit);
    }

    query.orderBy('dados.created_at', 'DESC');

    const data = await query.getMany();

    return { data, total };
  }
}
