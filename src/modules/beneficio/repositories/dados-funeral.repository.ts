import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';
import { ParentescoEnum, TipoUrnaEnum } from '@/enums';

/**
 * Repositório customizado para DadosFuneral
 * Extende o repositório base do TypeORM com métodos específicos
 */
@Injectable()
export class DadosFuneralRepository extends Repository<DadosFuneral> {
  constructor(private dataSource: DataSource) {
    super(DadosFuneral, dataSource.createEntityManager());
  }

  /**
   * Buscar dados de funeral por solicitação com relacionamentos
   */
  async findBySolicitacaoWithRelations(
    solicitacaoId: string,
  ): Promise<DadosFuneral | null> {
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
   * Buscar dados por período de óbito
   */
  async findByPeriodoObito(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<DadosFuneral[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('dados.data_obito BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .orderBy('dados.data_obito', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por grau de parentesco
   */
  async findByGrauParentesco(
    grauParentesco: ParentescoEnum,
  ): Promise<DadosFuneral[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('dados.grau_parentesco_requerente = :grauParentesco', {
        grauParentesco,
      })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por tipo de urna
   */
  async findByTipoUrna(tipoUrna: TipoUrnaEnum): Promise<DadosFuneral[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('dados.tipo_urna_necessaria = :tipoUrna', { tipoUrna })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por local de óbito
   */
  async findByLocalObito(localObito: string): Promise<DadosFuneral[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('LOWER(dados.local_obito) LIKE LOWER(:localObito)', {
        localObito: `%${localObito}%`,
      })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados por período de autorização
   */
  async findByPeriodoAutorizacao(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<DadosFuneral[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('dados.data_autorizacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .orderBy('dados.data_autorizacao', 'DESC')
      .getMany();
  }

  /**
   * Buscar estatísticas de funeral
   */
  async getEstatisticas(): Promise<{
    totalObitos: number;
    porGrauParentesco: Record<string, number>;
    porTipoUrna: Record<string, number>;
    porLocalObito: Record<string, number>;
    tempoMedioAutorizacao: number;
  }> {
    const totalObitos = await this.count();

    // Estatísticas por grau de parentesco
    const porGrauResult = await this.createQueryBuilder('dados')
      .select('dados.grau_parentesco_requerente', 'grau')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.grau_parentesco_requerente')
      .getRawMany();

    const porGrauParentesco = porGrauResult.reduce((acc, item) => {
      acc[item.grau] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por tipo de urna
    const porUrnaResult = await this.createQueryBuilder('dados')
      .select('dados.tipo_urna_necessaria', 'urna')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.tipo_urna_necessaria')
      .getRawMany();

    const porTipoUrna = porUrnaResult.reduce((acc, item) => {
      acc[item.urna] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por local de óbito (top 10)
    const porLocalResult = await this.createQueryBuilder('dados')
      .select('dados.local_obito', 'local')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.local_obito')
      .orderBy('quantidade', 'DESC')
      .limit(10)
      .getRawMany();

    const porLocalObito = porLocalResult.reduce((acc, item) => {
      acc[item.local] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Tempo médio entre óbito e autorização (em dias)
    const tempoMedioResult = await this.createQueryBuilder('dados')
      .select(
        'AVG(EXTRACT(DAY FROM (dados.data_autorizacao - dados.data_obito)))',
        'tempoMedio',
      )
      .where('dados.data_autorizacao IS NOT NULL')
      .andWhere('dados.data_obito IS NOT NULL')
      .getRawOne();

    const tempoMedioAutorizacao = parseFloat(tempoMedioResult.tempoMedio) || 0;

    return {
      totalObitos,
      porGrauParentesco,
      porTipoUrna,
      porLocalObito,
      tempoMedioAutorizacao,
    };
  }

  /**
   * Verificar duplicatas por dados do falecido
   */
  async findDuplicatesByFalecido(
    nomeFalecido: string,
    dataObito: Date,
    excludeId?: string,
  ): Promise<DadosFuneral[]> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .where('LOWER(dados.nome_completo_falecido) = LOWER(:nomeFalecido)', {
        nomeFalecido,
      })
      .andWhere('dados.data_obito = :dataObito', { dataObito });

    if (excludeId) {
      query.andWhere('dados.id != :excludeId', { excludeId });
    }

    return query.getMany();
  }

  /**
   * Buscar dados de funeral com filtros avançados
   */
  async findWithFilters(filters: {
    dataObitoInicio?: Date;
    dataObitoFim?: Date;
    dataAutorizacaoInicio?: Date;
    dataAutorizacaoFim?: Date;
    grauParentesco?: ParentescoEnum;
    tipoUrna?: TipoUrnaEnum;
    localObito?: string;
    nomeFalecido?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DadosFuneral[]; total: number }> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao');

    if (filters.dataObitoInicio && filters.dataObitoFim) {
      query.andWhere(
        'dados.data_obito BETWEEN :dataObitoInicio AND :dataObitoFim',
        {
          dataObitoInicio: filters.dataObitoInicio,
          dataObitoFim: filters.dataObitoFim,
        },
      );
    }

    if (filters.dataAutorizacaoInicio && filters.dataAutorizacaoFim) {
      query.andWhere(
        'dados.data_autorizacao BETWEEN :dataAutorizacaoInicio AND :dataAutorizacaoFim',
        {
          dataAutorizacaoInicio: filters.dataAutorizacaoInicio,
          dataAutorizacaoFim: filters.dataAutorizacaoFim,
        },
      );
    }

    if (filters.grauParentesco) {
      query.andWhere('dados.grau_parentesco_requerente = :grauParentesco', {
        grauParentesco: filters.grauParentesco,
      });
    }

    if (filters.tipoUrna) {
      query.andWhere('dados.tipo_urna_necessaria = :tipoUrna', {
        tipoUrna: filters.tipoUrna,
      });
    }

    if (filters.localObito) {
      query.andWhere('LOWER(dados.local_obito) LIKE LOWER(:localObito)', {
        localObito: `%${filters.localObito}%`,
      });
    }

    if (filters.nomeFalecido) {
      query.andWhere(
        'LOWER(dados.nome_completo_falecido) LIKE LOWER(:nomeFalecido)',
        {
          nomeFalecido: `%${filters.nomeFalecido}%`,
        },
      );
    }

    const total = await query.getCount();

    if (filters.page && filters.limit) {
      query.skip((filters.page - 1) * filters.limit).take(filters.limit);
    }

    query.orderBy('dados.data_obito', 'DESC');

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * Buscar óbitos por mês para relatórios
   */
  async getObitosPorMes(
    ano: number,
  ): Promise<{ mes: number; quantidade: number }[]> {
    return this.createQueryBuilder('dados')
      .select('EXTRACT(MONTH FROM dados.data_obito)', 'mes')
      .addSelect('COUNT(*)', 'quantidade')
      .where('EXTRACT(YEAR FROM dados.data_obito) = :ano', { ano })
      .groupBy('EXTRACT(MONTH FROM dados.data_obito)')
      .orderBy('mes', 'ASC')
      .getRawMany()
      .then((results) =>
        results.map((item) => ({
          mes: parseInt(item.mes),
          quantidade: parseInt(item.quantidade),
        })),
      );
  }
}
