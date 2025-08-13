import { Injectable } from '@nestjs/common';
import { SolicitacaoAprovacao } from '../entities';
import { IEstrategiaAprovacao } from './estrategia-aprovacao.interface';
import { AcaoAprovacao } from '../enums';

/**
 * @class AprovacaoUnanimeStrategy
 * @implements {IEstrategiaAprovacao}
 * @description Implementa a estratégia de aprovação unânime.
 *
 * Nesta estratégia, a solicitação só é considerada aprovada se TODOS os aprovadores
 * designados a aprovarem.
 */
@Injectable()
export class AprovacaoUnanimeStrategy implements IEstrategiaAprovacao {
  /**
   * @method avaliar
   * @description Avalia a solicitação de aprovação com base no critério unânime.
   * @param {SolicitacaoAprovacao} solicitacao A solicitação a ser avaliada.
   * @returns {Promise<boolean>} Retorna `true` se todos os aprovadores aprovaram, `false` caso contrário.
   */
  async avaliar(solicitacao: SolicitacaoAprovacao): Promise<boolean> {
    const aprovadores = solicitacao.configuracao_aprovacao.aprovadores;
    const aprovacoes = solicitacao.historico_aprovacoes.filter(
      (h) => h.acao === AcaoAprovacao.APROVAR,
    );

    // Todos os aprovadores devem ter aprovado
    return aprovadores.every((aprovador) =>
      aprovacoes.some((aprovacao) => aprovacao.aprovador_id === aprovador.id),
    );
  }
}