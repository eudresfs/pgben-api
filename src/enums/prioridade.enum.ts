/**
 * Enum para níveis de prioridade utilizados em filtros avançados
 * 
 * Define níveis de prioridade padronizados para classificação
 * de solicitações, tarefas e outros elementos do sistema
 * 
 * @enum {string}
 */
export enum Prioridade {
  /** Prioridade muito baixa - itens de menor urgência */
  MUITO_BAIXA = 'muito_baixa',
  
  /** Prioridade baixa - itens com pouca urgência */
  BAIXA = 'baixa',
  
  /** Prioridade normal/média - itens com urgência padrão */
  NORMAL = 'normal',
  
  /** Prioridade alta - itens com urgência elevada */
  ALTA = 'alta',
  
  /** Prioridade muito alta - itens críticos */
  MUITO_ALTA = 'muito_alta',
  
  /** Prioridade crítica - itens de emergência */
  CRITICA = 'critica'
}

/**
 * Mapeamento de prioridades para descrições legíveis
 */
export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  [Prioridade.MUITO_BAIXA]: 'Muito Baixa',
  [Prioridade.BAIXA]: 'Baixa',
  [Prioridade.NORMAL]: 'Normal',
  [Prioridade.ALTA]: 'Alta',
  [Prioridade.MUITO_ALTA]: 'Muito Alta',
  [Prioridade.CRITICA]: 'Crítica'
};

/**
 * Mapeamento de prioridades para valores numéricos (útil para ordenação)
 */
export const PRIORIDADE_VALORES: Record<Prioridade, number> = {
  [Prioridade.MUITO_BAIXA]: 1,
  [Prioridade.BAIXA]: 2,
  [Prioridade.NORMAL]: 3,
  [Prioridade.ALTA]: 4,
  [Prioridade.MUITO_ALTA]: 5,
  [Prioridade.CRITICA]: 6
};

/**
 * Mapeamento de prioridades para cores (útil para UI)
 */
export const PRIORIDADE_CORES: Record<Prioridade, string> = {
  [Prioridade.MUITO_BAIXA]: '#6B7280', // Cinza
  [Prioridade.BAIXA]: '#10B981',       // Verde
  [Prioridade.NORMAL]: '#3B82F6',      // Azul
  [Prioridade.ALTA]: '#F59E0B',        // Amarelo
  [Prioridade.MUITO_ALTA]: '#EF4444',  // Vermelho
  [Prioridade.CRITICA]: '#7C2D12'      // Vermelho escuro
};

/**
 * Função utilitária para obter a descrição de uma prioridade
 * 
 * @param prioridade - A prioridade
 * @returns A descrição legível da prioridade
 */
export function getPrioridadeLabel(prioridade: Prioridade): string {
  return PRIORIDADE_LABELS[prioridade] || prioridade;
}

/**
 * Função utilitária para obter o valor numérico de uma prioridade
 * 
 * @param prioridade - A prioridade
 * @returns O valor numérico da prioridade (1-6)
 */
export function getPrioridadeValor(prioridade: Prioridade): number {
  return PRIORIDADE_VALORES[prioridade] || 3;
}

/**
 * Função utilitária para obter a cor de uma prioridade
 * 
 * @param prioridade - A prioridade
 * @returns A cor hexadecimal da prioridade
 */
export function getPrioridadeCor(prioridade: Prioridade): string {
  return PRIORIDADE_CORES[prioridade] || '#3B82F6';
}

/**
 * Função utilitária para comparar prioridades
 * 
 * @param a - Primeira prioridade
 * @param b - Segunda prioridade
 * @returns Número negativo se a < b, positivo se a > b, zero se iguais
 */
export function compararPrioridades(a: Prioridade, b: Prioridade): number {
  return getPrioridadeValor(a) - getPrioridadeValor(b);
}

/**
 * Lista de prioridades ordenadas por valor (da menor para a maior)
 */
export const PRIORIDADES_ORDENADAS = [
  Prioridade.MUITO_BAIXA,
  Prioridade.BAIXA,
  Prioridade.NORMAL,
  Prioridade.ALTA,
  Prioridade.MUITO_ALTA,
  Prioridade.CRITICA
];

/**
 * Lista de prioridades consideradas "urgentes" (útil para alertas)
 */
export const PRIORIDADES_URGENTES = [
  Prioridade.ALTA,
  Prioridade.MUITO_ALTA,
  Prioridade.CRITICA
];

/**
 * Lista de prioridades consideradas "normais" (útil para processamento padrão)
 */
export const PRIORIDADES_NORMAIS = [
  Prioridade.MUITO_BAIXA,
  Prioridade.BAIXA,
  Prioridade.NORMAL
];