import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  Between,
  LessThan,
  MoreThan,
} from 'typeorm';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import {
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
} from '../enums/aprovacao.enums';

/**
 * Repository para gerenciar operações de banco de dados da entidade SolicitacaoAprovacao
 * Fornece métodos específicos do domínio para consultas e operações complexas
 */
@Injectable()
export class SolicitacaoAprovacaoRepository {
  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly repository: Repository<SolicitacaoAprovacao>,
  ) {}

  /**
   * Busca solicitação por código único
   * @param codigo - Código único da solicitação
   * @returns Promise<SolicitacaoAprovacao | null>
   */
  async buscarPorCodigo(codigo: string): Promise<SolicitacaoAprovacao | null> {
    return this.repository.findOne({
      where: { codigo },
      relations: [
        'acao_critica',
        'configuracao_aprovacao',
        'historico_aprovacoes',
        'historico_aprovacoes.aprovador',
      ],
    });
  }

  /**
   * Busca solicitações por status
   * @param status - Status da solicitação
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorStatus(
    status: StatusSolicitacaoAprovacao,
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: { status },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: {
        prioridade: 'DESC',
        created_at: 'ASC',
      },
    });
  }

  /**
   * Busca solicitações pendentes
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPendentes(): Promise<SolicitacaoAprovacao[]> {
    return this.buscarPorStatus(StatusSolicitacaoAprovacao.PENDENTE);
  }

  /**
   * Busca solicitações por solicitante
   * @param usuarioSolicitanteId - ID do usuário solicitante
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorSolicitante(
    usuarioSolicitanteId: string,
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: { usuario_solicitante_id: usuarioSolicitanteId },
      relations: [
        'acao_critica',
        'configuracao_aprovacao',
        'historico_aprovacoes',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca solicitações por ação crítica
   * @param acaoCriticaId - ID da ação crítica
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorAcaoCritica(
    acaoCriticaId: string,
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: { acao_critica_id: acaoCriticaId },
      relations: [
        'acao_critica',
        'configuracao_aprovacao',
        'historico_aprovacoes',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca solicitações por prioridade
   * @param prioridade - Prioridade da solicitação
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorPrioridade(
    prioridade: PrioridadeAprovacao,
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: { prioridade },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Busca solicitações por unidade
   * @param unidade - Unidade organizacional
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorUnidade(unidade: string): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: { unidade_solicitante: unidade },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: {
        prioridade: 'DESC',
        created_at: 'ASC',
      },
    });
  }

  /**
   * Busca solicitações expiradas
   * @param dataAtual - Data atual para comparação
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarExpiradas(
    dataAtual: Date = new Date(),
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: {
        status: StatusSolicitacaoAprovacao.PENDENTE,
        data_expiracao: LessThan(dataAtual),
      },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { data_expiracao: 'ASC' },
    });
  }

  /**
   * Busca solicitações próximas do vencimento
   * @param horasAntes - Horas antes do vencimento
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarProximasVencimento(
    horasAntes: number = 2,
  ): Promise<SolicitacaoAprovacao[]> {
    const agora = new Date();
    const limite = new Date(agora.getTime() + horasAntes * 60 * 60 * 1000);

    return this.repository.find({
      where: {
        status: StatusSolicitacaoAprovacao.PENDENTE,
        data_expiracao: Between(agora, limite),
      },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { data_expiracao: 'ASC' },
    });
  }

  /**
   * Busca solicitações por período
   * @param dataInicio - Data de início
   * @param dataFim - Data de fim
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: {
        created_at: Between(dataInicio, dataFim),
      },
      relations: [
        'acao_critica',
        'configuracao_aprovacao',
        'historico_aprovacoes',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca solicitações que precisam de lembrete
   * @param dataAtual - Data atual
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarParaLembrete(
    dataAtual: Date = new Date(),
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: {
        status: StatusSolicitacaoAprovacao.PENDENTE,
        created_at: LessThan(dataAtual),
      },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Busca solicitações que precisam de escalação
   * @param dataAtual - Data atual
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarParaEscalacao(
    dataAtual: Date = new Date(),
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: {
        status: StatusSolicitacaoAprovacao.PENDENTE,
        created_at: LessThan(dataAtual),
      },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Busca solicitações por valor envolvido
   * @param valorMinimo - Valor mínimo
   * @param valorMaximo - Valor máximo (opcional)
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorValor(
    valorMinimo: number,
    valorMaximo?: number,
  ): Promise<SolicitacaoAprovacao[]> {
    const where: FindOptionsWhere<SolicitacaoAprovacao> = {
      valor_envolvido: MoreThan(valorMinimo),
    };

    if (valorMaximo) {
      where.valor_envolvido = Between(valorMinimo, valorMaximo);
    }

    return this.repository.find({
      where,
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { valor_envolvido: 'DESC' },
    });
  }

  /**
   * Busca solicitações por tags
   * @param tags - Array de tags
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorTags(tags: string[]): Promise<SolicitacaoAprovacao[]> {
    return this.repository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.acao_critica', 'acao')
      .leftJoinAndSelect('solicitacao.configuracao_aprovacao', 'config')
      .where('solicitacao.tags && :tags', { tags })
      .orderBy('solicitacao.created_at', 'DESC')
      .getMany();
  }

  /**
   * Busca solicitações com paginação
   * @param skip - Número de registros para pular
   * @param take - Número de registros para retornar
   * @param filtros - Filtros opcionais
   * @returns Promise<[SolicitacaoAprovacao[], number]>
   */
  async buscarComPaginacao(
    skip: number,
    take: number,
    filtros?: Partial<SolicitacaoAprovacao>,
  ): Promise<[SolicitacaoAprovacao[], number]> {
    const where: FindOptionsWhere<SolicitacaoAprovacao> = {};

    if (filtros) {
      Object.assign(where, filtros);
    }

    return this.repository.findAndCount({
      where,
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: {
        prioridade: 'DESC',
        created_at: 'DESC',
      },
      skip,
      take,
    });
  }

  /**
   * Cria uma nova solicitação de aprovação
   * @param dadosSolicitacao - Dados da solicitação
   * @returns Promise<SolicitacaoAprovacao>
   */
  async criar(
    dadosSolicitacao: Partial<SolicitacaoAprovacao>,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = this.repository.create(dadosSolicitacao);
    return this.repository.save(solicitacao);
  }

  /**
   * Atualiza uma solicitação de aprovação
   * @param id - ID da solicitação
   * @param dadosAtualizacao - Dados para atualização
   * @returns Promise<SolicitacaoAprovacao>
   */
  async atualizar(
    id: string,
    dadosAtualizacao: Partial<SolicitacaoAprovacao>,
  ): Promise<SolicitacaoAprovacao> {
    await this.repository.update(id, dadosAtualizacao);
    return this.repository.findOne({
      where: { id },
      relations: [
        'acao_critica',
        'configuracao_aprovacao',
        'historico_aprovacoes',
      ],
    });
  }

  /**
   * Conta solicitações por status
   * @param status - Status da solicitação
   * @returns Promise<number>
   */
  async contarPorStatus(status: StatusSolicitacaoAprovacao): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  /**
   * Conta solicitações pendentes por usuário
   * @param usuarioSolicitanteId - ID do usuário
   * @returns Promise<number>
   */
  async contarPendentesPorUsuario(
    usuarioSolicitanteId: string,
  ): Promise<number> {
    return this.repository.count({
      where: {
        usuario_solicitante_id: usuarioSolicitanteId,
        status: StatusSolicitacaoAprovacao.PENDENTE,
      },
    });
  }

  /**
   * Busca estatísticas de solicitações por período
   * @param dataInicio - Data de início
   * @param dataFim - Data de fim
   * @returns Promise<any>
   */
  async buscarEstatisticasPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<any> {
    return this.repository
      .createQueryBuilder('solicitacao')
      .select('solicitacao.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .addSelect('AVG(solicitacao.tempo_processamento_segundos)', 'tempo_medio')
      .where('solicitacao.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .groupBy('solicitacao.status')
      .getRawMany();
  }

  /**
   * Busca solicitações por IP do solicitante
   * @param ipSolicitante - IP do solicitante
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarPorIpSolicitante(
    ipSolicitante: string,
  ): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: { ip_solicitante: ipSolicitante },
      relations: ['acao_critica'],
      order: { created_at: 'DESC' },
      take: 50, // Limita para evitar sobrecarga
    });
  }

  /**
   * Busca solicitações que permitem processamento automático
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarProcessamentoAutomatico(): Promise<SolicitacaoAprovacao[]> {
    return this.repository.find({
      where: {
        processamento_automatico: true,
        status: StatusSolicitacaoAprovacao.APROVADA,
      },
      relations: ['acao_critica', 'configuracao_aprovacao'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Atualiza tempo de processamento
   * @param id - ID da solicitação
   * @param tempoSegundos - Tempo em segundos
   * @returns Promise<void>
   */
  async atualizarTempoProcessamento(
    id: string,
    tempoSegundos: number,
  ): Promise<void> {
    await this.repository.update(id, {
      tempo_processamento_segundos: tempoSegundos,
    });
  }

  /**
   * Busca solicitações duplicadas por hash de integridade
   * @param hashIntegridade - Hash de integridade
   * @param excluirId - ID para excluir da busca
   * @returns Promise<SolicitacaoAprovacao[]>
   */
  async buscarDuplicadas(
    hashIntegridade: string,
    excluirId?: string,
  ): Promise<SolicitacaoAprovacao[]> {
    const where: FindOptionsWhere<SolicitacaoAprovacao> = {
      hash_integridade: hashIntegridade,
    };

    if (excluirId) {
      where.id = { $ne: excluirId } as any;
    }

    return this.repository.find({
      where,
      relations: ['acao_critica'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca top solicitantes por volume
   * @param limite - Limite de resultados
   * @returns Promise<any[]>
   */
  async buscarTopSolicitantes(limite: number = 10): Promise<any[]> {
    return this.repository
      .createQueryBuilder('solicitacao')
      .select('solicitacao.usuario_solicitante_id', 'usuario_id')
      .addSelect('solicitacao.nome', 'nome')
      .addSelect('COUNT(*)', 'total_solicitacoes')
      .groupBy('solicitacao.usuario_solicitante_id, solicitacao.nome')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limite)
      .getRawMany();
  }
}
