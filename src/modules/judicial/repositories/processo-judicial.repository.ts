import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProcessoJudicial } from '../../../entities/processo-judicial.entity';

/**
 * Repositório personalizado para ProcessoJudicial
 *
 * Fornece métodos especializados para acesso e manipulação de processos judiciais
 */
@Injectable()
export class ProcessoJudicialRepository extends Repository<ProcessoJudicial> {
  constructor(private dataSource: DataSource) {
    super(ProcessoJudicial, dataSource.createEntityManager());
  }

  /**
   * Busca um processo judicial pelo número
   *
   * @param numero Número do processo judicial
   * @returns Processo judicial encontrado ou null
   */
  async findByNumero(numero: string): Promise<ProcessoJudicial | null> {
    return this.findOne({ where: { numero_processo: numero } });
  }

  /**
   * Verifica se um processo judicial está vinculado a alguma solicitação
   *
   * @param processoId ID do processo judicial
   * @returns true se estiver vinculado, false caso contrário
   */
  async isVinculadoASolicitacao(processoId: string): Promise<boolean> {
    const count = await this.createQueryBuilder('processo')
      .leftJoin(
        'solicitacao',
        'solicitacao',
        'solicitacao.processo_judicial_id = processo.id',
      )
      .where('processo.id = :id', { id: processoId })
      .andWhere('solicitacao.id IS NOT NULL')
      .getCount();

    return count > 0;
  }
}
