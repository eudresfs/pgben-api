import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { ConfiguracaoAprovador } from '../entities/configuracao-aprovador.entity';
import { Status } from '../../../enums/status.enum';

/**
 * Repositório para gerenciar configurações de aprovadores
 */
@Injectable()
export class ConfiguracaoAprovadorRepository extends Repository<ConfiguracaoAprovador> {
  constructor(private dataSource: DataSource) {
    super(ConfiguracaoAprovador, dataSource.createEntityManager());
  }

  /**
   * Busca aprovadores configurados para uma ação específica
   */
  async buscarPorAcaoAprovacao(acaoAprovacaoId: string): Promise<ConfiguracaoAprovador[]> {
    return this.find({
      where: {
        acao_aprovacao_id: acaoAprovacaoId,
        status: Status.ATIVO
      },
      order: {
        ordem_aprovacao: 'ASC'
      }
    });
  }

  /**
   * Busca configuração específica de um usuário para uma ação
   */
  async buscarPorUsuarioEAcao(
    usuarioId: string, 
    acaoAprovacaoId: string
  ): Promise<ConfiguracaoAprovador | null> {
    return this.findOne({
      where: {
        usuario_id: usuarioId,
        acao_aprovacao_id: acaoAprovacaoId,
        status: Status.ATIVO
      }
    });
  }

  /**
   * Verifica se um usuário está configurado como aprovador para uma ação
   */
  async usuarioEhAprovador(
    usuarioId: string, 
    acaoAprovacaoId: string
  ): Promise<boolean> {
    const count = await this.count({
      where: {
        usuario_id: usuarioId,
        acao_aprovacao_id: acaoAprovacaoId,
        status: Status.ATIVO
      }
    });
    return count > 0;
  }

  /**
   * Busca todas as ações que um usuário pode aprovar
   */
  async buscarAcoesPorUsuario(usuarioId: string): Promise<ConfiguracaoAprovador[]> {
    return this.createQueryBuilder('configuracao')
      .select([
        'configuracao.id',
        'configuracao.usuario_id',
        'configuracao.acao_aprovacao_id',
        'configuracao.ordem_aprovacao',
        'configuracao.status',
        'configuracao.created_at',
        'configuracao.updated_at'
      ])
      .leftJoin('configuracao.acao_aprovacao', 'acao')
      .addSelect([
        'acao.id',
        'acao.tipo_acao',
        'acao.nome',
        'acao.descricao',
        'acao.estrategia',
        'acao.min_aprovadores',
        'acao.status'
      ])
      .where('configuracao.usuario_id = :usuarioId', { usuarioId })
      .andWhere('configuracao.status = :status', { status: Status.ATIVO })
      .orderBy('configuracao.ordem_aprovacao', 'ASC')
      .getMany();
  }

  /**
   * Remove configuração de aprovador
   */
  async removerConfiguracaoAprovador(
    usuarioId: string, 
    acaoAprovacaoId: string
  ): Promise<void> {
    await this.update(
      {
        usuario_id: usuarioId,
        acao_aprovacao_id: acaoAprovacaoId
      },
      {
        status: Status.INATIVO
      }
    );
  }

  /**
   * Conta o número de aprovadores configurados para uma ação
   */
  async contarAprovadoresPorAcao(acaoAprovacaoId: string): Promise<number> {
    return this.count({
      where: {
        acao_aprovacao_id: acaoAprovacaoId,
        status: Status.ATIVO
      }
    });
  }
}