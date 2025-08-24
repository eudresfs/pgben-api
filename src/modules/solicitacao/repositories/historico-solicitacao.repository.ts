import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HistoricoSolicitacao } from '../../../entities/historico-solicitacao.entity';
import { StatusSolicitacao } from '../../../entities/solicitacao.entity';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';

/**
 * Repository customizado para Histórico de Solicitações
 *
 * Implementa consultas e operações específicas para o histórico de solicitações,
 * permitindo rastrear todas as mudanças de status e alterações.
 */
@Injectable()
export class HistoricoSolicitacaoRepository {
  constructor(
    @InjectScopedRepository(HistoricoSolicitacao)
    private readonly scopedRepository: ScopedRepository<HistoricoSolicitacao>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Busca o histórico de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Lista de registros de histórico ordenados por data
   */
  async buscarHistoricoPorSolicitacao(
    solicitacaoId: string,
  ): Promise<HistoricoSolicitacao[]> {
    return this.scopedRepository
      .createScopedQueryBuilder('historico')
      .leftJoinAndSelect('historico.usuario', 'usuario')
      .leftJoin('historico.solicitacao', 'solicitacao')
      .where('historico.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .orderBy('historico.created_at', 'DESC')
      .getMany();
  }

  /**
   * Registra uma mudança de status na solicitação
   * @param solicitacaoId ID da solicitação
   * @param statusAnterior Status anterior
   * @param statusAtual Novo status
   * @param usuarioId ID do usuário que realizou a alteração
   * @param observacao Observação sobre a alteração (opcional)
   * @param dadosAlterados Dados alterados na solicitação (opcional)
   * @param ipUsuario IP do usuário (opcional)
   * @returns Registro de histórico criado
   */
  async registrarMudancaStatus(
    solicitacaoId: string,
    statusAnterior: StatusSolicitacao,
    statusAtual: StatusSolicitacao,
    usuarioId: string,
    observacao?: string,
    dadosAlterados?: Record<string, any>,
    ipUsuario?: string,
  ): Promise<HistoricoSolicitacao> {
    const historico = new HistoricoSolicitacao();
    historico.solicitacao_id = solicitacaoId;
    historico.status_anterior = statusAnterior;
    historico.status_atual = statusAtual;
    historico.usuario_id = usuarioId;
    historico.observacao = observacao || null;
    historico.dados_alterados = dadosAlterados || null;
    historico.ip_usuario = ipUsuario || null;

    return this.scopedRepository.saveWithScope(historico);
  }

  /**
   * Registra uma alteração em dados da solicitação sem mudança de status
   * @param solicitacaoId ID da solicitação
   * @param status Status atual da solicitação
   * @param usuarioId ID do usuário que realizou a alteração
   * @param dadosAlterados Dados alterados na solicitação
   * @param observacao Observação sobre a alteração (opcional)
   * @param ipUsuario IP do usuário (opcional)
   * @returns Registro de histórico criado
   */
  async registrarAlteracaoDados(
    solicitacaoId: string,
    status: StatusSolicitacao,
    usuarioId: string,
    dadosAlterados: Record<string, any>,
    observacao?: string,
    ipUsuario?: string,
  ): Promise<HistoricoSolicitacao> {
    const historico = new HistoricoSolicitacao();
    historico.solicitacao_id = solicitacaoId;
    historico.status_anterior = status;
    historico.status_atual = status; // Mesmo status, apenas alteração de dados
    historico.usuario_id = usuarioId;
    historico.observacao = observacao || 'Alteração de dados';
    historico.dados_alterados = dadosAlterados;
    historico.ip_usuario = ipUsuario || '0.0.0.0'; // IP padrão para alterações sem usuário

    return this.scopedRepository.saveWithScope(historico);
  }

  /**
   * Busca o último registro de histórico de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Último registro de histórico ou null se não existir
   */
  async buscarUltimoRegistro(
    solicitacaoId: string,
  ): Promise<HistoricoSolicitacao | null> {
    return this.scopedRepository
      .createScopedQueryBuilder('historico')
      .leftJoin('historico.solicitacao', 'solicitacao')
      .where('historico.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .orderBy('historico.created_at', 'DESC')
      .getOne();
  }

  /**
   * Busca o tempo médio de permanência em cada status
   * @param filtros Filtros opcionais (período, tipo de benefício, etc)
   * @returns Objeto com tempo médio em cada status em dias
   */
  async calcularTempoMedioPorStatus(filtros?: {
    dataInicio?: Date;
    dataFim?: Date;
    tipoBeneficioId?: string;
    unidadeId?: string;
  }): Promise<Record<StatusSolicitacao, number>> {
    // Construir a query para calcular o tempo médio entre status
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('historico')
      .select('historico.status_anterior', 'status')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (LEAD(historico.created_at) OVER (PARTITION BY historico.solicitacao_id ORDER BY historico.created_at) - historico.created_at)))/86400',
        'tempo_medio_dias',
      )
      .innerJoin('historico.solicitacao', 'solicitacao')
      .groupBy('historico.status_anterior');

    // Aplicar filtros se fornecidos
    if (filtros?.dataInicio) {
      queryBuilder.andWhere('historico.created_at >= :dataInicio', {
        dataInicio: filtros.dataInicio,
      });
    }

    if (filtros?.dataFim) {
      queryBuilder.andWhere('historico.created_at <= :dataFim', {
        dataFim: filtros.dataFim,
      });
    }

    if (filtros?.tipoBeneficioId) {
      queryBuilder.andWhere(
        'solicitacao.tipo_beneficio_id = :tipoBeneficioId',
        {
          tipoBeneficioId: filtros.tipoBeneficioId,
        },
      );
    }

    if (filtros?.unidadeId) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', {
        unidadeId: filtros.unidadeId,
      });
    }

    const resultados = await queryBuilder.getRawMany();

    // Inicializar todos os status com 0
    const tempoMedio = Object.values(StatusSolicitacao).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<StatusSolicitacao, number>,
    );

    // Preencher com os valores reais
    resultados.forEach((resultado) => {
      if (resultado.status) {
        tempoMedio[resultado.status] =
          parseFloat(resultado.tempo_medio_dias) || 0;
      }
    });

    return tempoMedio;
  }

  /**
   * Busca o histórico de alterações de dados específicos
   * @param solicitacaoId ID da solicitação
   * @param campo Nome do campo para filtrar alterações
   * @returns Lista de registros de histórico com alterações no campo
   */
  async buscarHistoricoPorCampo(
    solicitacaoId: string,
    campo: string,
  ): Promise<HistoricoSolicitacao[]> {
    return this.scopedRepository
      .createScopedQueryBuilder('historico')
      .leftJoin('historico.solicitacao', 'solicitacao')
      .where('historico.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere(`historico.dados_alterados->>'${campo}' IS NOT NULL`)
      .orderBy('historico.created_at', 'DESC')
      .getMany();
  }

  /**
   * Salva um registro de histórico
   * @param historico Registro de histórico a ser salvo
   * @returns Registro de histórico salvo
   */
  async salvar(historico: HistoricoSolicitacao): Promise<HistoricoSolicitacao> {
    return this.scopedRepository.saveWithScope(historico);
  }
}
