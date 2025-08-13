import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { HistoricoAprovacao } from '../entities/historico-aprovacao.entity';
import { AcaoAprovacao } from '../enums/aprovacao.enums';

/**
 * Repository para gerenciar operações de banco de dados da entidade HistoricoAprovacao
 * Fornece métodos específicos do domínio para consultas e operações complexas
 */
@Injectable()
export class HistoricoAprovacaoRepository {
  constructor(
    @InjectRepository(HistoricoAprovacao)
    private readonly repository: Repository<HistoricoAprovacao>,
  ) {}

  /**
   * Busca histórico por solicitação de aprovação
   * @param solicitacaoAprovacaoId - ID da solicitação de aprovação
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorSolicitacao(solicitacaoAprovacaoId: string): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { solicitacao_aprovacao_id: solicitacaoAprovacaoId },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
        'aprovador.configuracao_aprovacao',
      ],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Busca histórico por ação específica
   * @param acao - Ação de aprovação
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorAcao(acao: AcaoAprovacao): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { acao },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por usuário aprovador
   * @param usuarioId - ID do usuário aprovador
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorUsuario(usuarioId: string): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { usuario_id: usuarioId },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por aprovador
   * @param aprovadorId - ID do aprovador
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorAprovador(aprovadorId: string): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { aprovador_id: aprovadorId },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
        'aprovador.configuracao_aprovacao',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por período
   * @param dataInicio - Data de início
   * @param dataFim - Data de fim
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: {
        created_at: Between(dataInicio, dataFim),
      },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca aprovações realizadas
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarAprovacoes(): Promise<HistoricoAprovacao[]> {
    return this.buscarPorAcao(AcaoAprovacao.APROVAR);
  }

  /**
   * Busca rejeições realizadas
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarRejeicoes(): Promise<HistoricoAprovacao[]> {
    return this.buscarPorAcao(AcaoAprovacao.REJEITAR);
  }

  /**
   * Busca delegações realizadas
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarDelegacoes(): Promise<HistoricoAprovacao[]> {
    return this.buscarPorAcao(AcaoAprovacao.DELEGAR);
  }

  /**
   * Busca ações automáticas
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarAcoesAutomaticas(): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { acao_automatica: true },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por IP do usuário
   * @param ipUsuario - IP do usuário
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorIpUsuario(ipUsuario: string): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { ip_usuario: ipUsuario },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
      take: 50, // Limita para evitar sobrecarga
    });
  }

  /**
   * Busca histórico por nível de escalação
   * @param nivelEscalacao - Nível de escalação
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorNivelEscalacao(nivelEscalacao: number): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { nivel_escalacao: nivelEscalacao },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por tags
   * @param tags - Array de tags
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorTags(tags: string[]): Promise<HistoricoAprovacao[]> {
    return this.repository
      .createQueryBuilder('historico')
      .leftJoinAndSelect('historico.solicitacao_aprovacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.acao_critica', 'acao')
      .leftJoinAndSelect('historico.aprovador', 'aprovador')
      .where('historico.tags && :tags', { tags })
      .orderBy('historico.created_at', 'DESC')
      .getMany();
  }

  /**
   * Busca histórico com delegação
   * @param delegadoParaUsuarioId - ID do usuário para quem foi delegado
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarComDelegacao(delegadoParaUsuarioId?: string): Promise<HistoricoAprovacao[]> {
    const where: FindOptionsWhere<HistoricoAprovacao> = {
      acao: AcaoAprovacao.DELEGAR,
    };

    if (delegadoParaUsuarioId) {
      where.delegado_para_usuario_id = delegadoParaUsuarioId;
    }

    return this.repository.find({
      where,
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico com paginação
   * @param skip - Número de registros para pular
   * @param take - Número de registros para retornar
   * @param filtros - Filtros opcionais
   * @returns Promise<[HistoricoAprovacao[], number]>
   */
  async buscarComPaginacao(
    skip: number,
    take: number,
    filtros?: Partial<HistoricoAprovacao>,
  ): Promise<[HistoricoAprovacao[], number]> {
    const where: FindOptionsWhere<HistoricoAprovacao> = {};
    
    if (filtros) {
      Object.assign(where, filtros);
    }

    return this.repository.findAndCount({
      where,
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
      skip,
      take,
    });
  }

  /**
   * Cria um novo registro de histórico
   * @param dadosHistorico - Dados do histórico
   * @returns Promise<HistoricoAprovacao>
   */
  async criar(dadosHistorico: Partial<HistoricoAprovacao>): Promise<HistoricoAprovacao> {
    const historico = this.repository.create(dadosHistorico);
    return this.repository.save(historico);
  }

  /**
   * Atualiza um registro de histórico
   * @param id - ID do histórico
   * @param dadosAtualizacao - Dados para atualização
   * @returns Promise<HistoricoAprovacao>
   */
  async atualizar(
    id: string,
    dadosAtualizacao: Partial<HistoricoAprovacao>,
  ): Promise<HistoricoAprovacao> {
    await this.repository.update(id, dadosAtualizacao);
    return this.repository.findOne({
      where: { id },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
    });
  }

  /**
   * Conta registros por ação
   * @param acao - Ação de aprovação
   * @returns Promise<number>
   */
  async contarPorAcao(acao: AcaoAprovacao): Promise<number> {
    return this.repository.count({ where: { acao } });
  }

  /**
   * Conta registros por usuário
   * @param usuarioId - ID do usuário
   * @returns Promise<number>
   */
  async contarPorUsuario(usuarioId: string): Promise<number> {
    return this.repository.count({ where: { usuario_id: usuarioId } });
  }

  /**
   * Busca estatísticas de aprovação por usuário
   * @param usuarioId - ID do usuário
   * @returns Promise<any>
   */
  async buscarEstatisticasUsuario(usuarioId: string): Promise<any> {
    return this.repository
      .createQueryBuilder('historico')
      .select('historico.acao', 'acao')
      .addSelect('COUNT(*)', 'total')
      .where('historico.usuario_id = :usuarioId', { usuarioId })
      .groupBy('historico.acao')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();
  }

  /**
   * Busca estatísticas gerais por período
   * @param dataInicio - Data de início
   * @param dataFim - Data de fim
   * @returns Promise<any>
   */
  async buscarEstatisticasPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<any> {
    return this.repository
      .createQueryBuilder('historico')
      .select('historico.acao', 'acao')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(DISTINCT historico.usuario_id)', 'usuarios_unicos')
      .where('historico.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('historico.acao')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();
  }

  /**
   * Busca último histórico de uma solicitação
   * @param solicitacaoAprovacaoId - ID da solicitação
   * @returns Promise<HistoricoAprovacao | null>
   */
  async buscarUltimoPorSolicitacao(
    solicitacaoAprovacaoId: string,
  ): Promise<HistoricoAprovacao | null> {
    return this.repository.findOne({
      where: { solicitacao_aprovacao_id: solicitacaoAprovacaoId },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico de auditoria
   * @param auditado - Se foi auditado ou não
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorAuditoria(auditado: boolean): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { auditado },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Marca histórico como auditado
   * @param id - ID do histórico
   * @param auditorId - ID do auditor
   * @param observacoes - Observações da auditoria
   * @returns Promise<void>
   */
  async marcarComoAuditado(
    id: string,
    auditorId: string,
    observacoes?: string,
  ): Promise<void> {
    await this.repository.update(id, {
      auditado: true,
      data_auditoria: new Date(),
      auditor_id: auditorId,
      observacoes_auditoria: observacoes,
    });
  }

  /**
   * Busca top aprovadores por volume
   * @param limite - Limite de resultados
   * @returns Promise<any[]>
   */
  async buscarTopAprovadores(limite: number = 10): Promise<any[]> {
    return this.repository
      .createQueryBuilder('historico')
      .select('historico.usuario_id', 'usuario_id')
      .addSelect('COUNT(*)', 'total_acoes')
      .addSelect(
        'COUNT(CASE WHEN historico.acao = :aprovacao THEN 1 END)',
        'total_aprovacoes',
      )
      .addSelect(
        'COUNT(CASE WHEN historico.acao = :rejeicao THEN 1 END)',
        'total_rejeicoes',
      )
      .setParameter('aprovacao', AcaoAprovacao.APROVAR)
      .setParameter('rejeicao', AcaoAprovacao.REJEITAR)
      .where('historico.usuario_id IS NOT NULL')
      .groupBy('historico.usuario_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limite)
      .getRawMany();
  }

  /**
   * Busca histórico por versão do sistema
   * @param versaoSistema - Versão do sistema
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorVersaoSistema(versaoSistema: string): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { versao_sistema: versaoSistema },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por hash de integridade
   * @param hashIntegridade - Hash de integridade
   * @returns Promise<HistoricoAprovacao[]>
   */
  async buscarPorHashIntegridade(hashIntegridade: string): Promise<HistoricoAprovacao[]> {
    return this.repository.find({
      where: { hash_integridade: hashIntegridade },
      relations: [
        'solicitacao_aprovacao',
        'solicitacao_aprovacao.acao_critica',
        'aprovador',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca tempo médio de aprovação por ação crítica
   * @param acaoCriticaId - ID da ação crítica
   * @returns Promise<number>
   */
  async buscarTempoMedioAprovacao(acaoCriticaId?: string): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder('historico')
      .innerJoin('historico.solicitacao_aprovacao', 'solicitacao')
      .select(
        'AVG(EXTRACT(EPOCH FROM (historico.created_at - solicitacao.created_at)))',
        'tempo_medio_segundos',
      )
      .where('historico.acao = :acao', { acao: AcaoAprovacao.APROVAR });

    if (acaoCriticaId) {
      queryBuilder.andWhere('solicitacao.acao_critica_id = :acaoCriticaId', {
        acaoCriticaId,
      });
    }

    const resultado = await queryBuilder.getRawOne();
    return resultado?.tempo_medio_segundos || 0;
  }
}