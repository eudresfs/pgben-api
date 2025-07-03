import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';
import { PeriodicidadeEnum, OrigemAtendimentoEnum } from '@/enums';

/**
 * Repositório customizado para DadosCestaBasica
 * Extende o repositório base do TypeORM com métodos específicos
 */
@Injectable()
export class DadosCestaBasicaRepository extends Repository<DadosCestaBasica> {
  constructor(private dataSource: DataSource) {
    super(DadosCestaBasica, dataSource.createEntityManager());
  }

  /**
   * Buscar dados de cesta básica por solicitação com relacionamentos
   */
  async findBySolicitacaoWithRelations(
    solicitacaoId: string,
  ): Promise<DadosCestaBasica | null> {
    return this.findOne({
      where: { solicitacao_id: solicitacaoId },
      relations: [
        'solicitacao',
        'solicitacao.beneficiario',
        'solicitacao.tipo_beneficio',
      ],
    });
  }

  /**
   * Buscar dados por período de concessão
   */
  async findByPeriodoConcessao(
    periodoConcessao: PeriodicidadeEnum,
  ): Promise<DadosCestaBasica[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.periodo_concessao = :periodoConcessao', {
        periodoConcessao,
      })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por origem do atendimento
   */
  async findByOrigemAtendimento(
    origemAtendimento: OrigemAtendimentoEnum,
  ): Promise<DadosCestaBasica[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.origem_atendimento = :origemAtendimento', {
        origemAtendimento,
      })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por quantidade de cestas
   */
  async findByQuantidadeCestas(
    quantidadeMinima: number,
    quantidadeMaxima?: number,
  ): Promise<DadosCestaBasica[]> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
      .where('dados.quantidade_cestas_solicitadas >= :quantidadeMinima', {
        quantidadeMinima,
      });

    if (quantidadeMaxima) {
      query.andWhere(
        'dados.quantidade_cestas_solicitadas <= :quantidadeMaxima',
        { quantidadeMaxima },
      );
    }

    return query
      .orderBy('dados.quantidade_cestas_solicitadas', 'DESC')
      .getMany();
  }

  /**
   * Buscar estatísticas de cesta básica
   */
  async getEstatisticas(): Promise<{
    totalSolicitacoes: number;
    totalCestas: number;
    mediaCestasPorSolicitacao: number;
    porPeriodoConcessao: Record<string, number>;
    porOrigemAtendimento: Record<string, number>;
    porQuantidadeCestas: Record<string, number>;
  }> {
    const totalSolicitacoes = await this.count();

    // Total de cestas e média
    const cestasResult = await this.createQueryBuilder('dados')
      .select('SUM(dados.quantidade_cestas_solicitadas)', 'totalCestas')
      .addSelect('AVG(dados.quantidade_cestas_solicitadas)', 'mediaCestas')
      .getRawOne();

    const totalCestas = parseInt(cestasResult.totalCestas) || 0;
    const mediaCestasPorSolicitacao = parseFloat(cestasResult.mediaCestas) || 0;

    // Estatísticas por período de concessão
    const porPeriodoResult = await this.createQueryBuilder('dados')
      .select('dados.periodo_concessao', 'periodo')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.periodo_concessao')
      .getRawMany();

    const porPeriodoConcessao = porPeriodoResult.reduce((acc, item) => {
      acc[item.periodo] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por origem do atendimento
    const porOrigemResult = await this.createQueryBuilder('dados')
      .select('dados.origem_atendimento', 'origem')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.origem_atendimento')
      .getRawMany();

    const porOrigemAtendimento = porOrigemResult.reduce((acc, item) => {
      acc[item.origem] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por quantidade de cestas
    const porQuantidadeResult = await this.createQueryBuilder('dados')
      .select(
        `CASE 
          WHEN dados.quantidade_cestas_solicitadas = 1 THEN '1 cesta'
          WHEN dados.quantidade_cestas_solicitadas = 2 THEN '2 cestas'
          WHEN dados.quantidade_cestas_solicitadas = 3 THEN '3 cestas'
          WHEN dados.quantidade_cestas_solicitadas BETWEEN 4 AND 5 THEN '4-5 cestas'
          ELSE 'Mais de 5 cestas'
        END`,
        'faixa',
      )
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('faixa')
      .getRawMany();

    const porQuantidadeCestas = porQuantidadeResult.reduce((acc, item) => {
      acc[item.faixa] = parseInt(item.quantidade);
      return acc;
    }, {});

    return {
      totalSolicitacoes,
      totalCestas,
      mediaCestasPorSolicitacao,
      porPeriodoConcessao,
      porOrigemAtendimento,
      porQuantidadeCestas,
    };
  }

  /**
   * Buscar dados de cesta básica com filtros avançados
   */
  async findWithFilters(filters: {
    periodoConcessao?: PeriodicidadeEnum;
    origemAtendimento?: OrigemAtendimentoEnum;
    quantidadeMinima?: number;
    quantidadeMaxima?: number;
    dataInicioSolicitacao?: Date;
    dataFimSolicitacao?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: DadosCestaBasica[]; total: number }> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao');

    if (filters.periodoConcessao) {
      query.andWhere('dados.periodo_concessao = :periodoConcessao', {
        periodoConcessao: filters.periodoConcessao,
      });
    }

    if (filters.origemAtendimento) {
      query.andWhere('dados.origem_atendimento = :origemAtendimento', {
        origemAtendimento: filters.origemAtendimento,
      });
    }

    if (filters.quantidadeMinima) {
      query.andWhere(
        'dados.quantidade_cestas_solicitadas >= :quantidadeMinima',
        {
          quantidadeMinima: filters.quantidadeMinima,
        },
      );
    }

    if (filters.quantidadeMaxima) {
      query.andWhere(
        'dados.quantidade_cestas_solicitadas <= :quantidadeMaxima',
        {
          quantidadeMaxima: filters.quantidadeMaxima,
        },
      );
    }

    if (filters.dataInicioSolicitacao && filters.dataFimSolicitacao) {
      query.andWhere(
        'solicitacao.created_at BETWEEN :dataInicio AND :dataFim',
        {
          dataInicio: filters.dataInicioSolicitacao,
          dataFim: filters.dataFimSolicitacao,
        },
      );
    }

    const total = await query.getCount();

    if (filters.page && filters.limit) {
      query.skip((filters.page - 1) * filters.limit).take(filters.limit);
    }

    query.orderBy('dados.created_at', 'DESC');

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * Buscar distribuição de cestas por mês
   */
  async getCestasPorMes(
    ano: number,
  ): Promise<{ mes: number; quantidade: number; totalCestas: number }[]> {
    return this.createQueryBuilder('dados')
      .leftJoin('dados.solicitacao', 'solicitacao')
      .select('EXTRACT(MONTH FROM solicitacao.created_at)', 'mes')
      .addSelect('COUNT(*)', 'quantidade')
      .addSelect('SUM(dados.quantidade_cestas_solicitadas)', 'totalCestas')
      .where('EXTRACT(YEAR FROM solicitacao.created_at) = :ano', { ano })
      .groupBy('EXTRACT(MONTH FROM solicitacao.created_at)')
      .orderBy('mes', 'ASC')
      .getRawMany()
      .then((results) =>
        results.map((item) => ({
          mes: parseInt(item.mes),
          quantidade: parseInt(item.quantidade),
          totalCestas: parseInt(item.totalCestas),
        })),
      );
  }

  /**
   * Buscar famílias que receberam cestas múltiplas vezes
   */
  async findFamiliasRecorrentes(minimoSolicitacoes: number = 2): Promise<
    {
      cidadao_id: string;
      nome_cidadao: string;
      total_solicitacoes: number;
      total_cestas: number;
    }[]
  > {
    return this.createQueryBuilder('dados')
      .leftJoin('dados.solicitacao', 'solicitacao')
      .leftJoin('solicitacao.beneficiario', 'cidadao')
      .select('beneficiario.id', 'cidadao_id')
      .addSelect('cidadao.nome', 'nome_cidadao')
      .addSelect('COUNT(*)', 'total_solicitacoes')
      .addSelect('SUM(dados.quantidade_cestas_solicitadas)', 'total_cestas')
      .groupBy('cidadao.id, cidadao.nome')
      .having('COUNT(*) >= :minimoSolicitacoes', { minimoSolicitacoes })
      .orderBy('total_solicitacoes', 'DESC')
      .getRawMany()
      .then((results) =>
        results.map((item) => ({
          cidadao_id: item.cidadao_id,
          nome_cidadao: item.nome_cidadao,
          total_solicitacoes: parseInt(item.total_solicitacoes),
          total_cestas: parseInt(item.total_cestas),
        })),
      );
  }

  /**
   * Verificar se cidadão já recebeu cesta no período
   */
  async verificarCestaRecente(
    cidadaoId: string,
    diasLimite: number = 30,
  ): Promise<DadosCestaBasica | null> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    return this.createQueryBuilder('dados')
      .leftJoin('dados.solicitacao', 'solicitacao')
      .where('solicitacao.beneficiario_id = :cidadaoId', { cidadaoId })
      .andWhere('solicitacao.created_at >= :dataLimite', { dataLimite })
      .orderBy('solicitacao.created_at', 'DESC')
      .getOne();
  }
}
