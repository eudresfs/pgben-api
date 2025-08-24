import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
  Usuario,
  TipoBeneficio,
  Unidade,
  Cidadao,
} from '../../../entities';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';

/**
 * Interface para filtros de busca de solicitações
 */
export interface FiltrosSolicitacao {
  status?: StatusSolicitacao[];
  unidade_id?: string;
  beneficio_id?: string;
  protocolo?: string;
  data_inicio?: Date;
  data_fim?: Date;
  beneficiario_id?: string;
  tecnico_id?: string;
  aprovador_id?: string;
  determinacao_judicial?: boolean;
  vencimento_prazo?: 'vencido' | 'proximo' | 'normal';
}

/**
 * Interface para opções de paginação
 */
export interface OpcoesPaginacao {
  pagina: number;
  limite: number;
  ordenacao?: {
    campo: string;
    direcao: 'ASC' | 'DESC';
  };
}

/**
 * Interface para resultado paginado
 */
export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

/**
 * Repository customizado para Solicitações com escopo automático
 *
 * Implementa consultas complexas e otimizadas para o módulo de solicitações,
 * incluindo filtros avançados, paginação e joins otimizados.
 * Aplica automaticamente filtros de escopo baseados na unidade do usuário.
 */
@Injectable()
export class SolicitacaoRepository {
  constructor(
    @InjectScopedRepository(Solicitacao)
    private readonly scopedRepository: ScopedRepository<Solicitacao>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria um QueryBuilder com escopo aplicado automaticamente
   * @param alias Alias para a entidade principal
   * @returns QueryBuilder com escopo aplicado
   */
  createScopedQueryBuilder(alias: string = 'solicitacao') {
    return this.scopedRepository.createScopedQueryBuilder(alias);
  }

  /**
   * Busca uma solicitação com base nas opções fornecidas
   * @param options Opções de busca
   * @returns Solicitação encontrada ou null
   */
  async findOne(options: any): Promise<Solicitacao | null> {
    return this.scopedRepository.findOne(options);
  }

  /**
   * Busca solicitações com filtros e paginação
   * @param filtros Filtros a serem aplicados
   * @param opcoesPaginacao Opções de paginação
   * @returns Resultado paginado com solicitações
   */
  async buscarComFiltros(
    filtros: FiltrosSolicitacao,
    opcoesPaginacao: OpcoesPaginacao,
  ): Promise<ResultadoPaginado<Solicitacao>> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .leftJoinAndSelect('solicitacao.aprovador', 'aprovador')
      .leftJoinAndSelect('solicitacao.liberador', 'liberador');

    this.aplicarFiltros(queryBuilder, filtros);
    this.aplicarOrdenacao(queryBuilder, opcoesPaginacao.ordenacao);

    const total = await queryBuilder.getCount();

    const dados = await queryBuilder
      .skip((opcoesPaginacao.pagina - 1) * opcoesPaginacao.limite)
      .take(opcoesPaginacao.limite)
      .getMany();

    return {
      dados,
      total,
      pagina: opcoesPaginacao.pagina,
      limite: opcoesPaginacao.limite,
      totalPaginas: Math.ceil(total / opcoesPaginacao.limite),
    };
  }

  /**
   * Busca uma solicitação por ID com todas as relações
   * @param id ID da solicitação
   * @returns Solicitação com relações carregadas
   */
  async buscarPorIdCompleto(id: string): Promise<Solicitacao | null> {
    return this.scopedRepository.findById(id, {
      relations: [
        'beneficiario',
        'tipo_beneficio',
        'unidade',
        'tecnico',
        'aprovador',
        'liberador',
        'documentos',
        'historico',
        'pendencias',
        'processo_judicial',
        'determinacao_judicial',
      ],
    });
  }

  /**
   * Busca solicitações por protocolo
   * @param protocolo Protocolo da solicitação
   * @returns Solicitação encontrada
   */
  async buscarPorProtocolo(protocolo: string): Promise<Solicitacao | null> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .where('solicitacao.protocolo = :protocolo', { protocolo });

    return queryBuilder.getOne();
  }

  /**
   * Busca solicitações com prazos vencidos
   * @param dataReferencia Data de referência para verificar vencimento
   * @returns Lista de solicitações com prazos vencidos
   */
  async buscarComPrazosVencidos(
    dataReferencia: Date = new Date(),
  ): Promise<Solicitacao[]> {
    return this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .where(
        '(solicitacao.prazo_analise IS NOT NULL AND solicitacao.prazo_analise < :data) OR ' +
          '(solicitacao.prazo_documentos IS NOT NULL AND solicitacao.prazo_documentos < :data) OR ' +
          '(solicitacao.prazo_processamento IS NOT NULL AND solicitacao.prazo_processamento < :data)',
        { data: dataReferencia },
      )
      .andWhere('solicitacao.status NOT IN (:...statusFinais)', {
        statusFinais: [
          StatusSolicitacao.APROVADA,
          StatusSolicitacao.INDEFERIDA,
          StatusSolicitacao.CANCELADA,
        ],
      })
      .getMany();
  }

  /**
   * Busca solicitações próximas do vencimento
   * @param diasAntecedencia Número de dias de antecedência para considerar "próximo"
   * @returns Lista de solicitações próximas do vencimento
   */
  async buscarProximasDoVencimento(
    diasAntecedencia: number = 3,
  ): Promise<Solicitacao[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

    return this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .where(
        '(solicitacao.prazo_analise IS NOT NULL AND solicitacao.prazo_analise BETWEEN :hoje AND :limite) OR ' +
          '(solicitacao.prazo_documentos IS NOT NULL AND solicitacao.prazo_documentos BETWEEN :hoje AND :limite) OR ' +
          '(solicitacao.prazo_processamento IS NOT NULL AND solicitacao.prazo_processamento BETWEEN :hoje AND :limite)',
        { hoje: new Date(), limite: dataLimite },
      )
      .andWhere('solicitacao.status NOT IN (:...statusFinais)', {
        statusFinais: [
          StatusSolicitacao.APROVADA,
          StatusSolicitacao.INDEFERIDA,
          StatusSolicitacao.CANCELADA,
        ],
      })
      .getMany();
  }

  /**
   * Conta solicitações por status
   * @param filtros Filtros opcionais
   * @returns Objeto com contagem por status
   */
  async contarPorStatus(
    filtros?: Partial<FiltrosSolicitacao>,
  ): Promise<Record<StatusSolicitacao, number>> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .select('solicitacao.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('solicitacao.status');

    if (filtros) {
      this.aplicarFiltros(queryBuilder, filtros);
    }

    const resultados = await queryBuilder.getRawMany();

    // Inicializar todos os status com 0
    const contagem = Object.values(StatusSolicitacao).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<StatusSolicitacao, number>,
    );

    // Preencher com os valores reais
    resultados.forEach((resultado) => {
      contagem[resultado.status] = parseInt(resultado.total);
    });

    return contagem;
  }

  /**
   * Busca solicitações de um beneficiário
   * @param beneficiarioId ID do beneficiário
   * @param incluirFinalizadas Se deve incluir solicitações finalizadas (aprovadas, indeferidas, canceladas)
   * @returns Lista de solicitações do beneficiário
   */
  async buscarPorBeneficiario(
    beneficiarioId: string,
    incluirFinalizadas: boolean = false,
  ): Promise<Solicitacao[]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .where('solicitacao.beneficiario_id = :beneficiarioId', {
        beneficiarioId,
      })
      .orderBy('solicitacao.created_at', 'DESC');

    if (!incluirFinalizadas) {
      queryBuilder.andWhere('solicitacao.status NOT IN (:...statusFinais)', {
        statusFinais: [
          StatusSolicitacao.APROVADA,
          StatusSolicitacao.INDEFERIDA,
          StatusSolicitacao.CANCELADA,
        ],
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Cria um query builder base para solicitações
   * @returns Query builder configurado
   * @deprecated Use createScopedQueryBuilder instead
   */
  private criarQueryBuilder(): SelectQueryBuilder<Solicitacao> {
    return this.scopedRepository.createScopedQueryBuilder('solicitacao');
  }

  /**
   * Aplica filtros ao query builder
   * @param queryBuilder Query builder
   * @param filtros Filtros a serem aplicados
   */
  private aplicarFiltros(
    queryBuilder: SelectQueryBuilder<Solicitacao>,
    filtros: FiltrosSolicitacao,
  ): void {
    if (filtros.status && filtros.status.length > 0) {
      queryBuilder.andWhere('solicitacao.status IN (:...status)', {
        status: filtros.status,
      });
    }

    if (filtros.unidade_id) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', {
        unidadeId: filtros.unidade_id,
      });
    }

    if (filtros.beneficio_id) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id = :beneficioId', {
        beneficioId: filtros.beneficio_id,
      });
    }

    if (filtros.protocolo) {
      queryBuilder.andWhere('solicitacao.protocolo ILIKE :protocolo', {
        protocolo: `%${filtros.protocolo}%`,
      });
    }

    if (filtros.data_inicio) {
      queryBuilder.andWhere('solicitacao.created_at >= :dataInicio', {
        dataInicio: filtros.data_inicio,
      });
    }

    if (filtros.data_fim) {
      queryBuilder.andWhere('solicitacao.created_at <= :dataFim', {
        dataFim: filtros.data_fim,
      });
    }

    if (filtros.beneficiario_id) {
      queryBuilder.andWhere('solicitacao.beneficiario_id = :beneficiarioId', {
        beneficiarioId: filtros.beneficiario_id,
      });
    }

    if (filtros.tecnico_id) {
      queryBuilder.andWhere('solicitacao.tecnico_id = :tecnicoId', {
        tecnicoId: filtros.tecnico_id,
      });
    }

    if (filtros.aprovador_id) {
      queryBuilder.andWhere('solicitacao.aprovador_id = :aprovadorId', {
        aprovadorId: filtros.aprovador_id,
      });
    }

    if (filtros.determinacao_judicial !== undefined) {
      queryBuilder.andWhere(
        'solicitacao.determinacao_judicial_flag = :determinacaoJudicial',
        {
          determinacaoJudicial: filtros.determinacao_judicial,
        },
      );
    }

    if (filtros.vencimento_prazo) {
      this.aplicarFiltroPrazo(queryBuilder, filtros.vencimento_prazo);
    }
  }

  /**
   * Aplica filtro de prazo ao query builder
   * @param queryBuilder Query builder
   * @param tipoPrazo Tipo de filtro de prazo
   */
  private aplicarFiltroPrazo(
    queryBuilder: SelectQueryBuilder<Solicitacao>,
    tipoPrazo: 'vencido' | 'proximo' | 'normal',
  ): void {
    const hoje = new Date();
    const proximoVencimento = new Date();
    proximoVencimento.setDate(hoje.getDate() + 3);

    switch (tipoPrazo) {
      case 'vencido':
        queryBuilder.andWhere(
          '(solicitacao.prazo_analise IS NOT NULL AND solicitacao.prazo_analise < :hoje) OR ' +
            '(solicitacao.prazo_documentos IS NOT NULL AND solicitacao.prazo_documentos < :hoje) OR ' +
            '(solicitacao.prazo_processamento IS NOT NULL AND solicitacao.prazo_processamento < :hoje)',
          { hoje },
        );
        break;
      case 'proximo':
        queryBuilder.andWhere(
          '(solicitacao.prazo_analise IS NOT NULL AND solicitacao.prazo_analise BETWEEN :hoje AND :proximo) OR ' +
            '(solicitacao.prazo_documentos IS NOT NULL AND solicitacao.prazo_documentos BETWEEN :hoje AND :proximo) OR ' +
            '(solicitacao.prazo_processamento IS NOT NULL AND solicitacao.prazo_processamento BETWEEN :hoje AND :proximo)',
          { hoje, proximo: proximoVencimento },
        );
        break;
      case 'normal':
        queryBuilder.andWhere(
          '(solicitacao.prazo_analise IS NULL OR solicitacao.prazo_analise > :proximo) AND ' +
            '(solicitacao.prazo_documentos IS NULL OR solicitacao.prazo_documentos > :proximo) AND ' +
            '(solicitacao.prazo_processamento IS NULL OR solicitacao.prazo_processamento > :proximo)',
          { proximo: proximoVencimento },
        );
        break;
    }
  }

  /**
   * Aplica ordenação ao query builder
   * @param queryBuilder Query builder
   * @param ordenacao Opções de ordenação
   */
  private aplicarOrdenacao(
    queryBuilder: SelectQueryBuilder<Solicitacao>,
    ordenacao?: { campo: string; direcao: 'ASC' | 'DESC' },
  ): void {
    if (ordenacao) {
      const campoOrdenacao = this.mapearCampoOrdenacao(ordenacao.campo);
      queryBuilder.orderBy(campoOrdenacao, ordenacao.direcao);
    } else {
      // Ordenação padrão: mais recentes primeiro
      queryBuilder.orderBy('solicitacao.created_at', 'DESC');
    }
  }

  /**
   * Mapeia campos de ordenação para evitar SQL injection
   * @param campo Campo solicitado
   * @returns Campo mapeado seguro
   */
  private mapearCampoOrdenacao(campo: string): string {
    const mapeamento: Record<string, string> = {
      data_abertura: 'solicitacao.data_abertura',
      protocolo: 'solicitacao.protocolo',
      status: 'solicitacao.status',
      beneficiario: 'beneficiario.nome',
      tipo_beneficio: 'tipo_beneficio.nome',
      unidade: 'unidade.nome',
      created_at: 'solicitacao.created_at',
      updated_at: 'solicitacao.updated_at',
    };

    return mapeamento[campo] || 'solicitacao.created_at';
  }

  /**
   * Salva uma solicitação
   * @param solicitacao Solicitação a ser salva
   * @returns Solicitação salva
   */
  async salvar(solicitacao: Solicitacao): Promise<Solicitacao> {
    return this.scopedRepository.saveWithScope(solicitacao);
  }

  /**
   * Remove uma solicitação (soft delete)
   * @param id ID da solicitação
   * @returns Resultado da operação
   */
  async remover(id: string): Promise<void> {
    await this.scopedRepository.softDelete(id);
  }

  /**
   * Busca solicitações por IDs
   * @param ids Lista de IDs
   * @returns Lista de solicitações
   */
  async buscarPorIds(ids: string[]): Promise<Solicitacao[]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .whereInIds(ids);
    return queryBuilder.getMany();
  }

  /**
   * Verifica se existe uma solicitação com o protocolo
   * @param protocolo Protocolo a ser verificado
   * @param excluirId ID a ser excluído da verificação (para updates)
   * @returns Boolean indicando se existe
   */
  async existeProtocolo(
    protocolo: string,
    excluirId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('solicitacao')
      .where('solicitacao.protocolo = :protocolo', { protocolo });

    if (excluirId) {
      queryBuilder.andWhere('solicitacao.id != :excluirId', { excluirId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }
}
