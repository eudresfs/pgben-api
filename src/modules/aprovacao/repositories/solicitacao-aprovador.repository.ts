import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { SolicitacaoAprovador } from '../entities/solicitacao-aprovador.entity';
import { Status } from '../../../enums/status.enum';

/**
 * Repositório para gerenciar aprovadores de solicitações específicas
 */
@Injectable()
export class SolicitacaoAprovadorRepository extends Repository<SolicitacaoAprovador> {
  constructor(private dataSource: DataSource) {
    super(SolicitacaoAprovador, dataSource.createEntityManager());
  }

  /**
   * Busca aprovadores de uma solicitação específica
   */
  async buscarPorSolicitacao(solicitacaoId: string): Promise<SolicitacaoAprovador[]> {
    return this.createQueryBuilder('aprovador')
      .select([
        'aprovador.id',
        'aprovador.usuario_id',
        'aprovador.aprovado',
        'aprovador.justificativa_decisao',
        'aprovador.anexos_decisao',
        'aprovador.decidido_em',
        'aprovador.ordem_aprovacao',
        'aprovador.ativo',
        'aprovador.observacoes',
        'aprovador.created_at',
        'aprovador.updated_at',
        'aprovador.solicitacao_aprovacao_id'
      ])
      .leftJoin('aprovador.usuario', 'usuario')
      .addSelect(['usuario.id', 'usuario.nome'])
      .leftJoin('usuario.unidade', 'unidade')
      .addSelect(['unidade.id', 'unidade.nome'])
      .where('aprovador.solicitacao_aprovacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('aprovador.ativo = true')
      .orderBy('aprovador.ordem_aprovacao', 'ASC')
      .getMany();
  }

  /**
   * Busca aprovador específico de uma solicitação
   */
  async buscarPorUsuarioESolicitacao(
    usuarioId: string, 
    solicitacaoId: string
  ): Promise<SolicitacaoAprovador | null> {
    return this.createQueryBuilder('aprovador')
      .select([
        'aprovador.id',
        'aprovador.usuario_id',
        'aprovador.aprovado',
        'aprovador.justificativa_decisao',
        'aprovador.anexos_decisao',
        'aprovador.decidido_em',
        'aprovador.ordem_aprovacao',
        'aprovador.ativo',
        'aprovador.observacoes',
        'aprovador.created_at',
        'aprovador.updated_at',
        'aprovador.solicitacao_aprovacao_id'
      ])
      .leftJoin('aprovador.usuario', 'usuario')
      .addSelect(['usuario.id', 'usuario.nome'])
      .leftJoin('usuario.unidade', 'unidade')
      .addSelect(['unidade.id', 'unidade.nome'])
      .where('aprovador.usuario_id = :usuarioId', { usuarioId })
      .andWhere('aprovador.solicitacao_aprovacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('aprovador.ativo = true')
      .getOne();
  }

  /**
   * Busca aprovadores que já decidiram
   */
  async buscarAprovadoresQueDecidiram(solicitacaoId: string): Promise<SolicitacaoAprovador[]> {
    return this.createQueryBuilder('aprovador')
      .select([
        'aprovador.id',
        'aprovador.usuario_id',
        'aprovador.aprovado',
        'aprovador.justificativa_decisao',
        'aprovador.anexos_decisao',
        'aprovador.decidido_em',
        'aprovador.ordem_aprovacao',
        'aprovador.ativo',
        'aprovador.observacoes',
        'aprovador.created_at',
        'aprovador.updated_at',
        'aprovador.solicitacao_aprovacao_id'
      ])
      .leftJoin('aprovador.usuario', 'usuario')
      .addSelect(['usuario.id', 'usuario.nome'])
      .leftJoin('usuario.unidade', 'unidade')
      .addSelect(['unidade.id', 'unidade.nome'])
      .where('aprovador.solicitacao_aprovacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('aprovador.ativo = true')
      .andWhere('aprovador.aprovado IS NOT NULL')
      .orderBy('aprovador.ordem_aprovacao', 'ASC')
      .getMany();
  }

  /**
   * Busca aprovadores pendentes
   */
  async buscarAprovadoresPendentes(solicitacaoId: string): Promise<SolicitacaoAprovador[]> {
    return this.createQueryBuilder('aprovador')
      .select([
        'aprovador.id',
        'aprovador.usuario_id',
        'aprovador.aprovado',
        'aprovador.justificativa_decisao',
        'aprovador.anexos_decisao',
        'aprovador.decidido_em',
        'aprovador.ordem_aprovacao',
        'aprovador.ativo',
        'aprovador.observacoes',
        'aprovador.created_at',
        'aprovador.updated_at',
        'aprovador.solicitacao_aprovacao_id'
      ])
      .leftJoin('aprovador.usuario', 'usuario')
      .addSelect(['usuario.id', 'usuario.nome'])
      .leftJoin('usuario.unidade', 'unidade')
      .addSelect(['unidade.id', 'unidade.nome'])
      .where('aprovador.solicitacao_aprovacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('aprovador.ativo = true')
      .andWhere('aprovador.aprovado IS NULL')
      .orderBy('aprovador.ordem_aprovacao', 'ASC')
      .getMany();
  }

  /**
   * Conta aprovações positivas
   */
  async contarAprovacoes(solicitacaoId: string): Promise<number> {
    return this.count({
      where: {
        solicitacao_aprovacao_id: solicitacaoId,
        aprovado: true,
        status: Status.ATIVO
      }
    });
  }

  /**
   * Conta rejeições
   */
  async contarRejeicoes(solicitacaoId: string): Promise<number> {
    return this.count({
      where: {
        solicitacao_aprovacao_id: solicitacaoId,
        aprovado: false,
        status: Status.ATIVO
      }
    });
  }

  /**
   * Verifica se há alguma rejeição
   */
  async temRejeicao(solicitacaoId: string): Promise<boolean> {
    const count = await this.contarRejeicoes(solicitacaoId);
    return count > 0;
  }

  /**
   * Busca solicitações pendentes de aprovação para um usuário
   */
  async buscarSolicitacoesPendentesParaUsuario(usuarioId: string): Promise<SolicitacaoAprovador[]> {
    return this.createQueryBuilder('aprovador')
      .select([
        'aprovador.id',
        'aprovador.usuario_id',
        'aprovador.aprovado',
        'aprovador.justificativa_decisao',
        'aprovador.anexos_decisao',
        'aprovador.decidido_em',
        'aprovador.ordem_aprovacao',
        'aprovador.ativo',
        'aprovador.observacoes',
        'aprovador.created_at',
        'aprovador.updated_at',
        'aprovador.solicitacao_aprovacao_id'
      ])
      .leftJoin('aprovador.solicitacao_aprovacao', 'solicitacao')
      .addSelect([
        'solicitacao.id',
        'solicitacao.codigo',
        'solicitacao.status',
        'solicitacao.justificativa',
        'solicitacao.dados_acao',
        'solicitacao.created_at'
      ])
      .leftJoin('solicitacao.solicitante', 'solicitante')
      .addSelect(['solicitante.id', 'solicitante.nome'])
      .leftJoin('solicitante.unidade', 'unidade_solicitante')
      .addSelect(['unidade_solicitante.id', 'unidade_solicitante.nome'])
      .leftJoin('aprovador.usuario', 'usuario')
      .addSelect(['usuario.id', 'usuario.nome'])
      .leftJoin('usuario.unidade', 'unidade_aprovador')
      .addSelect(['unidade_aprovador.id', 'unidade_aprovador.nome'])
      .where('aprovador.usuario_id = :usuarioId', { usuarioId })
      .andWhere('aprovador.aprovado IS NULL')
      .andWhere('aprovador.ativo = true')
      .orderBy('aprovador.created_at', 'ASC')
      .getMany();
  }

  /**
   * Remove aprovador de uma solicitação
   */
  async removerAprovadorDaSolicitacao(
    usuarioId: string, 
    solicitacaoId: string
  ): Promise<void> {
    await this.update(
      {
        usuario_id: usuarioId,
        solicitacao_aprovacao_id: solicitacaoId
      },
      {
        status: Status.INATIVO
      }
    );
  }

  /**
   * Conta total de aprovadores de uma solicitação
   */
  async contarAprovadoresDaSolicitacao(solicitacaoId: string): Promise<number> {
    return this.count({
      where: {
        solicitacao_aprovacao_id: solicitacaoId,
        status: Status.ATIVO
      }
    });
  }

  /**
   * Verifica se um usuário é aprovador de uma solicitação
   */
  async usuarioEhAprovadorDaSolicitacao(
    usuarioId: string, 
    solicitacaoId: string
  ): Promise<boolean> {
    const count = await this.count({
      where: {
        usuario_id: usuarioId,
        solicitacao_aprovacao_id: solicitacaoId,
        status: Status.ATIVO
      }
    });
    return count > 0;
  }
}