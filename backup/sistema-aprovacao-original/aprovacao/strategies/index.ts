// Interface base
export { IEstrategiaAprovacao } from './estrategia-aprovacao.interface';

// Estratégias concretas
export { AprovacaoUnanimeStrategy } from './aprovacao-unanime.strategy';
export { AprovacaoMaioriaStrategy } from './aprovacao-maioria.strategy';
export { AprovacaoHierarquicaStrategy } from './aprovacao-hierarquica.strategy';
export { AprovacaoPonderadaStrategy } from './aprovacao-ponderada.strategy';

// Factory
export { EstrategiaAprovacaoFactory } from './estrategia-aprovacao.factory';