import { Injectable } from '@nestjs/common';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { IEstrategiaAprovacao } from './estrategia-aprovacao.interface';
import { AcaoAprovacao } from '../enums/aprovacao.enums';

/**
 * @class AprovacaoPonderadaStrategy
 * @implements {IEstrategiaAprovacao}
 * @description Implementa a estratégia de aprovação ponderada.
 *
 * Cada aprovador tem um peso específico, e a aprovação é concedida
 * quando a soma dos pesos dos aprovadores que aprovaram atinge um limiar.
 */
@Injectable()
export class AprovacaoPonderadaStrategy implements IEstrategiaAprovacao {
  private readonly LIMIAR_APROVACAO = 0.6; // 60% do peso total

  /**
   * @method avaliar
   * @description Avalia a solicitação com base nos pesos dos aprovadores.
   * @param {SolicitacaoAprovacao} solicitacao A solicitação a ser avaliada.
   * @returns {Promise<boolean>} Retorna `true` se o peso das aprovações atingir o limiar, `false` caso contrário.
   */
  async avaliar(solicitacao: SolicitacaoAprovacao): Promise<boolean> {
    const aprovadores = solicitacao.configuracao_aprovacao.aprovadores;
    const aprovacoes = solicitacao.historico_aprovacoes.filter(
      (h) => h.acao === AcaoAprovacao.APROVAR,
    );

    let pesoTotal = 0;
    let pesoAprovado = 0;

    for (const aprovador of aprovadores) {
      pesoTotal += aprovador.peso_aprovacao || 1;
      
      // Verifica se este aprovador aprovou
      const aprovou = aprovacoes.some(
        (aprovacao) => aprovacao.aprovador_id === aprovador.id,
      );
      
      if (aprovou) {
        pesoAprovado += aprovador.peso_aprovacao || 1;
      }
    }

    // Considera aprovado se mais de 50% do peso total aprovou
    return pesoAprovado > pesoTotal / 2;
  }
}