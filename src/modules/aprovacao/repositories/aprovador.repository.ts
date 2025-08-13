import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Aprovador } from '../entities/aprovador.entity';
import { TipoAprovador } from '../enums/aprovacao.enums';

/**
 * Repository para gerenciar operações de banco de dados da entidade Aprovador
 * Fornece métodos específicos do domínio para consultas e operações complexas
 */
@Injectable()
export class AprovadorRepository {
  constructor(
    @InjectRepository(Aprovador)
    private readonly repository: Repository<Aprovador>,
  ) {}

  /**
   * Busca aprovadores por configuração de aprovação
   * @param configuracaoAprovacaoId - ID da configuração de aprovação
   * @returns Promise<Aprovador[]>
   */
  async buscarPorConfiguracao(
    configuracaoAprovacaoId: string,
  ): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        configuracao_aprovacao_id: configuracaoAprovacaoId,
        ativo: true,
      },
      relations: ['configuracao_aprovacao', 'historico_aprovacoes'],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores por tipo
   * @param tipo - Tipo do aprovador
   * @returns Promise<Aprovador[]>
   */
  async buscarPorTipo(tipo: TipoAprovador): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        tipo,
        ativo: true,
      },
      relations: ['configuracao_aprovacao'],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores por usuário específico
   * @param usuarioId - ID do usuário
   * @returns Promise<Aprovador[]>
   */
  async buscarPorUsuario(usuarioId: string): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        tipo: TipoAprovador.USUARIO,
        usuario_id: usuarioId,
        ativo: true,
      },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores por perfil
   * @param perfilId - ID do perfil
   * @returns Promise<Aprovador[]>
   */
  async buscarPorPerfil(perfilId: string): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        tipo: TipoAprovador.PERFIL,
        perfil: perfilId,
        ativo: true,
      },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores por unidade
   * @param unidadeId - ID da unidade
   * @returns Promise<Aprovador[]>
   */
  async buscarPorUnidade(unidadeId: string): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        tipo: TipoAprovador.UNIDADE,
        unidade: unidadeId,
        ativo: true,
      },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores hierárquicos
   * @param hierarquiaId - ID da hierarquia
   * @returns Promise<Aprovador[]>
   */
  async buscarPorHierarquia(hierarquiaId: string): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        tipo: TipoAprovador.HIERARQUIA,
        nivel_hierarquico: parseInt(hierarquiaId),
        ativo: true,
      },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores por múltiplos IDs de usuário
   * @param usuarioIds - Array de IDs de usuários
   * @returns Promise<Aprovador[]>
   */
  async buscarPorUsuarios(usuarioIds: string[]): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        tipo: TipoAprovador.USUARIO,
        usuario_id: In(usuarioIds),
        ativo: true,
      },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Busca aprovadores por limite de valor
   * @param valor - Valor para verificar limite
   * @returns Promise<Aprovador[]>
   */
  async buscarPorLimiteValor(valor: number): Promise<Aprovador[]> {
    return this.repository
      .createQueryBuilder('aprovador')
      .leftJoinAndSelect('aprovador.configuracao_aprovacao', 'config')
      .leftJoinAndSelect('config.acao_critica', 'acao')
      .where('aprovador.ativo = :ativo', { ativo: true })
      .andWhere(
        '(aprovador.limite_valor_maximo IS NULL OR aprovador.limite_valor_maximo >= :valor)',
        { valor },
      )
      .andWhere(
        '(aprovador.limite_valor_minimo IS NULL OR aprovador.limite_valor_minimo <= :valor)',
        { valor },
      )
      .orderBy('aprovador.ordem_aprovacao', 'ASC')
      .addOrderBy('aprovador.peso_aprovacao', 'DESC')
      .getMany();
  }

  /**
   * Busca aprovadores disponíveis no horário atual
   * @param horaAtual - Hora atual para verificação
   * @returns Promise<Aprovador[]>
   */
  async buscarDisponiveis(horaAtual: Date = new Date()): Promise<Aprovador[]> {
    const hora = horaAtual.getHours();
    const diaSemana = horaAtual.getDay();

    return this.repository
      .createQueryBuilder('aprovador')
      .leftJoinAndSelect('aprovador.configuracao_aprovacao', 'config')
      .where('aprovador.ativo = :ativo', { ativo: true })
      .andWhere(
        '(aprovador.horario_funcionamento IS NULL OR ' +
          'aprovador.horario_funcionamento @> :horario)',
        {
          horario: JSON.stringify({
            hora_inicio: hora,
            hora_fim: hora,
            dias_semana: [diaSemana],
          }),
        },
      )
      .orderBy('aprovador.ordem_aprovacao', 'ASC')
      .addOrderBy('aprovador.peso_aprovacao', 'DESC')
      .getMany();
  }

  /**
   * Busca aprovadores por canais de notificação
   * @param canais - Array de canais de notificação
   * @returns Promise<Aprovador[]>
   */
  async buscarPorCanaisNotificacao(canais: string[]): Promise<Aprovador[]> {
    return this.repository
      .createQueryBuilder('aprovador')
      .leftJoinAndSelect('aprovador.configuracao_aprovacao', 'config')
      .where('aprovador.ativo = :ativo', { ativo: true })
      .andWhere('aprovador.canais_notificacao && :canais', { canais })
      .orderBy('aprovador.ordem_aprovacao', 'ASC')
      .addOrderBy('aprovador.peso_aprovacao', 'DESC')
      .getMany();
  }

  /**
   * Busca aprovadores com maior peso
   * @param configuracaoAprovacaoId - ID da configuração
   * @param limite - Limite de resultados
   * @returns Promise<Aprovador[]>
   */
  async buscarComMaiorPeso(
    configuracaoAprovacaoId: string,
    limite: number = 5,
  ): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        configuracao_aprovacao_id: configuracaoAprovacaoId,
        ativo: true,
      },
      relations: ['configuracao_aprovacao'],
      order: {
        peso_aprovacao: 'DESC',
        ordem_aprovacao: 'ASC',
      },
      take: limite,
    });
  }

  /**
   * Busca aprovadores com paginação
   * @param skip - Número de registros para pular
   * @param take - Número de registros para retornar
   * @param filtros - Filtros opcionais
   * @returns Promise<[Aprovador[], number]>
   */
  async buscarComPaginacao(
    skip: number,
    take: number,
    filtros?: Partial<Aprovador>,
  ): Promise<[Aprovador[], number]> {
    const where: FindOptionsWhere<Aprovador> = {
      ativo: true,
    };

    if (filtros) {
      Object.assign(where, filtros);
    }

    return this.repository.findAndCount({
      where,
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
        created_at: 'DESC',
      },
      skip,
      take,
    });
  }

  /**
   * Cria um novo aprovador
   * @param dadosAprovador - Dados do aprovador
   * @returns Promise<Aprovador>
   */
  async criar(dadosAprovador: Partial<Aprovador>): Promise<Aprovador> {
    const aprovador = this.repository.create(dadosAprovador);
    return this.repository.save(aprovador);
  }

  /**
   * Atualiza um aprovador
   * @param id - ID do aprovador
   * @param dadosAtualizacao - Dados para atualização
   * @returns Promise<Aprovador>
   */
  async atualizar(
    id: string,
    dadosAtualizacao: Partial<Aprovador>,
  ): Promise<Aprovador> {
    await this.repository.update(id, dadosAtualizacao);
    return this.repository.findOne({
      where: { id },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
    });
  }

  /**
   * Desativa um aprovador
   * @param id - ID do aprovador
   * @returns Promise<void>
   */
  async desativar(id: string): Promise<void> {
    await this.repository.update(id, { ativo: false });
  }

  /**
   * Conta aprovadores por tipo
   * @param tipo - Tipo do aprovador
   * @returns Promise<number>
   */
  async contarPorTipo(tipo: TipoAprovador): Promise<number> {
    return this.repository.count({
      where: {
        tipo,
        ativo: true,
      },
    });
  }

  /**
   * Conta aprovadores por configuração
   * @param configuracaoAprovacaoId - ID da configuração
   * @returns Promise<number>
   */
  async contarPorConfiguracao(
    configuracaoAprovacaoId: string,
  ): Promise<number> {
    return this.repository.count({
      where: {
        configuracao_aprovacao_id: configuracaoAprovacaoId,
        ativo: true,
      },
    });
  }

  /**
   * Busca estatísticas de aprovadores
   * @returns Promise<any[]>
   */
  async buscarEstatisticas(): Promise<any[]> {
    return this.repository
      .createQueryBuilder('aprovador')
      .select('aprovador.tipo', 'tipo')
      .addSelect('COUNT(*)', 'total')
      .addSelect('AVG(aprovador.peso_aprovacao)', 'peso_medio')
      .where('aprovador.ativo = :ativo', { ativo: true })
      .groupBy('aprovador.tipo')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();
  }

  /**
   * Busca aprovadores por múltiplas configurações
   * @param configuracaoIds - Array de IDs de configurações
   * @returns Promise<Aprovador[]>
   */
  async buscarPorConfiguracoes(
    configuracaoIds: string[],
  ): Promise<Aprovador[]> {
    return this.repository.find({
      where: {
        configuracao_aprovacao_id: In(configuracaoIds),
        ativo: true,
      },
      relations: [
        'configuracao_aprovacao',
        'configuracao_aprovacao.acao_critica',
      ],
      order: {
        ordem_aprovacao: 'ASC',
        peso_aprovacao: 'DESC',
      },
    });
  }

  /**
   * Verifica se usuário é aprovador para uma configuração específica
   * @param usuarioId - ID do usuário
   * @param configuracaoAprovacaoId - ID da configuração
   * @returns Promise<boolean>
   */
  async ehAprovador(
    usuarioId: string,
    configuracaoAprovacaoId: string,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        configuracao_aprovacao_id: configuracaoAprovacaoId,
        tipo: TipoAprovador.USUARIO,
        usuario_id: usuarioId,
        ativo: true,
      },
    });
    return count > 0;
  }

  /**
   * Busca próximo aprovador na ordem
   * @param configuracaoAprovacaoId - ID da configuração
   * @param ordemAtual - Ordem atual
   * @returns Promise<Aprovador | null>
   */
  async buscarProximoNaOrdem(
    configuracaoAprovacaoId: string,
    ordemAtual: number,
  ): Promise<Aprovador | null> {
    return this.repository.findOne({
      where: {
        configuracao_aprovacao_id: configuracaoAprovacaoId,
        ordem_aprovacao: ordemAtual + 1,
        ativo: true,
      },
      relations: ['configuracao_aprovacao'],
    });
  }

  /**
   * Busca aprovadores substitutos
   * @param aprovadorPrincipalId - ID do aprovador principal
   * @returns Promise<Aprovador[]>
   */
  async buscarSubstitutos(aprovadorPrincipalId: string): Promise<Aprovador[]> {
    // Busca aprovadores da mesma configuração com peso similar
    const aprovadorPrincipal = await this.repository.findOne({
      where: { id: aprovadorPrincipalId },
    });

    if (!aprovadorPrincipal) {
      return [];
    }

    return this.repository.find({
      where: {
        configuracao_aprovacao_id: aprovadorPrincipal.configuracao_aprovacao_id,
        ativo: true,
        // Excluir o aprovador principal da busca
        // id: Not(aprovadorPrincipalId),
      },
      relations: ['configuracao_aprovacao'],
      order: {
        peso_aprovacao: 'DESC',
        ordem_aprovacao: 'ASC',
      },
      take: 3, // Máximo 3 substitutos
    });
  }

  /**
   * Atualiza ordem dos aprovadores
   * @param configuracaoAprovacaoId - ID da configuração
   * @param novaOrdem - Array com nova ordem dos IDs
   * @returns Promise<void>
   */
  async atualizarOrdem(
    configuracaoAprovacaoId: string,
    novaOrdem: string[],
  ): Promise<void> {
    for (let i = 0; i < novaOrdem.length; i++) {
      await this.repository.update(novaOrdem[i], {
        ordem_aprovacao: i + 1,
      });
    }
  }
}
