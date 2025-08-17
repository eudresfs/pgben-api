import { Injectable } from '@nestjs/common';
import { SolicitacaoAprovacao } from '../entities';
import { IEstrategiaAprovacao } from './estrategia-aprovacao.interface';
import { AcaoAprovacao } from '../enums';

/**
 * @class AprovacaoMaioriaStrategy
 * @implements {IEstrategiaAprovacao}
 * @description Implementa a estratégia de aprovação por maioria simples.
 *
 * A solicitação é aprovada se o número de aprovações for maior que o número de rejeições.
 */
@Injectable()
export class AprovacaoMaioriaStrategy implements IEstrategiaAprovacao {
  /**
   * @method avaliar
   * @description Avalia a solicitação com base no critério de maioria.
   * @param {SolicitacaoAprovacao} solicitacao A solicitação a ser avaliada.
   * @returns {Promise<boolean>} Retorna `true` se a maioria aprovou, `false` caso contrário.
   */
  async avaliar(solicitacao: SolicitacaoAprovacao): Promise<boolean> {
    const aprovadores = solicitacao.configuracao_aprovacao.aprovadores;
    const aprovacoes = solicitacao.historico_aprovacoes.filter(
      (h) => h.acao === AcaoAprovacao.APROVAR,
    );

    const totalAprovadores = aprovadores.length;
    const totalAprovacoes = aprovacoes.length;

    // Maioria simples (mais de 50%)
    return totalAprovacoes > totalAprovadores / 2;
  }
}