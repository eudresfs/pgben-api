import { SolicitacaoAprovacao } from '../entities';

/**
 * @interface IEstrategiaAprovacao
 * @description Interface que define o contrato para as diferentes estratégias de aprovação.
 *
 * Toda estratégia de aprovação deve implementar o método `avaliar`, que recebe uma
 * solicitação de aprovação e retorna uma promessa que resolve para `true` se a
 * aprovação for concedida ou `false` caso contrário.
 */
export interface IEstrategiaAprovacao {
  /**
   * @method avaliar
   * @description Avalia uma solicitação de aprovação com base na estratégia implementada.
   * @param {SolicitacaoAprovacao} solicitacao A solicitação de aprovação a ser avaliada.
   * @returns {Promise<boolean>} Uma promessa que resolve para `true` se a solicitação for aprovada, `false` caso contrário.
   */
  avaliar(solicitacao: SolicitacaoAprovacao): Promise<boolean>;
}