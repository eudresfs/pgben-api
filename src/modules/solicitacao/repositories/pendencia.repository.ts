import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pendencia, StatusPendencia } from '../entities/pendencia.entity';
import { EntityNotFoundException, InvalidOperationException } from '../../../shared/exceptions';

/**
 * Interface para filtros de busca de pendências
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
 * Repository customizado para Pendências
 * 
 * Implementa consultas e operações específicas para pendências de solicitações,
 * incluindo filtros, relatórios e gestão de prazos.
 */
@Injectable()
export class PendenciaRepository {
  constructor(
    @InjectRepository(Pendencia)
    private readonly repository: Repository<Pendencia>,
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
    const queryBuilder = this.repository
      .createQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoinAndSelect('pendencia.resolvido_por', 'resolvido_por')
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
  async buscarAbertasPorSolicitacao(solicitacaoId: string): Promise<Pendencia[]> {
    return this.repository.find({
      where: {
        solicitacao_id: solicitacaoId,
        status: StatusPendencia.ABERTA,
      },
      relations: ['registrado_por'],
      order: { created_at: 'DESC' },
    });
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

    return this.repository.save(pendencia);
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
    const pendencias = descricoes.map(descricao => {
      const pendencia = new Pendencia();
      pendencia.solicitacao_id = solicitacaoId;
      pendencia.descricao = descricao;
      pendencia.registrado_por_id = registradoPorId;
      pendencia.status = StatusPendencia.ABERTA;
      pendencia.prazo_resolucao = prazoResolucao || null;
      return pendencia;
    });

    return this.repository.save(pendencias);
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
    const pendencia = await this.repository.findOne({
      where: { id: pendenciaId },
    });

    if (!pendencia) {
      throw new EntityNotFoundException('Pendência', pendenciaId);
    }

    if (pendencia.status !== StatusPendencia.ABERTA) {
      throw new InvalidOperationException(
        'resolver pendência',
        'Apenas pendências abertas podem ser resolvidas',
        pendencia.status,
        StatusPendencia.ABERTA
      );
    }

    pendencia.status = StatusPendencia.RESOLVIDA;
    pendencia.resolvido_por_id = resolvidoPorId;
    pendencia.data_resolucao = new Date();
    pendencia.observacao_resolucao = observacaoResolucao || null;

    return this.repository.save(pendencia);
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
    const pendencia = await this.repository.findOne({
      where: { id: pendenciaId },
    });

    if (!pendencia) {
      throw new EntityNotFoundException('Pendência', pendenciaId);
    }

    if (pendencia.status !== StatusPendencia.ABERTA) {
      throw new InvalidOperationException(
        'cancelar pendência',
        'Apenas pendências abertas podem ser canceladas',
        pendencia.status,
        StatusPendencia.ABERTA
      );
    }

    pendencia.status = StatusPendencia.CANCELADA;
    pendencia.resolvido_por_id = resolvidoPorId;
    pendencia.data_resolucao = new Date();
    pendencia.observacao_resolucao = observacaoResolucao || 'Pendência cancelada';

    return this.repository.save(pendencia);
  }

  /**
   * Busca pendências com filtros
   * @param filtros Filtros a serem aplicados
   * @returns Lista de pendências filtradas
   */
  async buscarComFiltros(filtros: FiltrosPendencia): Promise<Pendencia[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('pendencia')
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

    return queryBuilder
      .orderBy('pendencia.created_at', 'DESC')
      .getMany();
  }

  /**
   * Busca pendências com prazo vencido
   * @param dataReferencia Data de referência para verificar vencimento
   * @returns Lista de pendências vencidas
   */
  async buscarComPrazoVencido(dataReferencia: Date = new Date()): Promise<Pendencia[]> {
    return this.repository
      .createQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .where('pendencia.status = :status', { status: StatusPendencia.ABERTA })
      .andWhere('pendencia.prazo_resolucao IS NOT NULL')
      .andWhere('pendencia.prazo_resolucao < :dataReferencia', { dataReferencia })
      .orderBy('pendencia.prazo_resolucao', 'ASC')
      .getMany();
  }

  /**
   * Busca pendências próximas do vencimento
   * @param diasAntecedencia Número de dias de antecedência
   * @returns Lista de pendências próximas do vencimento
   */
  async buscarProximasDoVencimento(diasAntecedencia: number = 3): Promise<Pendencia[]> {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + diasAntecedencia);

    return this.repository
      .createQueryBuilder('pendencia')
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
  async contarPorStatus(filtros?: Partial<FiltrosPendencia>): Promise<Record<StatusPendencia, number>> {
    const queryBuilder = this.repository
      .createQueryBuilder('pendencia')
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
    const contagem = Object.values(StatusPendencia).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<StatusPendencia, number>);

    // Preencher com os valores reais
    resultados.forEach(resultado => {
      contagem[resultado.status] = parseInt(resultado.total);
    });

    return contagem;
  }

  /**
   * Verifica se uma solicitação tem pendências abertas
   * @param solicitacaoId ID da solicitação
   * @returns Boolean indicando se há pendências abertas
   */
  async temPendenciasAbertas(solicitacaoId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        solicitacao_id: solicitacaoId,
        status: StatusPendencia.ABERTA,
      },
    });

    return count > 0;
  }

  /**
   * Salva uma pendência
   * @param pendencia Pendência a ser salva
   * @returns Pendência salva
   */
  async salvar(pendencia: Pendencia): Promise<Pendencia> {
    return this.repository.save(pendencia);
  }

  /**
   * Remove uma pendência (soft delete)
   * @param id ID da pendência
   * @returns Resultado da operação
   */
  async remover(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  /**
   * Busca uma pendência por ID
   * @param id ID da pendência
   * @returns Pendência encontrada ou null
   */
  async buscarPorId(id: string): Promise<Pendencia | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['solicitacao', 'registrado_por', 'resolvido_por'],
    });
  }
}