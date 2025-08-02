import { Injectable } from '@nestjs/common';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pendencia, StatusPendencia } from '../../../entities';
import {
  EntityNotFoundException,
  InvalidOperationException,
} from '../../../shared/exceptions';
import { FiltrosPendenciaDto } from '../dto/pendencia';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';

/**
 * Interface para filtros de busca de pendências (compatibilidade)
 * @deprecated Use FiltrosPendenciaDto instead
 */
export interface FiltrosPendencia {
  status?: StatusPendencia[];
  solicitacao_id?: string;
  registrado_por_id?: string;
  resolvido_por_id?: string;
  data_inicio?: Date;
  data_fim?: Date;
  prazo_vencido?: boolean;
}

/**
 * Interface para estatísticas de pendências
 */
export interface EstatisticasPendencia {
  total_abertas: number;
  total_resolvidas: number;
  total_canceladas: number;
  total_vencidas: number;
  proximas_vencimento: number;
  tempo_medio_resolucao: number;
}

/**
 * Repository customizado para Pendências
 *
 * Implementa consultas e operações específicas para pendências de solicitações,
 * incluindo filtros, relatórios e gestão de prazos.
 */
@Injectable()
export class PendenciaRepository {
  constructor(
    @InjectScopedRepository(Pendencia)
    private readonly scopedRepository: ScopedRepository<Pendencia>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Busca pendências de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param incluirResolvidas Se deve incluir pendências resolvidas
   * @returns Lista de pendências
   */
  async buscarPorSolicitacao(
    solicitacaoId: string,
    incluirResolvidas: boolean = true,
  ): Promise<Pendencia[]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoinAndSelect('pendencia.resolvido_por', 'resolvido_por')
      .leftJoin('pendencia.solicitacao', 'solicitacao')
      .where('pendencia.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .orderBy('pendencia.created_at', 'DESC');

    if (!incluirResolvidas) {
      queryBuilder.andWhere('pendencia.status = :status', {
        status: StatusPendencia.ABERTA,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Busca pendências abertas de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Lista de pendências abertas
   */
  async buscarAbertasPorSolicitacao(
    solicitacaoId: string,
  ): Promise<Pendencia[]> {
    return this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoin('pendencia.solicitacao', 'solicitacao')
      .where('pendencia.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('pendencia.status = :status', {
        status: StatusPendencia.ABERTA,
      })
      .orderBy('pendencia.created_at', 'DESC')
      .getMany();
  }

  /**
   * Cria uma nova pendência
   * @param solicitacaoId ID da solicitação
   * @param descricao Descrição da pendência
   * @param registradoPorId ID do usuário que registrou
   * @param prazoResolucao Prazo para resolução (opcional)
   * @returns Pendência criada
   */
  async criar(
    solicitacaoId: string,
    descricao: string,
    registradoPorId: string,
    prazoResolucao?: Date,
  ): Promise<Pendencia> {
    const pendencia = new Pendencia();
    pendencia.solicitacao_id = solicitacaoId;
    pendencia.descricao = descricao;
    pendencia.registrado_por_id = registradoPorId;
    pendencia.status = StatusPendencia.ABERTA;
    pendencia.prazo_resolucao = prazoResolucao || null;

    return this.scopedRepository.saveWithScope(pendencia);
  }

  /**
   * Cria múltiplas pendências de uma vez
   * @param solicitacaoId ID da solicitação
   * @param descricoes Lista de descrições das pendências
   * @param registradoPorId ID do usuário que registrou
   * @param prazoResolucao Prazo para resolução (opcional)
   * @returns Lista de pendências criadas
   */
  async criarMultiplas(
    solicitacaoId: string,
    descricoes: string[],
    registradoPorId: string,
    prazoResolucao?: Date,
  ): Promise<Pendencia[]> {
    const pendencias = descricoes.map((descricao) => {
      const pendencia = new Pendencia();
      pendencia.solicitacao_id = solicitacaoId;
      pendencia.descricao = descricao;
      pendencia.registrado_por_id = registradoPorId;
      pendencia.status = StatusPendencia.ABERTA;
      pendencia.prazo_resolucao = prazoResolucao || null;
      return pendencia;
    });

    // Para múltiplas entidades, usamos o repository diretamente
    // pois o saveWithScope não suporta arrays
    return this.scopedRepository.save(pendencias);
  }

  /**
   * Resolve uma pendência
   * @param pendenciaId ID da pendência
   * @param resolvidoPorId ID do usuário que resolveu
   * @param observacaoResolucao Observação sobre a resolução
   * @returns Pendência atualizada
   */
  async resolver(
    pendenciaId: string,
    resolvidoPorId: string,
    observacaoResolucao?: string,
  ): Promise<Pendencia> {
    const pendencia = await this.scopedRepository.findById(pendenciaId);

    if (!pendencia) {
      throw new EntityNotFoundException('Pendência', pendenciaId);
    }

    if (pendencia.status !== StatusPendencia.ABERTA) {
      throw new InvalidOperationException(
        'resolver pendência',
        'Apenas pendências abertas podem ser resolvidas',
        pendencia.status,
        StatusPendencia.ABERTA,
      );
    }

    pendencia.status = StatusPendencia.RESOLVIDA;
    pendencia.resolvido_por_id = resolvidoPorId;
    pendencia.data_resolucao = new Date();
    pendencia.observacao_resolucao = observacaoResolucao || null;

    return this.scopedRepository.saveWithScope(pendencia);
  }

  /**
   * Cancela uma pendência
   * @param pendenciaId ID da pendência
   * @param resolvidoPorId ID do usuário que cancelou
   * @param observacaoResolucao Observação sobre o cancelamento
   * @returns Pendência atualizada
   */
  async cancelar(
    pendenciaId: string,
    resolvidoPorId: string,
    observacaoResolucao?: string,
  ): Promise<Pendencia> {
    const pendencia = await this.scopedRepository.findById(pendenciaId);

    if (!pendencia) {
      throw new EntityNotFoundException('Pendência', pendenciaId);
    }

    if (pendencia.status !== StatusPendencia.ABERTA) {
      throw new InvalidOperationException(
        'cancelar pendência',
        'Apenas pendências abertas podem ser canceladas',
        pendencia.status,
        StatusPendencia.ABERTA,
      );
    }

    pendencia.status = StatusPendencia.CANCELADA;
    pendencia.resolvido_por_id = resolvidoPorId;
    pendencia.data_resolucao = new Date();
    pendencia.observacao_resolucao =
      observacaoResolucao || 'Pendência cancelada';

    return this.scopedRepository.saveWithScope(pendencia);
  }

  /**
   * Busca pendências com filtros
   * @param filtros Filtros a serem aplicados
   * @returns Lista de pendências filtradas
   */
  async buscarComFiltros(filtros: FiltrosPendencia): Promise<Pendencia[]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoinAndSelect('pendencia.resolvido_por', 'resolvido_por');

    if (filtros.status && filtros.status.length > 0) {
      queryBuilder.andWhere('pendencia.status IN (:...status)', {
        status: filtros.status,
      });
    }

    if (filtros.solicitacao_id) {
      queryBuilder.andWhere('pendencia.solicitacao_id = :solicitacaoId', {
        solicitacaoId: filtros.solicitacao_id,
      });
    }

    if (filtros.registrado_por_id) {
      queryBuilder.andWhere('pendencia.registrado_por_id = :registradoPorId', {
        registradoPorId: filtros.registrado_por_id,
      });
    }

    if (filtros.resolvido_por_id) {
      queryBuilder.andWhere('pendencia.resolvido_por_id = :resolvidoPorId', {
        resolvidoPorId: filtros.resolvido_por_id,
      });
    }

    if (filtros.data_inicio) {
      queryBuilder.andWhere('pendencia.created_at >= :dataInicio', {
        dataInicio: filtros.data_inicio,
      });
    }

    if (filtros.data_fim) {
      queryBuilder.andWhere('pendencia.created_at <= :dataFim', {
        dataFim: filtros.data_fim,
      });
    }

    if (filtros.prazo_vencido) {
      const hoje = new Date();
      queryBuilder.andWhere(
        'pendencia.prazo_resolucao IS NOT NULL AND pendencia.prazo_resolucao < :hoje AND pendencia.status = :statusAberta',
        { hoje, statusAberta: StatusPendencia.ABERTA },
      );
    }

    return queryBuilder.orderBy('pendencia.created_at', 'DESC').getMany();
  }

  /**
   * Busca pendências com prazo vencido
   * @param dataReferencia Data de referência para verificar vencimento
   * @returns Lista de pendências vencidas
   */
  async buscarComPrazoVencido(
    dataReferencia: Date = new Date(),
  ): Promise<Pendencia[]> {
    return this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .where('pendencia.status = :status', { status: StatusPendencia.ABERTA })
      .andWhere('pendencia.prazo_resolucao IS NOT NULL')
      .andWhere('pendencia.prazo_resolucao < :dataReferencia', {
        dataReferencia,
      })
      .orderBy('pendencia.prazo_resolucao', 'ASC')
      .getMany();
  }

  /**
   * Busca pendências próximas do vencimento
   * @param diasAntecedencia Número de dias de antecedência
   * @returns Lista de pendências próximas do vencimento
   */
  async buscarProximasDoVencimento(
    diasAntecedencia: number = 3,
  ): Promise<Pendencia[]> {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + diasAntecedencia);

    return this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .where('pendencia.status = :status', { status: StatusPendencia.ABERTA })
      .andWhere('pendencia.prazo_resolucao IS NOT NULL')
      .andWhere('pendencia.prazo_resolucao BETWEEN :hoje AND :dataLimite', {
        hoje,
        dataLimite,
      })
      .orderBy('pendencia.prazo_resolucao', 'ASC')
      .getMany();
  }

  /**
   * Conta pendências por status
   * @param filtros Filtros opcionais
   * @returns Objeto com contagem por status
   */
  async contarPorStatus(
    filtros?: Partial<FiltrosPendencia>,
  ): Promise<Record<StatusPendencia, number>> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoin('pendencia.solicitacao', 'solicitacao')
      .select('pendencia.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('pendencia.status');

    if (filtros?.solicitacao_id) {
      queryBuilder.andWhere('pendencia.solicitacao_id = :solicitacaoId', {
        solicitacaoId: filtros.solicitacao_id,
      });
    }

    if (filtros?.data_inicio) {
      queryBuilder.andWhere('pendencia.created_at >= :dataInicio', {
        dataInicio: filtros.data_inicio,
      });
    }

    if (filtros?.data_fim) {
      queryBuilder.andWhere('pendencia.created_at <= :dataFim', {
        dataFim: filtros.data_fim,
      });
    }

    const resultados = await queryBuilder.getRawMany();

    // Inicializar todos os status com 0
    const contagem = Object.values(StatusPendencia).reduce(
      (acc, status) => {
        (acc as Record<StatusPendencia, number>)[status] = 0;
        return acc;
      },
      {} as Record<StatusPendencia, number>,
    );

    // Preencher com os valores reais
    resultados.forEach((resultado) => {
      (contagem as Record<StatusPendencia, number>)[resultado.status] =
        parseInt(resultado.total);
    });

    return contagem as Record<StatusPendencia, number>;
  }

  /**
   * Verifica se uma solicitação tem pendências abertas
   * @param solicitacaoId ID da solicitação
   * @returns Boolean indicando se há pendências abertas
   */
  async temPendenciasAbertas(solicitacaoId: string): Promise<boolean> {
    const count = await this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoin('pendencia.solicitacao', 'solicitacao')
      .where('pendencia.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('pendencia.status = :status', {
        status: StatusPendencia.ABERTA,
      })
      .getCount();

    return count > 0;
  }

  /**
   * Salva uma pendência
   * @param pendencia Pendência a ser salva
   * @returns Pendência salva
   */
  async salvar(pendencia: Pendencia): Promise<Pendencia> {
    return this.scopedRepository.saveWithScope(pendencia);
  }

  /**
   * Remove uma pendência (soft delete)
   * @param id ID da pendência
   * @returns Resultado da operação
   */
  async remover(id: string): Promise<void> {
    await this.scopedRepository.deleteWithScope(id);
  }

  /**
   * Busca uma pendência por ID
   * @param id ID da pendência
   * @returns Pendência encontrada ou null
   */
  async buscarPorId(id: string): Promise<Pendencia | null> {
    return this.scopedRepository.findById(id, {
      relations: ['solicitacao', 'registrado_por', 'resolvido_por'],
    });
  }

  /**
   * Busca pendências com filtros avançados e paginação
   * @param filtros Filtros do DTO
   * @param page Página
   * @param limit Limite por página
   * @returns Array com pendências e total
   */
  async buscarComFiltrosAvancados(
    filtros: FiltrosPendenciaDto,
    page: number = 1,
    limit: number = 10,
  ): Promise<[Pendencia[], number]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoinAndSelect('pendencia.resolvido_por', 'resolvido_por')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario');

    this.aplicarFiltrosAvancados(queryBuilder, filtros);
    this.aplicarOrdenacao(queryBuilder, filtros);

    return queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Aplica filtros avançados à consulta
   */
  private aplicarFiltrosAvancados(
    queryBuilder: SelectQueryBuilder<Pendencia>,
    filtros: FiltrosPendenciaDto,
  ): void {
    if (filtros.solicitacao_id) {
      queryBuilder.andWhere('pendencia.solicitacao_id = :solicitacaoId', {
        solicitacaoId: filtros.solicitacao_id,
      });
    }

    if (filtros.status) {
      queryBuilder.andWhere('pendencia.status = :status', {
        status: filtros.status,
      });
    }

    if (filtros.status_list && filtros.status_list.length > 0) {
      queryBuilder.andWhere('pendencia.status IN (:...statusList)', {
        statusList: filtros.status_list,
      });
    }

    if (filtros.registrado_por_id) {
      queryBuilder.andWhere('pendencia.registrado_por_id = :registradoPorId', {
        registradoPorId: filtros.registrado_por_id,
      });
    }

    if (filtros.resolvido_por_id) {
      queryBuilder.andWhere('pendencia.resolvido_por_id = :resolvidoPorId', {
        resolvidoPorId: filtros.resolvido_por_id,
      });
    }

    if (filtros.data_criacao_inicio) {
      queryBuilder.andWhere('pendencia.created_at >= :dataCriacaoInicio', {
        dataCriacaoInicio: new Date(filtros.data_criacao_inicio),
      });
    }

    if (filtros.data_criacao_fim) {
      const dataFim = new Date(filtros.data_criacao_fim);
      dataFim.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('pendencia.created_at <= :dataCriacaoFim', {
        dataCriacaoFim: dataFim,
      });
    }

    if (filtros.data_resolucao_inicio) {
      queryBuilder.andWhere(
        'pendencia.data_resolucao >= :dataResolucaoInicio',
        {
          dataResolucaoInicio: new Date(filtros.data_resolucao_inicio),
        },
      );
    }

    if (filtros.data_resolucao_fim) {
      const dataFim = new Date(filtros.data_resolucao_fim);
      dataFim.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('pendencia.data_resolucao <= :dataResolucaoFim', {
        dataResolucaoFim: dataFim,
      });
    }

    if (filtros.prazo_resolucao_inicio) {
      queryBuilder.andWhere(
        'pendencia.prazo_resolucao >= :prazoResolucaoInicio',
        {
          prazoResolucaoInicio: new Date(filtros.prazo_resolucao_inicio),
        },
      );
    }

    if (filtros.prazo_resolucao_fim) {
      queryBuilder.andWhere('pendencia.prazo_resolucao <= :prazoResolucaoFim', {
        prazoResolucaoFim: new Date(filtros.prazo_resolucao_fim),
      });
    }

    if (filtros.busca_descricao) {
      queryBuilder.andWhere('pendencia.descricao ILIKE :buscaDescricao', {
        buscaDescricao: `%${filtros.busca_descricao}%`,
      });
    }

    if (filtros.apenas_vencidas) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      queryBuilder
        .andWhere('pendencia.status = :statusAberta', {
          statusAberta: StatusPendencia.ABERTA,
        })
        .andWhere('pendencia.prazo_resolucao IS NOT NULL')
        .andWhere('pendencia.prazo_resolucao < :hoje', { hoje });
    }

    if (filtros.proximas_vencimento) {
      const hoje = new Date();
      const seteDias = new Date();
      seteDias.setDate(hoje.getDate() + 7);

      hoje.setHours(0, 0, 0, 0);
      seteDias.setHours(23, 59, 59, 999);

      queryBuilder
        .andWhere('pendencia.status = :statusAberta', {
          statusAberta: StatusPendencia.ABERTA,
        })
        .andWhere('pendencia.prazo_resolucao IS NOT NULL')
        .andWhere('pendencia.prazo_resolucao >= :hoje', { hoje })
        .andWhere('pendencia.prazo_resolucao <= :seteDias', { seteDias });
    }
  }

  /**
   * Aplica ordenação à consulta
   */
  private aplicarOrdenacao(
    queryBuilder: SelectQueryBuilder<Pendencia>,
    filtros: FiltrosPendenciaDto,
  ): void {
    const campoOrdenacao = filtros.sort_by || 'created_at';
    const direcaoOrdenacao = filtros.sort_order || 'DESC';

    // Mapear campos para evitar SQL injection
    const camposPermitidos = {
      created_at: 'pendencia.created_at',
      updated_at: 'pendencia.updated_at',
      status: 'pendencia.status',
      prazo_resolucao: 'pendencia.prazo_resolucao',
      data_resolucao: 'pendencia.data_resolucao',
    };

    const campoFinal =
      camposPermitidos[campoOrdenacao] || 'pendencia.created_at';
    queryBuilder.orderBy(campoFinal, direcaoOrdenacao as 'ASC' | 'DESC');

    // Ordenação secundária por data de criação
    if (campoOrdenacao !== 'created_at') {
      queryBuilder.addOrderBy('pendencia.created_at', 'DESC');
    }
  }

  /**
   * Calcula estatísticas de pendências
   * @param filtros Filtros opcionais
   * @returns Estatísticas calculadas
   */
  async calcularEstatisticas(
    filtros?: Partial<FiltrosPendenciaDto>,
  ): Promise<EstatisticasPendencia> {
    const queryBuilder = this.scopedRepository.createQueryBuilder('pendencia');

    // Aplicar filtros se fornecidos
    if (filtros?.solicitacao_id) {
      queryBuilder.andWhere('pendencia.solicitacao_id = :solicitacaoId', {
        solicitacaoId: filtros.solicitacao_id,
      });
    }

    if (filtros?.data_criacao_inicio) {
      queryBuilder.andWhere('pendencia.created_at >= :dataCriacaoInicio', {
        dataCriacaoInicio: new Date(filtros.data_criacao_inicio),
      });
    }

    if (filtros?.data_criacao_fim) {
      const dataFim = new Date(filtros.data_criacao_fim);
      dataFim.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('pendencia.created_at <= :dataCriacaoFim', {
        dataCriacaoFim: dataFim,
      });
    }

    // Contar por status
    const contadorStatus = await this.scopedRepository
      .createQueryBuilder('pendencia')
      .select('pendencia.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('pendencia.status')
      .getRawMany();

    const estatisticas: EstatisticasPendencia = {
      total_abertas: 0,
      total_resolvidas: 0,
      total_canceladas: 0,
      total_vencidas: 0,
      proximas_vencimento: 0,
      tempo_medio_resolucao: 0,
    };

    // Processar contadores por status
    contadorStatus.forEach((item) => {
      const total = parseInt(item.total);
      switch (item.status) {
        case StatusPendencia.ABERTA:
          estatisticas.total_abertas = total;
          break;
        case StatusPendencia.RESOLVIDA:
          estatisticas.total_resolvidas = total;
          break;
        case StatusPendencia.CANCELADA:
          estatisticas.total_canceladas = total;
          break;
      }
    });

    // Contar vencidas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    estatisticas.total_vencidas = await this.scopedRepository.count({
      where: {
        status: StatusPendencia.ABERTA,
      },
    });

    // Filtrar vencidas manualmente (devido à complexidade da consulta)
    const pendenciasAbertas = await this.scopedRepository.find({
      where: { status: StatusPendencia.ABERTA },
      select: ['id', 'prazo_resolucao'],
    });

    estatisticas.total_vencidas = pendenciasAbertas.filter((p) => {
      if (!p.prazo_resolucao) {
        return false;
      }
      const prazo = new Date(p.prazo_resolucao);
      prazo.setHours(0, 0, 0, 0);
      return prazo < hoje;
    }).length;

    // Contar próximas do vencimento (próximos 7 dias)
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() + 7);
    seteDias.setHours(23, 59, 59, 999);

    estatisticas.proximas_vencimento = pendenciasAbertas.filter((p) => {
      if (!p.prazo_resolucao) {
        return false;
      }
      const prazo = new Date(p.prazo_resolucao);
      return prazo >= hoje && prazo <= seteDias;
    }).length;

    // Calcular tempo médio de resolução
    const pendenciasResolvidas = await this.scopedRepository.find({
      where: { status: StatusPendencia.RESOLVIDA },
      select: ['created_at', 'data_resolucao'],
    });

    if (pendenciasResolvidas.length > 0) {
      const tempoTotal = pendenciasResolvidas.reduce((acc, p) => {
        if (p.data_resolucao) {
          const diffTime =
            new Date(p.data_resolucao).getTime() -
            new Date(p.created_at).getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return acc + diffDays;
        }
        return acc;
      }, 0);

      estatisticas.tempo_medio_resolucao =
        Math.round((tempoTotal / pendenciasResolvidas.length) * 100) / 100;
    }

    return estatisticas;
  }

  /**
   * Busca pendências próximas do vencimento com dias configuráveis
   * @param diasAntecedencia Número de dias de antecedência
   * @param incluirVencidas Se deve incluir as já vencidas
   * @returns Lista de pendências próximas do vencimento
   */
  async buscarProximasVencimentoAvancado(
    diasAntecedencia: number = 7,
    incluirVencidas: boolean = false,
  ): Promise<Pendencia[]> {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + diasAntecedencia);

    const queryBuilder = this.scopedRepository
      .createQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .where('pendencia.status = :status', { status: StatusPendencia.ABERTA })
      .andWhere('pendencia.prazo_resolucao IS NOT NULL');

    if (incluirVencidas) {
      queryBuilder.andWhere('pendencia.prazo_resolucao <= :dataLimite', {
        dataLimite,
      });
    } else {
      queryBuilder.andWhere(
        'pendencia.prazo_resolucao BETWEEN :hoje AND :dataLimite',
        { hoje, dataLimite },
      );
    }

    return queryBuilder.orderBy('pendencia.prazo_resolucao', 'ASC').getMany();
  }
}
