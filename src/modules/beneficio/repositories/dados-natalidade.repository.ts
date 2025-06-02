import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';

/**
 * Repositório customizado para DadosNatalidade
 * Extende o repositório base do TypeORM com métodos específicos
 */
@Injectable()
export class DadosNatalidadeRepository extends Repository<DadosNatalidade> {
  constructor(private dataSource: DataSource) {
    super(DadosNatalidade, dataSource.createEntityManager());
  }

  /**
   * Buscar dados de natalidade por solicitação com relacionamentos
   */
  async findBySolicitacaoWithRelations(solicitacaoId: string): Promise<DadosNatalidade | null> {
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
   * Buscar dados de natalidade por período de nascimento
   */
  async findByPeriodoNascimento(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<DadosNatalidade[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('dados.data_nascimento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .orderBy('dados.data_nascimento', 'DESC')
      .getMany();
  }

  /**
   * Buscar dados de natalidade por tipo de parto
   */
  async findByTipoParto(tipoParto: string): Promise<DadosNatalidade[]> {
    return this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
      .where('dados.tipo_parto = :tipoParto', { tipoParto })
      .orderBy('dados.created_at', 'DESC')
      .getMany();
  }

  /**
   * Contar solicitações por hospital
   */
  async countByHospital(): Promise<{ hospital: string; total: number }[]> {
    return this.createQueryBuilder('dados')
      .select('dados.hospital_nascimento', 'hospital')
      .addSelect('COUNT(*)', 'total')
      .groupBy('dados.hospital_nascimento')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * Buscar estatísticas de natalidade
   */
  async getEstatisticas(): Promise<{
    totalNascimentos: number;
    porTipoParto: Record<string, number>;
    porHospital: Record<string, number>;
    mediaIdadeGestacional: number;
  }> {
    const totalNascimentos = await this.count();

    // Estatísticas por tipo de parto
    const porTipoPartoResult = await this.createQueryBuilder('dados')
      .select('dados.tipo_parto', 'tipo')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.tipo_parto')
      .getRawMany();

    const porTipoParto = porTipoPartoResult.reduce((acc, item) => {
      acc[item.tipo] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por hospital
    const porHospitalResult = await this.createQueryBuilder('dados')
      .select('dados.hospital_nascimento', 'hospital')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.hospital_nascimento')
      .getRawMany();

    const porHospital = porHospitalResult.reduce((acc, item) => {
      acc[item.hospital] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Média de idade gestacional
    const mediaIdadeResult = await this.createQueryBuilder('dados')
      .select('AVG(dados.idade_gestacional)', 'media')
      .where('dados.idade_gestacional IS NOT NULL')
      .getRawOne();

    const mediaIdadeGestacional = parseFloat(mediaIdadeResult.media) || 0;

    return {
      totalNascimentos,
      porTipoParto,
      porHospital,
      mediaIdadeGestacional,
    };
  }

  /**
   * Verificar duplicatas por dados do bebê
   */
  async findDuplicatesByBaby(
    nomeBebe: string,
    dataNascimento: Date,
    excludeId?: string,
  ): Promise<DadosNatalidade[]> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .where('LOWER(dados.nome_completo_bebe) = LOWER(:nomeBebe)', { nomeBebe })
      .andWhere('dados.data_nascimento = :dataNascimento', { dataNascimento });

    if (excludeId) {
      query.andWhere('dados.id != :excludeId', { excludeId });
    }

    return query.getMany();
  }

  /**
   * Buscar dados de natalidade com filtros avançados
   */
  async findWithFilters(filters: {
    dataInicio?: Date;
    dataFim?: Date;
    tipoParto?: string;
    hospital?: string;
    idadeGestacionalMin?: number;
    idadeGestacionalMax?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: DadosNatalidade[]; total: number }> {
    const query = this.createQueryBuilder('dados')
      .leftJoinAndSelect('dados.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.cidadao', 'cidadao');

    if (filters.dataInicio && filters.dataFim) {
      query.andWhere('dados.data_nascimento BETWEEN :dataInicio AND :dataFim', {
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
      });
    }

    if (filters.tipoParto) {
      query.andWhere('dados.tipo_parto = :tipoParto', {
        tipoParto: filters.tipoParto,
      });
    }

    if (filters.hospital) {
      query.andWhere('LOWER(dados.hospital_nascimento) LIKE LOWER(:hospital)', {
        hospital: `%${filters.hospital}%`,
      });
    }

    if (filters.idadeGestacionalMin) {
      query.andWhere('dados.idade_gestacional >= :idadeMin', {
        idadeMin: filters.idadeGestacionalMin,
      });
    }

    if (filters.idadeGestacionalMax) {
      query.andWhere('dados.idade_gestacional <= :idadeMax', {
        idadeMax: filters.idadeGestacionalMax,
      });
    }

    const total = await query.getCount();

    if (filters.page && filters.limit) {
      query
        .skip((filters.page - 1) * filters.limit)
        .take(filters.limit);
    }

    query.orderBy('dados.data_nascimento', 'DESC');

    const data = await query.getMany();

    return { data, total };
  }
}