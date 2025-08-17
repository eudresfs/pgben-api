import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfiguracaoAprovacao } from '../entities/configuracao-aprovacao.entity';
import {
  EstrategiaAprovacao,
  StatusConfiguracaoAprovacao,
  PrioridadeAprovacao,
} from '../enums/aprovacao.enums';

/**
 * Repository para gerenciar operações de banco de dados da entidade ConfiguracaoAprovacao
 * Fornece métodos específicos do domínio para consultas e operações complexas
 */
@Injectable()
export class ConfiguracaoAprovacaoRepository {
  constructor(
    @InjectRepository(ConfiguracaoAprovacao)
    private readonly repository: Repository<ConfiguracaoAprovacao>,
  ) {}

  /**
   * Busca configuração de aprovação por ação crítica e perfil
   * @param acaoCriticaId - ID da ação crítica
   * @param perfilSolicitante - Perfil do solicitante
   * @param unidade - Unidade do solicitante (opcional)
   * @returns Promise<ConfiguracaoAprovacao | null>
   */
  async buscarPorAcaoEPerfil(
    acaoCriticaId: string,
    perfilSolicitante: string,
    unidade?: string,
  ): Promise<ConfiguracaoAprovacao | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.acao_critica', 'acao')
      .leftJoinAndSelect('config.aprovadores', 'aprovadores')
      .where('config.acao_critica_id = :acaoCriticaId', { acaoCriticaId })
      .andWhere('config.ativa = :ativa', { ativa: true })
      .andWhere('config.status = :status', {
        status: StatusConfiguracaoAprovacao.ATIVA,
      });

    // Busca configuração específica para o perfil
    queryBuilder.andWhere(
      '(config.perfil_solicitante = :perfil OR config.perfil_solicitante IS NULL)',
      { perfil: perfilSolicitante },
    );

    // Se unidade foi fornecida, prioriza configurações específicas da unidade
    if (unidade) {
      queryBuilder.andWhere(
        '(config.unidade = :unidade OR config.unidade IS NULL)',
        { unidade },
      );
      queryBuilder.orderBy('config.unidade', 'DESC'); // Prioriza configurações com unidade específica
    }

    queryBuilder
      .addOrderBy('config.perfil_solicitante', 'DESC') // Prioriza configurações com perfil específico
      .addOrderBy('config.prioridade', 'DESC')
      .addOrderBy('config.created_at', 'ASC');

    return queryBuilder.getOne();
  }

  /**
   * Busca todas as configurações ativas para uma ação crítica
   * @param acaoCriticaId - ID da ação crítica
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorAcaoCritica(
    acaoCriticaId: string,
  ): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        acao_critica_id: acaoCriticaId,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: {
        prioridade: 'DESC',
        created_at: 'ASC',
      },
    });
  }

  /**
   * Busca configurações por estratégia de aprovação
   * @param estrategia - Estratégia de aprovação
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorEstrategia(
    estrategia: EstrategiaAprovacao,
  ): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        estrategia,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: { prioridade: 'DESC' },
    });
  }

  /**
   * Busca configurações por perfil de solicitante
   * @param perfil - Perfil do solicitante
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorPerfil(perfil: string): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        perfil_solicitante: perfil,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: { prioridade: 'DESC' },
    });
  }

  /**
   * Busca configurações por unidade
   * @param unidade - Unidade organizacional
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorUnidade(unidade: string): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        unidade,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: { prioridade: 'DESC' },
    });
  }

  /**
   * Busca configurações que permitem auto-aprovação
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarAutoAprovacao(): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        permite_auto_aprovacao: true,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica'],
      order: { prioridade: 'DESC' },
    });
  }

  /**
   * Busca configurações por valor mínimo
   * @param valorMinimo - Valor mínimo para aprovação
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorValorMinimo(
    valorMinimo: number,
  ): Promise<ConfiguracaoAprovacao[]> {
    return this.repository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.acao_critica', 'acao')
      .leftJoinAndSelect('config.aprovadores', 'aprovadores')
      .where('config.valor_minimo <= :valorMinimo', { valorMinimo })
      .andWhere('config.ativa = :ativa', { ativa: true })
      .andWhere('config.status = :status', {
        status: StatusConfiguracaoAprovacao.ATIVA,
      })
      .orderBy('config.valor_minimo', 'DESC')
      .addOrderBy('config.prioridade', 'DESC')
      .getMany();
  }

  /**
   * Busca configurações que permitem aprovação paralela
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarAprovacaoParalela(): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        permite_aprovacao_paralela: true,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: { prioridade: 'DESC' },
    });
  }

  /**
   * Busca configurações por tempo limite
   * @param tempoLimiteMaximo - Tempo limite máximo em horas
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorTempoLimite(
    tempoLimiteMaximo: number,
  ): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        tempo_limite_horas: tempoLimiteMaximo,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: { tempo_limite_horas: 'ASC' },
    });
  }

  /**
   * Busca configurações com paginação
   * @param skip - Número de registros para pular
   * @param take - Número de registros para retornar
   * @param filtros - Filtros opcionais
   * @returns Promise<[ConfiguracaoAprovacao[], number]>
   */
  async buscarComPaginacao(
    skip: number,
    take: number,
    filtros?: Partial<ConfiguracaoAprovacao>,
  ): Promise<[ConfiguracaoAprovacao[], number]> {
    const where: FindOptionsWhere<ConfiguracaoAprovacao> = {
      ativa: true,
      status: StatusConfiguracaoAprovacao.ATIVA,
    };

    if (filtros) {
      Object.assign(where, filtros);
    }

    return this.repository.findAndCount({
      where,
      relations: ['acao_critica', 'aprovadores'],
      order: {
        prioridade: 'DESC',
        created_at: 'DESC',
      },
      skip,
      take,
    });
  }

  /**
   * Cria uma nova configuração de aprovação
   * @param dadosConfiguracao - Dados da configuração
   * @returns Promise<ConfiguracaoAprovacao>
   */
  async criar(
    dadosConfiguracao: Partial<ConfiguracaoAprovacao>,
  ): Promise<ConfiguracaoAprovacao> {
    const configuracao = this.repository.create(dadosConfiguracao);
    return this.repository.save(configuracao);
  }

  /**
   * Atualiza uma configuração de aprovação
   * @param id - ID da configuração
   * @param dadosAtualizacao - Dados para atualização
   * @returns Promise<ConfiguracaoAprovacao>
   */
  async atualizar(
    id: string,
    dadosAtualizacao: Partial<ConfiguracaoAprovacao>,
  ): Promise<ConfiguracaoAprovacao> {
    await this.repository.update(id, dadosAtualizacao);
    return this.repository.findOne({
      where: { id },
      relations: ['acao_critica', 'aprovadores'],
    });
  }

  /**
   * Desativa uma configuração de aprovação
   * @param id - ID da configuração
   * @returns Promise<void>
   */
  async desativar(id: string): Promise<void> {
    await this.repository.update(id, {
      ativa: false,
      status: StatusConfiguracaoAprovacao.INATIVA,
    });
  }

  /**
   * Conta configurações por status
   * @param status - Status da configuração
   * @returns Promise<number>
   */
  async contarPorStatus(status: StatusConfiguracaoAprovacao): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  /**
   * Busca configurações que requerem justificativa
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarQueRequeremJustificativa(): Promise<ConfiguracaoAprovacao[]> {
    return this.repository.find({
      where: {
        requer_justificativa_aprovacao: true,
        ativa: true,
        status: StatusConfiguracaoAprovacao.ATIVA,
      },
      relations: ['acao_critica', 'aprovadores'],
      order: { prioridade: 'DESC' },
    });
  }

  /**
   * Busca configurações por horário de funcionamento
   * @param horaAtual - Hora atual para verificação
   * @returns Promise<ConfiguracaoAprovacao[]>
   */
  async buscarPorHorarioFuncionamento(
    horaAtual: Date,
  ): Promise<ConfiguracaoAprovacao[]> {
    const hora = horaAtual.getHours();
    const diaSemana = horaAtual.getDay();

    return this.repository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.acao_critica', 'acao')
      .leftJoinAndSelect('config.aprovadores', 'aprovadores')
      .where('config.ativo = :ativo', { ativo: true })
      .andWhere('config.status = :status', {
        status: StatusConfiguracaoAprovacao.ATIVA,
      })
      .andWhere(
        '(config.horario_funcionamento IS NULL OR ' +
          'config.horario_funcionamento @> :horario)',
        {
          horario: JSON.stringify({
            hora_inicio: hora,
            hora_fim: hora,
            dias_semana: [diaSemana],
          }),
        },
      )
      .orderBy('config.prioridade', 'DESC')
      .getMany();
  }

  /**
   * Busca estatísticas de uso das configurações
   * @returns Promise<any[]>
   */
  async buscarEstatisticasUso(): Promise<any[]> {
    return this.repository
      .createQueryBuilder('config')
      .select('config.nome', 'nome')
      .addSelect('config.estrategia', 'estrategia')
      .addSelect('COUNT(sol.id)', 'total_solicitacoes')
      .leftJoin('config.solicitacoes_aprovacao', 'sol')
      .where('config.ativo = :ativo', { ativo: true })
      .groupBy('config.id, config.nome, config.estrategia')
      .orderBy('COUNT(sol.id)', 'DESC')
      .getRawMany();
  }

  /**
   * Verifica se existe configuração conflitante
   * @param acaoCriticaId - ID da ação crítica
   * @param perfil - Perfil do solicitante
   * @param unidade - Unidade (opcional)
   * @param excluirId - ID para excluir da verificação
   * @returns Promise<boolean>
   */
  async existeConfiguracaoConflitante(
    acaoCriticaId: string,
    perfil?: string,
    unidade?: string,
    excluirId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('config')
      .where('config.acao_critica_id = :acaoCriticaId', { acaoCriticaId })
      .andWhere('config.ativo = :ativo', { ativo: true })
      .andWhere('config.status = :status', {
        status: StatusConfiguracaoAprovacao.ATIVA,
      });

    if (perfil) {
      queryBuilder.andWhere('config.perfil_solicitante = :perfil', { perfil });
    }

    if (unidade) {
      queryBuilder.andWhere('config.unidade = :unidade', { unidade });
    }

    if (excluirId) {
      queryBuilder.andWhere('config.id != :excluirId', { excluirId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }
}
