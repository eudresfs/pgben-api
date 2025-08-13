import { Injectable } from '@nestjs/common';
import { IEstrategiaAprovacao } from './estrategia-aprovacao.interface';
import { AprovacaoUnanimeStrategy } from './aprovacao-unanime.strategy';
import { AprovacaoMaioriaStrategy } from './aprovacao-maioria.strategy';
import { AprovacaoHierarquicaStrategy } from './aprovacao-hierarquica.strategy';
import { AprovacaoPonderadaStrategy } from './aprovacao-ponderada.strategy';
import { EstrategiaAprovacao } from '../enums/aprovacao.enums';

/**
 * @class EstrategiaAprovacaoFactory
 * @description Factory responsável por criar e retornar a estratégia de aprovação apropriada.
 *
 * Este factory implementa o padrão Strategy, permitindo que diferentes
 * algoritmos de aprovação sejam utilizados de forma intercambiável.
 */
@Injectable()
export class EstrategiaAprovacaoFactory {
  constructor(
    private readonly aprovacaoUnanimeStrategy: AprovacaoUnanimeStrategy,
    private readonly aprovacaoMaioriaStrategy: AprovacaoMaioriaStrategy,
    private readonly aprovacaoHierarquicaStrategy: AprovacaoHierarquicaStrategy,
    private readonly aprovacaoPonderadaStrategy: AprovacaoPonderadaStrategy,
  ) {}

  /**
   * @method criarEstrategia
   * @description Cria e retorna a estratégia de aprovação baseada no tipo especificado.
   * @param {EstrategiaAprovacao} tipo O tipo de estratégia a ser criada.
   * @returns {IEstrategiaAprovacao} A instância da estratégia correspondente.
   * @throws {Error} Quando o tipo de estratégia não é suportado.
   */
  criarEstrategia(tipo: EstrategiaAprovacao): IEstrategiaAprovacao {
    switch (tipo) {
      case EstrategiaAprovacao.UNANIME:
        return this.aprovacaoUnanimeStrategy;

      case EstrategiaAprovacao.MAIORIA:
        return this.aprovacaoMaioriaStrategy;

      case EstrategiaAprovacao.HIERARQUICA:
        return this.aprovacaoHierarquicaStrategy;

      case EstrategiaAprovacao.PERSONALIZADA:
        return this.aprovacaoPonderadaStrategy;

      default:
        throw new Error(`Estratégia de aprovação não suportada: ${tipo}`);
    }
  }

  /**
   * @method obterEstrategiasDisponiveis
   * @description Retorna a lista de todas as estratégias de aprovação disponíveis.
   * @returns {EstrategiaAprovacao[]} Array com todos os tipos de estratégia disponíveis.
   */
  obterEstrategiasDisponiveis(): EstrategiaAprovacao[] {
    return Object.values(EstrategiaAprovacao);
  }
}