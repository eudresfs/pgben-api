/**
 * Enum para representar os níveis de prioridade de uma visita domiciliar.
 * 
 * @description
 * Define os níveis de prioridade para organização e execução das visitas,
 * permitindo que situações mais críticas sejam atendidas primeiro.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export enum PrioridadeVisita {
  /**
   * Prioridade baixa - visitas de rotina
   */
  BAIXA = 'baixa',

  /**
   * Prioridade normal - acompanhamento padrão
   */
  NORMAL = 'normal',

  /**
   * Prioridade média - situações intermediárias
   */
  MEDIA = 'media',

  /**
   * Prioridade alta - situações que requerem atenção especial
   */
  ALTA = 'alta',

  /**
   * Prioridade urgente - situações críticas
   */
  URGENTE = 'urgente'
}

/**
 * Mapeamento de prioridades para descrições legíveis
 */
export const PRIORIDADE_VISITA_LABELS = {
  [PrioridadeVisita.BAIXA]: 'Baixa',
  [PrioridadeVisita.NORMAL]: 'Normal',
  [PrioridadeVisita.ALTA]: 'Alta',
  [PrioridadeVisita.URGENTE]: 'Urgente'
};

/**
 * Descrições detalhadas das prioridades
 */
export const PRIORIDADE_VISITA_DESCRICOES = {
  [PrioridadeVisita.BAIXA]: 'Visita de rotina sem urgência específica',
  [PrioridadeVisita.NORMAL]: 'Acompanhamento padrão dentro do cronograma estabelecido',
  [PrioridadeVisita.ALTA]: 'Situação que requer atenção especial e agilidade',
  [PrioridadeVisita.URGENTE]: 'Situação crítica que demanda intervenção imediata'
};

/**
 * Valores numéricos para ordenação por prioridade (maior valor = maior prioridade)
 */
export const PRIORIDADE_VISITA_VALORES = {
  [PrioridadeVisita.BAIXA]: 1,
  [PrioridadeVisita.NORMAL]: 2,
  [PrioridadeVisita.ALTA]: 3,
  [PrioridadeVisita.URGENTE]: 4
};

/**
 * Cores para representação visual das prioridades
 */
export const PRIORIDADE_VISITA_CORES = {
  [PrioridadeVisita.BAIXA]: '#28a745',    // Verde
  [PrioridadeVisita.NORMAL]: '#007bff',   // Azul
  [PrioridadeVisita.ALTA]: '#ffc107',     // Amarelo
  [PrioridadeVisita.URGENTE]: '#dc3545'   // Vermelho
};

/**
 * Prazo máximo em dias para execução da visita por prioridade
 */
export const PRIORIDADE_VISITA_PRAZOS = {
  [PrioridadeVisita.BAIXA]: 30,     // 30 dias
  [PrioridadeVisita.NORMAL]: 15,    // 15 dias
  [PrioridadeVisita.ALTA]: 7,       // 7 dias
  [PrioridadeVisita.URGENTE]: 2     // 2 dias
};

/**
 * Prioridades que requerem notificação imediata
 */
export const PRIORIDADES_NOTIFICACAO_IMEDIATA = [
  PrioridadeVisita.ALTA,
  PrioridadeVisita.URGENTE
];

/**
 * Obtém o valor numérico de uma prioridade para ordenação
 * @param prioridade Prioridade a ser convertida
 * @returns Valor numérico da prioridade
 */
export function getValorPrioridade(prioridade: PrioridadeVisita): number {
  return PRIORIDADE_VISITA_VALORES[prioridade];
}

/**
 * Obtém o prazo máximo em dias para uma prioridade
 * @param prioridade Prioridade a ser verificada
 * @returns Prazo em dias
 */
export function getPrazoPrioridade(prioridade: PrioridadeVisita): number {
  return PRIORIDADE_VISITA_PRAZOS[prioridade];
}

/**
 * Verifica se uma prioridade requer notificação imediata
 * @param prioridade Prioridade a ser verificada
 * @returns true se requer notificação imediata
 */
export function requerNotificacaoImediata(prioridade: PrioridadeVisita): boolean {
  return PRIORIDADES_NOTIFICACAO_IMEDIATA.includes(prioridade);
}

/**
 * Compara duas prioridades e retorna qual é maior
 * @param prioridade1 Primeira prioridade
 * @param prioridade2 Segunda prioridade
 * @returns Número positivo se prioridade1 > prioridade2, negativo se menor, 0 se igual
 */
export function compararPrioridades(prioridade1: PrioridadeVisita, prioridade2: PrioridadeVisita): number {
  return getValorPrioridade(prioridade1) - getValorPrioridade(prioridade2);
}

/**
 * Obtém a cor associada a uma prioridade
 * @param prioridade Prioridade a ser verificada
 * @returns Código hexadecimal da cor
 */
export function getCorPrioridade(prioridade: PrioridadeVisita): string {
  return PRIORIDADE_VISITA_CORES[prioridade];
}

/**
 * Obtém o rótulo legível de uma prioridade de visita
 * @param prioridade Prioridade a ser convertida
 * @returns Rótulo legível da prioridade
 */
export function getPrioridadeVisitaLabel(prioridade: PrioridadeVisita): string {
  return PRIORIDADE_VISITA_LABELS[prioridade] || prioridade;
}

/**
 * Obtém a cor associada a uma prioridade (alias para compatibilidade)
 * @param prioridade Prioridade a ser verificada
 * @returns Código hexadecimal da cor
 */
export function getPrioridadeVisitaCor(prioridade: PrioridadeVisita): string {
  return getCorPrioridade(prioridade);
}

/**
 * Obtém o prazo máximo em dias para uma prioridade (alias para compatibilidade)
 * @param prioridade Prioridade a ser verificada
 * @returns Prazo em dias
 */
export function getPrioridadeVisitaPrazo(prioridade: PrioridadeVisita): number {
  return getPrazoPrioridade(prioridade);
}