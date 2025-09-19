/**
 * Enum que define as categorias de benefícios disponíveis no sistema.
 * 
 * Cada categoria representa um grupo específico de benefícios com características
 * e finalidades similares, facilitando a organização e gestão dos tipos de benefícios.
 */
export enum CategoriaBeneficio {
  /**
   * Benefício Natalidade
   * 
   * Visa atender necessidades do bebê que vai nascer, apoiar a mãe em casos 
   * de morte do bebê ou da mãe, e apoiar a família nesses casos.
   */
  NATALIDADE = 'natalidade',

  /**
   * Benefício por Morte
   * 
   * Apoia a família no custeio de despesas relacionadas ao falecimento 
   * de um membro.
   */
  MORTE = 'morte',

  /**
   * Benefício por Vulnerabilidade Temporária
   * 
   * Concedido em situações de risco, perdas e danos que afetam o acesso 
   * a itens essenciais como alimentação (cesta básica, cartão alimentação), 
   * documentação e moradia (aluguel social).
   */
  VULNERABILIDADE_TEMPORARIA = 'vulnerabilidade_temporaria',

  /**
   * Benefício por Calamidade Pública
   * 
   * Oferecido em situações de desastres naturais, como enchentes ou 
   * deslizamentos, onde a população pode precisar de apoio imediato 
   * para superar a situação.
   */
  CALAMIDADE_PUBLICA = 'calamidade_publica',
}

/**
 * Labels descritivos para as categorias de benefício
 */
export const CATEGORIA_BENEFICIO_LABELS: Record<CategoriaBeneficio, string> = {
  [CategoriaBeneficio.NATALIDADE]: 'Benefício Natalidade',
  [CategoriaBeneficio.MORTE]: 'Benefício por Morte',
  [CategoriaBeneficio.VULNERABILIDADE_TEMPORARIA]: 'Benefício por Vulnerabilidade Temporária',
  [CategoriaBeneficio.CALAMIDADE_PUBLICA]: 'Benefício por Calamidade Pública',
};

/**
 * Descrições detalhadas para as categorias de benefício
 */
export const CATEGORIA_BENEFICIO_DESCRICOES: Record<CategoriaBeneficio, string> = {
  [CategoriaBeneficio.NATALIDADE]: 
    'Visa atender necessidades do bebê que vai nascer, apoiar a mãe em casos de morte do bebê ou da mãe, e apoiar a família nesses casos.',
  [CategoriaBeneficio.MORTE]: 
    'Apoia a família no custeio de despesas relacionadas ao falecimento de um membro.',
  [CategoriaBeneficio.VULNERABILIDADE_TEMPORARIA]: 
    'Concedido em situações de risco, perdas e danos que afetam o acesso a itens essenciais como alimentação (cesta básica, cartão alimentação), documentação e moradia (aluguel social).',
  [CategoriaBeneficio.CALAMIDADE_PUBLICA]: 
    'Oferecido em situações de desastres naturais, como enchentes ou deslizamentos, onde a população pode precisar de apoio imediato para superar a situação.',
};

/**
 * Função utilitária para obter o label de uma categoria
 */
export function getCategoriaLabel(categoria: CategoriaBeneficio): string {
  return CATEGORIA_BENEFICIO_LABELS[categoria];
}

/**
 * Função utilitária para obter a descrição de uma categoria
 */
export function getCategoriaDescricao(categoria: CategoriaBeneficio): string {
  return CATEGORIA_BENEFICIO_DESCRICOES[categoria];
}

/**
 * Função utilitária para verificar se uma categoria é válida
 */
export function isCategoriaValida(categoria: string): categoria is CategoriaBeneficio {
  return Object.values(CategoriaBeneficio).includes(categoria as CategoriaBeneficio);
}