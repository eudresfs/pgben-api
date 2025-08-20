import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { SolicitacaoAprovador } from '../entities/solicitacao-aprovador.entity';

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
    return this.find({
      where: {
        solicitacao_aprovacao_id: solicitacaoId,
        ativo: true
      },
      order: {
        ordem_aprovacao: 'ASC'
      }
    });
  }

  /**
   * Busca aprovador específico de uma solicitação
   */
  async buscarPorUsuarioESolicitacao(
    usuarioId: string, 
    solicitacaoId: string
  ): Promise<SolicitacaoAprovador | null> {
    return this.findOne({
      where: {
        usuario_id: usuarioId,
        solicitacao_aprovacao_id: solicitacaoId,
        ativo: true
      }
    });
  }

  /**
   * Busca aprovadores que já decidiram
   */
  async buscarAprovadoresQueDecidiram(solicitacaoId: string): Promise<SolicitacaoAprovador[]> {
    return this.createQueryBuilder('aprovador')
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
        ativo: true
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
        ativo: true
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
    return this.find({
      where: {
        usuario_id: usuarioId,
        aprovado: null,
        ativo: true
      },
      relations: ['solicitacao_aprovacao'],
      order: {
        created_at: 'ASC'
      }
    });
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
        ativo: false
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
        ativo: true
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
        ativo: true
      }
    });
    return count > 0;
  }
}