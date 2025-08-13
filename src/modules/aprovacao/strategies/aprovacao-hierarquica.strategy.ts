import { Injectable } from '@nestjs/common';
import { SolicitacaoAprovacao } from '../entities';
import { IEstrategiaAprovacao } from './estrategia-aprovacao.interface';
import { AcaoAprovacao } from '../enums';

/**
 * @class AprovacaoHierarquicaStrategy
 * @implements {IEstrategiaAprovacao}
 * @description Implementa a estratégia de aprovação hierárquica.
 *
 * A solicitação é aprovada seguindo uma ordem hierárquica específica,
 * onde aprovadores de níveis superiores têm precedência.
 */
@Injectable()
export class AprovacaoHierarquicaStrategy implements IEstrategiaAprovacao {
  /**
   * @method avaliar
   * @description Avalia a solicitação com base na hierarquia dos aprovadores.
   * @param {SolicitacaoAprovacao} solicitacao A solicitação a ser avaliada.
   * @returns {Promise<boolean>} Retorna `true` se aprovado conforme hierarquia, `false` caso contrário.
   */
  async avaliar(solicitacao: SolicitacaoAprovacao): Promise<boolean> {
    const aprovadores = solicitacao.configuracao_aprovacao.aprovadores;
    const aprovacoes = solicitacao.historico_aprovacoes.filter(
      (h) => h.acao === AcaoAprovacao.APROVAR,
    );

    // Ordena aprovadores por hierarquia (maior nível primeiro)
    const aprovadoresOrdenados = aprovadores.sort(
      (a, b) => b.nivel_hierarquico - a.nivel_hierarquico,
    );

    // Verifica se o aprovador de maior hierarquia aprovou
    const aprovadorMaiorNivel = aprovadoresOrdenados[0];
    return aprovacoes.some(
      (aprovacao) => aprovacao.aprovador_id === aprovadorMaiorNivel?.id,
    );
  }
}