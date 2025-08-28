/**
 * Enum para períodos predefinidos utilizados em filtros avançados
 * 
 * Define períodos comuns para facilitar a filtragem de dados temporais
 * sem necessidade de especificar datas manuais
 * 
 * @enum {string}
 */
export enum PeriodoPredefinido {
  /** Apenas o dia atual */
  HOJE = 'hoje',
  
  /** Apenas o dia anterior */
  ONTEM = 'ontem',
  
  /** Últimos 7 dias incluindo hoje */
  ULTIMOS_7_DIAS = 'ultimos_7_dias',
  
  /** Últimos 30 dias incluindo hoje */
  ULTIMOS_30_DIAS = 'ultimos_30_dias',
  
  /** Últimos 90 dias incluindo hoje */
  ULTIMOS_90_DIAS = 'ultimos_90_dias',
  
  /** Do primeiro dia do mês atual até hoje */
  MES_ATUAL = 'mes_atual',
  
  /** Todo o mês anterior completo */
  MES_ANTERIOR = 'mes_anterior',
  
  /** Do primeiro dia do trimestre atual até hoje */
  TRIMESTRE_ATUAL = 'trimestre_atual',
  
  /** Todo o trimestre anterior completo */
  TRIMESTRE_ANTERIOR = 'trimestre_anterior',
  
  /** Do primeiro dia do ano atual até hoje */
  ANO_ATUAL = 'ano_atual',
  
  /** Todo o ano anterior completo */
  ANO_ANTERIOR = 'ano_anterior',
  
  /** Período personalizado definido por data_inicio e data_fim */
  PERSONALIZADO = 'personalizado'
}

/**
 * Mapeamento de períodos predefinidos para descrições legíveis
 */
export const PERIODO_PREDEFINIDO_LABELS: Record<PeriodoPredefinido, string> = {
  [PeriodoPredefinido.HOJE]: 'Hoje',
  [PeriodoPredefinido.ONTEM]: 'Ontem',
  [PeriodoPredefinido.ULTIMOS_7_DIAS]: 'Últimos 7 dias',
  [PeriodoPredefinido.ULTIMOS_30_DIAS]: 'Últimos 30 dias',
  [PeriodoPredefinido.ULTIMOS_90_DIAS]: 'Últimos 90 dias',
  [PeriodoPredefinido.MES_ATUAL]: 'Mês atual',
  [PeriodoPredefinido.MES_ANTERIOR]: 'Mês anterior',
  [PeriodoPredefinido.TRIMESTRE_ATUAL]: 'Trimestre atual',
  [PeriodoPredefinido.TRIMESTRE_ANTERIOR]: 'Trimestre anterior',
  [PeriodoPredefinido.ANO_ATUAL]: 'Ano atual',
  [PeriodoPredefinido.ANO_ANTERIOR]: 'Ano anterior',
  [PeriodoPredefinido.PERSONALIZADO]: 'Período personalizado'
};

/**
 * Função utilitária para obter a descrição de um período predefinido
 * 
 * @param periodo - O período predefinido
 * @returns A descrição legível do período
 */
export function getPeriodoLabel(periodo: PeriodoPredefinido): string {
  return PERIODO_PREDEFINIDO_LABELS[periodo] || periodo;
}

/**
 * Função utilitária para verificar se um período requer datas personalizadas
 * 
 * @param periodo - O período predefinido
 * @returns true se o período requer data_inicio e data_fim
 */
export function isPeriodoPersonalizado(periodo: PeriodoPredefinido): boolean {
  return periodo === PeriodoPredefinido.PERSONALIZADO;
}

/**
 * Lista de períodos que são considerados "recentes" (útil para validações)
 */
export const PERIODOS_RECENTES = [
  PeriodoPredefinido.HOJE,
  PeriodoPredefinido.ONTEM,
  PeriodoPredefinido.ULTIMOS_7_DIAS,
  PeriodoPredefinido.ULTIMOS_30_DIAS
];

/**
 * Lista de períodos que são considerados "históricos" (útil para relatórios)
 */
export const PERIODOS_HISTORICOS = [
  PeriodoPredefinido.ULTIMOS_90_DIAS,
  PeriodoPredefinido.TRIMESTRE_ANTERIOR,
  PeriodoPredefinido.ANO_ANTERIOR
];